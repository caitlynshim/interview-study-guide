import { useState, useEffect } from 'react';

export default function Home() {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  useEffect(() => {
    // Fetch categories when component mounts
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/questions/categories');
        const data = await response.json();
        setCategories(['All', ...data]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const fetchRandomQuestion = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'All' ? '' : encodeURIComponent(selectedCategory);
      const response = await fetch(`/api/questions/random${category ? `?category=${category}` : ''}`);
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">Sample Interview Questions</h1>
        
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
          {loading ? 'Loading...' : 'Get Random Question'}
        </button>

        {question && (
          <div className="question-container">
            <p className="question">{question.question}</p>
            <div className="meta">
              <span className="category">{question.category}</span>
              <span className="difficulty">{question.difficulty}</span>
            </div>
          </div>
        )}
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
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          max-width: 800px;
          width: 100%;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
          text-align: center;
          color: #2c3e50;
          margin-bottom: 2rem;
        }

        .categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 2rem;
          max-width: 100%;
          padding: 0 1rem;
        }

        .category-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
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
          padding: 1rem 2rem;
          font-size: 1.2rem;
          background-color: #2c3e50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 2rem;
        }

        .button:hover {
          background-color: #34495e;
        }

        .button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }

        .question-container {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 800px;
          margin: 0 1rem;
        }

        .question {
          font-size: 1.2rem;
          color: #2c3e50;
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .meta {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        .category, .difficulty {
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
          background: #f0f0f0;
        }

        @media (max-width: 600px) {
          .title {
            font-size: 2.5rem;
          }
          
          .question-container {
            margin: 0 0.5rem;
            padding: 1.5rem;
          }
          
          .categories {
            padding: 0 0.5rem;
          }
        }
      `}</style>
    </div>
  );
} 