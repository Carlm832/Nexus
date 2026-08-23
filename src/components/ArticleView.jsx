import React, { useState, useRef, useEffect } from 'react';
import './ArticleView.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

const DISCIPLINE_ICONS = {
    'Neuroscience': '🧠',
    'Economics': '📊',
    'Biology': '🧬',
    'Artificial Intelligence': '⚡',
    'Climate Science': '🌍',
    'Psychology': '💭'
};

/* =========================================================================
 * AudioPlayer Component
 * 
 * High-performance audio player with:
 * - Seekable timeline scrubber
 * - Playback rate selector (0.75x - 2x)
 * - Safe MP3 download handling
 * - Clean solid surface styling
 * ========================================================================= */
const AudioPlayer = ({ article, isAuthenticated, onAuthRequest }) => {
    const audioRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [speechProgress, setSpeechProgress] = useState(0);

    // Resolve audio URL safely
    const resolvedAudioSrc = article.audioUrl
        ? (article.audioUrl.startsWith('http') ? article.audioUrl : `${API_BASE_URL}${article.audioUrl}`)
        : null;

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const togglePlay = () => {
        if (resolvedAudioSrc && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().catch(err => {
                    console.warn("Audio playback error:", err);
                });
                setIsPlaying(true);
            }
        } else {
            if (!('speechSynthesis' in window)) {
                alert("Speech synthesis is not supported in this browser.");
                return;
            }

            if (isPlaying) {
                window.speechSynthesis.cancel();
                setIsPlaying(false);
                setSpeechProgress(0);
            } else {
                const textToRead = `${article.title}. Summary: ${article.summary} Why it matters: ${article.significance}`;
                const utterance = new SpeechSynthesisUtterance(textToRead);
                utterance.rate = playbackRate;
                
                utterance.onboundary = (e) => {
                    if (textToRead.length > 0) {
                        const progress = Math.min(100, Math.round((e.charIndex / textToRead.length) * 100));
                        setSpeechProgress(progress);
                    }
                };

                utterance.onend = () => {
                    setIsPlaying(false);
                    setSpeechProgress(0);
                };

                utterance.onerror = () => {
                    setIsPlaying(false);
                    setSpeechProgress(0);
                };

                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            }
        }
    };

    const handleSeek = (e) => {
        const targetTime = Number(e.target.value);
        if (audioRef.current && isFinite(targetTime)) {
            audioRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    };

    const changeSpeed = (rate) => {
        setPlaybackRate(rate);
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleDownload = () => {
        if (!isAuthenticated) {
            onAuthRequest();
            return;
        }

        if (resolvedAudioSrc) {
            const rawDoi = article.doi || article.id || 'nexus_synthesis';
            const cleanName = rawDoi.replace(/^https?:\/\/doi\.org\//i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const a = document.createElement('a');
            a.href = resolvedAudioSrc;
            a.download = `${cleanName}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const progressPercent = resolvedAudioSrc
        ? (duration > 0 ? (currentTime / duration) * 100 : 0)
        : speechProgress;

    return (
        <div className="audio-player editorial-card animate-fade-in">
            {resolvedAudioSrc && (
                <audio
                    ref={audioRef}
                    src={resolvedAudioSrc}
                    onEnded={() => {
                        setIsPlaying(false);
                        setCurrentTime(0);
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                />
            )}

            <div className="player-main-row">
                <button
                    type="button"
                    className={`play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause narration' : 'Play narrated synthesis'}
                    title={isPlaying ? 'Pause' : 'Listen to Synthesis'}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>

                <div className="player-timeline-container">
                    <div className="player-labels">
                        <span className="audio-mode-label">
                            {resolvedAudioSrc ? '🎧 AI Studio Narration' : '🔊 Web Speech Synthesis'}
                        </span>
                        {resolvedAudioSrc && (
                            <span className="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        )}
                    </div>

                    <div className="scrubber-wrapper">
                        {resolvedAudioSrc ? (
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                step="0.1"
                                value={currentTime}
                                onChange={handleSeek}
                                className="timeline-slider"
                                aria-label="Audio timeline slider"
                            />
                        ) : (
                            <div className="fallback-progress-bar">
                                <div className="fallback-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="player-controls-right">
                    <div className="speed-selector">
                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                                key={rate}
                                type="button"
                                className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                                onClick={() => changeSpeed(rate)}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>

                    {resolvedAudioSrc && (
                        <button
                            type="button"
                            className="download-audio-btn"
                            onClick={handleDownload}
                            title={isAuthenticated ? 'Download MP3' : 'Sign in to download MP3'}
                            aria-label="Download audio narration"
                        >
                            ↓ MP3
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* =========================================================================
 * CitationModal Component
 * ========================================================================= */
const CitationModal = ({ article, isOpen, onClose }) => {
    const [copiedFormat, setCopiedFormat] = useState(null);
    if (!isOpen || !article) return null;

    const year = new Date(article.publishDate).getFullYear() || '2024';
    const authorsFormatted = (article.authors || []).join(', ');
    const firstAuthorLast = (article.authors?.[0] || 'Author').split(' ').slice(-1)[0];
    const cleanDoi = (article.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
    const doiUrl = article.doi?.startsWith('http') ? article.doi : `https://doi.org/${cleanDoi}`;

    const citations = {
        'APA 7th': `${authorsFormatted} (${year}). ${article.title}. ${article.journal}. ${doiUrl}`,
        'MLA 9th': `${authorsFormatted}. "${article.title}." ${article.journal}, ${year}, ${doiUrl}.`,
        'Chicago': `${authorsFormatted}. "${article.title}." ${article.journal} (${year}). ${doiUrl}.`,
        'BibTeX': `@article{${firstAuthorLast.toLowerCase()}${year},\n  title={${article.title}},\n  author={${(article.authors || []).join(' and ')}},\n  journal={${article.journal}},\n  year={${year}},\n  doi={${cleanDoi}}\n}`,
        'RIS': `TY  - JOUR\nTI  - ${article.title}\n${(article.authors || []).map(a => `AU  - ${a}`).join('\n')}\nJO  - ${article.journal}\nPY  - ${year}\nDO  - ${cleanDoi}\nER  -`
    };

    const handleCopy = (formatName, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedFormat(formatName);
            setTimeout(() => setCopiedFormat(null), 2000);
        });
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-content editorial-card animate-fade-in" style={{ maxWidth: '650px' }}>
                <header className="modal-header">
                    <h2 className="heading-serif">Cite This Study</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close citation modal">&times;</button>
                </header>

                <div className="modal-body">
                    <p className="modal-description" style={{ marginBottom: '1.25rem' }}>
                        Copy citation in your preferred academic format:
                    </p>

                    <div className="citation-list">
                        {Object.entries(citations).map(([format, text]) => (
                            <div key={format} className="citation-item">
                                <div className="citation-item-header">
                                    <span className="citation-format-name">{format}</span>
                                    <button
                                        type="button"
                                        className="copy-citation-btn"
                                        onClick={() => handleCopy(format, text)}
                                    >
                                        {copiedFormat === format ? '✓ Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <pre className="citation-text-box">{text}</pre>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* =========================================================================
 * ArticleView Main Component
 * ========================================================================= */
export default function ArticleView({
    article,
    onBack,
    isAuthenticated,
    onAuthRequest,
    isBookmarked,
    onToggleBookmark
}) {
    const [activeTab, setActiveTab] = useState('summary');
    const [isCiteOpen, setIsCiteOpen] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isCiteOpen) {
                    setIsCiteOpen(false);
                } else {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCiteOpen, onBack]);

    if (!article) return null;

    const cleanDoi = (article.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
    const fullDoiUrl = article.doi?.startsWith('http') ? article.doi : `https://doi.org/${cleanDoi}`;
    const discIcon = DISCIPLINE_ICONS[article.discipline] || '📄';

    const handleShare = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('paper', article.id);
        navigator.clipboard.writeText(url.toString()).then(() => {
            setCopiedShare(true);
            setTimeout(() => setCopiedShare(false), 2000);
        });
    };

    return (
        <article className="article-view animate-fade-in">
            <div className="article-top-nav">
                <button type="button" className="back-btn" onClick={onBack}>
                    &larr; Back to Feed
                </button>

                <div className="article-action-buttons">
                    <button
                        type="button"
                        className={`action-pill-btn ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => onToggleBookmark && onToggleBookmark(article.id)}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                    >
                        {isBookmarked ? '★ Saved' : '☆ Save'}
                    </button>
                    <button
                        type="button"
                        className="action-pill-btn"
                        onClick={handleShare}
                        title="Copy shareable link to this study"
                    >
                        {copiedShare ? '✓ Link Copied!' : '🔗 Share'}
                    </button>
                    <button
                        type="button"
                        className="action-pill-btn primary"
                        onClick={() => setIsCiteOpen(true)}
                        title="Generate citation"
                    >
                        ❝ Cite
                    </button>
                </div>
            </div>

            <header className="article-header editorial-card">
                <div className="meta-row">
                    <span className="discipline-tag">
                        <span style={{ marginRight: '0.35rem' }}>{discIcon}</span>
                        {article.discipline}
                    </span>
                    <span className="date-text">
                        {new Date(article.publishDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                    <span className="journal-text">{article.journal}</span>
                </div>

                <h1 className="heading-serif article-title">{article.title}</h1>
                <p className="article-authors">{(article.authors || []).join(', ')}</p>

                <div className="meta-pills">
                    {cleanDoi && (
                        <a
                            href={fullDoiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pill-badge pill-neutral doi-link"
                            title="Open original publication at publisher"
                        >
                            DOI: {cleanDoi} ↗
                        </a>
                    )}
                    <span className="pill-badge pill-neutral">
                        Citations: {article.metrics?.citations ?? 0}
                    </span>
                    <span className="pill-badge pill-neutral">
                        Type: {article.metrics?.studyType || 'Journal Article'}
                    </span>
                    <span className={`pill-badge ${article.metrics?.evidenceLevel === 'High' ? 'pill-success' : 'pill-warning'}`}>
                        Evidence: {article.metrics?.evidenceLevel || 'Preliminary'}
                    </span>
                    <span className={`pill-badge ${article.reviewStatus === 'preReview' ? 'pill-warning' : 'pill-neutral'}`}>
                        {article.reviewStatus === 'preReview' ? 'Pre-print' : 'Peer-reviewed'}
                    </span>
                </div>
            </header>

            <AudioPlayer
                article={article}
                isAuthenticated={isAuthenticated}
                onAuthRequest={onAuthRequest}
            />

            <div className="article-content editorial-card">
                <div className="tabs-nav">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        Plain Synthesis
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'significance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('significance')}
                    >
                        Real-World Impact
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'limitations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('limitations')}
                    >
                        Methodology & Limits
                    </button>
                    {article.abstract && (
                        <button
                            type="button"
                            className={`tab-btn ${activeTab === 'abstract' ? 'active' : ''}`}
                            onClick={() => setActiveTab('abstract')}
                        >
                            Original Abstract
                        </button>
                    )}
                </div>

                <div className="tab-pane animate-fade-in">
                    {activeTab === 'summary' && (
                        <div className="content-block">
                            <div className="highlight-box">
                                <h4 className="box-heading">💡 Core Synthesis</h4>
                                <p className="lead-paragraph">{article.summary}</p>
                            </div>

                            {article.tags && article.tags.length > 0 && (
                                <div className="article-tags-section">
                                    <span className="tags-label">Key Topics:</span>
                                    <div className="tags-container">
                                        {article.tags.map(t => (
                                            <span key={t} className="tag">#{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'significance' && (
                        <div className="content-block">
                            <div className="highlight-box impact-box">
                                <h4 className="box-heading">🌍 Why It Matters</h4>
                                <p className="lead-paragraph">{article.significance}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'limitations' && (
                        <div className="content-block">
                            <div className="limitation-block">
                                <div className="limitation-alert">
                                    <span className="alert-icon">⚠️</span>
                                    <strong>Methodological Context & Boundaries</strong>
                                </div>
                                <div className="limitation-row">
                                    <strong>Design:</strong> {article.metrics?.studyType || 'Observational'}
                                </div>
                                <div className="limitation-row">
                                    <strong>Evidence Confidence:</strong> {article.metrics?.evidenceLevel || 'Preliminary'}
                                </div>
                                <p className="limitation-text">{article.limitations}</p>
                                {article.funding && (
                                    <div className="funding-note">
                                        <em>Funding & Disclosures: {article.funding}</em>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'abstract' && (
                        <div className="content-block">
                            <h3 className="heading-serif" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                                Full Academic Abstract
                            </h3>
                            <p className="abstract-text">{article.abstract}</p>
                        </div>
                    )}
                </div>
            </div>

            <CitationModal
                article={article}
                isOpen={isCiteOpen}
                onClose={() => setIsCiteOpen(false)}
            />
        </article>
    );
}

