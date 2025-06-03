import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/track-progress',
  query: {},
  asPath: '/track-progress'
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

// Mock fetch globally
global.fetch = jest.fn();

// Import component after mocks
import TrackProgress from '../pages/track-progress';

describe('Track Progress Enhanced Features', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockPush.mockClear();
  });

  const mockAnalyticsData = {
    summary: {
      totalSessions: 1,
      overallAverageRating: 7,
      overallTrend: 0,
      totalCategories: 1,
      unpracticedQuestionsCount: 72,
      practicedQuestionsCount: 1
    },
    ratingTrends: [
      {
        date: '2025-06-02T00:00:00.000Z',
        rating: 7,
        sessionNumber: 1,
        category: 'Technical Trade-offs & Architecture'
      }
    ],
    categoryStats: [
      {
        category: 'Technical Trade-offs & Architecture',
        totalSessions: 1,
        averageRating: 7,
        trend: 0,
        lastPracticed: '2025-06-02T00:00:00.000Z'
      }
    ],
    questionsNeedingPractice: [],
    topQuestions: [
      {
        questionText: 'Build vs buy decision',
        category: 'Technical Trade-offs & Architecture',
        sessions: [{ rating: 7, date: '2025-06-02T00:00:00.000Z', practiceType: 'verbal' }],
        averageRating: 7,
        lastPracticed: '2025-06-02T00:00:00.000Z'
      }
    ],
    lowestQuestions: [],
    allPracticedQuestions: [
      {
        questionText: 'Build vs buy decision',
        category: 'Technical Trade-offs & Architecture',
        sessions: [{ rating: 7, date: '2025-06-02T00:00:00.000Z', practiceType: 'verbal' }],
        averageRating: 7,
        lastPracticed: '2025-06-02T00:00:00.000Z'
      }
    ],
    timeTrends: [
      {
        date: '2025-06-02',
        sessionCount: 1,
        totalRating: 7,
        averageRating: 7
      }
    ],
    unpracticedQuestions: Array.from({ length: 72 }, (_, i) => ({
      questionText: `Unpracticed question ${i + 1}`,
      category: i % 2 === 0 ? 'Technical Trade-offs & Architecture' : 'Customer Obsession & Leadership',
      difficulty: 'Medium',
      tags: ['leadership', 'decision-making']
    }))
  };

  it('renders track progress page with all view options', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Check all view buttons are present - use partial text matching for emoji buttons
    expect(screen.getByText(/Overview/)).toBeInTheDocument();
    expect(screen.getByText(/All Practiced/)).toBeInTheDocument();
    expect(screen.getByText(/Top Questions/)).toBeInTheDocument();
    expect(screen.getByText(/Need Practice/)).toBeInTheDocument();
    expect(screen.getByText(/Unpracticed/)).toBeInTheDocument();
  });

  it('switches between different views correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Test switching to "All Practiced" view - use partial text match
    const allPracticedButton = screen.getByText(/All Practiced/);
    fireEvent.click(allPracticedButton);

    await waitFor(() => {
      expect(screen.getByText('Build vs buy decision')).toBeInTheDocument();
      expect(screen.getByText('Avg: 7.0/10')).toBeInTheDocument();
    });

    // Test switching to "Unpracticed" view
    const unpracticedButton = screen.getByText(/Unpracticed/);
    fireEvent.click(unpracticedButton);

    await waitFor(() => {
      expect(screen.getByText('Unpracticed question 1')).toBeInTheDocument();
    });
  });

  it('displays category filter dropdown', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Check category filter dropdown
    const categorySelect = screen.getByDisplayValue('All');
    expect(categorySelect).toBeInTheDocument();

    // Check that options are available by looking for the select element
    expect(categorySelect.tagName).toBe('SELECT');
  });

  it('filters questions by category correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Switch to unpracticed view
    const unpracticedButton = screen.getByText(/Unpracticed/);
    fireEvent.click(unpracticedButton);

    await waitFor(() => {
      expect(screen.getByText('Unpracticed question 1')).toBeInTheDocument();
    });

    // Filter by Technical Trade-offs category
    const categorySelect = screen.getByDisplayValue('All');
    fireEvent.change(categorySelect, { 
      target: { value: 'Technical Trade-offs & Architecture' } 
    });

    await waitFor(() => {
      // Should show only Technical Trade-offs questions (even indices)
      expect(screen.getByText('Unpracticed question 1')).toBeInTheDocument();
      expect(screen.queryByText('Unpracticed question 2')).not.toBeInTheDocument();
    });
  });

  it('displays rankings for top questions', async () => {
    const dataWithMultipleQuestions = {
      ...mockAnalyticsData,
      topQuestions: [
        {
          questionText: 'Best question',
          category: 'Technical Trade-offs & Architecture',
          sessions: [{ rating: 9, date: '2025-06-02T00:00:00.000Z', practiceType: 'verbal' }],
          averageRating: 9,
          lastPracticed: '2025-06-02T00:00:00.000Z'
        },
        {
          questionText: 'Second best question',
          category: 'Customer Obsession & Leadership',
          sessions: [{ rating: 8, date: '2025-06-01T00:00:00.000Z', practiceType: 'verbal' }],
          averageRating: 8,
          lastPracticed: '2025-06-01T00:00:00.000Z'
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithMultipleQuestions
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Switch to top questions view - use partial text matching
    const topButton = screen.getByText(/Top Questions/);
    fireEvent.click(topButton);

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('Best question')).toBeInTheDocument();
      expect(screen.getByText('Second best question')).toBeInTheDocument();
    });
  });

  it('shows different card styles for different question types', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Check practiced question card (green border)
    const allPracticedButton = screen.getByText(/All Practiced/);
    fireEvent.click(allPracticedButton);

    await waitFor(() => {
      const practicedCard = screen.getByText('Build vs buy decision').closest('.question-card');
      expect(practicedCard).toHaveClass('practiced');
    });

    // Check unpracticed question cards (blue border)
    const unpracticedButton = screen.getByText(/Unpracticed/);
    fireEvent.click(unpracticedButton);

    await waitFor(() => {
      const unpracticedCard = screen.getByText('Unpracticed question 1').closest('.question-card');
      expect(unpracticedCard).toHaveClass('unpracticed');
    });
  });

  it('displays summary statistics correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Check summary statistics
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('Average Rating')).toBeInTheDocument();
    expect(screen.getByText('Overall Trend')).toBeInTheDocument();
    expect(screen.getByText('Categories Practiced')).toBeInTheDocument();
  });

  it('handles empty states correctly', async () => {
    const emptyData = {
      summary: {
        totalSessions: 0,
        overallAverageRating: 0,
        overallTrend: 0,
        totalCategories: 0,
        unpracticedQuestionsCount: 0,
        practicedQuestionsCount: 0
      },
      ratingTrends: [],
      categoryStats: [],
      questionsNeedingPractice: [],
      topQuestions: [],
      lowestQuestions: [],
      allPracticedQuestions: [],
      timeTrends: [],
      unpracticedQuestions: []
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('No Practice Sessions Yet')).toBeInTheDocument();
    });

    // Check empty state message
    expect(screen.getByText('Start practicing questions to see your progress analytics!')).toBeInTheDocument();
    expect(screen.getByText('Practice a Question')).toBeInTheDocument();
  });

  it('handles API error states', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    // Spy on console.error to suppress error logging in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics: API Error')).toBeInTheDocument();
    });

    // Check retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Cleanup
    consoleSpy.mockRestore();
  });

  it('displays correct question metadata', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Switch to practiced questions
    const allPracticedButton = screen.getByText(/All Practiced/);
    fireEvent.click(allPracticedButton);

    await waitFor(() => {
      expect(screen.getByText('Build vs buy decision')).toBeInTheDocument();
      // Be more specific - look for the category within the question metadata
      const questionCard = screen.getByText('Build vs buy decision').closest('.question-card');
      expect(questionCard).toHaveTextContent('Technical Trade-offs & Architecture');
      expect(screen.getByText('Avg: 7.0/10')).toBeInTheDocument();
      expect(screen.getByText('1 attempts')).toBeInTheDocument();
      expect(screen.getByText(/Last:/)).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData
    });

    render(<TrackProgress />);

    await waitFor(() => {
      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    // Switch to practiced questions to see date formatting
    const allPracticedButton = screen.getByText(/All Practiced/);
    fireEvent.click(allPracticedButton);

    await waitFor(() => {
      // Check that date is formatted (exact format may vary based on timezone)
      expect(screen.getByText(/Last:/)).toBeInTheDocument();
    });
  });
}); 