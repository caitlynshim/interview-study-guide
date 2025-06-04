import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createMocks } from 'node-mocks-http';
import formatStarHandler from '../pages/api/experiences/format-star';
import Home from '../pages/index';

// Mock next/router
const mockRouter = { push: jest.fn() };
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }) {
    return <div>{children}</div>;
  };
});

// Mock diff
jest.mock('diff', () => ({
  diffLines: jest.fn(() => []),
}));

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('../lib/openai', () => ({
  openai: mockOpenAI,
}));

describe('STAR Formatting Feature', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API /api/experiences/format-star', () => {
    it('successfully formats experience content in STAR format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about a leadership challenge you faced',
          content: 'Last year I had to lead a team of 5 developers on a critical project. The deadline was tight and we had technical challenges. I organized daily standups, delegated tasks based on expertise, and worked extra hours to help the team. We delivered on time and the client was very satisfied.',
        },
      });

      const formattedContent = `**Situation:** Last year I was assigned to lead a team of 5 developers on a critical project with a tight deadline and significant technical challenges.

**Task:** I needed to organize the team effectively, ensure we met the tight deadline, and overcome the technical obstacles while maintaining team morale and code quality.

**Action:** I implemented daily standups to track progress and identify blockers early. I carefully delegated tasks based on each developer's expertise and strengths. When technical challenges arose, I worked extra hours alongside the team to help solve problems and provide guidance.

**Result:** We successfully delivered the project on time, and the client was very satisfied with the quality of our work. The team felt supported throughout the process, and we strengthened our working relationships.`;

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: formattedContent
          }
        }]
      });

      await formatStarHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.formattedContent).toBe(formattedContent);
      expect(data.originalContent).toBe('Last year I had to lead a team of 5 developers on a critical project. The deadline was tight and we had technical challenges. I organized daily standups, delegated tasks based on expertise, and worked extra hours to help the team. We delivered on time and the client was very satisfied.');
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach helping candidates structure their experiences using the STAR method. Always preserve all details and keep responses in clear narrative format.'
          },
          {
            role: 'user',
            content: expect.stringContaining('Please reformat the following experience into a clear, well-structured narrative using STAR format')
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
    });

    it('handles missing content with 400 error', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about a challenge',
          content: '',
        },
      });

      await formatStarHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Content is required');
    });

    it('handles non-POST requests with 405 error', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await formatStarHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Method not allowed');
    });

    it('handles OpenAI API errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about a challenge',
          content: 'Sample content for testing error handling',
        },
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI service temporarily unavailable')
      );

      await formatStarHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Failed to format experience in STAR format');
      expect(data.error).toBe('OpenAI service temporarily unavailable');
    });

    it('handles empty OpenAI response', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          question: 'Tell me about a challenge',
          content: 'Sample content for testing',
        },
      });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      await formatStarHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Failed to format experience in STAR format');
      expect(data.error).toBe('No formatted content received from OpenAI');
    });
  });

  describe('UI Integration for STAR Formatting', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows STAR formatting option during write-in workflow', async () => {
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
              evaluation: '## Evaluation\n\nGood answer.',
              matchedExperience: null,
              suggestedUpdate: null,
            }),
          });
        }
        if (url === '/api/experiences/format-star') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              formattedContent: '**Situation:** Test situation\n**Task:** Test task\n**Action:** Test action\n**Result:** Test result',
              originalContent: 'I led a team through a difficult project with tight deadlines.'
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

      // Enter a question
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/enter your own question/i), {
          target: { value: 'Describe a leadership challenge' },
        });
      });

      // Start write-in workflow
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
      });

      // Enter an answer
      const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: 'I led a team through a difficult project with tight deadlines.' },
        });
      });

      // Submit for evaluation
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
      });

      // Wait for evaluation to complete
      await waitFor(() => expect(screen.getByText(/good answer/i)).toBeInTheDocument());

      // Should show Add Experience button
      expect(screen.getByRole('button', { name: /add experience/i })).toBeInTheDocument();

      // Click Add Experience
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /add experience/i }));
      });

      // Verify STAR formatting API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/experiences/format-star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Describe a leadership challenge',
            content: 'I led a team through a difficult project with tight deadlines.'
          }),
        });
      });

      // Verify router.push was called with formatted content
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith({
          pathname: '/add-experience',
          query: {
            title: 'Describe a leadership challenge',
            content: '**Situation:** Test situation\n**Task:** Test task\n**Action:** Test action\n**Result:** Test result'
          },
        });
      });
    });

    it('handles STAR formatting errors gracefully', async () => {
      // Mock fetch to simulate formatting error
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
              evaluation: '## Evaluation\n\nGood answer.',
              matchedExperience: null,
              suggestedUpdate: null,
            }),
          });
        }
        if (url === '/api/experiences/format-star') {
          return Promise.resolve({
            ok: false,
            json: async () => ({
              message: 'OpenAI service temporarily unavailable'
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
          target: { value: 'Describe a challenge' },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /write-in answer/i }));
      });

      const textarea = screen.getByPlaceholderText(/paste or write your answer here/i);
      await act(async () => {
        fireEvent.change(textarea, {
          target: { value: 'Test answer content' },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit for evaluation/i }));
      });

      await waitFor(() => expect(screen.getByText(/good answer/i)).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /add experience/i }));
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to format experience/i)).toBeInTheDocument();
      });

      // Button should return to normal state
      expect(screen.getByRole('button', { name: /add experience/i })).toBeInTheDocument();
    });
  });
});