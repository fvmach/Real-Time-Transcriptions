import fs from 'fs';
import EventEmitter from 'events';

export default class AnalyticsService extends EventEmitter {
  constructor(trackName) {
    super();
    this.track = trackName;
    this.chunkTimestamps = [];
    this.byteLog = [];
    this.audioOutputFile = `./audio-${trackName}.raw`;
    this.saveToFile = true;
  }

  logChunk(payload) {
    const now = Date.now();
    const buffer = Buffer.from(payload, 'base64');

    // Track timing and data size
    this.chunkTimestamps.push(now);
    this.byteLog.push(buffer.length);

    if (this.saveToFile) {
      fs.appendFileSync(this.audioOutputFile, buffer);
    }

    // Emit structured event without logging
    this.emit('chunk', {
      track: this.track,
      time: now,
      size: buffer.length,
      delta: this.chunkTimestamps.length > 1
        ? now - this.chunkTimestamps[this.chunkTimestamps.length - 2]
        : 0
    });
  }

  summary() {
    const totalChunks = this.byteLog.length;
    const totalBytes = this.byteLog.reduce((a, b) => a + b, 0);
    const averageInterval =
      this.chunkTimestamps.length > 1
        ? (this.chunkTimestamps[this.chunkTimestamps.length - 1] - this.chunkTimestamps[0]) / (this.chunkTimestamps.length - 1)
        : 0;

    console.log(`\n=== ${this.track} Summary ===`);
    console.log(`Chunks received: ${totalChunks}`);
    console.log(`Total bytes: ${totalBytes}`);
    console.log(`Average interval: ${averageInterval.toFixed(2)}ms`);
  }

  close() {
    this.summary();
  }
}
