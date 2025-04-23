import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAITranscriptionService from './transcription-service-openai.js';
import AnalyticsService from './analytics-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_SERVER_PORT = process.env.PORT || 8080;
const LOG_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message, ...args) {
  console.log(new Date().toISOString(), message, ...args);
}

const app = express();
const httpServer = createServer(app);
const mediaws = new WebSocketServer({ server: httpServer });

app.post('/twiml', (req, res) => {
  const streamUrl = process.env.TWIML_STREAM_URL;

  if (!streamUrl) {
    return res.status(500).send('Missing TWIML_STREAM_URL in .env');
  }

  const responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${streamUrl}"/>
  </Start>
  <Pause length="40"/>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  res.send(responseXml);
});

mediaws.on('connection', (connection) => {
  log('Media WS: Connection accepted');
  new MediaStreamHandler(connection);
});

class MediaStreamHandler {
  constructor(connection) {
    this.connection = connection;
    this.metaData = null;
    this.trackHandlers = {};
    this.csvStreams = {};

    connection.on('message', this.processMessage.bind(this));
    connection.on('close', this.close.bind(this));
  }

  processMessage(message) {
    try {
      const data = JSON.parse(message);

      if (data.event === 'start') {
        this.metaData = data.start;
        return;
      }

      if (data.event !== 'media') return;

      const track = data.media.track;
      const payload = data.media.payload;

      if (!this.trackHandlers[track]) {
        const transcriptionService = new OpenAITranscriptionService({ 
            flushIntervalMs: 1000,
            minBufferBytes: 16000,});
        const analyticsService = new AnalyticsService(track);

        transcriptionService.on('transcription', (transcription) => {
          log(`Transcription (${track}):`, transcription);
        });

        // Prepare CSV logger
        const csvPath = path.join(LOG_DIR, `chunk-log-${track}.csv`);
        const csvStream = fs.createWriteStream(csvPath, { flags: 'a' });

        if (!fs.existsSync(csvPath) || fs.statSync(csvPath).size === 0) {
          csvStream.write('timestamp,size,delta_ms\n');
        }

        analyticsService.on('chunk', (info) => {
          const timestamp = new Date().toISOString();
          csvStream.write(`${timestamp},${info.size},${info.delta}\n`);
        });

        this.trackHandlers[track] = {
          transcriptionService,
          analyticsService,
        };
        this.csvStreams[track] = csvStream;
      }

      this.trackHandlers[track].analyticsService.logChunk(payload);
      this.trackHandlers[track].transcriptionService.send(payload);
    } catch (err) {
      log('Failed to parse message:', err);
    }
  }

  close() {
    log('Media WS: Connection closed');

    for (const track of Object.keys(this.trackHandlers)) {
      this.trackHandlers[track].transcriptionService.close();
      this.trackHandlers[track].analyticsService.close();

      if (this.csvStreams[track]) {
        this.csvStreams[track].end();
      }
    }
  }
}

httpServer.listen(HTTP_SERVER_PORT, () => {
  console.log(`Server listening on http://localhost:${HTTP_SERVER_PORT}`);
});
