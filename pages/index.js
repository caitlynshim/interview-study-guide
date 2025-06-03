import React, { useEffect } from 'react';
import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import { diffLines } from 'diff';

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

// Animated ellipsis component
function AnimatedEllipsis() {
  return <span className="ellipsis">&nbsp;<span>.</span><span>.</span><span>.</span><style jsx>{`
    .ellipsis span {
      opacity: 0.2;
      animation: blink 1.2s infinite;
      font-weight: bold;
      font-size: 1.2em;
    }
    .ellipsis span:nth-child(1) { animation-delay: 0s; }
    .ellipsis span:nth-child(2) { animation-delay: 0.3s; }
    .ellipsis span:nth-child(3) { animation-delay: 0.6s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: 0.2; }
      40% { opacity: 1; }
    }
  `}</style></span>;
}

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
  const [showWriteIn, setShowWriteIn] = useState(false);
  const [writeInAnswer, setWriteInAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [suggestedUpdate, setSuggestedUpdate] = useState(null);
  const [matchedExperience, setMatchedExperience] = useState(null);
  const [showPractice, setShowPractice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [addExpFields, setAddExpFields] = useState({ title: '', content: '', tags: '', category: '', role: '', date: '' });
  const [addExpLoading, setAddExpLoading] = useState(false);
  const [addExpError, setAddExpError] = useState('');
  const [addExpSuccess, setAddExpSuccess] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const router = useRouter();

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

  const requireQuestion = () => {
    if (!question || !question.trim()) {
      setError('Please select or enter a question before proceeding.');
      setAnswerError('Please select or enter a question before proceeding.');
      setEvalError('Please select or enter a question before proceeding.');
      setTranscribeError('Please select or enter a question before proceeding.');
      return false;
    }
    return true;
  };

  // Add a resetAll function
  function resetAll() {
    setAnswer(''); setAnswerError(''); setShowWriteIn(false); setWriteInAnswer(''); setEvaluation(''); setEvalError(''); setEvalLoading(false); setSuggestedUpdate(null); setMatchedExperience(null); setShowPractice(false); setRecording(false); setAudioUrl(null); setTranscript(''); setTranscribeError(''); setTranscribeLoading(false); setShowAddExperience(false); setAddExpFields({ title: '', content: '', tags: '', category: '', role: '', date: '' }); setAddExpError(''); setAddExpSuccess('');
  }

  return (
    <div className="spring-bg">
      {/* Navigation Bar */}
      <nav className="spring-navbar">
        <div className="spring-navbar-title">Mock Interview Questions</div>
        <div className="spring-navbar-links">
          <a href="/" className="spring-navbar-link active">Answer a question</a>
          <a href="/add-experience" className="spring-navbar-link">Add an experience</a>
          <a href="/navigate-experiences" className="spring-navbar-link">Navigate experiences</a>
        </div>
      </nav>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="spring-generate-btn"
                onClick={() => {
                  if (!requireQuestion()) return;
                  resetAll();
                  handleGenerateAnswer();
                }}
                disabled={loading}
                style={{ minWidth: 160 }}
              >
                Generate Answer
              </button>
              <button
                className="spring-writein-btn"
                onClick={() => {
                  if (!requireQuestion()) return;
                  resetAll();
                  setShowWriteIn(true);
                }}
                style={{ minWidth: 160, background: '#e6e9d8', color: '#4a5a23', border: '1px solid #bfc7a1', fontWeight: 600 }}
              >
                Write-in answer
              </button>
              <button
                className="spring-practice-btn"
                onClick={() => {
                  if (!requireQuestion()) return;
                  resetAll();
                  setShowPractice(true);
                }}
                style={{ minWidth: 160, background: '#f7e6d8', color: '#7b4a23', border: '1px solid #e0bfa1', fontWeight: 600 }}
              >
                Practice out loud
              </button>
            </div>
          </div>

          {/* Render generated answer */}
          {answerLoading && (
            <div className="spring-answer-box" style={{ textAlign: 'center', fontWeight: 500, fontSize: '1.1em' }}>
              Generating answer<AnimatedEllipsis />
            </div>
          )}
          {answer && (
            <div className="spring-answer-box">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}

          {/* Write-in answer area */}
          {showWriteIn && (
            <div className="spring-answer-box">
              <textarea
                className="spring-input"
                style={{ width: '100%', minHeight: 120, marginBottom: 12 }}
                placeholder="Paste or write your answer here..."
                value={writeInAnswer}
                onChange={e => setWriteInAnswer(e.target.value)}
                disabled={evalLoading}
              />
              <button
                className="spring-btn"
                style={{ minWidth: 180 }}
                onClick={async () => {
                  setEvalError(''); setEvaluation(''); setEvalLoading(true); setSuggestedUpdate(null); setMatchedExperience(null);
                  try {
                    const resp = await fetch('/api/experiences/evaluate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ question, answer: writeInAnswer }),
                    });
                    const data = await resp.json();
                    if (!resp.ok) throw new Error(data.message || 'Failed to evaluate answer');
                    setEvaluation(data.evaluation);
                    setSuggestedUpdate(data.suggestedUpdate || null);
                    setMatchedExperience(data.matchedExperience || null);
                  } catch (err) {
                    setEvalError(err.message);
                  } finally {
                    setEvalLoading(false);
                  }
                }}
                disabled={evalLoading || !writeInAnswer.trim()}
              >
                Submit for Evaluation
              </button>
              {evalLoading && (
                <div style={{ textAlign: 'center', fontWeight: 500, fontSize: '1.1em', margin: '1em 0' }}>
                  Evaluating<AnimatedEllipsis />
                </div>
              )}
              {showWriteIn && evaluation && !evalLoading && (
                <div className="spring-eval-box">
                  <ReactMarkdown>{evaluation}</ReactMarkdown>
                  {matchedExperience && suggestedUpdate ? (
                    <div className="spring-match-prompt" style={{marginTop: '1.5em', background: '#f7f8f3', border: '1px solid #bfc7a1', borderRadius: 8, padding: '1.2em'}}>
                      <div style={{fontWeight: 600, marginBottom: 8}}>
                        This answer matches an existing experience:
                      </div>
                      {(matchedExperience.content && suggestedUpdate.content) ? (
                        <div style={{display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 8}}>
                          <div style={{flex: 1}}>
                            <b>Old Experience</b>
                            <pre style={{background: '#fff0ee', borderRadius: 4, padding: 8, marginTop: 4, minHeight: 80, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                              {diffLines(matchedExperience.content, suggestedUpdate.content).map((part, i) =>
                                <span key={i} style={{background: part.removed ? '#ffeaea' : undefined, color: part.removed ? '#c0392b' : undefined}}>{part.removed ? part.value : null}</span>
                              )}
                            </pre>
                          </div>
                          <div style={{flex: 1}}>
                            <b>Suggested Update</b>
                            <pre style={{background: '#e7ecd9', borderRadius: 4, padding: 8, marginTop: 4, minHeight: 80, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                              {diffLines(matchedExperience.content, suggestedUpdate.content).map((part, i) =>
                                <span key={i} style={{background: part.added ? '#e6ffe6' : undefined, color: part.added ? '#217a3c' : undefined}}>{part.added ? part.value : null}</span>
                              )}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div style={{color: '#c0392b', marginBottom: 8}}>Unable to show diff: missing content.</div>
                      )}
                      <div style={{display: 'flex', gap: '1em', marginTop: 12}}>
                        <button className="spring-btn" style={{background: '#bfc7a1', color: '#4a5a23'}} onClick={() => {
                          router.push({
                            pathname: '/navigate-experiences',
                            query: { editId: matchedExperience._id, suggested: JSON.stringify(suggestedUpdate) },
                          });
                        }}>Edit Existing</button>
                        <button className="spring-btn" style={{background: '#e6e9d8', color: '#4a5a23'}} onClick={() => {
                          setMatchedExperience(null); setSuggestedUpdate(null); setShowAddExperience(true);
                        }}>Continue New</button>
                      </div>
                    </div>
                  ) : null}
                  {!matchedExperience && !suggestedUpdate && (
                    <div className="spring-no-match-prompt" style={{marginTop: '1.5em', background: '#f7f8f3', border: '1px solid #bfc7a1', borderRadius: 8, padding: '1.2em'}}>
                      <div style={{fontWeight: 600, marginBottom: 8}}>No similar experience found.</div>
                      <div style={{marginBottom: 8}}>Would you like to add this as a new experience?</div>
                      <button className="spring-btn" style={{background: '#bfc7a1', color: '#4a5a23'}} onClick={() => {
                        router.push({
                          pathname: '/add-experience',
                          query: { title: question, content: writeInAnswer },
                        });
                      }}>Add Experience</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Practice Out Loud Modal/Area */}
          {showPractice && (
            <div className="spring-practice-area">
              {!recording && !audioUrl && (
                <button onClick={async () => {
                  setTranscribeError('');
                  setTranscript('');
                  setAudioUrl(null);
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorderRef.current = new window.MediaRecorder(stream);
                    audioChunksRef.current = [];
                    mediaRecorderRef.current.ondataavailable = (e) => {
                      if (e.data.size > 0) audioChunksRef.current.push(e.data);
                    };
                    mediaRecorderRef.current.onstop = () => {
                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                      setAudioUrl(URL.createObjectURL(audioBlob));
                    };
                    mediaRecorderRef.current.start();
                    setRecording(true);
                  } catch (err) {
                    setTranscribeError('Microphone access denied or unavailable.');
                  }
                }} style={{ background: '#e6e9d8', color: '#4a5a23', fontWeight: 600 }}>Start Recording</button>
              )}
              {recording && (
                <button onClick={() => {
                  mediaRecorderRef.current.stop();
                  setRecording(false);
                }} style={{ background: '#f7e6d8', color: '#7b4a23', fontWeight: 600 }}>Stop Recording</button>
              )}
              {audioUrl && !transcript && (
                <div style={{ marginTop: '1rem' }}>
                  <audio src={audioUrl} controls />
                  <button onClick={async () => {
                    setTranscribeLoading(true);
                    setTranscribeError('');
                    setTranscript('');
                    try {
                      const audioBlob = await fetch(audioUrl).then(r => r.blob());
                      if (!audioBlob || audioBlob.size === 0) {
                        setTranscribeError('Audio file is empty. Please record your answer before submitting.');
                        setTranscribeLoading(false);
                        return;
                      }
                      const formData = new FormData();
                      formData.append('audio', audioBlob, 'recording.webm');
                      const resp = await fetch('/api/experiences/transcribe', { method: 'POST', body: formData });
                      let data;
                      try {
                        data = await resp.json();
                      } catch (jsonErr) {
                        setTranscribeError('Transcription error: Invalid JSON response');
                        return;
                      }
                      if (resp.ok) {
                        setTranscript(data.transcript);
                      } else {
                        setTranscribeError(typeof data === 'object' ? data : (data.message || 'Transcription failed'));
                      }
                    } catch (err) {
                      setTranscribeError('Transcription error: ' + err.message);
                    } finally {
                      setTranscribeLoading(false);
                    }
                  }} disabled={transcribeLoading} style={{ marginLeft: '1rem', background: '#e6e9d8', color: '#4a5a23', fontWeight: 600 }}>
                    Transcribe & Evaluate
                  </button>
                  {transcribeLoading && (
                    <span style={{ marginLeft: 8 }}>
                      Transcribing<AnimatedEllipsis />
                    </span>
                  )}
                  {evalLoading && (
                    <div style={{ textAlign: 'center', fontWeight: 500, fontSize: '1.1em', margin: '1em 0' }}>
                      Evaluating<AnimatedEllipsis />
                    </div>
                  )}
                  {evalError && <div style={{ color: 'red', marginTop: 8 }}>{evalError}</div>}
                  {evaluation && (
                    <div className="spring-answer" style={{ marginTop: 16 }}>
                      <ReactMarkdown>{evaluation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Add a Reset button when answer or evaluation is shown */}
      {(answer || evaluation) && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button className="spring-btn" style={{ background: SPRING.gray, color: '#fff', minWidth: 100 }} onClick={resetAll}>Reset</button>
        </div>
      )}
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
        .spring-practice-area {
          background: ${SPRING.accent3};
          border-radius: 10px;
          padding: 1.1rem 1rem;
          min-height: 3.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
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
        }
      `}</style>
    </div>
  );
} 