import { createMocks } from 'node-mocks-http';
import transcribeHandler from '../pages/api/experiences/transcribe';
import evaluateHandler from '../pages/api/experiences/evaluate';

// Mock formidable with the same import pattern as the actual handler
const mockParse = jest.fn();
const mockForm = {
  parse: mockParse
};

jest.mock('formidable', () => {
  const mockIncomingForm = jest.fn(() => mockForm);
  return {
    IncomingForm: mockIncomingForm
  };
});

// Mock fs
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => ({
    pipe: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock OpenAI
jest.mock('../lib/openai', () => ({
  openai: {
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    embeddings: {
      create: jest.fn(),
    },
  },
}));

// Mock database
jest.mock('../lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('../models/Experience', () => ({
  aggregate: jest.fn(),
}));

const { openai } = require('../lib/openai');
const Experience = require('../models/Experience');
const fs = require('fs');

describe('Phase 6 – Write-in Answer API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/experiences/transcribe', () => {
    it('successfully transcribes audio file', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockAudioFile = {
        filepath: '/tmp/audio.webm',
        originalFilename: 'recording.webm',
        mimetype: 'audio/webm',
        size: 1024,
      };

      // Mock the form parse to call the callback with success
      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: mockAudioFile });
      });

      openai.audio.transcriptions.create.mockResolvedValue(
        'This is a test transcription of the audio file.'
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transcript).toBe('This is a test transcription of the audio file.');
      expect(openai.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(Object),
        model: 'whisper-1',
        response_format: 'text',
        language: 'en',
      });
    });

    it('handles audio file array format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockAudioFile = {
        filepath: '/tmp/audio.webm',
        originalFilename: 'recording.webm',
        mimetype: 'audio/webm',
        size: 1024,
      };

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: [mockAudioFile] });
      });

      openai.audio.transcriptions.create.mockResolvedValue(
        'Transcribed audio content.'
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transcript).toBe('Transcribed audio content.');
    });

    it('returns 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Method not allowed');
    });

    it('returns 400 when no audio file provided', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, {});
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('No audio file found in upload');
    });

    it('handles form parsing errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      mockParse.mockImplementation((req, callback) => {
        callback(new Error('Form parsing failed'), {}, {});
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Form parse error');
      expect(data.error).toBe('Form parsing failed');
    });

    it('handles OpenAI transcription errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockAudioFile = {
        filepath: '/tmp/audio.webm',
        originalFilename: 'recording.webm',
        mimetype: 'audio/webm',
        size: 1024,
      };

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: mockAudioFile });
      });

      openai.audio.transcriptions.create.mockRejectedValue(
        new Error('OpenAI API error')
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Transcription failed');
      expect(data.error).toBe('OpenAI API error');
    });

    it('handles missing file path', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockAudioFile = {
        originalFilename: 'recording.webm',
        mimetype: 'audio/webm',
        size: 1024,
        // Missing filepath/path
      };

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: mockAudioFile });
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Audio file path missing');
    });
  });

  describe('/api/experiences/evaluate', () => {
    it('successfully evaluates an answer', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about a leadership challenge',
          answer: 'I led a team through a difficult project by setting clear goals and maintaining open communication.',
        },
      });

      openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '## Evaluation\n\nGood leadership example with clear structure.\n\n**Rating: 8/10**'
          }
        }]
      });

      openai.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      Experience.aggregate.mockResolvedValue([]);

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.evaluation).toContain('Good leadership example');
      expect(data.evaluation).toContain('Rating: 8/10');
      expect(data.matchedExperience).toBeNull();
      expect(data.suggestedUpdate).toBeNull();
    });

    it('returns 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Method not allowed');
    });

    it('returns 400 when question is missing', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          answer: 'Some answer without a question',
        },
      });

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Question and answer are required');
    });

    it('returns 400 when answer is missing', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'What is leadership?',
        },
      });

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Question and answer are required');
    });

    it('finds matched experience and suggests update', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Describe a technical challenge',
          answer: 'I designed a microservices architecture to solve scalability issues.',
        },
      });

      openai.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '## Evaluation\n\nExcellent technical answer.\n\n**Rating: 9/10**'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Enhanced microservices architecture with improved monitoring and fault tolerance.'
            }
          }]
        });

      openai.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      const mockMatchedExperience = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Microservices Architecture',
        content: 'Original microservices implementation story...',
        score: 0.9,
      };

      Experience.aggregate.mockResolvedValue([mockMatchedExperience]);

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.evaluation).toContain('Excellent technical answer');
      expect(data.matchedExperience).toEqual(mockMatchedExperience);
      expect(data.suggestedUpdate).toEqual({
        content: 'Enhanced microservices architecture with improved monitoring and fault tolerance.',
        title: 'Microservices Architecture',
      });
    });

    it('handles low similarity scores without suggesting updates', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about ownership',
          answer: 'I took ownership of a failing project and turned it around.',
        },
      });

      openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '## Evaluation\n\nGood ownership example.\n\n**Rating: 7/10**'
          }
        }]
      });

      openai.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      const mockLowSimilarityExperience = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Different Experience',
        content: 'Completely different content...',
        score: 0.5, // Low similarity
      };

      Experience.aggregate.mockResolvedValue([mockLowSimilarityExperience]);

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.evaluation).toContain('Good ownership example');
      expect(data.matchedExperience).toBeNull();
      expect(data.suggestedUpdate).toBeNull();
    });

    it('handles vector search failures gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Leadership question',
          answer: 'Leadership answer',
        },
      });

      openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '## Evaluation\n\nGood answer.\n\n**Rating: 8/10**'
          }
        }]
      });

      openai.embeddings.create.mockRejectedValue(new Error('Embedding failed'));

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.evaluation).toContain('Good answer');
      expect(data.matchedExperience).toBeNull();
      expect(data.suggestedUpdate).toBeNull();
    });

    it('handles OpenAI evaluation errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Test question',
          answer: 'Test answer',
        },
      });

      openai.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Internal server error');
      expect(data.error).toBe('OpenAI API error');
    });

    it('handles database connection errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Test question',
          answer: 'Test answer',
        },
      });

      // Mock DB connect to fail for this test
      const dbConnect = require('../lib/dbConnect');
      dbConnect.mockRejectedValueOnce(new Error('Database connection failed'));

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Internal server error');
      expect(data.error).toBe('Database connection failed');
    });

    it('handles empty experience search results', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Unique question',
          answer: 'Completely unique answer with no matches',
        },
      });

      openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '## Evaluation\n\nUnique answer worth adding.\n\n**Rating: 8/10**'
          }
        }]
      });

      openai.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      Experience.aggregate.mockResolvedValue([]); // No similar experiences

      await evaluateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.evaluation).toContain('Unique answer worth adding');
      expect(data.matchedExperience).toBeNull();
      expect(data.suggestedUpdate).toBeNull();
    });
  });
}); 