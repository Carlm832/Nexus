import React, { useState, useEffect } from 'react';
import './AccountModal.css';
import { disciplines } from '../data/taxonomy';

export default function AccountModal({
    isOpen,
    onClose,
    currentUser,
    userProfile,
    onUpdateProfile,
    savedPapers = [],
    onRemoveBookmark,
    onOpenPaper,
    readingHistory = [],
    onClearHistory,
    preferences,
    onUpdatePreferences,
    onSignOut
}) {
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'library' | 'history' | 'preferences'
    const [fullName, setFullName] = useState(userProfile?.name || '');
    const [institution, setInstitution] = useState(userProfile?.institution || '');
    const [academicRole, setAcademicRole] = useState(userProfile?.role || 'Graduate / PhD Researcher');
    const [selectedInterests, setSelectedInterests] = useState(userProfile?.interests || []);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFullName(userProfile.name || '');
            setInstitution(userProfile.institution || '');
            setAcademicRole(userProfile.role || 'Graduate / PhD Researcher');
            setSelectedInterests(userProfile.interests || []);
        } else if (currentUser) {
            const emailName = (currentUser.email || '').split('@')[0];
            setFullName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }
    }, [userProfile, currentUser]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const toggleInterest = (disc) => {
        setSelectedInterests(prev =>
            prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
        );
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        onUpdateProfile({
            name: fullName,
            institution,
            role: academicRole,
            interests: selectedInterests
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const exportLibraryToBibTeX = () => {
        if (!savedPapers || savedPapers.length === 0) return;

        const bibEntries = savedPapers.map(paper => {
            const year = paper.publishDate ? new Date(paper.publishDate).getFullYear() : '2024';
            const firstAuthor = (paper.authors?.[0] || 'Author').split(' ').slice(-1)[0].toLowerCase();
            const cleanId = `${firstAuthor}${year}_${(paper.id || 'paper').replace(/[^a-zA-Z0-9]/g, '')}`;
            const authors = (paper.authors || ['Unknown Author']).join(' and ');
            const title = paper.title || 'Untitled';
            const journal = paper.journal || 'Academic Publication';
            const doi = (paper.doi || paper.id || '').replace(/^https?:\/\/doi\.org\//i, '');

            return `@article{${cleanId},
  title = {${title}},
  author = {${authors}},
  journal = {${journal}},
  year = {${year}}${doi ? `,\n  doi = {${doi}}` : ''}
}`;
        }).join('\n\n');

        const blob = new Blob([bibEntries], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus_library_citations_${new Date().toISOString().split('T')[0]}.bib`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
    };

    const userEmail = currentUser?.email || 'Researcher Guest';
    const initials = (fullName || userEmail)
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <button
                type="button"
                className="modal-backdrop"
                onClick={onClose}
                aria-label="Close account modal"
            />
            <div className="account-modal-container editorial-card animate-fade-in">
                {/* Header */}
                <header className="account-modal-header">
                    <div className="account-user-banner">
                        <div className="account-avatar">{initials || 'R'}</div>
                        <div className="account-user-meta">
                            <h2 className="heading-serif account-user-name">
                                {fullName || userEmail.split('@')[0]}
                            </h2>
                            <p className="account-user-subtitle">
                                {institution ? `${academicRole} • ${institution}` : userEmail}
                            </p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close account dashboard">&times;</button>
                </header>

                {/* Dashboard Tabs */}
                <div className="account-tabs-bar">
                    <button
                        type="button"
                        className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Academic Profile
                    </button>
                    <button
                        type="button"
                        className={`account-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                        onClick={() => setActiveTab('library')}
                    >
                        My Library ({savedPapers.length})
                    </button>
                    <button
                        type="button"
                        className={`account-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Reading History ({readingHistory.length})
                    </button>
                    <button
                        type="button"
                        className={`account-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        Preferences &amp; Security
                    </button>
                </div>

                {/* Tab 1: Profile & Affiliation */}
                {activeTab === 'profile' && (
                    <form className="account-tab-content" onSubmit={handleSaveProfile}>
                        <div className="account-form-grid">
                            <div className="form-group">
                                <label className="form-label" htmlFor="full-name">Full Name</label>
                                <input
                                    id="full-name"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Dr. Alex Mercer"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="institution">University / Research Institution</label>
                                <input
                                    id="institution"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Stanford University, Max Planck Institute"
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label" htmlFor="academic-role">Academic Position / Role</label>
                                <select
                                    id="academic-role"
                                    className="form-select"
                                    value={academicRole}
                                    onChange={(e) => setAcademicRole(e.target.value)}
                                >
                                    <option value="Undergraduate Student">Undergraduate Student</option>
                                    <option value="Graduate / Master's Student">Graduate / Master's Student</option>
                                    <option value="PhD Candidate / Doctoral Researcher">PhD Candidate / Doctoral Researcher</option>
                                    <option value="Postdoctoral Fellow">Postdoctoral Fellow</option>
                                    <option value="Principal Investigator / Professor">Principal Investigator / Professor</option>
                                    <option value="Industry R&D Researcher">Industry R&D Researcher</option>
                                    <option value="Independent Scholar">Independent Scholar</option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Primary Fields of Study</label>
                                <p className="form-hint">Select disciplines to tailor recommendations and scholarly feeds.</p>
                                <div className="interests-chip-grid">
                                    {disciplines.map(disc => {
                                        const isSelected = selectedInterests.includes(disc);
                                        return (
                                            <button
                                                key={disc}
                                                type="button"
                                                className={`interest-chip ${isSelected ? 'selected' : ''}`}
                                                onClick={() => toggleInterest(disc)}
                                            >
                                                {disc}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="account-footer-actions">
                            {saveSuccess && <span className="save-notice">Profile updated successfully</span>}
                            <button type="submit" className="done-btn">Save Profile Changes</button>
                        </div>
                    </form>
                )}

                {/* Tab 2: Saved Library & BibTeX Export */}
                {activeTab === 'library' && (
                    <div className="account-tab-content">
                        <div className="library-top-bar">
                            <div>
                                <h3 className="section-heading">Saved Research Papers</h3>
                                <p className="section-subheading">
                                    {savedPapers.length} {savedPapers.length === 1 ? 'paper' : 'papers'} in your permanent research collection.
                                </p>
                            </div>
                            {savedPapers.length > 0 && (
                                <button
                                    type="button"
                                    className="export-bibtex-btn"
                                    onClick={exportLibraryToBibTeX}
                                    title="Export formatted BibTeX file (.bib) for LaTeX, Overleaf, or Word"
                                >
                                    {exportSuccess ? 'Downloaded .bib File' : 'Export Library to BibTeX (.bib)'}
                                </button>
                            )}
                        </div>

                        {savedPapers.length > 0 ? (
                            <div className="library-papers-list">
                                {savedPapers.map(paper => (
                                    <div key={paper.id} className="library-paper-row">
                                        <div className="library-paper-info">
                                            <span className="library-paper-disc">{paper.discipline}</span>
                                            <h4
                                                className="library-paper-title"
                                                onClick={() => {
                                                    onOpenPaper(paper);
                                                    onClose();
                                                }}
                                            >
                                                {paper.title}
                                            </h4>
                                            <p className="library-paper-meta">
                                                {(paper.authors || []).slice(0, 3).join(', ')} • {paper.journal || 'Academic Journal'}
                                                {paper.metrics?.citations ? ` • ${paper.metrics.citations.toLocaleString()} citations` : ''}
                                            </p>
                                        </div>
                                        <div className="library-paper-actions">
                                            <button
                                                type="button"
                                                className="action-pill-btn primary"
                                                onClick={() => {
                                                    onOpenPaper(paper);
                                                    onClose();
                                                }}
                                            >
                                                Open Study
                                            </button>
                                            <button
                                                type="button"
                                                className="action-pill-btn danger"
                                                onClick={() => onRemoveBookmark(paper.id)}
                                                title="Remove from saved library"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="account-empty-state">
                                <p>No saved research papers yet.</p>
                                <p className="empty-sub">Click the Save button on any study card or article view to build your personal library.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Reading History */}
                {activeTab === 'history' && (
                    <div className="account-tab-content">
                        <div className="library-top-bar">
                            <div>
                                <h3 className="section-heading">Recently Read Research</h3>
                                <p className="section-subheading">Chronological history of syntheses and studies you have explored.</p>
                            </div>
                            {readingHistory.length > 0 && (
                                <button
                                    type="button"
                                    className="action-pill-btn"
                                    onClick={onClearHistory}
                                >
                                    Clear History
                                </button>
                            )}
                        </div>

                        {readingHistory.length > 0 ? (
                            <div className="library-papers-list">
                                {readingHistory.map((paper, idx) => (
                                    <div key={`${paper.id}-${idx}`} className="library-paper-row">
                                        <div className="library-paper-info">
                                            <span className="library-paper-disc">{paper.discipline}</span>
                                            <h4
                                                className="library-paper-title"
                                                onClick={() => {
                                                    onOpenPaper(paper);
                                                    onClose();
                                                }}
                                            >
                                                {paper.title}
                                            </h4>
                                            <p className="library-paper-meta">
                                                {(paper.authors || []).slice(0, 3).join(', ')} • {paper.journal || 'Academic Journal'}
                                            </p>
                                        </div>
                                        <div className="library-paper-actions">
                                            <button
                                                type="button"
                                                className="action-pill-btn"
                                                onClick={() => {
                                                    onOpenPaper(paper);
                                                    onClose();
                                                }}
                                            >
                                                Revisit Study
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="account-empty-state">
                                <p>No reading history recorded yet.</p>
                                <p className="empty-sub">Studies you view will automatically appear here for rapid recall.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Preferences & Security */}
                {activeTab === 'preferences' && (
                    <div className="account-tab-content">
                        <div className="settings-section">
                            <h3 className="section-heading">Audio &amp; Synthesis Preferences</h3>
                            <div className="setting-row">
                                <div>
                                    <span className="setting-title">Default Audio Narration Speed</span>
                                    <p className="setting-desc">Sets default playback rate for ElevenLabs audio summaries.</p>
                                </div>
                                <select
                                    className="form-select"
                                    style={{ width: '120px' }}
                                    value={preferences?.playbackRate || 1}
                                    onChange={(e) => onUpdatePreferences({ playbackRate: parseFloat(e.target.value) })}
                                >
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1.0x (Normal)</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x (Fast)</option>
                                    <option value="2">2.0x (Double)</option>
                                </select>
                            </div>

                            <div className="setting-row">
                                <div>
                                    <span className="setting-title">Include Pre-print Discoveries</span>
                                    <p className="setting-desc">Include unreviewed scientific manuscripts from arXiv and bioRxiv in feeds.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences?.includePreprints ?? false}
                                    onChange={(e) => onUpdatePreferences({ includePreprints: e.target.checked })}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                />
                            </div>
                        </div>

                        <div className="settings-section" style={{ marginTop: '2rem' }}>
                            <h3 className="section-heading">Account &amp; Authentication</h3>
                            <div className="setting-row">
                                <div>
                                    <span className="setting-title">Account Email</span>
                                    <p className="setting-desc">{currentUser?.email || 'Guest Mode (Local Storage)'}</p>
                                </div>
                                <span className="pill-badge pill-neutral">
                                    {currentUser ? 'Supabase Verified' : 'Local Session'}
                                </span>
                            </div>

                            <div className="account-danger-zone">
                                <div>
                                    <span className="setting-title">Session Management</span>
                                    <p className="setting-desc">End your active session on this device.</p>
                                </div>
                                <button
                                    type="button"
                                    className="action-pill-btn danger"
                                    onClick={() => {
                                        onSignOut();
                                        onClose();
                                    }}
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
