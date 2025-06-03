import React, { useState, useEffect } from 'react';

const SPRING = {
  bg: '#f7f8f3',
  beige: '#f3ede4',
  accent: '#8a9a5b',
  accent2: '#9aab6b',
  accent3: '#e6e9d8',
  text: '#2d3d0f',
  gray: '#8e8e8e',
  blue: '#5b8a9a',
  error: '#d32f2f',
  errorBg: '#ffebee',
};

export default function TrackProgress() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentView, setCurrentView] = useState('overview'); // overview, practiced, top, lowest, unpracticed

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/questions/analytics');
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      setError('Failed to load analytics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTrendIcon = (trend) => {
    if (trend > 0.5) return '📈';
    if (trend < -0.5) return '📉';
    return '➡️';
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return '#4caf50'; // Green
    if (rating >= 6) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Filter questions by category
  const filterQuestionsByCategory = (questions) => {
    if (selectedCategory === 'All') return questions;
    return questions.filter(q => q.category === selectedCategory);
  };

  // Get all unique categories
  const getAllCategories = () => {
    if (!analytics) return ['All'];
    const categories = new Set(['All']);
    if (analytics.categoryStats) {
      analytics.categoryStats.forEach(cat => categories.add(cat.category));
    }
    if (analytics.allPracticedQuestions) {
      analytics.allPracticedQuestions.forEach(q => categories.add(q.category));
    }
    return Array.from(categories);
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
            <a href="/track-progress" className="spring-navbar-link active">Track progress</a>
          </div>
        </nav>
        <div className="loading-container">
          <div className="loading-text">Loading analytics...</div>
        </div>
        <style jsx>{`
          .spring-bg {
            min-height: 100vh;
            background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
          }
          .spring-navbar {
            width: 100vw;
            background: #fff;
            border-bottom: 1.5px solid ${SPRING.accent3};
            box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.7rem 2.5rem;
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
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 50vh;
          }
          .loading-text {
            font-size: 1.2rem;
            color: ${SPRING.text};
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spring-bg">
        <nav className="spring-navbar">
          <div className="spring-navbar-title">Mock Interview Questions</div>
          <div className="spring-navbar-links">
            <a href="/" className="spring-navbar-link">Answer a question</a>
            <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
            <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
            <a href="/track-progress" className="spring-navbar-link active">Track progress</a>
          </div>
        </nav>
        <div className="error-container">
          <div className="error-text">{error}</div>
          <button className="retry-btn" onClick={fetchAnalytics}>Retry</button>
        </div>
        <style jsx>{`
          .spring-bg {
            min-height: 100vh;
            background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
          }
          .spring-navbar {
            width: 100vw;
            background: #fff;
            border-bottom: 1.5px solid ${SPRING.accent3};
            box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.7rem 2.5rem;
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
          .error-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 50vh;
            gap: 1rem;
          }
          .error-text {
            color: ${SPRING.error};
            font-size: 1.1rem;
          }
          .retry-btn {
            background: ${SPRING.accent};
            color: #fff;
            border: none;
            border-radius: 7px;
            padding: 0.6rem 1.3rem;
            font-size: 1rem;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  if (!analytics || analytics.summary.totalSessions === 0) {
    return (
      <div className="spring-bg">
        <nav className="spring-navbar">
          <div className="spring-navbar-title">Mock Interview Questions</div>
          <div className="spring-navbar-links">
            <a href="/" className="spring-navbar-link">Answer a question</a>
            <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
            <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
            <a href="/track-progress" className="spring-navbar-link active">Track progress</a>
          </div>
        </nav>
        <div className="empty-container">
          <div className="empty-text">
            <h2>No Practice Sessions Yet</h2>
            <p>Start practicing questions to see your progress analytics!</p>
            <a href="/" className="start-btn">Practice a Question</a>
          </div>
        </div>
        <style jsx>{`
          .spring-bg {
            min-height: 100vh;
            background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
          }
          .spring-navbar {
            width: 100vw;
            background: #fff;
            border-bottom: 1.5px solid ${SPRING.accent3};
            box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.7rem 2.5rem;
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
          .empty-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 70vh;
          }
          .empty-text {
            text-align: center;
            color: ${SPRING.text};
          }
          .empty-text h2 {
            color: ${SPRING.accent};
            margin-bottom: 0.5rem;
          }
          .empty-text p {
            margin-bottom: 1.5rem;
            color: ${SPRING.gray};
          }
          .start-btn {
            background: ${SPRING.accent};
            color: #fff;
            text-decoration: none;
            border-radius: 7px;
            padding: 0.8rem 1.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            display: inline-block;
          }
          .start-btn:hover {
            background: ${SPRING.accent2};
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
          <a href="/track-progress" className="spring-navbar-link active">Track progress</a>
        </div>
      </nav>

      <main className="main-container">
        <div className="progress-header">
          <h1>Progress Analytics</h1>
          <button className="refresh-btn" onClick={fetchAnalytics}>
            🔄 Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{analytics.summary.totalSessions}</div>
            <div className="summary-label">Total Sessions</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{analytics.summary.overallAverageRating}</div>
            <div className="summary-label">Average Rating</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {getTrendIcon(analytics.summary.overallTrend)} {Math.abs(analytics.summary.overallTrend).toFixed(1)}
            </div>
            <div className="summary-label">Overall Trend</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{analytics.summary.totalCategories}</div>
            <div className="summary-label">Categories Practiced</div>
          </div>
        </div>

        {/* View Selector */}
        <div className="view-selector">
          <button 
            className={`view-btn ${currentView === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentView('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`view-btn ${currentView === 'practiced' ? 'active' : ''}`}
            onClick={() => setCurrentView('practiced')}
          >
            📝 All Practiced ({analytics.summary.practicedQuestionsCount || 0})
          </button>
          <button 
            className={`view-btn ${currentView === 'top' ? 'active' : ''}`}
            onClick={() => setCurrentView('top')}
          >
            ⭐ Top Questions
          </button>
          <button 
            className={`view-btn ${currentView === 'lowest' ? 'active' : ''}`}
            onClick={() => setCurrentView('lowest')}
          >
            📉 Need Practice
          </button>
          <button 
            className={`view-btn ${currentView === 'unpracticed' ? 'active' : ''}`}
            onClick={() => setCurrentView('unpracticed')}
          >
            🆕 Unpracticed ({analytics.summary.unpracticedQuestionsCount})
          </button>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <label>Filter by Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {getAllCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Content based on current view */}
        {currentView === 'overview' && (
          <>
            {/* Rating Trends Chart */}
            {analytics.ratingTrends.length > 0 && (
              <div className="chart-container">
                <h2>Rating Improvement Over Time</h2>
                <div className="rating-trend">
                  {analytics.ratingTrends.map((point, index) => (
                    <div key={index} className="trend-point" style={{
                      height: `${(point.rating / 10) * 100}%`,
                      backgroundColor: getRatingColor(point.rating)
                    }}>
                      <div className="trend-tooltip">
                        Session {point.sessionNumber}<br/>
                        Rating: {point.rating}/10<br/>
                        {formatDate(point.date)}<br/>
                        {point.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Performance */}
            {analytics.categoryStats.length > 0 && (
              <div className="chart-container">
                <h2>Category Performance</h2>
                <div className="category-grid">
                  {analytics.categoryStats.map((cat, index) => (
                    <div key={index} className="category-card">
                      <div className="category-name">{cat.category}</div>
                      <div className="category-stats">
                        <div className="category-rating" style={{ color: getRatingColor(cat.averageRating) }}>
                          {cat.averageRating.toFixed(1)}/10
                        </div>
                        <div className="category-trend">
                          {getTrendIcon(cat.trend)} {Math.abs(cat.trend).toFixed(1)}
                        </div>
                        <div className="category-sessions">{cat.totalSessions} sessions</div>
                        <div className="category-last">Last: {formatDate(cat.lastPracticed)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Trends */}
            {analytics.timeTrends.length > 0 && (
              <div className="chart-container">
                <h2>Daily Activity (Last 30 Days)</h2>
                <div className="time-trend">
                  {analytics.timeTrends.map((day, index) => (
                    <div key={index} className="day-bar">
                      <div className="day-sessions" style={{
                        height: `${Math.min(day.sessionCount * 20, 100)}px`,
                        backgroundColor: getRatingColor(day.averageRating)
                      }}>
                        <div className="day-tooltip">
                          {formatDate(day.date)}<br/>
                          {day.sessionCount} sessions<br/>
                          Avg: {day.averageRating.toFixed(1)}/10
                        </div>
                      </div>
                      <div className="day-label">{formatDate(day.date).split(',')[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* All Practiced Questions */}
        {currentView === 'practiced' && analytics.allPracticedQuestions && (
          <div className="chart-container">
            <h2>All Practiced Questions</h2>
            <div className="questions-list">
              {filterQuestionsByCategory(analytics.allPracticedQuestions).map((q, index) => (
                <div key={index} className="question-card practiced">
                  <div className="question-text">{q.questionText}</div>
                  <div className="question-meta">
                    <span className="question-category">{q.category}</span>
                    <span className="question-rating" style={{ color: getRatingColor(q.averageRating) }}>
                      Avg: {q.averageRating.toFixed(1)}/10
                    </span>
                    <span className="question-sessions">{q.sessions.length} attempts</span>
                    <span className="question-last">Last: {formatDate(q.lastPracticed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Questions */}
        {currentView === 'top' && analytics.topQuestions && (
          <div className="chart-container">
            <h2>🏆 Top Performing Questions</h2>
            <div className="questions-list">
              {filterQuestionsByCategory(analytics.topQuestions).map((q, index) => (
                <div key={index} className="question-card top">
                  <div className="question-text">
                    <span className="rank">#{index + 1}</span>
                    {q.questionText}
                  </div>
                  <div className="question-meta">
                    <span className="question-category">{q.category}</span>
                    <span className="question-rating" style={{ color: getRatingColor(q.averageRating) }}>
                      Avg: {q.averageRating.toFixed(1)}/10
                    </span>
                    <span className="question-sessions">{q.sessions.length} attempts</span>
                    <span className="question-last">Last: {formatDate(q.lastPracticed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lowest Questions / Need Practice */}
        {currentView === 'lowest' && analytics.lowestQuestions && (
          <div className="chart-container">
            <h2>📉 Questions Needing More Practice</h2>
            <div className="questions-list">
              {filterQuestionsByCategory(analytics.lowestQuestions).map((q, index) => (
                <div key={index} className="question-card lowest">
                  <div className="question-text">{q.questionText}</div>
                  <div className="question-meta">
                    <span className="question-category">{q.category}</span>
                    <span className="question-rating" style={{ color: getRatingColor(q.averageRating) }}>
                      Avg: {q.averageRating.toFixed(1)}/10
                    </span>
                    <span className="question-sessions">{q.sessions.length} attempts</span>
                    <span className="question-last">Last: {formatDate(q.lastPracticed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpracticed Questions */}
        {currentView === 'unpracticed' && analytics.unpracticedQuestions && (
          <div className="chart-container">
            <h2>🆕 Questions to Try ({analytics.summary.unpracticedQuestionsCount} total)</h2>
            <div className="questions-list">
              {filterQuestionsByCategory(analytics.unpracticedQuestions).map((q, index) => (
                <div key={index} className="question-card unpracticed">
                  <div className="question-text">{q.questionText}</div>
                  <div className="question-meta">
                    <span className="question-category">{q.category}</span>
                    <span className="question-difficulty">{q.difficulty}</span>
                    {q.tags && q.tags.length > 0 && (
                      <span className="question-tags">{q.tags.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .spring-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, ${SPRING.bg} 60%, ${SPRING.beige} 100%);
        }
        
        .spring-navbar {
          width: 100vw;
          background: #fff;
          border-bottom: 1.5px solid ${SPRING.accent3};
          box-shadow: 0 2px 8px 0 rgba(138,154,91,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 2.5rem;
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
        
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .progress-header h1 {
          color: ${SPRING.accent};
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0;
        }
        
        .refresh-btn {
          background: ${SPRING.accent3};
          color: ${SPRING.accent};
          border: 1px solid ${SPRING.accent};
          border-radius: 7px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.16s;
        }
        
        .refresh-btn:hover {
          background: ${SPRING.accent};
          color: #fff;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .summary-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 16px rgba(138,154,91,0.1);
          text-align: center;
        }
        
        .summary-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: ${SPRING.accent};
          margin-bottom: 0.5rem;
        }
        
        .summary-label {
          color: ${SPRING.gray};
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .view-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        
        .view-btn {
          background: #fff;
          color: ${SPRING.text};
          border: 1px solid ${SPRING.accent3};
          border-radius: 7px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.16s;
        }
        
        .view-btn.active {
          background: ${SPRING.accent};
          color: #fff;
          border-color: ${SPRING.accent};
        }
        
        .view-btn:hover:not(.active) {
          background: ${SPRING.accent3};
          color: ${SPRING.accent};
        }
        
        .category-filter {
          background: #fff;
          border-radius: 7px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 8px rgba(138,154,91,0.05);
        }
        
        .category-filter label {
          font-weight: 500;
          color: ${SPRING.text};
        }
        
        .category-select {
          background: #fff;
          border: 1px solid ${SPRING.accent3};
          border-radius: 5px;
          padding: 0.4rem 0.8rem;
          color: ${SPRING.text};
          font-size: 0.9rem;
        }
        
        .chart-container {
          background: #fff;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 16px rgba(138,154,91,0.1);
        }
        
        .chart-container h2 {
          color: ${SPRING.accent};
          font-size: 1.4rem;
          margin-bottom: 1.5rem;
          font-weight: 600;
        }
        
        .rating-trend {
          display: flex;
          align-items: end;
          gap: 4px;
          height: 200px;
          padding: 1rem 0;
          border-bottom: 2px solid ${SPRING.accent3};
          position: relative;
        }
        
        .trend-point {
          flex: 1;
          min-width: 8px;
          border-radius: 2px 2px 0 0;
          position: relative;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .trend-point:hover {
          opacity: 0.8;
        }
        
        .trend-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 10;
        }
        
        .trend-point:hover .trend-tooltip {
          opacity: 1;
        }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .category-card {
          background: ${SPRING.accent3};
          border-radius: 8px;
          padding: 1.2rem;
          border: 1px solid ${SPRING.accent};
        }
        
        .category-name {
          font-weight: 600;
          color: ${SPRING.accent};
          margin-bottom: 0.8rem;
          font-size: 1.1rem;
        }
        
        .category-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .category-rating {
          font-weight: 700;
          font-size: 1.2rem;
        }
        
        .category-trend {
          font-size: 0.9rem;
          color: ${SPRING.text};
        }
        
        .category-sessions, .category-last {
          font-size: 0.8rem;
          color: ${SPRING.gray};
        }
        
        .questions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .question-card {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid #f44336;
        }
        
        .question-card.practiced {
          border-left-color: ${SPRING.accent};
          background: ${SPRING.accent3};
        }
        
        .question-card.top {
          border-left-color: #4caf50;
          background: #f0f8ff;
        }
        
        .question-card.lowest {
          border-left-color: #f44336;
          background: #ffebee;
        }
        
        .question-card.unpracticed {
          border-left-color: ${SPRING.blue};
          background: #f0f8ff;
        }
        
        .question-text {
          font-weight: 500;
          color: ${SPRING.text};
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .rank {
          background: #4caf50;
          color: #fff;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          margin-right: 0.5rem;
        }
        
        .question-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .question-category {
          background: ${SPRING.accent};
          color: #fff;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .question-difficulty {
          background: ${SPRING.blue};
          color: #fff;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .question-rating {
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .question-sessions, .question-last {
          color: ${SPRING.gray};
          font-size: 0.8rem;
        }
        
        .question-tags {
          color: ${SPRING.gray};
          font-size: 0.8rem;
          font-style: italic;
        }
        
        .time-trend {
          display: flex;
          align-items: end;
          gap: 2px;
          height: 120px;
          padding: 1rem 0;
        }
        
        .day-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .day-sessions {
          border-radius: 2px 2px 0 0;
          position: relative;
          cursor: pointer;
          min-height: 4px;
          width: 100%;
        }
        
        .day-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 10;
        }
        
        .day-sessions:hover .day-tooltip {
          opacity: 1;
        }
        
        .day-label {
          font-size: 0.7rem;
          color: ${SPRING.gray};
          margin-top: 0.5rem;
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        
        @media (max-width: 768px) {
          .main-container {
            padding: 1rem;
          }
          
          .progress-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .category-stats {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .question-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .view-selector {
            justify-content: center;
          }
          
          .category-filter {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
} 