import React, { useEffect } from 'react';
import './CurationModal.css';
import { disciplines, ACADEMIC_DOMAINS } from '../data/taxonomy';

export default function CurationModal({ isOpen, onClose, selectedDisciplines, toggleDiscipline }) {
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
            <div className="modal-content editorial-card animate-fade-in" style={{ zIndex: 10 }}>
                <header className="modal-header">
                    <h2 className="heading-serif">Curate Your Feed</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close curation modal">&times;</button>
                </header>

                <div className="modal-body">
                    <p className="modal-description">
                        Select the disciplines you want to explore in your Nexus feed. 
                        Leave unselected to view all fields.
                    </p>

                    <div className="discipline-grid">
                        {disciplines.map(disc => {
                            const isSelected = selectedDisciplines.includes(disc);
                            return (
                                <button
                                    key={disc}
                                    type="button"
                                    className={`discipline-chip-btn ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleDiscipline(disc)}
                                >
                                    <span className="disc-chip-label">
                                        {disc}
                                    </span>
                                    {isSelected ? <span className="check-icon">Selected</span> : <span className="plus-icon">Add</span>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="adjacent-fields">
                        <h4>Recommended Interdisciplinary Connections</h4>
                        <p>Exploring <strong>Neuroscience</strong> alongside <strong>Artificial Intelligence</strong> and <strong>Cognitive Psychology</strong> reveals cutting-edge neural computation discoveries.</p>
                    </div>
                </div>

                <footer className="modal-footer">
                    <button type="button" className="done-btn" onClick={onClose}>Apply Preferences</button>
                </footer>
            </div>
        </div>
    );
}

