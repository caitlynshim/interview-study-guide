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
      <main className="spring-main-responsive">
        <div className="spring-card-responsive">
          {/* Category bubbles */}
          <div className="spring-categories-row">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`spring-category-bubble${selectedCategory === cat ? ' selected' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Random question button and user input */}
          <div className="spring-row spring-row-question-input">
            <button
              className="spring-btn"
              onClick={fetchRandomQuestion}
              disabled={loading}
              style={{ minWidth: 180 }}
            >
              {loading ? 'Loading...' : 'Get Random Question'}
            </button>
            <input
              id="userq"
              type="text"
              placeholder="Enter your own question..."
              className="spring-input"
              value={userInput}
              onChange={handleUserInput}
              style={{ flex: 1 }}
            />
          </div>

          {/* Your Question and Generate Answer */}
          <div className="spring-row spring-row-question-display">
            <div className="spring-question-box" style={{ flex: 1 }}>
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
            <button
              className="spring-btn"
              onClick={handleGenerateAnswer}
              disabled={answerLoading || !question}
              style={{ marginLeft: 16, minWidth: 180 }}
            >
              {answerLoading ? 'Generating...' : 'Generate Answer'}
            </button>
          </div>

          {/* Error */}
          {answerError && <div className="spring-error">{answerError}</div>}

          {/* Answer */}
          {answer && (
            <div className="spring-answer-box">
              <div className="spring-answer">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
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
          padding: 0.45rem 1.2rem;
          font-size: 1.01rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, border 0.18s;
        }
        .spring-category-bubble.selected {
          background: ${SPRING.accent};
          color: #fff;
          border: 1.5px solid ${SPRING.accent};
        }
        .spring-row-question-input {
          display: flex;
          flex-direction: row;
          gap: 1.2rem;
          margin-bottom: 1.2rem;
        }
        .spring-row-question-display {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 1.2rem;
          margin-bottom: 1.2rem;
        }
        .spring-question-box {
          background: ${SPRING.accent3};
          border-radius: 10px;
          padding: 1.1rem 1rem;
          min-height: 3.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .spring-answer-box {
          background: ${SPRING.accent3};
          border-radius: 10px;
          padding: 1.1rem 1rem;
          min-height: 3.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1.2rem;
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
        @media (max-width: 700px) {
          .spring-row-question-input,
          .spring-row-question-display {
            flex-direction: column;
            gap: 0.7rem;
          }
          .spring-btn {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
} 