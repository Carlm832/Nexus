import React, { useEffect } from 'react';

export default function AuthModal({ isOpen, onClose, onLogin }) {
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

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <button
                type="button"
                className="modal-backdrop"
                onClick={onClose}
                aria-label="Close modal overlay"
            />
            <div className="modal-content editorial-card animate-fade-in" style={{ maxWidth: '420px', zIndex: 10 }}>
                <header className="modal-header">
                    <h2 className="heading-serif">Join Nexus</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close authentication modal">&times;</button>
                </header>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎓</div>

                    <p className="modal-description" style={{ marginBottom: '1.75rem' }}>
                        Create a researcher or reader profile to submit DOIs, save custom feeds, and download high-definition audio syntheses.
                    </p>

                    <button
                        type="button"
                        className="done-btn full-width"
                        onClick={() => {
                            onLogin();
                            onClose();
                        }}
                    >
                        Continue with Google SSO
                    </button>

                    <button
                        type="button"
                        className="done-btn full-width"
                        style={{
                            marginTop: '0.75rem',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-primary)'
                        }}
                        onClick={() => {
                            onLogin();
                            onClose();
                        }}
                    >
                        Continue with Email
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Instant access demonstration mode enabled.
                    </p>
                </div>
            </div>
        </div>
    );
}

