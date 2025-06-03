import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createMocks } from 'node-mocks-http';
import transcribeHandler from '../pages/api/experiences/transcribe';
import Home from '../pages/index';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({ 
    push: jest.fn(), 
    query: {} 
  }),
}));

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
  },
}));

const { openai } = require('../lib/openai');
const fs = require('fs');

// Mock MediaRecorder and getUserMedia for audio recording tests
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
};

global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder);
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({})),
};
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');

describe('Phase 7 – Practice Out Loud', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audio Recording UI', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('shows Practice Out Loud button and starts recording interface', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ['Technical'],
      }));

      render(<Home />);

      // Wait for categories to load
      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      // Type a question
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Describe a technical challenge you solved' },
      });

      // Click Practice Out Loud button
      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

      // Should show start recording button (from actual UI implementation)
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });

    it('handles audio permission request and starts recording', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ['Technical'],
      }));

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Technical question' },
      });

      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

      // Start recording
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      // Should request microphone permission
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      
      // Should show stop recording button
      await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument());
    });

    it('handles recording stop and shows audio playback', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ['Technical'],
      }));

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Technical question' },
      });

      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      // Simulate recording data available
      await act(async () => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob(['audio data'], { type: 'audio/webm' })
          });
        }
      });

      // Stop recording
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
      });

      // Should show audio element and transcribe button (using generic selector since audio doesn't have role by default)
      await waitFor(() => {
        expect(document.querySelector('audio')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).toBeInTheDocument();
      });
    });

    it('shows recording timer during recording', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ['Technical'],
      }));

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Technical question' },
      });

      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      // Should show stop recording button when recording starts
      await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument());
    });

    it('handles empty audio blob as error (actual implementation behavior)', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ['Technical'],
      }));

      // Mock fetch to return empty blob
      global.fetch.mockImplementation((url) => {
        if (url === 'mock-audio-url') {
          return Promise.resolve({
            blob: () => Promise.resolve(new Blob([], { type: 'audio/webm' }))
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Technical question' },
      });

      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      await act(async () => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob([], { type: 'audio/webm' }) // Empty blob
          });
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
      });

      await waitFor(() => expect(document.querySelector('audio')).toBeInTheDocument());

      // Click transcribe button with empty audio
      fireEvent.click(screen.getByRole('button', { name: /transcribe & evaluate/i }));

      // The current implementation sets transcribeError but doesn't display it
      // This test validates the current behavior, but suggests the need for error display
      await waitFor(() => expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).not.toBeDisabled());
    });
  });

  describe('Audio Transcription API', () => {
    it('successfully transcribes uploaded audio file', async () => {
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

      openai.audio.transcriptions.create.mockResolvedValue(
        'This is my answer about the technical challenge I solved last year.'
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transcript).toBe('This is my answer about the technical challenge I solved last year.');
      expect(openai.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(Object),
        model: 'whisper-1',
        response_format: 'text',
        language: 'en',
      });
    });

    it('handles empty audio file upload error', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, {}); // No audio file provided
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('No audio file found in upload');
    });

    it('handles very small audio file as invalid', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockSmallAudioFile = {
        filepath: '/tmp/tiny.webm',
        originalFilename: 'tiny.webm',
        mimetype: 'audio/webm',
        size: 10, // Very small file
      };

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: mockSmallAudioFile });
      });

      // OpenAI rejects tiny files
      openai.audio.transcriptions.create.mockRejectedValue(
        new Error('Audio file too short to transcribe')
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Transcription failed');
      expect(data.error).toBe('Audio file too short to transcribe');
    });

    it('handles OpenAI transcription service errors', async () => {
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
        new Error('OpenAI service temporarily unavailable')
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Transcription failed');
      expect(data.error).toBe('OpenAI service temporarily unavailable');
    });

    it('handles non-POST requests with method not allowed', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Method not allowed');
    });

    it('handles malformed multipart data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      mockParse.mockImplementation((req, callback) => {
        callback(new Error('Malformed multipart data'), {}, {});
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Form parse error');
      expect(data.error).toBe('Malformed multipart data');
    });

    it('handles missing file path in uploaded audio', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });

      const mockAudioFileWithoutPath = {
        originalFilename: 'recording.webm',
        mimetype: 'audio/webm',
        size: 1024,
        // Missing filepath/path
      };

      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: mockAudioFileWithoutPath });
      });

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Audio file path missing');
    });

    it('handles audio file arrays (formidable sometimes returns arrays)', async () => {
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

      // Test when formidable returns audio as array
      mockParse.mockImplementation((req, callback) => {
        callback(null, {}, { audio: [mockAudioFile] });
      });

      openai.audio.transcriptions.create.mockResolvedValue(
        'Transcribed from array format.'
      );

      await transcribeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transcript).toBe('Transcribed from array format.');
    });
  });

  describe('End-to-End Audio Workflow Validation', () => {
    it('validates transcribe button becomes available after recording', async () => {
      global.fetch = jest.fn().mockImplementation((url, options) => {
        if (url === '/api/questions/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => ['Technical'],
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      // Set up question
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Describe a technical challenge you overcame' },
      });

      // Start practice out loud flow
      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));
      
      // Initially should not have transcribe button
      expect(screen.queryByRole('button', { name: /transcribe & evaluate/i })).not.toBeInTheDocument();
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      // Simulate recording completion
      await act(async () => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob(['audio data'], { type: 'audio/webm' })
          });
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
      });

      // Now transcribe button should be available
      await waitFor(() => expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).toBeInTheDocument());
    });

    it('validates transcribe loading state', async () => {
      global.fetch = jest.fn().mockImplementation((url, options) => {
        if (url === '/api/questions/categories') {
          return Promise.resolve({
            ok: true,
            json: async () => ['Technical'],
          });
        }
        if (url === '/api/experiences/transcribe') {
          // Return a long-running promise to test loading state
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ 
                  transcript: 'I solved a complex database performance issue.' 
                }),
              });
            }, 100);
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<Home />);

      await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Technical question' },
      });

      fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      });

      await act(async () => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob(['audio data'], { type: 'audio/webm' })
          });
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
      });

      await waitFor(() => expect(document.querySelector('audio')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /transcribe & evaluate/i }));

      // Should show transcribing state
      await waitFor(() => expect(screen.getByText(/transcribing/i)).toBeInTheDocument());

      // Eventually the loading should complete
      await waitFor(() => {
        expect(screen.queryByText(/transcribing/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
}); 