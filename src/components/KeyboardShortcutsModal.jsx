import React, { useEffect } from 'react';
import './KeyboardShortcutsModal.css';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
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

    const shortcuts = [
        { key: '/', description: 'Focus global search input' },
        { key: 'J / K', description: 'Navigate down / up through paper list' },
        { key: 'Enter', description: 'Open focused paper in deep reader' },
        { key: 'B', description: 'Toggle bookmark for focused paper' },
        { key: 'A', description: 'Play / pause audio narration' },
        { key: 'Esc', description: 'Close modal or return to discovery feed' },
        { key: '?', description: 'Toggle this keyboard shortcuts helper' },
    ];

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <button
                type="button"
                className="modal-backdrop"
                onClick={onClose}
                aria-label="Close shortcuts modal"
            />
            <div className="modal-content editorial-card animate-fade-in shortcuts-modal-box">
                <header className="shortcuts-modal-header">
                    <div>
                        <h2 className="heading-serif shortcuts-title">Keyboard Navigation Shortcuts</h2>
                        <p className="shortcuts-subtitle">Power-user navigation controls for scholarly research</p>
                    </div>
                    <button
                        type="button"
                        className="close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </header>

                <div className="shortcuts-list">
                    {shortcuts.map((item) => (
                        <div key={item.key} className="shortcut-row">
                            <span className="shortcut-desc">{item.description}</span>
                            <kbd className="shortcut-kbd">{item.key}</kbd>
                        </div>
                    ))}
                </div>

                <footer className="shortcuts-modal-footer">
                    <button
                        type="button"
                        className="done-btn"
                        onClick={onClose}
                    >
                        Got It
                    </button>
                </footer>
            </div>
        </div>
    );
}
