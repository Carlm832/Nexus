import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ isOpen, onClose, onLogin }) {
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setEmail('');
            setPassword('');
            setError(null);
            setSuccessMsg(null);
            setMode('signin');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            if (!supabase) {
                // Fallback: demo mode if Supabase not configured
                onLogin({ email: email || 'demo@nexus.app', id: 'demo-user' });
                onClose();
                return;
            }

            if (mode === 'signup') {
                const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;
                if (data?.user?.identities?.length === 0) {
                    // User already exists
                    setError('An account with this email already exists. Please sign in instead.');
                } else {
                    setSuccessMsg('Account created! Check your email to confirm your address, then sign in.');
                    setMode('signin');
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                onLogin(data.user);
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
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
            <div className="modal-content editorial-card animate-fade-in" style={{ maxWidth: '420px', zIndex: 10 }}>
                <header className="modal-header">
                    <h2 className="heading-serif">{mode === 'signup' ? 'Join Nexus' : 'Welcome Back'}</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close authentication modal">&times;</button>
                </header>

                <div className="modal-body">
                    <p className="modal-description" style={{ marginBottom: '1.5rem' }}>
                        {mode === 'signup'
                            ? 'Create a researcher profile to submit DOIs, save feeds, and download audio syntheses.'
                            : 'Sign in to access your saved research, custom feeds, and audio downloads.'}
                    </p>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            color: 'var(--color-accent)',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            color: '#10b981',
                            fontSize: '0.85rem'
                        }}>
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label
                                htmlFor="auth-email"
                                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                            >
                                Email Address
                            </label>
                            <input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.875rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-strong)',
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="auth-password"
                                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                            >
                                Password
                            </label>
                            <input
                                id="auth-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.875rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-strong)',
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="done-btn full-width"
                            disabled={loading}
                            style={{ marginTop: '0.5rem' }}
                        >
                            {loading
                                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                                : (mode === 'signup' ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                        {mode === 'signin' ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-accent)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', padding: 0 }}
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-accent)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', padding: 0 }}
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
