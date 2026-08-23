import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { mockStudies, disciplines } from './data/mockData';
import ResearchCard from './components/ResearchCard';
import ArticleView from './components/ArticleView';
import CurationModal from './components/CurationModal';
import SubmitModal from './components/SubmitModal';
import AuthModal from './components/AuthModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nexus_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [includeEarlyResearch, setIncludeEarlyResearch] = useState(() => {
    try {
      return (localStorage.getItem('nexus_include_early_research') || 'false') === 'true';
    } catch {
      return false;
    }
  });

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isCurationOpen, setIsCurationOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [papers, setPapers] = useState(mockStudies);
  const [isLiveBackend, setIsLiveBackend] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); 
  const [viewBookmarksOnly, setViewBookmarksOnly] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('nexus_theme', next);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_include_early_research', includeEarlyResearch ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [includeEarlyResearch]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_bookmarks', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  const toggleBookmark = useCallback((paperId) => {
    setBookmarks(prev => 
      prev.includes(paperId) ? prev.filter(id => id !== paperId) : [...prev, paperId]
    );
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/papers`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPapers(data);
          setIsLiveBackend(true);
        }
      })
      .catch(err => {
        console.warn("Using offline research cache:", err.message);
        setIsLiveBackend(false);
      });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const paperId = params.get('paper');
      if (paperId) {
        const found = papers.find(p => p.id === paperId);
        if (found) {
          setSelectedArticle(found);
          return;
        }
      }
      setSelectedArticle(null);
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, [papers]);

  const handleSelectArticle = useCallback((article) => {
    setSelectedArticle(article);
    const url = new URL(window.location.href);
    if (article) {
      url.searchParams.set('paper', article.id);
    } else {
      url.searchParams.delete('paper');
    }
    window.history.pushState(null, '', url.toString());
  }, []);

  const handleBackToFeed = useCallback(() => {
    handleSelectArticle(null);
  }, [handleSelectArticle]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !selectedArticle && !isCurationOpen && !isSubmitOpen && !isAuthOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticle, isCurationOpen, isSubmitOpen, isAuthOpen]);

  const toggleDiscipline = (disc) => {
    setSelectedDisciplines(prev =>
      prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
    );
  };

  const processedStudies = useMemo(() => {
    let list = [...papers];

    if (!includeEarlyResearch) {
      list = list.filter(s => (s.reviewStatus || 'peerReviewed') !== 'preReview');
    }

    if (selectedDisciplines.length > 0) {
      list = list.filter(s => selectedDisciplines.includes(s.discipline));
    }

    if (viewBookmarksOnly) {
      list = list.filter(s => bookmarks.includes(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => {
        const title = (s.title || '').toLowerCase();
        const summary = (s.summary || '').toLowerCase();
        const journal = (s.journal || '').toLowerCase();
        const authors = (s.authors || []).join(' ').toLowerCase();
        const tags = (s.tags || []).join(' ').toLowerCase();
        return title.includes(q) || summary.includes(q) || journal.includes(q) || authors.includes(q) || tags.includes(q);
      });
    }

    if (sortBy === 'citations') {
      list.sort((a, b) => (b.metrics?.citations || 0) - (a.metrics?.citations || 0));
    } else if (sortBy === 'evidence') {
      const score = (level) => (level === 'High' ? 3 : level === 'Moderate' ? 2 : 1);
      list.sort((a, b) => score(b.metrics?.evidenceLevel) - score(a.metrics?.evidenceLevel));
    } else {
      list.sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0));
    }

    return list;
  }, [papers, includeEarlyResearch, selectedDisciplines, viewBookmarksOnly, searchQuery, sortBy, bookmarks]);

  return (
    <div className="app-container">
      <header className="main-header editorial-card">
        <div className="logo-container">
          <button
            type="button"
            className="logo-button"
            onClick={handleBackToFeed}
            aria-label="Nexus home feed"
          >
            <img
              src="/nexus-logo.svg"
              alt="Nexus"
              className="logo-svg"
              height="40"
              draggable={false}
            />
          </button>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            className={`nav-link ${!viewBookmarksOnly && !selectedArticle ? 'active' : ''}`}
            onClick={() => {
              setViewBookmarksOnly(false);
              handleBackToFeed();
            }}
          >
            Discover
          </button>
          <button
            type="button"
            className={`nav-link ${viewBookmarksOnly ? 'active' : ''}`}
            onClick={() => {
              setViewBookmarksOnly(true);
              handleBackToFeed();
            }}
          >
            Saved ({bookmarks.length})
          </button>
          <button type="button" className="nav-link" onClick={() => setIsCurationOpen(true)}>
            Curate Feed {selectedDisciplines.length > 0 && `(${selectedDisciplines.length})`}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              if (isAuthenticated) {
                setIsSubmitOpen(true);
              } else {
                setIsAuthOpen(true);
              }
            }}
          >
            Submit Research {isAuthenticated ? null : <span style={{ fontSize: '0.75em', opacity: 0.7 }}>🔒</span>}
          </button>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className={`chip-toggle ${includeEarlyResearch ? 'active' : ''}`}
            onClick={() => setIncludeEarlyResearch(v => !v)}
            title="Toggle pre-print research inclusion"
          >
            {includeEarlyResearch ? 'Pre-prints: On' : 'Pre-prints: Off'}
          </button>

          <button
            type="button"
            className="theme-button"
            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button
            type="button"
            className="auth-button"
            onClick={() => {
              if (isAuthenticated) {
                setIsAuthenticated(false);
              } else {
                setIsAuthOpen(true);
              }
            }}
          >
            {isAuthenticated ? 'Sign Out' : 'Sign In'}
          </button>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={() => {
          setIsAuthenticated(true);
          setIsSubmitOpen(true);
        }}
      />

      <CurationModal
        isOpen={isCurationOpen}
        onClose={() => setIsCurationOpen(false)}
        selectedDisciplines={selectedDisciplines}
        toggleDiscipline={toggleDiscipline}
      />

      <SubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onPaperAdded={(newPaper) => {
          setPapers(prev => [newPaper, ...prev]);
          handleSelectArticle(newPaper);
        }}
      />

      <main className="main-content">
        {!selectedArticle ? (
          <div className="animate-fade-in">
            <section className="hero-section">
              <div className="hero-badge">
                {isLiveBackend ? '● Live API Connected' : '○ Offline Research Archive'}
              </div>
              <h1 className="heading-serif hero-title">Bridging Rigor & Comprehension.</h1>
              <p className="hero-subtitle">
                Peer-reviewed academic literature synthesized into clear, multi-layered insights with synchronized audio.
              </p>

              <div className="search-filter-bar editorial-card">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search studies by title, summary, keyword, or author... (Press '/' to focus)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search query"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="sort-wrapper">
                  <label htmlFor="sort-select" className="sort-label">Sort:</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="newest">Latest Published</option>
                    <option value="citations">Most Cited</option>
                    <option value="evidence">Highest Evidence</option>
                  </select>
                </div>
              </div>

              <div className="quick-disciplines-bar">
                <button
                  type="button"
                  className={`quick-disc-btn ${selectedDisciplines.length === 0 && !viewBookmarksOnly ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDisciplines([]);
                    setViewBookmarksOnly(false);
                  }}
                >
                  All Disciplines
                </button>
                {disciplines.map(disc => (
                  <button
                    key={disc}
                    type="button"
                    className={`quick-disc-btn ${selectedDisciplines.includes(disc) ? 'active' : ''}`}
                    onClick={() => toggleDiscipline(disc)}
                  >
                    {disc}
                  </button>
                ))}
              </div>
            </section>

            <div className="feed-header-info">
              <span className="results-count">
                Showing <strong>{processedStudies.length}</strong> {processedStudies.length === 1 ? 'study' : 'studies'}
                {selectedDisciplines.length > 0 && ` across ${selectedDisciplines.join(', ')}`}
                {viewBookmarksOnly && ' in your Saved List'}
              </span>
            </div>

            <div className="feed-layout">
              {processedStudies.map(study => (
                <ResearchCard
                  key={study.id}
                  study={study}
                  onClick={handleSelectArticle}
                  isBookmarked={bookmarks.includes(study.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>

            {processedStudies.length === 0 && (
              <div className="empty-state editorial-card">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔬</div>
                <h3 className="heading-serif" style={{ marginBottom: '0.5rem' }}>No matching studies found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Try relaxing your search keywords, curation filters, or toggle pre-print research inclusion.
                </p>
                <button
                  type="button"
                  className="done-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDisciplines([]);
                    setViewBookmarksOnly(false);
                    setIncludeEarlyResearch(true);
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <ArticleView
            article={selectedArticle}
            onBack={handleBackToFeed}
            isAuthenticated={isAuthenticated}
            onAuthRequest={() => setIsAuthOpen(true)}
            isBookmarked={bookmarks.includes(selectedArticle.id)}
            onToggleBookmark={toggleBookmark}
          />
        )}
      </main>
    </div>
  );
}

export default App;
