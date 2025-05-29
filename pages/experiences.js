import { useState } from 'react';

export default function Experiences() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    date: '',
  });
  const [status, setStatus] = useState({ message: '', isError: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: '', isError: false });

    try {
      const response = await fetch('/api/experiences/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()),
          date: formData.date || new Date(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message || 'Failed to add experience');
      }

      const data = await response.json();
      setStatus({ message: 'Experience added successfully!', isError: false });
      setFormData({
        title: '',
        description: '',
        tags: '',
        date: '',
      });
    } catch (error) {
      console.error('Error:', error);
      setStatus({ message: error.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">Add Experience</h1>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated):</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., next.js, mongodb, react"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Adding...' : 'Add Experience'}
          </button>

          {status.message && (
            <p className={`status ${status.isError ? 'error' : 'success'}`}>
              {status.message}
            </p>
          )}
        </form>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: #f5f5f5;
        }

        .main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 800px;
          width: 100%;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 2.5rem;
          text-align: center;
          color: #2c3e50;
          margin-bottom: 2rem;
        }

        .form {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 600px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #2c3e50;
          font-weight: 500;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-group textarea {
          resize: vertical;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background-color: #2c3e50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover {
          background-color: #34495e;
        }

        .submit-btn:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }

        .status {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 4px;
          text-align: center;
        }

        .success {
          background-color: #d4edda;
          color: #155724;
        }

        .error {
          background-color: #f8d7da;
          color: #721c24;
        }

        @media (max-width: 600px) {
          .form {
            padding: 1.5rem;
            margin: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
} 