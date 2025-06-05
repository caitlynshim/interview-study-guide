/**
 * Navigate Experiences UI Tests
 * Testing category text size consistency and content formatting
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NavigateExperiences from '../pages/navigate-experiences';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

beforeEach(() => {
  useRouter.mockReturnValue({
    query: {},
    isReady: true,
    push: mockRouterPush,
    replace: mockRouterReplace,
    pathname: '/navigate-experiences'
  });
  
  fetch.mockClear();
  mockRouterPush.mockClear();
  mockRouterReplace.mockClear();
});

describe('Navigate Experiences UI', () => {
  const mockExperiences = [
    {
      _id: '1',
      title: 'Test Experience 1',
      content: 'This is a test experience.\n\nIt has multiple paragraphs.\n\nAnd should format properly.',
      category: 'Leadership & People',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      metadata: {
        tags: ['test', 'example'],
        role: 'Engineer',
        date: '2023-01-01'
      }
    },
    {
      _id: '2', 
      title: 'Test Experience 2',
      content: 'Another experience\nwith line breaks\nfor testing formatting.',
      category: 'Technical Skills',
      createdAt: '2023-01-02T00:00:00.000Z'
    },
    {
      _id: '3',
      title: 'Test Experience with Bullets',
      content: 'Experience with bullet points: * First point * Second point * Third point',
      category: 'Leadership & People',
      createdAt: '2023-01-03T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        experiences: mockExperiences
      })
    });
  });

  test('should render category bubbles with correct size', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // Check that category bubbles exist
    const categoryBubbles = screen.getAllByRole('button');
    const allButton = categoryBubbles.find(button => button.textContent === 'All');
    
    expect(allButton).toBeInTheDocument();
    expect(allButton).toHaveClass('spring-category-bubble');
  });

  test('should format experience content with proper line breaks', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience 1')).toBeInTheDocument();
    });

    // Click to expand the first experience
    fireEvent.click(screen.getByText('Test Experience 1'));
    
    await waitFor(() => {
      const contentElement = screen.getByText(/This is a test experience/);
      expect(contentElement).toBeInTheDocument();
      
      // Check that the content element has the proper whiteSpace style
      expect(contentElement).toHaveStyle('white-space: pre-line');
    });
  });

  test('should preserve paragraph breaks in experience content', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience 1')).toBeInTheDocument();
    });

    // Click to expand the first experience
    fireEvent.click(screen.getByText('Test Experience 1'));
    
    await waitFor(() => {
      // The content should include the newlines
      const contentText = screen.getByText(/This is a test experience.*It has multiple paragraphs.*And should format properly/s);
      expect(contentText).toBeInTheDocument();
    });
  });

  test('should handle experiences with simple line breaks', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience 2')).toBeInTheDocument();
    });

    // Click to expand the second experience  
    fireEvent.click(screen.getByText('Test Experience 2'));
    
    await waitFor(() => {
      const contentElement = screen.getByText(/Another experience.*with line breaks.*for testing formatting/s);
      expect(contentElement).toBeInTheDocument();
    });
  });

  test('should display metadata correctly when expanded', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience 1')).toBeInTheDocument();
    });

    // Click to expand the first experience
    fireEvent.click(screen.getByText('Test Experience 1'));
    
    await waitFor(() => {
      expect(screen.getByText('Tags:')).toBeInTheDocument();
      expect(screen.getByText('test, example')).toBeInTheDocument();
      expect(screen.getByText('Role:')).toBeInTheDocument();
      expect(screen.getByText('Engineer')).toBeInTheDocument();
    });
  });

  test('should convert asterisks to bullet points in content', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience with Bullets')).toBeInTheDocument();
    });

    // Click to expand the experience with bullet points
    fireEvent.click(screen.getByText('Test Experience with Bullets'));
    
    await waitFor(() => {
      // Check that each bullet point is on its own line
      expect(screen.getByText(/Experience with bullet points:/)).toBeInTheDocument();
      expect(screen.getByText(/• First point/)).toBeInTheDocument();
      expect(screen.getByText(/• Second point/)).toBeInTheDocument();
      expect(screen.getByText(/• Third point/)).toBeInTheDocument();
      
      // Check that the original asterisks are not present
      expect(screen.queryByText(/\* First point/)).not.toBeInTheDocument();
      
      // Verify the content has proper line breaks for bullets
      const contentElement = screen.getByText(/Experience with bullet points:/);
      expect(contentElement.textContent).toMatch(/Experience with bullet points:\s*\n\s*• First point\s*\n\s*• Second point\s*\n\s*• Third point/);
    });
  });

  test('should filter experiences by category', async () => {
    render(<NavigateExperiences />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experience 1')).toBeInTheDocument();
      expect(screen.getByText('Test Experience 2')).toBeInTheDocument();
    });

    // Click on Leadership & People category button specifically
    const categoryButtons = screen.getAllByRole('button');
    const leadershipButton = categoryButtons.find(button => button.textContent === 'Leadership & People');
    fireEvent.click(leadershipButton);

    await waitFor(() => {
      // Should only show the first experience
      expect(screen.getByText('Test Experience 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Experience 2')).not.toBeInTheDocument();
    });
  });
}); 