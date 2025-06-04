/**
 * Manage Questions Page Tests
 * TDD approach for question management functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import ManageQuestions from '../pages/manage-questions';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouterPush = jest.fn();

beforeEach(() => {
  useRouter.mockReturnValue({
    query: {},
    push: mockRouterPush,
    pathname: '/manage-questions'
  });
  
  fetch.mockClear();
  mockRouterPush.mockClear();
});

describe('Manage Questions Page', () => {
  
  describe('Step 1: Category Navigation', () => {
    test('should display loading state then show category bubbles', async () => {
      // Mock categories API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          'Leadership & People',
          'Technical Skills', 
          'Customer & Field Focus',
          'Strategy, Product & Innovation'
        ]
      });

      render(<ManageQuestions />);
      
      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
        expect(screen.getByText('Technical Skills')).toBeInTheDocument();
        expect(screen.getByText('Customer & Field Focus')).toBeInTheDocument();
        expect(screen.getByText('Strategy, Product & Innovation')).toBeInTheDocument();
      });

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith('/api/questions/categories');
    });

    test('should handle category selection', async () => {
      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['Leadership & People', 'Technical Skills']
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on a category
      const leadershipButton = screen.getByRole('button', { name: 'Leadership & People' });
      fireEvent.click(leadershipButton);

      // Should show selected state
      expect(leadershipButton).toHaveClass('selected');
    });
  });

  describe('Step 3: Question Listing', () => {
    test('should fetch and display questions when category is selected', async () => {
      const mockCategories = ['Leadership & People', 'Technical Skills'];
      const mockQuestions = [
        {
          _id: '1',
          question: 'Tell me about a time you had to lead a difficult team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        },
        {
          _id: '2', 
          question: 'Describe how you handled a technical challenge.',
          category: 'Leadership & People',
          difficulty: 'hard',
          createdAt: '2023-01-02T00:00:00.000Z'
        }
      ];

      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock questions list API  
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 2 })
      });

      render(<ManageQuestions />);
      
      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on Leadership & People category
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      // Should fetch questions for that category
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/questions/list?category=Leadership%20%26%20People');
      });

      // Should display the questions
      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you had to lead a difficult team.')).toBeInTheDocument();
        expect(screen.getByText('Describe how you handled a technical challenge.')).toBeInTheDocument();
        expect(screen.getByText('medium')).toBeInTheDocument();
        expect(screen.getByText('hard')).toBeInTheDocument();
      });
    });

    test('should show empty state when no questions found', async () => {
      const mockCategories = ['Leadership & People'];
      
      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock empty questions response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [], total: 0 })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      const leadershipButton = screen.getByRole('button', { name: 'Leadership & People' });
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText(/no questions found/i)).toBeInTheDocument();
      });
    });

    it('should fetch all questions when "All" category is selected', async () => {
      // Mock API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(['Leadership & People', 'Technical Skills']),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            questions: [
              { _id: '1', question: 'Test question 1', category: 'Leadership & People', createdAt: '2023-01-01' },
              { _id: '2', question: 'Test question 2', category: 'Technical Skills', createdAt: '2023-01-02' }
            ]
          }),
        });

      render(<ManageQuestions />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getAllByText('Leadership & People')[0]).toBeInTheDocument();
      });

      // Verify "All" category is selected by default and questions are fetched
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/list');
      });

      // Verify questions from all categories are displayed
      await waitFor(() => {
        expect(screen.getByText('Test question 1')).toBeInTheDocument();
        expect(screen.getByText('Test question 2')).toBeInTheDocument();
      });
    });
  });

  describe('Step 5: Add Question Form', () => {
    test('should display add question form', async () => {
      const mockCategories = ['Leadership & People', 'Technical Skills'];
      
      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Should show add question form
      expect(screen.getByText('Add New Question')).toBeInTheDocument();
      expect(screen.getByLabelText(/question text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
    });

    test('should handle form submission successfully', async () => {
      const mockCategories = ['Leadership & People', 'Technical Skills'];
      
      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock successful add question API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'new-question-id' })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Fill out the form
      const questionInput = screen.getByLabelText(/question text/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const difficultySelect = screen.getByLabelText(/difficulty/i);
      
      fireEvent.change(questionInput, { 
        target: { value: 'Tell me about a time you solved a complex problem.' } 
      });
      fireEvent.change(categorySelect, { target: { value: 'Technical Skills' } });
      fireEvent.change(difficultySelect, { target: { value: 'medium' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add question/i });
      fireEvent.click(submitButton);

      // Should call add question API
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/questions/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Tell me about a time you solved a complex problem.',
            category: 'Technical Skills',
            difficulty: 'medium'
          })
        });
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/question added successfully/i)).toBeInTheDocument();
      });

      // Form should be reset
      expect(questionInput.value).toBe('');
    });

    test('should handle form validation errors', async () => {
      const mockCategories = ['Leadership & People'];
      
      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Submit empty form
      const submitButton = screen.getByRole('button', { name: /add question/i });
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/question text is required/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(fetch).toHaveBeenCalledTimes(1); // Only categories call
    });
  });

  describe('Step 6: Edit and Delete Question Functionality', () => {
    test('should display edit and delete buttons for each question', async () => {
      const mockCategories = ['Leadership & People'];
      const mockQuestions = [
        {
          _id: 'question-1',
          question: 'Tell me about a time you led a team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock questions list API  
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 1 })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on Leadership & People category
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Should display edit and delete buttons
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    test('should handle question deletion with confirmation', async () => {
      const mockCategories = ['Leadership & People'];
      const mockQuestions = [
        {
          _id: 'question-1',
          question: 'Tell me about a time you led a team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock questions list API  
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 1 })
      });

      // Mock delete API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock refreshed questions list (empty after deletion)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [], total: 0 })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on category to show questions
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Should call confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this question? This action cannot be undone.'
      );

      // Should call delete API
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/questions/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'question-1' })
        });
      });

      // Should refresh the questions list
      await waitFor(() => {
        expect(screen.getByText(/no questions found/i)).toBeInTheDocument();
      });
    });

    test('should handle edit question functionality', async () => {
      const mockCategories = ['Leadership & People', 'Technical Skills'];
      const mockQuestions = [
        {
          _id: 'question-1',
          question: 'Tell me about a time you led a team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      // Mock categories API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      // Mock questions list API  
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 1 })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on category to show questions
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Click edit button to show edit form
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Should show edit form with current values
      await waitFor(() => {
        const editInput = screen.getByDisplayValue('Tell me about a time you led a team.');
        expect(editInput).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test('should save edited question', async () => {
      const mockCategories = ['Leadership & People', 'Technical Skills'];
      const mockQuestions = [
        {
          _id: 'question-1',
          question: 'Tell me about a time you led a team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      // Mock APIs
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 1 })
      });

      // Mock edit API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock refreshed questions list
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          questions: [{
            ...mockQuestions[0],
            question: 'Updated: Tell me about a time you led a team.',
            difficulty: 'hard'
          }], 
          total: 1 
        })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on category to show questions
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Update the question text and difficulty
      const editInput = screen.getByDisplayValue('Tell me about a time you led a team.');
      const difficultySelect = screen.getByDisplayValue('medium');
      
      fireEvent.change(editInput, { 
        target: { value: 'Updated: Tell me about a time you led a team.' } 
      });
      fireEvent.change(difficultySelect, { target: { value: 'hard' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should call edit API
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/questions/edit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'question-1',
            question: 'Updated: Tell me about a time you led a team.',
            category: 'Leadership & People',
            difficulty: 'hard'
          })
        });
      });

      // Should refresh questions and show updated content
      await waitFor(() => {
        expect(screen.getByText('Updated: Tell me about a time you led a team.')).toBeInTheDocument();
      });
    });

    test('should cancel edit without saving changes', async () => {
      const mockCategories = ['Leadership & People'];
      const mockQuestions = [
        {
          _id: 'question-1',
          question: 'Tell me about a time you led a team.',
          category: 'Leadership & People',
          difficulty: 'medium',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      // Mock APIs
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions, total: 1 })
      });

      render(<ManageQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText('Leadership & People')).toBeInTheDocument();
      });

      // Click on category and edit button
      const leadershipButton = screen.getAllByText('Leadership & People')[0];
      fireEvent.click(leadershipButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Tell me about a time you led a team.')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should return to display mode without saving
      await waitFor(() => {
        expect(screen.getByText('Tell me about a time you led a team.')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Tell me about a time you led a team.')).not.toBeInTheDocument();
      });

      // Should not have called edit API
      expect(fetch).toHaveBeenCalledTimes(2); // Only categories and questions list calls
    });
  });

}); 