import { useState, useEffect } from 'react';

export default function Home() {
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [question, setQuestion] = useState('');
  const [questionMeta, setQuestionMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInput, setUserInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/questions/categories');
        if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
        const data = await response.json();
        setCategories(['All', ...data]);
      } catch (error) {
        setError(`Error fetching categories: ${error.message}`);
      }
    };
    fetchCategories();
  }, []);

  const fetchRandomQuestion = async () => {
    setError('');
    setAnswer('');
    setAnswerError('');
    setUserInput('');
    try {
      setLoading(true);
      const category = selectedCategory === 'All' ? '' : encodeURIComponent(selectedCategory);
      const response = await fetch(`/api/questions/random${category ? `?category=${category}` : ''}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Failed to fetch question: ${response.status}`);
      }
      const data = await response.json();
      setQuestion(data.question);
      setQuestionMeta({ category: data.category, difficulty: data.difficulty });
    } catch (error) {
      setError(`Error fetching question: ${error.message}`);
      setQuestion('');
      setQuestionMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
    setQuestion(e.target.value);
    setQuestionMeta(null);
    setAnswer('');
    setAnswerError('');
    setError('');
  };

  const handleGenerateAnswer = async () => {
    setAnswerError('');
    setAnswer('');
    if (!question.trim()) {
      setAnswerError('Please enter or select a question.');
      return;
    }
    try {
      setAnswerLoading(true);
      const resp = await fetch('/api/experiences/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || `Failed to generate answer: ${resp.status}`);
      }
      setAnswer(data.answer || 'No answer');
    } catch (err) {
      setAnswerError(`Error generating answer: ${err.message}`);
    } finally {
      setAnswerLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">Interview Questions</h1>

        {/* Question Display Card */}
        <div className="qa-card">
          <div className="qa-card-content">
            <div className="question-block">
              <h3 className="qa-label">Question</h3>
              {question ? (
                <>
                  <p className="question">{question}</p>
                  {questionMeta && (
                    <div className="meta">
                      <span className="category">{questionMeta.category}</span>
                      <span className="difficulty">{questionMeta.difficulty}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="placeholder">No question selected yet.</p>
              )}
            </div>
            {error && <div className="error">{error}</div>}
          </div>
          {/* Controls Row */}
          <div className="controls-row">
            <div className="random-controls">
              <div className="categories">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <button
                className="button"
                onClick={fetchRandomQuestion}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Random Question'}
              </button>
            </div>
            <div className="or-divider">or</div>
            <div className="user-input-controls">
              <input
                type="text"
                value={userInput}
                onChange={handleUserInput}
                placeholder="Type your own question..."
                className="ask-input"
              />
            </div>
          </div>
          {/* Generate Answer Section (only if question is present) */}
          {question && (
            <div className="answer-block">
              <button
                className="button answer-btn"
                onClick={handleGenerateAnswer}
                disabled={answerLoading}
              >
                {answerLoading ? 'Generating...' : 'Generate Answer'}
              </button>
              {answerError && <div className="error">{answerError}</div>}
              {answer && (
                <div className="answer-container">
                  <h3 className="qa-label">Answer</h3>
                  <p className="answer">{answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f5f5f5;
        }
        .main {
          padding: 2rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          max-width: 700px;
          width: 100%;
        }
        .title {
          margin: 0 0 1.5rem 0;
          line-height: 1.15;
          font-size: 2.2rem;
          text-align: center;
          color: #2c3e50;
        }
        .qa-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 1.5rem 2rem;
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .qa-card-content {
          margin-bottom: 1.2rem;
        }
        .question-block {
          margin-bottom: 0.5rem;
        }
        .qa-label {
          font-size: 1.1rem;
          color: #34495e;
          margin-bottom: 0.2rem;
        }
        .question {
          font-size: 1.15rem;
          color: #2c3e50;
          margin: 0 0 0.2rem 0;
          line-height: 1.5;
        }
        .placeholder {
          color: #aaa;
          font-style: italic;
        }
        .meta {
          display: flex;
          gap: 0.7rem;
          font-size: 0.95rem;
          color: #7f8c8d;
        }
        .category, .difficulty {
          padding: 0.2rem 0.7rem;
          border-radius: 12px;
          background: #f0f0f0;
        }
        .controls-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .random-controls, .user-input-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.2rem;
        }
        .category-btn {
          padding: 0.35rem 0.9rem;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.92rem;
        }
        .category-btn:hover {
          background: #f0f0f0;
        }
        .category-btn.selected {
          background: #2c3e50;
          color: white;
          border-color: #2c3e50;
        }
        .button {
          padding: 0.7rem 1.5rem;
          font-size: 1rem;
          background-color: #2c3e50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .button:hover {
          background-color: #34495e;
        }
        .button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        .ask-input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          width: 100%;
          font-size: 1rem;
        }
        .or-divider {
          align-self: center;
          color: #aaa;
          font-size: 1.1rem;
          padding: 0 0.5rem;
        }
        .answer-block {
          margin-top: 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .answer-btn {
          margin-bottom: 0.7rem;
        }
        .answer-container {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          width: 100%;
          margin: 0;
        }
        .answer {
          font-size: 1.08rem;
          color: #2c3e50;
          margin: 0;
          line-height: 1.5;
        }
        .error {
          color: #c0392b;
          background: #ffeaea;
          border: 1px solid #e74c3c;
          border-radius: 5px;
          padding: 0.4rem 0.8rem;
          margin: 0.5rem 0 0 0;
          font-size: 0.98rem;
        }
        @media (max-width: 700px) {
          .main {
            padding: 1rem 0;
          }
          .qa-card {
            padding: 1rem 0.5rem;
          }
          .controls-row {
            flex-direction: column;
            gap: 0.7rem;
          }
          .or-divider {
            padding: 0.2rem 0;
          }
        }
      `}</style>
    </div>
  );
} 