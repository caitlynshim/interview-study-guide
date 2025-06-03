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

describe('Phase 6 – Write-in Answer UI', () => {
  let mockMediaRecorder;

  beforeEach(() => {
    // Mock MediaRecorder with proper state synchronization
    mockMediaRecorder = {
      start: jest.fn().mockImplementation(function() {
        this.state = 'recording';
        // Trigger DOM update synchronously
        setTimeout(() => {
          if (this.onstart) this.onstart();
        }, 0);
      }),
      stop: jest.fn().mockImplementation(function() {
        this.state = 'inactive';
        // Trigger DOM update synchronously
        setTimeout(() => {
          if (this.onstop) this.onstop();
        }, 0);
      }),
      ondataavailable: null,
      onstop: null,
      onstart: null,
      state: 'inactive',
    };

    global.MediaRecorder = jest.fn(() => mockMediaRecorder);
    global.MediaRecorder.isTypeSupported = jest.fn(() => true);

    // Mock navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn(() => Promise.resolve({
          getTracks: () => [{ stop: jest.fn() }]
        })),
      },
      writable: true,
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock fetch for categories - ensure this is set before each test
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows write-in textarea when button clicked with custom question', async () => {
    // 1st fetch: categories
    mockFetchSequence([
      {
        ok: true,
        json: async () => ['Leadership', 'Ownership'],
      },
    ]);

    render(<Home />);

    // Wait for categories to load
    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument());

    // Type a custom question
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Tell me about a time you led without authority' },
    });

    // Click Write-in answer button
    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    // Textarea should appear
    expect(
      screen.getByPlaceholderText(/paste or write your answer here/i)
    ).toBeInTheDocument();
  });

  it('shows evaluation results after submitting write-in answer', async () => {
    mockFetchSequence([
      {
        ok: true,
        json: async () => ['Leadership'],
      },
      {
        ok: true,
        json: async () => ({
          evaluation: '## Evaluation\n\nGood answer with specific examples.\n\n**Rating: 8/10**',
          matchedExperience: null,
          suggestedUpdate: null,
        }),
      },
    ]);

    render(<Home />);

    // Wait for categories and set up question
    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument());
    
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Describe a leadership challenge' },
    });

    // Click Write-in answer button
    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    // Fill in the answer
    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    fireEvent.change(textarea, {
      target: { value: 'I led a cross-functional team to deliver a critical project ahead of schedule.' },
    });

    // Submit for evaluation
    fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));

    // Should show loading state
    await waitFor(() => expect(screen.getByText(/evaluating/i)).toBeInTheDocument());

    // Should show evaluation results
    await waitFor(() => expect(screen.getByText(/good answer with specific examples/i)).toBeInTheDocument());
    expect(screen.getByText(/rating: 8\/10/i)).toBeInTheDocument();
  });

  it('shows practice out loud recording interface', async () => {
    mockFetchSequence([
      {
        ok: true,
        json: async () => ['Technical'],
      },
    ]);

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Type a question
    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Explain a technical architecture decision' },
    });

    // Click Practice Out Loud button
    fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

    // Should show start recording button
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('handles audio recording start and stop flow', async () => {
    // Enhanced fetch mock for this specific test
    global.fetch = jest.fn().mockImplementation((url) => {
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

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Technical question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));

    // Start recording with proper state update
    await act(async () => {
      const startButton = screen.getByRole('button', { name: /start recording/i });
      fireEvent.click(startButton);
      
      // Wait for the async getUserMedia and MediaRecorder setup
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should show stop recording button
    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument());

    // Simulate recording completion and stop
    await act(async () => {
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      fireEvent.click(stopButton);
      
      // Wait for the onstop callback to be triggered
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should show audio element after recording stops
    await waitFor(() => expect(document.querySelector('audio')).toBeInTheDocument());
  });

  it('handles transcription and evaluation flow', async () => {
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
          json: async () => ({ transcript: 'I designed a microservices architecture that improved system scalability.' }),
        });
      }
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            evaluation: '## Evaluation\n\nExcellent technical answer.\n\n**Rating: 9/10**',
            matchedExperience: null,
            suggestedUpdate: null,
          }),
        });
      }
      // Mock the blob conversion step
      if (url === 'blob:mock-url') {
        return Promise.resolve({
          blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/webm' }))
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Technical architecture question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /practice out loud/i }));
    
    await act(async () => {
      const startButton = screen.getByRole('button', { name: /start recording/i });
      fireEvent.click(startButton);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate recording completion
    await act(async () => {
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      fireEvent.click(stopButton);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Wait for audio element to appear (means recording finished)
    await waitFor(() => expect(document.querySelector('audio')).toBeInTheDocument());

    // Find and click the transcribe button
    const transcribeButton = screen.getByRole('button', { name: /transcribe & evaluate/i });
    fireEvent.click(transcribeButton);

    // Should show transcribing state
    await waitFor(() => expect(screen.getByText(/transcribing/i)).toBeInTheDocument());

    // Wait for transcript to appear first
    await waitFor(() => expect(screen.getByText(/I designed a microservices architecture/i)).toBeInTheDocument(), { timeout: 3000 });

    // Now find and click the separate "Evaluate" button that appears after transcription
    const evaluateButton = screen.getByRole('button', { name: /^evaluate$/i });
    fireEvent.click(evaluateButton);

    // Should eventually show evaluation results
    await waitFor(() => expect(screen.getByText(/excellent technical answer/i)).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/rating: 9\/10/i)).toBeInTheDocument();
  });

  it('handles matched experience with suggested update', async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Leadership'],
        });
      }
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            evaluation: '## Evaluation\n\nGood answer with room for improvement.',
            matchedExperience: {
              _id: '123',
              title: 'Leadership Experience',
              content: 'Original leadership story...',
            },
            suggestedUpdate: {
              title: 'Leadership Experience',
              content: 'Enhanced leadership story with new insights...',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Leadership question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    fireEvent.change(textarea, {
      target: { value: 'Similar leadership experience with new details.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));

    // Should show matched experience prompt
    await waitFor(() => expect(screen.getByText(/this answer matches an existing experience/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /edit existing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue new/i })).toBeInTheDocument();
  });

  it('handles no matched experience found', async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Ownership'],
        });
      }
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            evaluation: '## Evaluation\n\nUnique experience worth adding.',
            matchedExperience: null,
            suggestedUpdate: null,
          }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Ownership')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Ownership question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    fireEvent.change(textarea, {
      target: { value: 'Completely new ownership experience.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));

    // Should show no match prompt
    await waitFor(() => expect(screen.getByText(/no similar experience found/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /add experience/i })).toBeInTheDocument();
  });

  it('prevents submission with empty answer', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Leadership'],
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Leadership')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Test question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    // Submit button should be disabled when answer is empty
    const submitButton = screen.getByRole('button', { name: /submit for evaluation/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows reset button after evaluation', async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            evaluation: '## Evaluation\n\nGood technical answer.',
            matchedExperience: null,
            suggestedUpdate: null,
          }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    render(<Home />);

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
      target: { value: 'Technical question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    fireEvent.change(textarea, {
      target: { value: 'Technical answer' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));

    await waitFor(() => expect(screen.getByText(/good technical answer/i)).toBeInTheDocument());

    // Reset button should appear
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();

    // Click reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    // Write-in area should be hidden
    expect(screen.queryByPlaceholderText(/paste or write your answer here/i)).not.toBeInTheDocument();
  });
});

// Helper to create mock fetch implementation per call sequence
function mockFetchSequence(responses) {
  global.fetch = jest.fn();
  responses.forEach((resp, idx) => {
    global.fetch.mockImplementationOnce(() => Promise.resolve(resp));
  });
} 