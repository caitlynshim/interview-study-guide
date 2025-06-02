import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const SPRING = {
  bg: '#f7f8f3', // light olive-tinted background
  card: '#fff',
  accent: '#8a9a5b', // olive green
  accent2: '#b7c68b', // lighter olive/spring green
  accent3: '#e7ecd9', // lightest olive/green-gray
  text: '#2d3a2e',
  gray: '#7a8b7b',
  error: '#c0392b',
  errorBg: '#fff0ee',
  border: '#dbe5dd',
  blue: '#7bbfdc', // spring blue
  beige: '#f3ede4',
  blush: '#f7e6e6', // soft blush for subtle highlights
};

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
    <div className="spring-bg">
      <main className="spring-main">
        <div className="spring-card">
          <h1 className="spring-title">Interview Question Helper</h1>

          {/* Step 1: Choose or Enter a Question */}
          <div className="spring-step">
            <div className="spring-step-title">1. Choose or Enter a Question</div>
            <div className="spring-row">
              <div className="spring-col">
                <label htmlFor="category" className="spring-label">Category</label>
                <select
                  id="category"
                  className="spring-select"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  className="spring-btn"
                  onClick={fetchRandomQuestion}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'Loading...' : 'Get Random Question'}
                </button>
              </div>
              <div className="spring-or">or</div>
              <div className="spring-col">
                <label htmlFor="userq" className="spring-label">Your Question</label>
                <input
                  id="userq"
                  type="text"
                  value={userInput}
                  onChange={handleUserInput}
                  placeholder="Type your question..."
                  className="spring-input"
                />
              </div>
            </div>
            {error && <div className="spring-error">{error}</div>}
          </div>

          {/* Step 2: View the Question */}
          <div className="spring-step">
            <div className="spring-step-title">2. Your Question</div>
            <div className="spring-question-box">
              {question ? (
                <>
                  <span className="spring-question">{question}</span>
                  {questionMeta && (
                    <span className="spring-badges">
                      <span className="spring-badge">{questionMeta.category}</span>
                      <span className="spring-badge spring-badge-diff">{questionMeta.difficulty}</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="spring-placeholder">No question selected yet.</span>
              )}
            </div>
          </div>

          {/* Step 3: Generate and View the Answer */}
          <div className="spring-step">
            <div className="spring-step-title">3. Generate an Answer</div>
            <button
              className="spring-btn"
              onClick={handleGenerateAnswer}
              disabled={answerLoading || !question}
            >
              {answerLoading ? 'Generating...' : 'Generate Answer'}
            </button>
            {answerError && <div className="spring-error">{answerError}</div>}
            {answer && (
              <div className="spring-answer-box">
                <div className="spring-answer">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
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
        .spring-main {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spring-card {
          background: ${SPRING.card};
          border-radius: 18px;
          box-shadow: 0 4px 24px 0 rgba(138,154,91,0.10), 0 1.5px 6px 0 rgba(138,154,91,0.08);
          padding: 2.5rem 2.2rem 2.2rem 2.2rem;
          max-width: 520px;
          width: 100%;
          margin: 2.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 2.2rem;
        }
        .spring-title {
          font-size: 2.1rem;
          color: ${SPRING.accent};
          font-weight: 700;
          text-align: center;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
        }
        .spring-step {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .spring-step-title {
          font-size: 1.08rem;
          color: ${SPRING.accent};
          font-weight: 600;
          margin-bottom: 0.2rem;
        }
        .spring-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          gap: 1.2rem;
        }
        .spring-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .spring-label {
          font-size: 0.98rem;
          color: ${SPRING.gray};
          margin-bottom: 0.1rem;
        }
        .spring-select, .spring-input {
          padding: 0.5rem 0.7rem;
          border-radius: 7px;
          border: 1px solid ${SPRING.border};
          font-size: 1rem;
          background: ${SPRING.accent3};
          color: ${SPRING.text};
        }
        .spring-btn {
          background: ${SPRING.accent};
          color: #fff;
          border: none;
          border-radius: 7px;
          padding: 0.6rem 1.3rem;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s;
        }
        .spring-btn:hover {
          background: ${SPRING.accent2};
          color: ${SPRING.text};
        }
        .spring-btn:disabled {
          background: ${SPRING.accent3};
          color: ${SPRING.gray};
          cursor: not-allowed;
        }
        .spring-or {
          color: ${SPRING.gray};
          font-size: 1.1rem;
          font-weight: 500;
          align-self: flex-end;
          margin-bottom: 0.5rem;
        }
        .spring-question-box, .spring-answer-box {
          background: ${SPRING.accent3};
          border-radius: 10px;
          padding: 1.1rem 1rem;
          min-height: 3.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .spring-question {
          font-size: 1.13rem;
          color: ${SPRING.text};
          font-weight: 500;
        }
        .spring-placeholder {
          color: ${SPRING.gray};
          font-style: italic;
        }
        .spring-badges {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.2rem;
        }
        .spring-badge {
          background: ${SPRING.blue};
          color: #fff;
          border-radius: 8px;
          padding: 0.18rem 0.7rem;
          font-size: 0.93rem;
          font-weight: 500;
        }
        .spring-badge-diff {
          background: ${SPRING.accent};
        }
        .spring-error {
          color: ${SPRING.error};
          background: ${SPRING.errorBg};
          border: 1px solid ${SPRING.error};
          border-radius: 6px;
          padding: 0.5rem 1rem;
          margin-top: 0.5rem;
          font-size: 0.99rem;
        }
        @media (max-width: 600px) {
          .spring-card {
            padding: 1.1rem 0.3rem;
            max-width: 99vw;
          }
          .spring-row {
            flex-direction: column;
            gap: 0.7rem;
          }
          .spring-or {
            align-self: center;
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
} 