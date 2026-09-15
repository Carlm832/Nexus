import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { mockStudies } from './data/mockData';
import { ACADEMIC_DOMAINS, disciplines, YEAR_FILTER_OPTIONS, SORT_OPTIONS } from './data/taxonomy';
import ResearchCard from './components/ResearchCard';
import ArticleView from './components/ArticleView';
import CurationModal from './components/CurationModal';
import SubmitModal from './components/SubmitModal';
import AuthModal from './components/AuthModal';
import AccountModal from './components/AccountModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { supabase } from './lib/supabase';

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

  // Bookmarks: stored in Supabase for authenticated users, localStorage for guests
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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Feed keyboard navigation: index of the currently "focused" card
  const [focusedCardIndex, setFocusedCardIndex] = useState(-1);
  const cardRefs = useRef([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [papers, setPapers] = useState(mockStudies);
  const [isLiveBackend, setIsLiveBackend] = useState(false);

  // Researcher Profile & Reading History
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [readingHistory, setReadingHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_reading_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_user_preferences');
      return saved ? JSON.parse(saved) : {
        defaultMode: 'curated',
        autoPlayAudio: false,
        readingLevel: 'scholarly'
      };
    } catch {
      return {
        defaultMode: 'curated',
        autoPlayAudio: false,
        readingLevel: 'scholarly'
      };
    }
  });

  // Search Engine Mode: 'curated' | 'global'
  const [searchMode, setSearchMode] = useState('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearRange, setSelectedYearRange] = useState(YEAR_FILTER_OPTIONS[0]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0].id);
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [viewBookmarksOnly, setViewBookmarksOnly] = useState(false);

  // Global search state
  const [globalResults, setGlobalResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalTotalCount, setGlobalTotalCount] = useState(0);

  // JIT synthesis loading state
  const [synthesizingPaper, setSynthesizingPaper] = useState(null);
  const [synthesisError, setSynthesisError] = useState(null);

  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const isAuthenticated = Boolean(currentUser);

  /* -----------------------------------------------------------------------
   * Supabase Auth: listen for session changes
   * --------------------------------------------------------------------- */
  useEffect(() => {
    const initSession = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        loadBookmarksFromSupabase(session.user.id);
      }
    };
    initSession();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await loadBookmarksFromSupabase(session.user.id);
      } else {
        setCurrentUser(null);
        try {
          const saved = localStorage.getItem('nexus_bookmarks');
          setBookmarks(saved ? JSON.parse(saved) : []);
        } catch {
          setBookmarks([]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* -----------------------------------------------------------------------
   * Load bookmarks from Supabase for authenticated users
   * --------------------------------------------------------------------- */
  const loadBookmarksFromSupabase = useCallback(async (userId) => {
    if (!supabase || !userId) return;
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('paper_id')
        .eq('user_id', userId);
      if (!error && data) {
        setBookmarks(data.map(b => b.paper_id));
      }
    } catch (err) {
      console.warn('Failed to load bookmarks from Supabase:', err.message);
    }
  }, []);

  /* -----------------------------------------------------------------------
   * Theme persistence
   * --------------------------------------------------------------------- */
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

  // Persist bookmarks to localStorage for guest users
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem('nexus_bookmarks', JSON.stringify(bookmarks));
      } catch {
        // ignore
      }
    }
  }, [bookmarks, isAuthenticated]);

  /* -----------------------------------------------------------------------
   * Toggle Bookmark: Supabase for authenticated users, localStorage for guests
   * --------------------------------------------------------------------- */
  const toggleBookmark = useCallback(async (paperId) => {
    const isBookmarked = bookmarks.includes(paperId);

    setBookmarks(prev =>
      isBookmarked ? prev.filter(id => id !== paperId) : [...prev, paperId]
    );

    if (isAuthenticated && supabase && currentUser) {
      try {
        if (isBookmarked) {
          await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('paper_id', paperId);
        } else {
          await supabase
            .from('bookmarks')
            .insert({ user_id: currentUser.id, paper_id: paperId });
        }
      } catch (err) {
        console.warn('Bookmark sync failed:', err.message);
        setBookmarks(prev =>
          isBookmarked ? [...prev, paperId] : prev.filter(id => id !== paperId)
        );
      }
    }
  }, [bookmarks, isAuthenticated, currentUser]);

  /* -----------------------------------------------------------------------
   * Fetch curated papers from backend / Supabase
   * --------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------
   * Global Scholarly Search Query Execution (OpenAlex 250M+ Works)
   * --------------------------------------------------------------------- */
  const executeGlobalSearch = useCallback(async (query, discipline, yearOption, sort, oaOnly) => {
    setIsSearchingGlobal(true);
    try {
      const params = new URLSearchParams();
      if (query && query.trim()) params.set('q', query.trim());
      if (discipline) params.set('discipline', discipline);
      if (yearOption?.fromYear) params.set('from_year', yearOption.fromYear);
      if (yearOption?.toYear) params.set('to_year', yearOption.toYear);
      if (oaOnly) params.set('open_access', 'true');
      if (sort) params.set('sort', sort);
      params.set('per_page', '24');

      const res = await fetch(`${API_BASE}/api/search/live?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();

      setGlobalResults(data.results || []);
      setGlobalTotalCount(data.total || 0);
    } catch (err) {
      console.error('Global search error:', err.message);
      setGlobalResults([]);
      setGlobalTotalCount(0);
    } finally {
      setIsSearchingGlobal(false);
    }
  }, []);

  // Trigger search on global mode changes or filter adjustments
  useEffect(() => {
    if (searchMode === 'global') {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        const primaryDisc = selectedDisciplines[0] || '';
        executeGlobalSearch(searchQuery, primaryDisc, selectedYearRange, selectedSort, openAccessOnly);
      }, 350);
    }
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchMode, searchQuery, selectedDisciplines, selectedYearRange, selectedSort, openAccessOnly, executeGlobalSearch]);

  const addToReadingHistory = useCallback((study) => {
    if (!study || !study.id) return;
    setReadingHistory(prev => {
      const filtered = prev.filter(p => p.id !== study.id);
      const updated = [
        {
          id: study.id,
          title: study.title,
          authors: study.authors,
          journal: study.journal,
          publishDate: study.publishDate,
          discipline: study.discipline,
          doi: study.doi,
          summary: study.summary || study.abstract,
          viewedAt: new Date().toISOString()
        },
        ...filtered
      ].slice(0, 30);
      try {
        localStorage.setItem('nexus_reading_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleUpdateProfile = useCallback((newProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('nexus_user_profile', JSON.stringify(newProfile));
    } catch {
      // ignore
    }
  }, []);

  const handleUpdatePreferences = useCallback((newPrefs) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem('nexus_user_preferences', JSON.stringify(newPrefs));
    } catch {
      // ignore
    }
  }, []);

  const handleClearHistory = useCallback(() => {
    setReadingHistory([]);
    try {
      localStorage.removeItem('nexus_reading_history');
    } catch {
      // ignore
    }
  }, []);

  /* -----------------------------------------------------------------------
   * Just-In-Time (JIT) Paper Selection & Gemini Synthesis
   * --------------------------------------------------------------------- */
  const handleSelectArticle = useCallback(async (study) => {
    if (!study) {
      setSelectedArticle(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('paper');
      window.history.pushState(null, '', url.toString());
      return;
    }

    addToReadingHistory(study);

    // If the paper already has full synthesis (summary & significance), open it immediately
    if (study.summary && study.significance && study.limitations) {
      setSelectedArticle(study);
      const url = new URL(window.location.href);
      url.searchParams.set('paper', study.id);
      window.history.pushState(null, '', url.toString());
      return;
    }

    // Otherwise, it's an uncached global paper from OpenAlex -> run JIT Gemini synthesis!
    setSynthesizingPaper(study);
    setSynthesisError(null);

    try {
      const res = await fetch(`${API_BASE}/api/papers/jit-synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPaper: study })
      });

      if (!res.ok) throw new Error(`Synthesis failed with status ${res.status}`);
      const data = await res.json();
      const synthesized = data.paper;

      if (synthesized) {
        // Add to cached papers feed
        setPapers(prev => {
          const exists = prev.some(p => p.id === synthesized.id);
          return exists ? prev.map(p => p.id === synthesized.id ? synthesized : p) : [synthesized, ...prev];
        });

        addToReadingHistory(synthesized);
        setSelectedArticle(synthesized);
        const url = new URL(window.location.href);
        url.searchParams.set('paper', synthesized.id);
        window.history.pushState(null, '', url.toString());
      }
    } catch (err) {
      console.error('JIT synthesis error:', err);
      setSynthesisError(err.message || 'Failed to synthesize insights');
      // Fall back to showing the raw paper with abstract
      const fallbackArticle = {
        ...study,
        summary: study.abstract || 'Abstract details unavailable.',
        significance: 'Synthesizing live from primary source metadata.',
        limitations: 'Full analysis pending peer review indexing.'
      };
      addToReadingHistory(fallbackArticle);
      setSelectedArticle(fallbackArticle);
    } finally {
      setSynthesizingPaper(null);
    }
  }, [addToReadingHistory]);

  const handleBackToFeed = useCallback(() => {
    handleSelectArticle(null);
  }, [handleSelectArticle]);

  /* -----------------------------------------------------------------------
   * Browser History / URL State
   * --------------------------------------------------------------------- */
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const paperId = params.get('paper');
      if (paperId) {
        const found = papers.find(p => p.id === paperId) || globalResults.find(p => p.id === paperId) || readingHistory.find(p => p.id === paperId);
        if (found) {
          addToReadingHistory(found);
          setSelectedArticle(found);
          return;
        }
      }
      setSelectedArticle(null);
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, [papers, globalResults, readingHistory, addToReadingHistory]);

  /* -----------------------------------------------------------------------
   * Power-user keyboard shortcuts
   * /  → focus search
   * ?  → toggle shortcuts modal
   * J  → next card in feed
   * K  → previous card in feed
   * Enter → open focused card
   * B  → toggle bookmark on focused card
   * Esc → back to feed (when article is open)
   * --------------------------------------------------------------------- */
  useEffect(() => {
    const anyModalOpen = isCurationOpen || isSubmitOpen || isAuthOpen || isAccountOpen || isShortcutsOpen;

    const handleKeyDown = (e) => {
      // Never hijack when user is typing in an input/textarea
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      // '?' → toggle shortcuts modal (works everywhere except when typing)
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // Esc → close article view if open
      if (e.key === 'Escape' && selectedArticle && !anyModalOpen) {
        handleBackToFeed();
        return;
      }

      // Below shortcuts only work on the feed (no article open, no modal open, not typing)
      if (selectedArticle || anyModalOpen || isTyping) return;

      // '/' → focus search
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // J → next card
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedCardIndex(prev => {
          const next = Math.min(prev + 1, activeStudies.length - 1);
          cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          cardRefs.current[next]?.focus();
          return next;
        });
        return;
      }

      // K → previous card
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedCardIndex(prev => {
          const next = Math.max(prev - 1, 0);
          cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          cardRefs.current[next]?.focus();
          return next;
        });
        return;
      }

      // Enter → open focused card
      if (e.key === 'Enter' && focusedCardIndex >= 0) {
        e.preventDefault();
        const study = activeStudies[focusedCardIndex];
        if (study) handleSelectArticle(study);
        return;
      }

      // B → toggle bookmark on focused card
      if ((e.key === 'b' || e.key === 'B') && focusedCardIndex >= 0) {
        e.preventDefault();
        const study = activeStudies[focusedCardIndex];
        if (study) toggleBookmark(study.id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticle, isCurationOpen, isSubmitOpen, isAuthOpen, isAccountOpen, isShortcutsOpen, focusedCardIndex, activeStudies, handleBackToFeed, handleSelectArticle, toggleBookmark]);

  const toggleDiscipline = (disc) => {
    setSelectedDisciplines(prev =>
      prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
    );
  };

  const handleSignOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setViewBookmarksOnly(false);
  }, []);

  /* -----------------------------------------------------------------------
   * Filtered + Sorted Curated feed
   * --------------------------------------------------------------------- */
  const processedCuratedStudies = useMemo(() => {
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

    if (openAccessOnly) {
      list = list.filter(s => s.isOpenAccess || s.oaUrl);
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

    if (selectedSort === 'cited_by_count:desc' || selectedSort === 'citations') {
      list.sort((a, b) => (b.metrics?.citations || b.citations || 0) - (a.metrics?.citations || a.citations || 0));
    } else {
      list.sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0));
    }

    return list;
  }, [papers, includeEarlyResearch, selectedDisciplines, viewBookmarksOnly, openAccessOnly, searchQuery, selectedSort, bookmarks]);

  // Collect full paper objects for saved bookmarks
  const savedPapersList = useMemo(() => {
    const paperMap = new Map();
    papers.forEach(p => paperMap.set(p.id, p));
    globalResults.forEach(p => paperMap.set(p.id, p));
    readingHistory.forEach(p => paperMap.set(p.id, p));
    return bookmarks.map(id => paperMap.get(id) || { id, title: `Paper DOI: ${id}` }).filter(Boolean);
  }, [papers, globalResults, readingHistory, bookmarks]);

  const activeStudies = searchMode === 'global' ? globalResults : processedCuratedStudies;

  return (
    <div className="app-container">
      {/* JIT Synthesis Modal Overlay */}
      {synthesizingPaper && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content editorial-card animate-fade-in jit-modal">
            <h3 className="heading-serif" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Synthesizing Research with Gemini AI...
            </h3>
            <p className="jit-paper-title">"{synthesizingPaper.title}"</p>
            <div className="jit-steps">
              <span className="jit-step active">1. Extracting Methodology & Findings</span>
              <span className="jit-step active">2. Generating Plain Synthesis & Real-World Impact</span>
              <span className="jit-step active">3. Caching permanently to Supabase Database</span>
            </div>
          </div>
        </div>
      )}

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
            className={`nav-link ${searchMode === 'curated' && !viewBookmarksOnly && !selectedArticle ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('curated');
              setViewBookmarksOnly(false);
              handleBackToFeed();
            }}
          >
            Discover
          </button>
          <button
            type="button"
            className={`nav-link ${searchMode === 'global' && !viewBookmarksOnly && !selectedArticle ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('global');
              setViewBookmarksOnly(false);
              handleBackToFeed();
            }}
          >
            Global Search <span className="global-badge">250M+</span>
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
            Disciplines {selectedDisciplines.length > 0 && `(${selectedDisciplines.length})`}
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
            Submit DOI
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
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <button
            type="button"
            className="shortcuts-help-btn"
            onClick={() => setIsShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
          >
            ?
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="account-profile-btn"
              onClick={() => setIsAccountOpen(true)}
              title="Open Researcher Account & Library Dashboard"
            >
              <span className="account-profile-avatar-sm">
                {(userProfile?.name || currentUser?.email || 'R').charAt(0).toUpperCase()}
              </span>
              <span>{userProfile?.name || currentUser?.email?.split('@')[0] || 'Researcher'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="auth-button"
              onClick={() => setIsAuthOpen(true)}
              title="Sign in to access your researcher account"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(user) => {
          setCurrentUser(user);
          setIsSubmitOpen(true);
        }}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        savedPapers={savedPapersList}
        onRemoveBookmark={toggleBookmark}
        onOpenPaper={(paper) => {
          setIsAccountOpen(false);
          handleSelectArticle(paper);
        }}
        readingHistory={readingHistory}
        onClearHistory={handleClearHistory}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onSignOut={() => {
          handleSignOut();
          setIsAccountOpen(false);
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

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <main className="main-content">
        {!selectedArticle ? (
          <div className="animate-fade-in">
            <section className="hero-section">
              <div className="hero-badge">
                <span>Peer-Reviewed Scientific Discovery • 250M+ Scholarly Index</span>
                {isAuthenticated && <span style={{ marginLeft: '0.75rem', opacity: 0.8 }}>· {currentUser?.email}</span>}
              </div>

              <h1 className="heading-serif hero-title">
                {searchMode === 'global' ? 'Global Scholarly Research Engine' : 'Bridging Rigor & Comprehension'}
              </h1>
              <p className="hero-subtitle">
                {searchMode === 'global'
                  ? 'Discover millions of peer-reviewed works across past decades with instant on-demand AI synthesis and open PDF access.'
                  : 'Peer-reviewed academic literature synthesized into clear, multi-layered insights with synchronized audio.'}
              </p>

              {/* Mode Switcher Tabs */}
              <div className="search-mode-tabs">
                <button
                  type="button"
                  className={`mode-tab-btn ${searchMode === 'curated' ? 'active' : ''}`}
                  onClick={() => setSearchMode('curated')}
                >
                  Featured &amp; Curated
                </button>
                <button
                  type="button"
                  className={`mode-tab-btn ${searchMode === 'global' ? 'active' : ''}`}
                  onClick={() => setSearchMode('global')}
                >
                  Global Scholarly Index <span className="global-badge">250M+</span>
                </button>
              </div>

              {/* Search Bar & Primary Filters */}
              <div className="search-filter-bar editorial-card">
                <div className="search-input-wrapper">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={
                      searchMode === 'global'
                        ? 'Search 250M+ papers by keyword, topic (e.g. CRISPR, LLM, Quantum), author, or title...'
                        : 'Search curated studies by title, summary, keyword, or author... (Press \'/\' to focus)'
                    }
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

                <div className="academic-filter-row">
                  {/* Year Range Filter */}
                  {searchMode === 'global' && (
                    <div className="filter-item">
                      <label htmlFor="year-select" className="filter-label">Years:</label>
                      <select
                        id="year-select"
                        value={selectedYearRange.label}
                        onChange={(e) => {
                          const match = YEAR_FILTER_OPTIONS.find(o => o.label === e.target.value);
                          if (match) setSelectedYearRange(match);
                        }}
                        className="sort-select"
                      >
                        {YEAR_FILTER_OPTIONS.map(opt => (
                          <option key={opt.label} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sort Filter */}
                  <div className="filter-item">
                    <label htmlFor="sort-select" className="filter-label">Sort:</label>
                    <select
                      id="sort-select"
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value)}
                      className="sort-select"
                    >
                      {SORT_OPTIONS.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Open Access Filter */}
                  <label className="oa-checkbox-label" title="Show only papers with direct free Open Access PDF access">
                    <input
                      type="checkbox"
                      checked={openAccessOnly}
                      onChange={(e) => setOpenAccessOnly(e.target.checked)}
                    />
                    <span>Free PDF Only</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Academic Taxonomy Bar */}
              <div className="quick-disciplines-bar">
                <button
                  type="button"
                  className={`quick-disc-btn ${selectedDisciplines.length === 0 && !viewBookmarksOnly ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDisciplines([]);
                    setViewBookmarksOnly(false);
                  }}
                >
                  All Fields
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

            {/* Results Header */}
            <div className="feed-header-info">
              <span className="results-count">
                {isSearchingGlobal ? (
                  <span>Searching 250M+ scholarly works on OpenAlex...</span>
                ) : (
                  <span>
                    Showing <strong>{activeStudies.length}</strong> {activeStudies.length === 1 ? 'study' : 'studies'}
                    {searchMode === 'global' && globalTotalCount > 0 && ` of ~${globalTotalCount.toLocaleString()} total found`}
                    {selectedDisciplines.length > 0 && ` in ${selectedDisciplines.join(', ')}`}
                    {viewBookmarksOnly && ' in your Saved List'}
                  </span>
                )}
              </span>
            </div>

            {/* Feed Grid */}
            <div className="feed-layout">
              {activeStudies.map((study, idx) => (
                <ResearchCard
                  key={study.id}
                  study={study}
                  onClick={handleSelectArticle}
                  isBookmarked={bookmarks.includes(study.id)}
                  onToggleBookmark={toggleBookmark}
                  isFocused={focusedCardIndex === idx}
                  cardRef={el => { cardRefs.current[idx] = el; }}
                />
              ))}
            </div>

            {/* Empty State */}
            {!isSearchingGlobal && activeStudies.length === 0 && (
              <div className="empty-state editorial-card">
                <h3 className="heading-serif" style={{ marginBottom: '0.5rem' }}>No matching research found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  {searchMode === 'curated'
                    ? 'No studies found in your curated library. Try switching to the Global Scholarly Index above to search 250M+ papers.'
                    : 'No global results matched your query and filters. Try adjusting keywords or date ranges.'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  {searchMode === 'curated' && (
                    <button
                      type="button"
                      className="done-btn"
                      onClick={() => setSearchMode('global')}
                    >
                      Search Global Scholarly Index
                    </button>
                  )}
                  <button
                    type="button"
                    className="action-pill-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDisciplines([]);
                      setViewBookmarksOnly(false);
                      setOpenAccessOnly(false);
                      setSelectedYearRange(YEAR_FILTER_OPTIONS[0]);
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
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
