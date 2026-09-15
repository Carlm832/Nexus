import React, { useState, useRef, useEffect } from 'react';
import './ArticleView.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

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
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioError, setAudioError] = useState(null);
    const [localAudioUrl, setLocalAudioUrl] = useState(article.audioUrl || null);

    useEffect(() => {
        setLocalAudioUrl(article.audioUrl || null);
        setIsPlaying(false);
        setCurrentTime(0);
        setIsGeneratingAudio(false);
        setAudioError(null);
    }, [article.id, article.audioUrl]);

    // Resolve audio URL safely
    const resolvedAudioSrc = localAudioUrl
        ? (localAudioUrl.startsWith('http') ? localAudioUrl : `${API_BASE_URL}${localAudioUrl}`)
        : null;

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const generateAndPlayElevenLabs = async () => {
        setIsGeneratingAudio(true);
        setAudioError(null);

        try {
            const paperId = article.id || article.doi;
            const res = await fetch(`${API_BASE_URL}/api/papers/${encodeURIComponent(paperId)}/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper: article })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Audio generation failed (${res.status})`);
            }

            const data = await res.json();
            if (data.audioUrl) {
                setLocalAudioUrl(data.audioUrl);
                article.audioUrl = data.audioUrl;
                // Wait for audio element to load new source
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
                    }
                }, 300);
            }
        } catch (err) {
            console.error('ElevenLabs generation error:', err);
            setAudioError(err.message);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const togglePlay = () => {
        if (resolvedAudioSrc && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
                    console.warn("Audio playback error:", err);
                });
            }
        } else {
            // Paper doesn't have an audio file yet -> Generate on-demand with ElevenLabs!
            generateAndPlayElevenLabs();
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

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
                    className={`play-btn ${isPlaying ? 'playing' : ''} ${isGeneratingAudio ? 'generating' : ''}`}
                    onClick={togglePlay}
                    disabled={isGeneratingAudio}
                    aria-label={isPlaying ? 'Pause narration' : 'Play ElevenLabs narrated synthesis'}
                    title={isGeneratingAudio ? 'Generating ElevenLabs studio audio...' : isPlaying ? 'Pause' : 'Listen with ElevenLabs Studio Voice'}
                >
                    {isGeneratingAudio ? '⚡' : isPlaying ? '⏸' : '▶'}
                </button>

                <div className="player-timeline-container">
                    <div className="player-labels">
                        <span className="audio-mode-label">
                            {isGeneratingAudio ? (
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Generating ElevenLabs Studio Voice...</span>
                            ) : resolvedAudioSrc ? (
                                <span>ElevenLabs Studio Voice</span>
                            ) : (
                                <span>ElevenLabs Narration (Click Play to Listen)</span>
                            )}
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
                                <div className={`fallback-progress-fill ${isGeneratingAudio ? 'generating-pulse' : ''}`} style={{ width: isGeneratingAudio ? '100%' : '0%' }}></div>
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
                            Download MP3
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
                                        {copiedFormat === format ? 'Copied' : 'Copy'}
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
 * PaperChat Component ("Ask the Paper")
 * ========================================================================= */
const SUGGESTED_QUESTIONS = [
    { label: "Explain like I'm 5", q: "Can you explain this research in simple, engaging terms like I am 5 years old?" },
    { label: "Core Methodology", q: "What methodology, study design, and sample size were used in this study?" },
    { label: "Practical Impact", q: "What are the tangible real-world applications and implications of these findings?" },
    { label: "Major Limitations", q: "What are the primary methodological limitations or boundary conditions noted in this work?" },
    { label: "Key Finding", q: "What is the single most important or novel takeaway from this research?" }
];

function renderFormattedText(text) {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
}

const FormattedChatContent = ({ content }) => {
    const lines = content.split('\n');
    return (
        <div className="chat-markdown-body">
            {lines.map((line, idx) => {
                if (line.startsWith('### ')) {
                    return <h5 key={idx} className="chat-heading">{line.replace('### ', '')}</h5>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    const clean = line.substring(2);
                    return (
                        <div key={idx} className="chat-bullet-item">
                            <span className="bullet-dot">•</span>
                            <span>{renderFormattedText(clean)}</span>
                        </div>
                    );
                }
                if (!line.trim()) {
                    return <div key={idx} style={{ height: '0.4rem' }} />;
                }
                return <p key={idx} className="chat-paragraph">{renderFormattedText(line)}</p>;
            })}
        </div>
    );
};

function generateClientFallbackAnswer(paper, question) {
    const q = (question || '').toLowerCase();

    if (q.includes('limit') || q.includes('flaw') || q.includes('weakness')) {
        return `**Methodology & Limitations:**\n\n${paper.limitations || 'The authors highlighted standard methodological and contextual constraints.'}\n\n- **Study Design:** ${paper.metrics?.studyType || 'Empirical'}\n- **Evidence Level:** ${paper.metrics?.evidenceLevel || 'Moderate'}`;
    }

    if (q.includes('impact') || q.includes('matter') || q.includes('significan') || q.includes('apply') || q.includes('real world')) {
        return `**Real-World Significance:**\n\n${paper.significance || 'This study provides empirical benchmarks advancing current scientific knowledge.'}\n\n- **Field:** ${paper.discipline}\n- **Journal:** ${paper.journal}`;
    }

    if (q.includes('5') || q.includes('simple') || q.includes('eli5') || q.includes('kid')) {
        return `**Simple Explanation:**\n\nImagine scientists wanted to understand **${(paper.tags || [])[0] || paper.discipline}**. They tested this and found that **${paper.summary}**\n\nIn short: it helps us understand how things work in the real world!`;
    }

    if (q.includes('method') || q.includes('sample') || q.includes('how did they')) {
        return `**Methodological Framework:**\n\n- **Type:** ${paper.metrics?.studyType || 'Observational'}\n- **Evidence Level:** ${paper.metrics?.evidenceLevel || 'Moderate'}\n- **Summary of Methods:** ${paper.summary}\n- **Key Disciplinary Focus:** ${paper.discipline}`;
    }

    return `**Grounded Synthesis for "${paper.title}":**\n\n${paper.summary}\n\n**Significance:** ${paper.significance}\n\n*Published in ${paper.journal} by ${(paper.authors || []).join(', ')}.*`;
}

const PaperChat = ({ article }) => {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I'm your research assistant for **"${article.title}"**.\n\nAsk me anything about this study's methodology, real-world impact, findings, or terminology.`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleCopyAnswer = (id, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleSend = async (questionText) => {
        const q = (questionText || input).trim();
        if (!q || isLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: q,
            timestamp: new Date()
        };

        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/papers/${encodeURIComponent(article.id)}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: q,
                    history: updatedHistory.slice(1),
                    paper: article
                })
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            const data = await res.json();
            const assistantMsg = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: data.answer || "I couldn't generate a response for this query.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.warn("Using offline fallback chat:", err.message);
            const fallbackAnswer = generateClientFallbackAnswer(article, q);
            const assistantMsg = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: fallbackAnswer,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: `Chat cleared. Ask a new question about **"${article.title}"** below.`,
                timestamp: new Date()
            }
        ]);
    };

    return (
        <div className="paper-chat-container">
            <div className="chat-header-row">
                <div className="chat-header-info">
                    <span className="chat-badge">Grounded in paper</span>
                    <span className="chat-hint">Answers cite abstract, synthesis & metrics</span>
                </div>
                {messages.length > 1 && (
                    <button
                        type="button"
                        className="clear-chat-btn"
                        onClick={handleClearChat}
                        title="Clear chat history"
                    >
                        Reset Conversation
                    </button>
                )}
            </div>

            {/* Quick Starter Chips */}
            <div className="quick-questions-wrapper">
                <span className="quick-label">Suggested prompts:</span>
                <div className="quick-chips-list">
                    {SUGGESTED_QUESTIONS.map((item, i) => (
                        <button
                            key={i}
                            type="button"
                            className="quick-chip-btn"
                            onClick={() => handleSend(item.q)}
                            disabled={isLoading}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Stream */}
            <div className="chat-messages-stream" role="log" aria-live="polite">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                    >
                        <div className="chat-avatar" aria-hidden="true">
                            {msg.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div className="chat-bubble">
                            <div className="chat-bubble-header">
                                <span className="sender-name">
                                    {msg.role === 'user' ? 'You' : 'Nexus Scientific AI'}
                                </span>
                                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                                    <button
                                        type="button"
                                        className="copy-answer-btn"
                                        onClick={() => handleCopyAnswer(msg.id, msg.content)}
                                        title="Copy answer"
                                        aria-label="Copy answer"
                                    >
                                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                            </div>
                            <FormattedChatContent content={msg.content} />
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message-row assistant-row">
                        <div className="chat-avatar" aria-hidden="true">AI</div>
                        <div className="chat-bubble loading-bubble">
                            <div className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className="thinking-text">Synthesizing answer from paper...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
                className="chat-input-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-text-input"
                    placeholder="Ask a question about this study (e.g. sample size, real-world impact)..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send question"
                >
                    {isLoading ? '...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

/* =========================================================================
 * ArticleView Main Component
 * ========================================================================= */
import { formatAPA, formatBibTeX, formatMLA } from '../utils/citationHelper';

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
    const [isSplitView, setIsSplitView] = useState(false);
    const [copiedFormat, setCopiedFormat] = useState(null);

    const hasPdf = Boolean(article?.oaUrl || article?.pdfUrl);

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

    const handleShare = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('paper', article.id);
        navigator.clipboard.writeText(url.toString()).then(() => {
            setCopiedShare(true);
            setTimeout(() => setCopiedShare(false), 2000);
        });
    };

    const handleQuickCopy = (formatName, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedFormat(formatName);
            setTimeout(() => setCopiedFormat(null), 2000);
        });
    };

    return (
        <article className={`article-view animate-fade-in ${isSplitView && hasPdf ? 'split-layout' : ''}`}>
            <div className="article-top-nav">
                <button type="button" className="back-btn" onClick={onBack}>
                    Back to Feed
                </button>

                <div className="article-action-buttons">
                    <button
                        type="button"
                        className={`action-pill-btn ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => onToggleBookmark && onToggleBookmark(article.id)}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                    >
                        {isBookmarked ? 'Saved' : 'Save'}
                    </button>

                    <button
                        type="button"
                        className="action-pill-btn"
                        onClick={handleShare}
                        title="Copy shareable link to this study"
                    >
                        {copiedShare ? 'Link Copied' : 'Share'}
                    </button>

                    {hasPdf && (
                        <button
                            type="button"
                            className={`action-pill-btn ${isSplitView ? 'active-split' : ''}`}
                            onClick={() => setIsSplitView(v => !v)}
                            title="Toggle side-by-side AI synthesis and live PDF view"
                        >
                            {isSplitView ? 'Close Split PDF' : 'Split View (PDF + AI)'}
                        </button>
                    )}

                    {article.oaUrl && (
                        <a
                            href={article.oaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-pill-btn oa-pdf-btn"
                            title="Open direct free Open-Access PDF in new window"
                        >
                            Open PDF ↗
                        </a>
                    )}

                    <button
                        type="button"
                        className="action-pill-btn primary"
                        onClick={() => setIsCiteOpen(true)}
                        title="Generate citation in BibTeX, APA, MLA"
                    >
                        Cite
                    </button>
                </div>
            </div>

            <div className={isSplitView && hasPdf ? 'split-view-container' : 'single-view-container'}>
                {/* Left Column: Header, Audio, Synthesis Tabs */}
                <div className="split-view-left">
                    <header className="article-header editorial-card">
                        <div className="meta-row">
                            <span className="discipline-tag">
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

                        {/* Instant 1-Click Citation Bar */}
                        <div className="quick-citation-row">
                            <span className="quick-cite-label">Quick Cite:</span>
                            <button
                                type="button"
                                className={`quick-cite-chip ${copiedFormat === 'APA' ? 'copied' : ''}`}
                                onClick={() => handleQuickCopy('APA', formatAPA(article))}
                                title="Copy APA 7th Edition citation to clipboard"
                            >
                                {copiedFormat === 'APA' ? 'Copied APA' : 'Copy APA'}
                            </button>
                            <button
                                type="button"
                                className={`quick-cite-chip ${copiedFormat === 'BibTeX' ? 'copied' : ''}`}
                                onClick={() => handleQuickCopy('BibTeX', formatBibTeX(article))}
                                title="Copy BibTeX entry to clipboard"
                            >
                                {copiedFormat === 'BibTeX' ? 'Copied BibTeX' : 'Copy BibTeX'}
                            </button>
                            <button
                                type="button"
                                className={`quick-cite-chip ${copiedFormat === 'MLA' ? 'copied' : ''}`}
                                onClick={() => handleQuickCopy('MLA', formatMLA(article))}
                                title="Copy MLA 9th Edition citation to clipboard"
                            >
                                {copiedFormat === 'MLA' ? 'Copied MLA' : 'Copy MLA'}
                            </button>
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
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                                onClick={() => setActiveTab('chat')}
                            >
                                Ask the Paper
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
                                        <h4 className="box-heading">Core Synthesis</h4>
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
                                        <h4 className="box-heading">Why It Matters</h4>
                                        <p className="lead-paragraph">{article.significance}</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'limitations' && (
                                <div className="content-block">
                                    <div className="limitation-block">
                                        <div className="limitation-alert">
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

                            {activeTab === 'chat' && (
                                <PaperChat article={article} />
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
                </div>

                {/* Right Column: Embedded PDF Reader (when Split View is enabled) */}
                {isSplitView && hasPdf && (
                    <div className="split-view-right animate-fade-in">
                        <div className="pdf-embed-card">
                            <div className="pdf-embed-header">
                                <span>Live PDF Reader ({article.journal || 'Full Document'})</span>
                                <a
                                    href={article.pdfUrl || article.oaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-pill-btn"
                                    title="Open PDF in a new window"
                                >
                                    Full Window ↗
                                </a>
                            </div>
                            <iframe
                                src={article.pdfUrl || article.oaUrl}
                                title={`PDF Document Reader for ${article.title}`}
                                className="pdf-iframe"
                            />
                        </div>
                    </div>
                )}
            </div>

            <CitationModal
                article={article}
                isOpen={isCiteOpen}
                onClose={() => setIsCiteOpen(false)}
            />
        </article>
    );
}


