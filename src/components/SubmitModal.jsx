import React, { useState, useEffect } from 'react';
import './SubmitModal.css';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export default function SubmitModal({ isOpen, onClose, onPaperAdded }) {
    const [doi, setDoi] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isSubmitting) onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!doi.trim()) return;

        setIsSubmitting(true);
        setMessage(null);
        setError(null);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ doi: doi.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to submit paper');
            }

            setMessage('Paper successfully analyzed and added to Nexus!');
            setDoi('');

            if (onPaperAdded) {
                onPaperAdded(data.paper);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <button
                type="button"
                className="modal-backdrop"
                onClick={onClose}
                aria-label="Close modal overlay"
            />
            <div className="modal-content editorial-card animate-fade-in" style={{ maxWidth: '520px', zIndex: 10 }}>
                <header className="modal-header">
                    <h2 className="heading-serif">Submit Research</h2>
                    <button className="close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Close submit modal">&times;</button>
                </header>

                <div className="modal-body">
                    <p className="modal-description">
                        Submit a peer-reviewed DOI to run through our AI synthesis and audio narration pipeline.
                    </p>

                    <form className="submit-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="doi">Digital Object Identifier (DOI)</label>
                            <input
                                id="doi"
                                type="text"
                                value={doi}
                                onChange={(e) => setDoi(e.target.value)}
                                placeholder="e.g. 10.1038/s41586-024-07386-0"
                                disabled={isSubmitting}
                                className="doi-input"
                            />
                            <div className="doi-help-row">
                                <small className="help-text">Must have an open abstract available via Crossref.</small>
                            </div>
                        </div>

                        {error && <div className="status-message error">{error}</div>}
                        {message && <div className="status-message success">{message}</div>}

                        <button type="submit" className="done-btn full-width" disabled={isSubmitting || !doi.trim()}>
                            {isSubmitting ? 'Analyzing & Abstracting...' : 'Submit to Nexus'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

