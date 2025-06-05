import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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

function validate(fields) {
  const errors = {};
  if (!fields.title.trim()) errors.title = 'Title is required.';
  if (!fields.content.trim()) errors.content = 'Content is required.';
  return errors;
}

export default function AddExperience() {
  const router = useRouter();
  const [fields, setFields] = useState({
    title: '',
    content: '',
    tags: '',
    category: '',
    role: '',
    date: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // On mount, prefill from query if present
  useEffect(() => {
    if (router.isReady) {
      setFields(f => ({
        ...f,
        title: router.query.title || f.title,
        content: router.query.content || f.content,
        tags: router.query.tags || f.tags,
        category: router.query.category || f.category,
        role: router.query.role || f.role,
        date: router.query.date || f.date,
      }));
    }
  }, [router.isReady, router.query]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFields(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate(fields);
    setErrors(errs);
    setSuccess('');
    setSubmitError('');
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/experiences/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.message || 'Failed to submit experience.');
        setErrors(data.errors || {});
      } else {
        setSuccess('Experience submitted!');
        setFields({ title: '', content: '', tags: '', category: '', role: '', date: '' });
      }
    } catch (err) {
      setSubmitError('Failed to submit experience.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="spring-bg">
      <nav className="spring-navbar">
        <div className="spring-navbar-title">Mock Interview Questions</div>
        <div className="spring-navbar-links">
          <a href="/" className="spring-navbar-link">Answer a question</a>
          <a href="/add-experience" className="spring-navbar-link active">Add an experience</a>
          <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
          <a href="/manage-questions" className="spring-navbar-link">Manage questions</a>
        </div>
      </nav>
      <main className="spring-main-responsive">
        <div className="spring-card-responsive">
          <h2 className="spring-page-title">Add a New Experience</h2>
          <form className="spring-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
            <div className="spring-form-group">
              <label htmlFor="title">Title <span className="spring-required">*</span></label>
              <input
                id="title"
                name="title"
                type="text"
                value={fields.title}
                onChange={handleChange}
                className={errors.title ? 'spring-input error' : 'spring-input'}
                disabled={submitting}
                required
              />
              {errors.title && <div className="spring-error-msg">{errors.title}</div>}
            </div>
            <div className="spring-form-group">
              <label htmlFor="content">Content <span className="spring-required">*</span></label>
              <textarea
                id="content"
                name="content"
                rows={8}
                value={fields.content}
                onChange={handleChange}
                className={errors.content ? 'spring-input error' : 'spring-input'}
                placeholder="Start with: Behavioral Theme: ...\nSituation: ...\nTask: ...\nAction: ...\nResult: ...\nReflection: ..."
                disabled={submitting}
                required
              />
              {errors.content && <div className="spring-error-msg">{errors.content}</div>}
              <div className="spring-hint">Tip: Start with <b>Behavioral Theme:</b> and use markdown for formatting.</div>
            </div>
            <div className="spring-form-row">
              <div className="spring-form-group">
                <label htmlFor="tags">Tags</label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={fields.tags}
                  onChange={handleChange}
                  className="spring-input"
                  placeholder="Comma-separated"
                  disabled={submitting}
                />
              </div>
              <div className="spring-form-group">
                <label htmlFor="category">Category</label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={fields.category}
                  onChange={handleChange}
                  className="spring-input"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="spring-form-row">
              <div className="spring-form-group">
                <label htmlFor="role">Role</label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  value={fields.role}
                  onChange={handleChange}
                  className="spring-input"
                  disabled={submitting}
                />
              </div>
              <div className="spring-form-group">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={fields.date}
                  onChange={handleChange}
                  className="spring-input"
                  disabled={submitting}
                />
              </div>
            </div>
            <button
              type="submit"
              className="spring-submit-btn"
              disabled={submitting || Object.keys(validate(fields)).length > 0}
            >
              {submitting ? 'Submitting…' : 'Add Experience'}
            </button>
            {success && <div className="spring-success-msg">{success}</div>}
            {submitError && <div className="spring-error-msg">{submitError}</div>}
          </form>
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
          max-width: 700px;
          width: 100%;
          margin: 2.5rem 0;
        }
        .spring-page-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: ${SPRING.accent};
          margin-bottom: 1.2rem;
        }
        .spring-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .spring-form-row {
          display: flex;
          gap: 1.2rem;
        }
        .spring-form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .spring-input {
          border: 1.5px solid ${SPRING.border};
          border-radius: 7px;
          padding: 0.6rem 0.9rem;
          font-size: 1.05rem;
          margin-top: 0.2rem;
          background: #fff;
          color: ${SPRING.text};
          transition: border 0.16s;
        }
        .spring-input:focus {
          border: 1.5px solid ${SPRING.accent};
          outline: none;
        }
        .spring-input.error {
          border: 1.5px solid ${SPRING.error};
        }
        .spring-required {
          color: ${SPRING.error};
          font-size: 1.1em;
        }
        .spring-hint {
          color: ${SPRING.gray};
          font-size: 0.97rem;
          margin-top: 0.2rem;
        }
        .spring-submit-btn {
          background: ${SPRING.accent};
          color: #fff;
          border: none;
          border-radius: 7px;
          padding: 0.7rem 1.7rem;
          font-size: 1.08rem;
          font-weight: 600;
          margin-top: 0.7rem;
          cursor: pointer;
          transition: background 0.16s;
        }
        .spring-submit-btn:disabled {
          background: ${SPRING.accent2};
          color: #fff;
          cursor: not-allowed;
        }
        .spring-error-msg {
          color: ${SPRING.error};
          background: ${SPRING.errorBg};
          border: 1px solid ${SPRING.error};
          border-radius: 6px;
          padding: 0.3rem 0.7rem;
          margin-top: 0.3rem;
          font-size: 0.99rem;
        }
        .spring-success-msg {
          color: #2d3a2e;
          background: #e7ecd9;
          border: 1px solid #b7c68b;
          border-radius: 6px;
          padding: 0.3rem 0.7rem;
          margin-top: 0.3rem;
          font-size: 0.99rem;
        }
        @media (max-width: 700px) {
          .spring-navbar {
            flex-direction: column;
            align-items: flex-start;
            padding: 0.7rem 1rem;
          }
          .spring-navbar-title {
            margin-bottom: 0.5rem;
          }
          .spring-navbar-links {
            gap: 0.7rem;
          }
          .spring-card-responsive {
            padding: 1.2rem 0.5rem 1.2rem 0.5rem;
          }
          .spring-form-row {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
} 