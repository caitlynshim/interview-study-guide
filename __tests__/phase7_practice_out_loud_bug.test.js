import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Home from '../pages/index';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({ 
    push: jest.fn(), 
    query: {} 
  }),
}));

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

describe('Phase 7 Practice Out Loud - Transcription Display Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for different endpoints
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      
      if (url === '/api/experiences/transcribe') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            transcript: 'This is my transcribed answer about solving a technical challenge.' 
          }),
        });
      }
      
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            evaluation: '## Evaluation\n\nGood answer with specific details.',
            suggestedUpdate: null,
            matchedExperience: null
          }),
        });
      }
      
      if (url === 'mock-audio-url') {
        return Promise.resolve({
          blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/webm' }))
        });
      }
      
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
  });

  it('should display transcript after successful transcription', async () => {
    render(<Home />);

    // Wait for categories to load
    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Set up a question
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Describe a technical challenge you solved' },
    });

    // Start practice out loud workflow
    fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

    // Start recording
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

    // Should show audio element and transcribe button
    await waitFor(() => {
      expect(document.querySelector('audio')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).toBeInTheDocument();
    });

    // Click transcribe button
    fireEvent.click(screen.getByRole('button', { name: /transcribe & evaluate/i }));

    // Should show loading state
    await waitFor(() => expect(screen.getByText(/transcribing/i)).toBeInTheDocument());

    // Should show transcript after transcription completes
    await waitFor(() => {
      expect(screen.queryByText(/transcribing/i)).not.toBeInTheDocument();
      // Find the transcript text (case-insensitive and flexible matching)
      const transcriptText = screen.queryByText(/this is my transcribed answer/i) || 
                            screen.queryByText(/transcribed answer about solving/i) ||
                            screen.queryByText(/solving a technical challenge/i);
      expect(transcriptText).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('should show evaluation option after transcription is displayed', async () => {
    render(<Home />);

    // Wait for categories to load
    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Set up a question
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Describe a technical challenge you solved' },
    });

    // Complete the recording and transcription workflow
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

    await waitFor(() => expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /transcribe & evaluate/i }));

    // After transcription, should show transcript and evaluation button
    await waitFor(() => {
      // Transcript should be visible
      expect(screen.getByText(/this is my transcribed answer about solving a technical challenge/i)).toBeInTheDocument();
      
      // Should have an "Evaluate" button to proceed with evaluation
      expect(screen.getByRole('button', { name: /evaluate/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should complete full workflow: record → transcribe → evaluate', async () => {
    render(<Home />);

    // Wait for categories to load
    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Set up question and complete full workflow
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Describe a technical challenge you solved' },
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

    // Transcribe
    await waitFor(() => expect(screen.getByRole('button', { name: /transcribe & evaluate/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /transcribe & evaluate/i }));

    // Wait for transcript to appear
    await waitFor(() => {
      expect(screen.getByText(/this is my transcribed answer about solving a technical challenge/i)).toBeInTheDocument();
    });

    // Click evaluate button
    const evaluateButton = screen.getByRole('button', { name: /evaluate/i });
    fireEvent.click(evaluateButton);

    // Should show evaluation loading
    await waitFor(() => expect(screen.getByText(/evaluating/i)).toBeInTheDocument());

    // Should show final evaluation
    await waitFor(() => {
      expect(screen.queryByText(/evaluating/i)).not.toBeInTheDocument();
      expect(screen.getByText(/good answer with specific details/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
}); 