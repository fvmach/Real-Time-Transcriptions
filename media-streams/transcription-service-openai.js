import { EventEmitter } from 'events';
import { config } from 'dotenv';
import OpenAI from 'openai';
import wav from 'wav';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUFFER_DIR = path.join(__dirname, 'buffers');
const CSV_LOG_PATH = path.join(__dirname, 'flush-log.csv');

export default class OpenAITranscriptionService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.buffer = [];
    this.timestamps = [];
    this.sampleRate = 8000;
    this.targetSampleRate = 16000;
    this.flushIntervalMs = options.flushIntervalMs || 2000;
    this.minBufferBytes = options.minBufferBytes || 32000; // adjustable sample size

    if (!fs.existsSync(BUFFER_DIR)) {
      fs.mkdirSync(BUFFER_DIR, { recursive: true });
    }

    if (!fs.existsSync(CSV_LOG_PATH)) {
      fs.writeFileSync(CSV_LOG_PATH, 'timestamp,duration_ms,buffer_bytes,transcription_length,latency_ms,error\n');
    }

    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  send(payload) {
    const buffer = Buffer.from(payload, 'base64');
    this.buffer.push(buffer);
    this.timestamps.push(Date.now());
  }

  normalizeAndResample(buffer, inRate, outRate) {
    const inSamples = buffer.length / 2;
    const outSamples = Math.floor(inSamples * outRate / inRate);
    const outBuffer = Buffer.alloc(outSamples * 2);

    for (let i = 0; i < outSamples; i++) {
      const srcIndex = Math.floor(i * inRate / outRate) * 2;
      if (srcIndex + 1 < buffer.length) {
        let sample = buffer.readInt16LE(srcIndex);
        sample = Math.min(32767, Math.max(-32768, sample * 2.0)); // Apply gain
        outBuffer.writeInt16LE(sample, i * 2);
      }
    }

    return outBuffer;
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const flushStart = Date.now();
    const combinedBuffer = Buffer.concat(this.buffer);
    if (combinedBuffer.length < this.minBufferBytes) return;

    const fileId = `${Date.now()}-${randomUUID()}`;
    const filePath = path.join(BUFFER_DIR, `openai-audio-buffer-${fileId}.wav`);

    try {
      const resampled = this.normalizeAndResample(combinedBuffer, this.sampleRate, this.targetSampleRate);

      await new Promise((resolve, reject) => {
        const writer = new wav.FileWriter(filePath, {
          sampleRate: this.targetSampleRate,
          channels: 1,
          bitDepth: 16,
        });

        writer.on('error', reject);
        writer.on('finish', resolve);

        writer.write(resampled);
        writer.end();
      });

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const responseStart = Date.now();
      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        response_format: 'text'
      });
      const latency = Date.now() - responseStart;

      const text = response.text?.trim();
      if (text) this.emit('transcription', text);

      const logRow = `${new Date().toISOString()},${this.flushIntervalMs},${combinedBuffer.length},${text?.length || 0},${latency},\n`;
      fs.appendFileSync(CSV_LOG_PATH, logRow);

    } catch (err) {
      const logRow = `${new Date().toISOString()},${this.flushIntervalMs},${this.buffer.length},0,0,"${(err?.message || '').replace(/"/g, '')}"\n`;
      fs.appendFileSync(CSV_LOG_PATH, logRow);
      console.error('[OpenAI STT] Transcription error:', err);
    }

    this.buffer = [];
    this.timestamps = [];
  }

  close() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}
