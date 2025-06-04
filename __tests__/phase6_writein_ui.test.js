import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Home from '../pages/index';

// Mock react-markdown before any other imports
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

// Mock next/router
const mockRouter = { push: jest.fn() };
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock diff
jest.mock('diff', () => ({
  diffLines: jest.fn(() => []),
}));

describe('Phase 6 - Write-in Answer & Evaluation UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  });

  it('displays write-in answer textarea when write-in workflow is started', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Technical'],
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Enter a question first
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Describe a challenging project' },
      });
    });

    // Start write-in workflow
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    // Should show textarea for answer input
    expect(screen.getByPlaceholderText(/paste or write your answer here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for evaluation/i })).toBeInTheDocument();
  });

  it('submits answer for evaluation and displays feedback', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
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
            evaluation: '## Evaluation\n\nGood answer with specific examples. Consider adding more metrics.',
            matchedExperience: null,
            suggestedUpdate: null,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Enter question
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Tell me about a successful project' },
      });
    });

    // Start write-in workflow
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    // Enter answer
    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'I led a team of 5 engineers to deliver a critical API service that improved response times by 40%.' },
      });
    });

    // Submit for evaluation
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
    });

    // Wait for evaluation to appear
    await waitFor(() => {
      expect(screen.getByText(/good answer with specific examples/i)).toBeInTheDocument();
    });

    // Should show Add Experience button
    expect(screen.getByRole('button', { name: /add experience/i })).toBeInTheDocument();
  });

  it('shows matched experience when similarity threshold is met', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
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
            evaluation: '## Evaluation\n\nSolid answer.',
            matchedExperience: {
              _id: 'exp123',
              title: 'API Performance Optimization',
              content: 'I optimized our API to improve response times by 35%.',
              metadata: { category: 'Technical' }
            },
            suggestedUpdate: 'I led a team of 5 engineers to deliver a critical API service that improved response times by 40%, building on my previous optimization work that achieved 35% improvement.',
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Tell me about API optimization' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'I improved API response times by 40%.' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
    });

    // Should show matched experience section
    await waitFor(() => {
      expect(screen.getByText(/similar experience found/i)).toBeInTheDocument();
      expect(screen.getByText('API Performance Optimization')).toBeInTheDocument();
    });

    // Should show Update Experience button
    expect(screen.getByRole('button', { name: /update experience/i })).toBeInTheDocument();
  });

  it('handles evaluation errors gracefully', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      if (url === '/api/experiences/evaluate') {
        return Promise.resolve({
          ok: false,
          json: async () => ({
            message: 'Evaluation service temporarily unavailable',
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Test question' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'Test answer' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/evaluation service temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it('navigates to add experience with pre-filled content', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
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
            evaluation: '## Evaluation\n\nGood answer.',
            matchedExperience: null,
            suggestedUpdate: null,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Describe a leadership challenge' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'I led a team through a difficult project.' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
    });

    await waitFor(() => expect(screen.getByText(/good answer/i)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add experience/i }));
    });

    // Should navigate to add experience page with pre-filled content
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/add-experience',
      query: {
        title: 'Describe a leadership challenge',
        content: 'I led a team through a difficult project.',
      },
    });
  });

  it('resets form when starting new write-in workflow', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Technical'],
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'First question' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    let textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'First answer' },
      });
    });

    // Change question
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Second question' },
      });
    });

    // Start new write-in workflow
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    // Textarea should be cleared
    textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    expect(textarea.value).toBe('');
  });

  it('shows loading state during evaluation', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      if (url === '/api/experiences/evaluate') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                evaluation: '## Evaluation\n\nGood answer.',
                matchedExperience: null,
                suggestedUpdate: null,
              }),
            });
          }, 100);
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Test question' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'Test answer' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
    });

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/evaluating/i)).toBeInTheDocument();
    });

    // Wait for evaluation to complete
    await waitFor(() => {
      expect(screen.getByText(/good answer/i)).toBeInTheDocument();
    });
  });

  it('validates answer input before submission', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Technical'],
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Test question' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
    });

    // Submit button should be disabled with empty answer
    const submitButton = screen.getByRole('button', { name: /submit for evaluation/i });
    expect(submitButton).toBeDisabled();

    // Enter answer
    const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: 'Now I have an answer' },
      });
    });

    // Submit button should be enabled
    expect(submitButton).toBeEnabled();
  });
}); 