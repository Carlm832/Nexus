import React, { useState } from 'react';
import './AudioMicroPlayer.css';

export default function AudioMicroPlayer({
    paper,
    isPlaying,
    currentTime = 0,
    duration = 0,
    playbackRate = 1,
    isGenerating = false,
    mode = 'file',
    onTogglePlay,
    onSeek,
    onChangeSpeed,
    onOpenPaper,
    onClose
}) {
    const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);

    if (!paper) return null;

    const formatTime = (seconds) => {
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSkip = (secondsOffset) => {
        if (onSeek) {
            const nextTime = Math.max(0, Math.min(duration || 0, currentTime + secondsOffset));
            onSeek(nextTime);
        }
    };

    const speedOptions = [0.75, 1, 1.25, 1.5, 2];
    const handleNextSpeed = () => {
        const nextIdx = (speedOptions.indexOf(playbackRate) + 1) % speedOptions.length;
        onChangeSpeed(speedOptions[nextIdx]);
    };

    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    return (
        <aside className="audio-micro-player-container" aria-label="Audio Narration Player">
            {/* Scrubber Bar */}
            <div
                className="audio-scrubber-track"
                onMouseEnter={() => setIsHoveringScrubber(true)}
                onMouseLeave={() => setIsHoveringScrubber(false)}
            >
                <div
                    className={`audio-scrubber-fill ${isGenerating ? 'generating-pulse' : ''}`}
                    style={{ width: isGenerating ? '100%' : `${progressPercent}%` }}
                />
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    disabled={isGenerating}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="audio-scrubber-input"
                    aria-label="Seek audio timeline"
                />
            </div>

            <div className="audio-micro-player-content">
                {/* Paper Info */}
                <div className="audio-player-meta">
                    <button
                        type="button"
                        className="audio-meta-title-btn"
                        onClick={() => onOpenPaper(paper)}
                        title={`View paper: ${paper.title}`}
                    >
                        <span className={`audio-live-indicator ${isPlaying ? 'pulse' : ''}`} />
                        <span className="audio-player-title">{paper.title}</span>
                    </button>
                    <div className="audio-player-sub-meta">
                        <span className="audio-player-authors">
                            {(paper.authors || []).slice(0, 2).join(', ')} {paper.authors?.length > 2 && 'et al.'}
                        </span>
                        {isGenerating ? (
                            <span className="audio-source-badge generating">⚡ Generating Voice...</span>
                        ) : mode === 'speech' ? (
                            <span className="audio-source-badge voice">TTS Voice</span>
                        ) : (
                            <span className="audio-source-badge studio">Studio Narration</span>
                        )}
                    </div>
                </div>

                {/* Center Controls */}
                <div className="audio-player-controls">
                    <button
                        type="button"
                        className="audio-ctrl-btn skip-btn"
                        onClick={() => handleSkip(-15)}
                        disabled={isGenerating}
                        title="Skip back 15 seconds"
                        aria-label="Skip back 15 seconds"
                    >
                        -15s
                    </button>

                    <button
                        type="button"
                        className={`audio-ctrl-btn play-pause-btn ${isGenerating ? 'loading' : ''}`}
                        onClick={onTogglePlay}
                        disabled={isGenerating}
                        aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isGenerating ? (
                            <span>⚡</span>
                        ) : isPlaying ? (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                                <span>Pause</span>
                            </>
                        ) : (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                <span>Play</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="audio-ctrl-btn skip-btn"
                        onClick={() => handleSkip(15)}
                        disabled={isGenerating}
                        title="Skip forward 15 seconds"
                        aria-label="Skip forward 15 seconds"
                    >
                        +15s
                    </button>

                    <div className="audio-time-display">
                        <span>{formatTime(currentTime)}</span>
                        <span className="time-divider">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="audio-player-actions">
                    <button
                        type="button"
                        className="audio-speed-toggle"
                        onClick={handleNextSpeed}
                        title="Adjust playback speed"
                    >
                        {playbackRate}x
                    </button>

                    <button
                        type="button"
                        className="audio-open-paper-btn"
                        onClick={() => onOpenPaper(paper)}
                    >
                        View Paper ↗
                    </button>

                    <button
                        type="button"
                        className="audio-dismiss-btn"
                        onClick={onClose}
                        title="Close player"
                        aria-label="Close audio player"
                    >
                        &times;
                    </button>
                </div>
            </div>
        </aside>
    );
}

