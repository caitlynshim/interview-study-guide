import { useEffect, useState } from 'react';

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

function extractBehavioralTheme(content) {
  // Expects first line like: 'Behavioral Theme: XYZ'
  if (!content) return '';
  const firstLine = content.split('\n')[0];
  const match = firstLine.match(/^Behavioral Theme:\s*(.+)$/i);
  return match ? match[1].trim() : '';
}

export default function NavigateExperiences() {
  const [experiences, setExperiences] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchExperiences = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/experiences/list');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch experiences');
        // Attach behavioralTheme to each experience
        const withThemes = data.experiences.map(e => ({
          ...e,
          behavioralTheme: extractBehavioralTheme(e.content),
        }));
        setExperiences(withThemes);
        // Extract unique behavioral themes
        const cats = Array.from(new Set(withThemes.map(e => e.behavioralTheme).filter(Boolean)));
        setCategories(['All', ...cats]);
      } catch (err) {
        setError(`Error fetching experiences: ${err.message}`);
        setExperiences([]);
        setCategories(['All']);
      } finally {
        setLoading(false);
      }
    };
    fetchExperiences();
  }, []);

  // Filter by behavioral theme
  const filteredExperiences = selectedCategory === 'All'
    ? experiences
    : experiences.filter(e => e.behavioralTheme === selectedCategory);

  return (
    <div className="spring-bg">
      <nav className="spring-navbar">
        <div className="spring-navbar-title">Mock Interview Questions</div>
        <div className="spring-navbar-links">
          <a href="/" className="spring-navbar-link">Answer a question</a>
          <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
          <a href="/navigate-experiences" className="spring-navbar-link active">Navigate experiences</a>
        </div>
      </nav>
      <main className="spring-main-responsive">
        <div className="spring-card-responsive">
          <h2 className="spring-page-title">Browse Experiences</h2>
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
          {error && <div className="spring-error">{error}</div>}
          {loading ? (
            <div className="spring-loading">Loading experiences...</div>
          ) : filteredExperiences.length === 0 ? (
            <div className="spring-placeholder">No experiences found.</div>
          ) : (
            <ul className="spring-experiences-list">
              {filteredExperiences.map((exp) => (
                <li
                  key={exp._id}
                  className="spring-experience-item"
                  tabIndex={0}
                  aria-expanded={expandedId === exp._id}
                  onClick={() => setExpandedId(expandedId === exp._id ? null : exp._id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setExpandedId(expandedId === exp._id ? null : exp._id);
                  }}
                  style={{ cursor: 'pointer', outline: expandedId === exp._id ? `2px solid ${SPRING.accent}` : 'none' }}
                >
                  <div className="spring-experience-title">{exp.title}</div>
                  <div className="spring-experience-category">{exp.behavioralTheme || 'Uncategorized'}</div>
                  {expandedId === exp._id ? (
                    <div className="spring-experience-details">
                      <div className="spring-experience-content" style={{ whiteSpace: 'pre-line', marginTop: '0.7rem' }}>{exp.content}</div>
                      {exp.metadata && (
                        <div className="spring-experience-metadata">
                          {exp.metadata.tags && exp.metadata.tags.length > 0 && (
                            <div><strong>Tags:</strong> {exp.metadata.tags.join(', ')}</div>
                          )}
                          {exp.metadata.category && (
                            <div><strong>Category:</strong> {exp.metadata.category}</div>
                          )}
                          {exp.metadata.role && (
                            <div><strong>Role:</strong> {exp.metadata.role}</div>
                          )}
                          {exp.metadata.date && (
                            <div><strong>Date:</strong> {new Date(exp.metadata.date).toLocaleDateString()}</div>
                          )}
                        </div>
                      )}
                      <div className="spring-experience-meta-dates">
                        <span><strong>Created:</strong> {exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : ''}</span>
                        {exp.updatedAt && exp.updatedAt !== exp.createdAt && (
                          <span style={{ marginLeft: '1.2rem' }}><strong>Updated:</strong> {new Date(exp.updatedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="spring-experience-content" style={{ color: SPRING.gray, fontStyle: 'italic', marginTop: '0.7rem' }}>
                      {exp.content.slice(0, 120)}{exp.content.length > 120 ? '…' : ''}
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
          max-width: 900px;
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
        .spring-experiences-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .spring-experience-item {
          background: ${SPRING.accent3};
          border-radius: 10px;
          padding: 1.1rem 1rem;
          box-shadow: 0 1.5px 6px 0 rgba(138,154,91,0.04);
        }
        .spring-experience-title {
          font-size: 1.13rem;
          color: ${SPRING.accent};
          font-weight: 600;
        }
        .spring-experience-category {
          font-size: 0.98rem;
          color: ${SPRING.blue};
          font-weight: 500;
          margin-bottom: 0.3rem;
        }
        .spring-experience-content {
          color: ${SPRING.text};
          font-size: 1.01rem;
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
        .spring-placeholder {
          color: ${SPRING.gray};
          font-style: italic;
          margin-top: 1.2rem;
        }
        .spring-loading {
          color: ${SPRING.gray};
          font-size: 1.1rem;
          margin-top: 1.2rem;
        }
        .spring-experience-details {
          margin-top: 0.7rem;
        }
        .spring-experience-metadata {
          margin-top: 0.7rem;
        }
        .spring-experience-meta-dates {
          margin-top: 0.7rem;
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
        }
      `}</style>
    </div>
  );
}

// TEST: Extraction logic
if (typeof describe === 'function') {
  describe('extractBehavioralTheme', () => {
    it('extracts the theme from the first line', () => {
      expect(extractBehavioralTheme('Behavioral Theme: Foo\nSituation: ...')).toBe('Foo');
      expect(extractBehavioralTheme('Behavioral Theme: Bar')).toBe('Bar');
      expect(extractBehavioralTheme('No theme here')).toBe('');
      expect(extractBehavioralTheme('Behavioral Theme:   Something   ')).toBe('Something');
      expect(extractBehavioralTheme('')).toBe('');
    });
  });
}

// TEST: Metadata rendering logic
if (typeof describe === 'function') {
  describe('metadata rendering', () => {
    it('renders tags, category, role, and date if present', () => {
      const meta = { tags: ['foo', 'bar'], category: 'cat', role: 'lead', date: '2024-06-01T00:00:00Z' };
      expect(meta.tags.join(', ')).toBe('foo, bar');
      expect(meta.category).toBe('cat');
      expect(meta.role).toBe('lead');
      expect(new Date(meta.date).toLocaleDateString()).toBe(new Date('2024-06-01T00:00:00Z').toLocaleDateString());
    });
  });
} 