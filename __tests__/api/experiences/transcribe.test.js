const fs = require('fs');
const path = require('path');
const request = require('supertest');
const handler = require('../../../pages/api/experiences/transcribe').default;
const express = require('express');
const bodyParser = require('body-parser');
const supertest = require('supertest');

// Helper: create a short silent .wav file buffer (44-byte header + silence)
function createTestWavBuffer() {
  // 44-byte header for PCM WAV, 1s silence, 8kHz, mono, 16-bit
  const header = Buffer.from([
    0x52,0x49,0x46,0x46,0x24,0x08,0x00,0x00,0x57,0x41,0x56,0x45,0x66,0x6d,0x74,0x20,
    0x10,0x00,0x00,0x00,0x01,0x00,0x01,0x00,0x40,0x1f,0x00,0x00,0x80,0x3e,0x00,0x00,
    0x02,0x00,0x10,0x00,0x64,0x61,0x74,0x61,0x00,0x08,0x00,0x00
  ]);
  const silence = Buffer.alloc(2048, 0); // 2048 bytes of silence
  return Buffer.concat([header, silence]);
}

describe('/api/experiences/transcribe', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(bodyParser.raw({ type: '*/*', limit: '10mb' }));
    app.post('/api/experiences/transcribe', (req, res) => handler(req, res));
  });

  it('should return 405 for non-POST', async () => {
    const res = await supertest(app).get('/api/experiences/transcribe');
    expect(res.status).toBe(405);
    expect(res.body.message).toMatch(/Method not allowed/);
  });

  it('should return 400 if no audio uploaded', async () => {
    const res = await supertest(app).post('/api/experiences/transcribe');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No audio file/);
  });

  it('should accept a valid audio upload and call OpenAI', async () => {
    jest.mock('../../../lib/openai', () => ({
      openai: {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue('test transcript'),
          },
        },
      },
    }));
    const buffer = createTestWavBuffer();
    const res = await supertest(app)
      .post('/api/experiences/transcribe')
      .attach('audio', buffer, 'test-audio.wav');
    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe('test transcript');
  });
}); 