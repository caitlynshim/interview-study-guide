import React, { useEffect, useState } from 'react';

const SPRING = {
  bg: '#f7f8f3',
  card: '#fff',
  accent: '#8a9a5b',
  accent2: '#b7c68b',
  accent3: '#e7ecd9',
  text: '#2d3a2e',
  gray: '#7a8b7b',
  error: '#c0392b',
  errorBg: '#fff0ee',
  border: '#dbe5dd',
  blue: '#7bbfdc',
  beige: '#f3ede4',
  blush: '#f7e6e6',
};

export default function ManageQuestions() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    question: '',
    category: '',
    difficulty: 'medium'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    question: '',
    category: '',
    difficulty: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/questions/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(['All', ...data]);
        // Set first non-All category as default for form
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, category: data[0] }));
        }
      } catch (err) {
        setError(`Error fetching categories: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch questions for the selected category
  useEffect(() => {
    if (selectedCategory) {
      fetchQuestions(selectedCategory);
    }
  }, [selectedCategory]);

  // Fetch questions on initial load for 'All' category
  useEffect(() => {
    if (!loading && selectedCategory === 'All') {
      fetchQuestions('All');
    }
  }, [loading, selectedCategory]);

  const fetchQuestions = async (category) => {
    try {
      setQuestionsLoading(true);
      const url = category === 'All' 
        ? '/api/questions/list' 
        : `/api/questions/list?category=${encodeURIComponent(category)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError(`Error fetching questions: ${err.message}`);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (formError) setFormError('');
    if (formSuccess) setFormSuccess('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.question.trim()) {
      setFormError('Question text is required');
      return;
    }
    if (!formData.category.trim()) {
      setFormError('Category is required');
      return;
    }
    
    try {
      setFormLoading(true);
      setFormError('');
      
      const response = await fetch('/api/questions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add question');
      }
      
      setFormSuccess('Question added successfully!');
      setFormData({ question: '', category: categories[1] || '', difficulty: 'medium' });
      
      // Refresh questions if we're viewing the same category
      if (selectedCategory === formData.category) {
        fetchQuestions(selectedCategory);
      }
    } catch (err) {
      setFormError(`Error adding question: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Edit handlers
  const handleEditStart = (question) => {
    setEditingId(question._id);
    setEditData({
      question: question.question,
      category: question.category,
      difficulty: question.difficulty
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({ question: '', category: '', difficulty: '' });
    setError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async (questionId) => {
    // Client-side validation
    if (!editData.question.trim()) {
      setError('Question text is required');
      return;
    }
    if (!editData.category.trim()) {
      setError('Category is required');
      return;
    }

    try {
      setEditLoading(true);
      setError('');

      const response = await fetch('/api/questions/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          question: editData.question,
          category: editData.category,
          difficulty: editData.difficulty
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update question');
      }

      // Exit edit mode
      setEditingId(null);
      setEditData({ question: '', category: '', difficulty: '' });
      
      // Refresh questions list
      await fetchQuestions(selectedCategory);
    } catch (err) {
      setError(`Error updating question: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (questionId, questionText) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this question? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setError('');

      const response = await fetch('/api/questions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: questionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete question');
      }

      // Refresh questions list
      await fetchQuestions(selectedCategory);
    } catch (err) {
      setError(`Error deleting question: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="spring-bg">
        <nav className="spring-navbar">
          <div className="spring-navbar-title">Mock Interview Questions</div>
          <div className="spring-navbar-links">
            <a href="/" className="spring-navbar-link">Answer a question</a>
            <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
            <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
            <a href="/manage-questions" className="spring-navbar-link active">Manage questions</a>
          </div>
        </nav>
        <main className="spring-main-responsive">
          <div className="spring-card-responsive">
            <div className="spring-loading">Loading categories...</div>
          </div>
        </main>
        <style jsx>{`
          .spring-bg {
            min-height: 100vh;
            background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
          }
          .spring-navbar {
            width: 100vw;
            background: #fff;
            border-bottom: 1.5px solid ${SPRING.accent3};
            box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.7rem 2.5rem 0.7rem 2.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .spring-navbar-title {
            font-size: 1.45rem;
            font-weight: 700;
            color: ${SPRING.accent};
            letter-spacing: 0.01em;
          }
          .spring-navbar-links {
            display: flex;
            gap: 1.5rem;
          }
          .spring-navbar-link {
            color: ${SPRING.text};
            text-decoration: none;
            font-size: 1.08rem;
            font-weight: 500;
            padding: 0.3rem 0.9rem;
            border-radius: 7px;
            transition: background 0.16s, color 0.16s;
          }
          .spring-navbar-link.active, .spring-navbar-link:hover {
            background: ${SPRING.accent3};
            color: ${SPRING.accent};
          }
          .spring-main-responsive {
            width: 100vw;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f7f8f3 60%, #f3ede4 100%);
          }
          .spring-card-responsive {
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 4px 24px 0 rgba(138,154,91,.1),0 1.5px 6px 0 rgba(138,154,91,.08);
            padding: 2.5rem 2.2rem 2.2rem 2.2rem;
            max-width: 1200px;
            width: 100%;
            margin: 2.5rem 0;
          }
          .spring-loading {
            color: ${SPRING.gray};
            font-size: 1.1rem;
            margin-top: 1.2rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="spring-bg">
      <nav className="spring-navbar">
        <div className="spring-navbar-title">Mock Interview Questions</div>
        <div className="spring-navbar-links">
          <a href="/" className="spring-navbar-link">Answer a question</a>
          <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
          <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
          <a href="/manage-questions" className="spring-navbar-link active">Manage questions</a>
        </div>
      </nav>
      <main className="spring-main-responsive">
        <div className="spring-card-responsive">
          <h2 className="spring-page-title">Manage Questions</h2>
          
          {error && <div className="spring-error">{error}</div>}
          
          <div className="spring-categories-row">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`spring-category-bubble${selectedCategory === cat ? ' selected' : ''}`}
                onClick={() => handleCategorySelect(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Add Question Form */}
          <div className="spring-form-section">
            <h3 className="spring-section-title">Add New Question</h3>
            
            {formError && <div className="spring-error">{formError}</div>}
            {formSuccess && <div className="spring-success">{formSuccess}</div>}
            
            <form onSubmit={handleFormSubmit} className="spring-form">
              <div className="spring-form-group">
                <label htmlFor="question-text" className="spring-label">Question Text</label>
                <textarea
                  id="question-text"
                  name="question"
                  value={formData.question}
                  onChange={handleFormChange}
                  className="spring-textarea"
                  rows="3"
                  placeholder="Enter the interview question..."
                  disabled={formLoading}
                />
              </div>
              
              <div className="spring-form-row">
                <div className="spring-form-group">
                  <label htmlFor="question-category" className="spring-label">Category</label>
                  <select
                    id="question-category"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="spring-select"
                    disabled={formLoading}
                  >
                    {categories.filter(cat => cat !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="spring-form-group">
                  <label htmlFor="question-difficulty" className="spring-label">Difficulty</label>
                  <select
                    id="question-difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleFormChange}
                    className="spring-select"
                    disabled={formLoading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                className="spring-submit-button"
                disabled={formLoading}
              >
                {formLoading ? 'Adding Question...' : 'Add Question'}
              </button>
            </form>
          </div>

          {selectedCategory && (
            <div className="spring-questions-section">
              <h3 className="spring-section-title">
                Questions in {selectedCategory}
                {questionsLoading && <span className="spring-loading-inline"> Loading...</span>}
              </h3>
              
              {!questionsLoading && questions.length === 0 && (
                <div className="spring-empty-state">No questions found in this category.</div>
              )}
              
              {!questionsLoading && questions.length > 0 && (
                <div className="spring-questions-list">
                  {questions.map((question) => (
                    <div key={question._id} className="spring-question-card">
                      {editingId === question._id ? (
                        // Edit mode
                        <div className="spring-edit-form">
                          <div className="spring-form-group">
                            <label className="spring-label">Question Text</label>
                            <textarea
                              name="question"
                              value={editData.question}
                              onChange={handleEditChange}
                              className="spring-textarea"
                              rows="3"
                              disabled={editLoading}
                            />
                          </div>
                          <div className="spring-form-row">
                            <div className="spring-form-group">
                              <label className="spring-label">Category</label>
                              <select
                                name="category"
                                value={editData.category}
                                onChange={handleEditChange}
                                className="spring-select"
                                disabled={editLoading}
                              >
                                {categories.filter(cat => cat !== 'All').map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="spring-form-group">
                              <label className="spring-label">Difficulty</label>
                              <select
                                name="difficulty"
                                value={editData.difficulty}
                                onChange={handleEditChange}
                                className="spring-select"
                                disabled={editLoading}
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                          </div>
                          <div className="spring-edit-actions">
                            <button
                              className="spring-save-button"
                              onClick={() => handleEditSave(question._id)}
                              disabled={editLoading}
                            >
                              {editLoading ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="spring-cancel-button"
                              onClick={handleEditCancel}
                              disabled={editLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="spring-question-text">{question.question}</div>
                          <div className="spring-question-meta">
                            <span className={`spring-difficulty ${question.difficulty}`}>
                              {question.difficulty}
                            </span>
                            <span className="spring-question-date">
                              Added {formatDate(question.createdAt)}
                            </span>
                          </div>
                          <div className="spring-question-actions">
                            <button
                              className="spring-edit-button"
                              onClick={() => handleEditStart(question)}
                            >
                              Edit
                            </button>
                            <button
                              className="spring-delete-button"
                              onClick={() => handleDelete(question._id, question.question)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <style jsx>{`
        .spring-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }
        .spring-navbar {
          width: 100vw;
          background: #fff;
          border-bottom: 1.5px solid ${SPRING.accent3};
          box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 2.5rem 0.7rem 2.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .spring-navbar-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: ${SPRING.accent};
          letter-spacing: 0.01em;
        }
        .spring-navbar-links {
          display: flex;
          gap: 1.5rem;
        }
        .spring-navbar-link {
          color: ${SPRING.text};
          text-decoration: none;
          font-size: 1.08rem;
          font-weight: 500;
          padding: 0.3rem 0.9rem;
          border-radius: 7px;
          transition: background 0.16s, color 0.16s;
        }
        .spring-navbar-link.active, .spring-navbar-link:hover {
          background: ${SPRING.accent3};
          color: ${SPRING.accent};
        }
        .spring-main-responsive {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f7f8f3 60%, #f3ede4 100%);
        }
        .spring-card-responsive {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px 0 rgba(138,154,91,.1),0 1.5px 6px 0 rgba(138,154,91,.08);
          padding: 2.5rem 2.2rem 2.2rem 2.2rem;
          max-width: 1200px;
          width: 100%;
          margin: 2.5rem 0;
        }
        .spring-page-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: ${SPRING.accent};
          margin-bottom: 1.2rem;
        }
        .spring-categories-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          margin-bottom: 1.2rem;
          justify-content: center;
        }
        .spring-category-bubble {
          background: ${SPRING.accent3};
          color: ${SPRING.text};
          border: 1.5px solid ${SPRING.accent2};
          border-radius: 20px;
          padding: 0.3rem 0.9rem;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, border 0.18s;
        }
        .spring-category-bubble.selected {
          background: ${SPRING.accent};
          color: #fff;
          border: 1.5px solid ${SPRING.accent};
        }
        .spring-error {
          color: ${SPRING.error};
          background: ${SPRING.errorBg};
          border: 1px solid ${SPRING.error};
          border-radius: 6px;
          padding: 0.5rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.99rem;
        }
        .spring-success {
          color: #155724;
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.99rem;
        }
        .spring-loading {
          color: ${SPRING.gray};
          font-size: 1.1rem;
          margin-top: 1.2rem;
        }
        .spring-form-section {
          margin-top: 2rem;
          border-top: 1px solid ${SPRING.border};
          padding-top: 2rem;
        }
        .spring-section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: ${SPRING.text};
          margin-bottom: 1rem;
        }
        .spring-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .spring-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .spring-form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }
        .spring-label {
          font-size: 0.95rem;
          font-weight: 500;
          color: ${SPRING.text};
        }
        .spring-textarea, .spring-select {
          padding: 0.75rem;
          border: 1.5px solid ${SPRING.border};
          border-radius: 6px;
          font-size: 1rem;
          color: ${SPRING.text};
          background: #fff;
          transition: border-color 0.16s;
        }
        .spring-textarea:focus, .spring-select:focus {
          outline: none;
          border-color: ${SPRING.accent};
        }
        .spring-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }
        .spring-submit-button {
          background: ${SPRING.accent};
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.16s;
          align-self: flex-start;
        }
        .spring-submit-button:hover:not(:disabled) {
          background: ${SPRING.text};
        }
        .spring-submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spring-loading-inline {
          color: ${SPRING.gray};
          font-size: 0.9rem;
          font-weight: 400;
        }
        .spring-empty-state {
          color: ${SPRING.gray};
          font-size: 1rem;
          text-align: center;
          padding: 2rem;
          background: ${SPRING.accent3};
          border-radius: 8px;
        }
        .spring-questions-section {
          margin-top: 2rem;
        }
        .spring-questions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .spring-question-card {
          background: ${SPRING.accent3};
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid ${SPRING.border};
        }
        .spring-question-text {
          font-size: 1rem;
          color: ${SPRING.text};
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .spring-question-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }
        .spring-difficulty {
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .spring-difficulty.easy {
          background: #d4edda;
          color: #155724;
        }
        .spring-difficulty.medium {
          background: #fff3cd;
          color: #856404;
        }
        .spring-difficulty.hard {
          background: #f8d7da;
          color: #721c24;
        }
        .spring-question-date {
          color: ${SPRING.gray};
        }
        .spring-question-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .spring-edit-button, .spring-delete-button {
          background: ${SPRING.accent};
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.16s;
        }
        .spring-edit-button:hover {
          background: ${SPRING.text};
        }
        .spring-delete-button {
          background: ${SPRING.error};
        }
        .spring-delete-button:hover {
          background: #a93529;
        }
        .spring-edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .spring-edit-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .spring-save-button {
          background: ${SPRING.accent};
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.16s;
        }
        .spring-save-button:hover:not(:disabled) {
          background: ${SPRING.text};
        }
        .spring-save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spring-cancel-button {
          background: ${SPRING.gray};
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.16s;
        }
        .spring-cancel-button:hover:not(:disabled) {
          background: #5a6b5b;
        }
        .spring-cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
} 