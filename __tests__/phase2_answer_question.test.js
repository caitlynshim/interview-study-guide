import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
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

/**
 * Helper to create a fetch mock that returns responses based on URL pattern.
 */
function createFetchMock({ categories = ['Technical'], randomQuestion, generateAnswer, errorGenerate } = {}) {
  return jest.fn(async (url, opts) => {
    if (url.startsWith('/api/questions/categories')) {
      return {
        ok: true,
        json: async () => categories,
      };
    }
    if (url.startsWith('/api/questions/random')) {
      if (!randomQuestion) throw new Error('randomQuestion response not provided');
      return {
        ok: true,
        json: async () => randomQuestion,
      };
    }
    if (url.startsWith('/api/experiences/generate')) {
      if (errorGenerate) {
        return { ok: false, json: async () => ({ message: 'Failed to generate' }) };
      }
      return {
        ok: true,
        json: async () => ({ answer: generateAnswer }),
      };
    }
    throw new Error(`Unhandled fetch URL in mock: ${url}`);
  });
}

describe('Phase 2 - Answer a Question', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset fetch mock
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  });

  it('loads random question when button clicked', async () => {
    // Mock fetch for categories and random question
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical', 'Behavioral'],
        });
      }
      if (url.includes('/api/questions/random')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            question: 'Tell me about a time you solved a difficult problem',
            category: 'Behavioral',
            difficulty: 'Medium',
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    // Wait for categories to load
    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Click random question button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /random question/i }));
    });

    // Verify question loads
    await waitFor(() => {
      expect(screen.getByText('Tell me about a time you solved a difficult problem')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/questions/random', expect.any(Object));
  });

  it('disables generate button with empty question', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Technical'],
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    const generateButton = screen.getByRole('button', { name: /generate answer/i });
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when question is present', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    await act(async () => {
      render(<Home />);
    });

    await waitFor(() => expect(screen.getByText('Technical')).toBeInTheDocument());

    // Enter a custom question
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'What is your greatest strength?' },
      });
    });

    const generateButton = screen.getByRole('button', { name: /generate answer/i });
    expect(generateButton).toBeEnabled();
  });

  it('shows loading spinner during answer generation', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/questions/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => ['Technical'],
        });
      }
      if (url === '/api/experiences/generate') {
        // Simulate delay
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                answer: 'This is a generated answer...',
                context: [],
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

    // Enter a question
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
        target: { value: 'Test question' },
      });
    });

    // Click generate
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));
    });

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    // Wait for answer to appear
    await waitFor(() => {
      expect(screen.getByText('This is a generated answer...')).toBeInTheDocument();
    });
  });

  it('does not generate answer when Generate pressed without question', async () => {
    global.fetch = createFetchMock();
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    // Wait briefly and assert that spinner or answer not shown
    await waitFor(() => {
      expect(screen.queryByText(/Generating answer/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  it('displays spinner then markdown answer on successful generation', async () => {
    const questionObj = { question: 'Explain CAP theorem', category: 'Technical', difficulty: 'Hard' };
    global.fetch = createFetchMock({
      randomQuestion: questionObj,
      generateAnswer: '### Sample Answer\nConsistency, Availability, Partition Tolerance...'
    });

    render(<Home />);

    // Load random question
    fireEvent.click(screen.getByRole('button', { name: /get random question/i }));
    await screen.findByText(/Explain CAP theorem/);

    // Generate answer
    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    // Spinner appears
    expect(await screen.findByText(/Generating answer/)).toBeInTheDocument();

    // Answer appears after fetch resolves
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sample answer/i })).toBeInTheDocument();
    });

    // Reset button should now be visible
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();

    // Click reset and answer should disappear
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /sample answer/i })).not.toBeInTheDocument();
    });
  });

  it('handles API failure gracefully (no answer rendered)', async () => {
    const questionObj = { question: 'Explain CAP theorem', category: 'Technical', difficulty: 'Hard' };
    global.fetch = createFetchMock({ randomQuestion: questionObj, errorGenerate: true });

    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /get random question/i }));
    await screen.findByText(/Explain CAP theorem/);

    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });
}); 