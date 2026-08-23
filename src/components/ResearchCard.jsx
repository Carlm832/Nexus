import React from 'react';
import './ResearchCard.css';

const DISCIPLINE_CONFIG = {
    'Neuroscience': { icon: '🧠', class: 'badge-neuro' },
    'Economics': { icon: '📊', class: 'badge-econ' },
    'Biology': { icon: '🧬', class: 'badge-bio' },
    'Artificial Intelligence': { icon: '⚡', class: 'badge-ai' },
    'Climate Science': { icon: '🌍', class: 'badge-climate' },
    'Psychology': { icon: '💭', class: 'badge-psych' }
};

const EvidenceBadge = ({ level }) => {
    let pillClass = 'pill-neutral';
    if (level === 'High') pillClass = 'pill-success';
    if (level === 'Moderate') pillClass = 'pill-warning';

    return (
        <span className={`pill-badge ${pillClass}`} title="Quality of Evidence Rating">
            ● {level} Evidence
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

export default function ResearchCard({ study, onClick, isBookmarked, onToggleBookmark }) {
    const discInfo = DISCIPLINE_CONFIG[study.discipline] || { icon: '📄', class: 'pill-neutral' };

    return (
        <div
            className="research-card editorial-card"
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
                        <span className="disc-icon">{discInfo.icon}</span>
                        {study.discipline}
                    </span>
                    <span className="card-date">
                        {new Date(study.publishDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                </div>

                <div className="card-actions">
                    {study.audioUrl && (
                        <span className="audio-badge" title="Audio narration available">
                            🎧 Audio
                        </span>
                    )}
                    {onToggleBookmark && (
                        <button
                            type="button"
                            className={`card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleBookmark(study.id);
                            }}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark paper'}
                        >
                            {isBookmarked ? '★' : '☆'}
                        </button>
                    )}
                </div>
            </div>

            <header className="card-header">
                <h3 className="heading-serif card-title">{study.title}</h3>
                <p className="card-journal">{study.journal} {study.metrics?.citations ? `• ${study.metrics.citations} citations` : ''}</p>
            </header>

            <div className="card-body">
                <p className="card-summary">{study.summary}</p>
            </div>

            <footer className="card-footer">
                <div className="tags-container">
                    {(study.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                </div>
                <div className="footer-metrics">
                    <div className="metrics-group">
                        <ReviewStatusBadge status={study.reviewStatus} />
                        <EvidenceBadge level={study.metrics?.evidenceLevel} />
                    </div>
                    <div className="read-more">Read Insight &rarr;</div>
                </div>
            </footer>
        </div>
    );
}

