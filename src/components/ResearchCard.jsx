import React, { useState } from 'react';
import './ResearchCard.css';
import { formatAPA } from '../utils/citationHelper';

const DISCIPLINE_CONFIG = {
    'Neuroscience': { class: 'badge-neuro' },
    'Economics': { class: 'badge-econ' },
    'Economics & Finance': { class: 'badge-econ' },
    'Biology': { class: 'badge-bio' },
    'Biological Sciences': { class: 'badge-bio' },
    'Artificial Intelligence': { class: 'badge-ai' },
    'Climate Science': { class: 'badge-climate' },
    'Climate & Earth': { class: 'badge-climate' },
    'Psychology': { class: 'badge-psych' },
    'Health & Medicine': { class: 'badge-med' },
    'Medicine': { class: 'badge-med' },
    'Physics & Quantum': { class: 'badge-phys' },
    'Physics': { class: 'badge-phys' }
};

const EvidenceBadge = ({ level }) => {
    if (!level) return null;
    let pillClass = 'pill-neutral';
    if (level === 'High') pillClass = 'pill-success';
    if (level === 'Moderate') pillClass = 'pill-warning';

    return (
        <span className={`pill-badge ${pillClass}`} title="Quality of Evidence Rating">
            {level} Evidence
        </span>
    );
};

const ReviewStatusBadge = ({ status }) => {
    const normalized = status || 'peerReviewed';
    if (normalized === 'preReview') {
        return (
            <span className="pill-badge pill-warning" title="Shared before journal peer review. Findings may change.">
                Pre-print
            </span>
        );
    }
    return (
        <span className="pill-badge pill-neutral" title="Published after peer review.">
            Peer-reviewed
        </span>
    );
};

export default function ResearchCard({
    study,
    onClick,
    isBookmarked,
    onToggleBookmark,
    onPlayAudio,
    isAudioPlaying = false,
    isFocused = false,
    cardRef = null
}) {
    const [copiedCite, setCopiedCite] = useState(false);
    const discInfo = DISCIPLINE_CONFIG[study.discipline] || { class: 'pill-neutral' };
    const citations = study.metrics?.citations || study.citations || 0;
    const isOA = study.isOpenAccess || !!study.oaUrl;
    const isSynthesized = !!(study.summary && study.significance);

    const formattedDate = study.publishDate
        ? new Date(study.publishDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : study.publicationYear || '';

    const handleQuickCite = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(formatAPA(study)).then(() => {
            setCopiedCite(true);
            setTimeout(() => setCopiedCite(false), 2000);
        });
    };

    return (
        <div
            ref={cardRef}
            className={`research-card editorial-card ${isFocused ? 'keyboard-focused' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onClick(study)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(study);
                }
            }}
        >
            <div className="card-top-row">
                <div className="card-meta-left">
                    <span className={`discipline-chip ${discInfo.class}`}>
                        {study.discipline || 'Scholarly Paper'}
                    </span>
                    {formattedDate && (
                        <span className="card-date">
                            {formattedDate}
                        </span>
                    )}
                </div>

                <div className="card-actions">
                    {isOA && (
                        <span className="oa-badge" title="Open Access Research Paper (Free PDF)">
                            Open Access
                        </span>
                    )}
                    {study.audioUrl && onPlayAudio && (
                        <button
                            type="button"
                            className={`card-action-btn ${isAudioPlaying ? 'active-audio' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPlayAudio(study);
                            }}
                            title="Listen to audio narration"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <span>{isAudioPlaying ? 'Playing' : 'Listen'}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className={`card-action-btn cite-btn ${copiedCite ? 'copied' : ''}`}
                        onClick={handleQuickCite}
                        title="Copy APA citation to clipboard"
                    >
                        {copiedCite ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M6 9a3 3 0 0 1 3-3h1v4H8a1 1 0 0 0-1 1v1h3v4H6V9zm8 0a3 3 0 0 1 3-3h1v4h-2a1 1 0 0 0-1 1v1h3v4h-4V9z"></path>
                            </svg>
                        )}
                        <span>{copiedCite ? 'Copied APA' : 'Cite'}</span>
                    </button>
                    {onToggleBookmark && (
                        <button
                            type="button"
                            className={`card-action-btn card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleBookmark(study.id);
                            }}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                        </button>
                    )}
                </div>
            </div>

            <header className="card-header">
                <h3 className="heading-serif card-title">{study.title}</h3>
                <p className="card-journal">
                    {study.journal || 'Academic Source'}
                    {citations > 0 ? ` • ${citations.toLocaleString()} citations` : ''}
                </p>
            </header>

            <div className="card-body">
                <p className="card-summary">
                    {study.summary || study.abstract || 'Click to view full analysis, AI synthesis, and key methodology.'}
                </p>
            </div>

            <footer className="card-footer">
                <div className="tags-container">
                    {(study.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                    {study.metrics?.studyType && (
                        <span className="tag study-type-tag">{study.metrics.studyType}</span>
                    )}
                </div>
                <div className="footer-metrics">
                    <div className="metrics-group">
                        <ReviewStatusBadge status={study.reviewStatus} />
                        <EvidenceBadge level={study.metrics?.evidenceLevel} />
                        {!isSynthesized && (
                            <span className="pill-badge pill-ai-jit" title="Gemini AI will synthesize key takeaways when opened">
                                Instant AI Synthesis
                            </span>
                        )}
                    </div>
                    <div className="read-more">
                        {isSynthesized ? 'Read Insight →' : 'Synthesize & Read →'}
                    </div>
                </div>
            </footer>
        </div>
    );
}
