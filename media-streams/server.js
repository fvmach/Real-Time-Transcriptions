import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import TranscriptionService from './transcription-service.js';
import AnalyticsService from './analytics-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_SERVER_PORT = process.env.PORT || 8080;

function log(message, ...args) {
  console.log(new Date().toISOString(), message, ...args);
}

const app = express();
const httpServer = createServer(app);
const mediaws = new WebSocketServer({ server: httpServer });

// Serve dynamic TwiML using environment variable
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

// Handle Media Stream connections
mediaws.on('connection', (connection) => {
  log('Media WS: Connection accepted');
  new MediaStreamHandler(connection);
});

// MediaStreamHandler class
class MediaStreamHandler {
  constructor(connection) {
    this.connection = connection;
    this.metaData = null;
    this.trackHandlers = {};

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
        const transcriptionService = new TranscriptionService();
        const analyticsService = new AnalyticsService(track);

        transcriptionService.on('transcription', (transcription) => {
          log(`Transcription (${track}):`, transcription);
        });

        analyticsService.on('chunk', (info) => {
          log(`Chunk (${track}): size=${info.size} delta=${info.delta}ms`);
        });

        this.trackHandlers[track] = {
          transcriptionService,
          analyticsService,
        };
      }

      // Log and transcribe
      this.trackHandlers[track].analyticsService.logChunk(payload);
      this.trackHandlers[track].transcriptionService.send(payload);
    } catch (err) {
      log('Failed to parse message:', err);
    }
  }

  close() {
    log('Media WS: Connection closed');

    for (const track of Object.keys(this.trackHandlers)) {
      log(`Closing handler for track: ${track}`);
      this.trackHandlers[track].transcriptionService.close();
      this.trackHandlers[track].analyticsService.close();
    }
  }
}

httpServer.listen(HTTP_SERVER_PORT, () => {
  console.log(`Server listening on http://localhost:${HTTP_SERVER_PORT}`);
});
