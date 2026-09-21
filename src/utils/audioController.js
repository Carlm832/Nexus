/* =========================================================================
 * Audio Controller Utility (audioController.js)
 * 
 * Manages global audio playback for research papers:
 * - Persistent HTMLAudioElement playback (survives route navigation)
 * - On-demand ElevenLabs studio generation via backend API
 * - Intelligent Web Speech API (speechSynthesis) fallback
 * - Seek, timeline, playback rate (0.75x - 2x), and skip support
 * ========================================================================= */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class GlobalAudioManager {
    constructor() {
        this.audioElement = new Audio();
        this.activePaper = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.playbackRate = 1;
        this.isGenerating = false;
        this.error = null;
        this.mode = 'idle'; // 'file' | 'speech' | 'idle'

        // Web Speech API state
        this.speechUtterance = null;
        this.speechTimer = null;
        this.speechEstimatedDuration = 0;
        this.speechStartTime = 0;
        this.speechPausedTime = 0;

        this.listeners = new Set();
        this._initAudioListeners();
    }

    _initAudioListeners() {
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.mode === 'file') {
                this.currentTime = this.audioElement.currentTime;
                if (isFinite(this.audioElement.duration) && this.audioElement.duration > 0) {
                    this.duration = this.audioElement.duration;
                }
                this._notify();
            }
        });

        this.audioElement.addEventListener('loadedmetadata', () => {
            if (this.mode === 'file' && isFinite(this.audioElement.duration)) {
                this.duration = this.audioElement.duration;
                this._notify();
            }
        });

        this.audioElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.currentTime = 0;
            this._notify();
        });

        this.audioElement.addEventListener('play', () => {
            this.isPlaying = true;
            this._notify();
        });

        this.audioElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this._notify();
        });

        this.audioElement.addEventListener('error', (e) => {
            console.warn('HTMLAudioElement error, falling back to speech synthesis:', e);
            if (this.activePaper) {
                this._playWithSpeechSynthesis(this.activePaper);
            }
        });
    }

    subscribe(listener) {
        this.listeners.add(listener);
        // Initial state emission
        listener(this.getState());
        return () => this.listeners.delete(listener);
    }

    _notify() {
        const state = this.getState();
        this.listeners.forEach(fn => {
            try { fn(state); } catch (err) { console.error('Audio listener error:', err); }
        });
    }

    getState() {
        return {
            activePaper: this.activePaper,
            isPlaying: this.isPlaying,
            currentTime: this.currentTime,
            duration: this.duration,
            playbackRate: this.playbackRate,
            isGenerating: this.isGenerating,
            error: this.error,
            mode: this.mode
        };
    }

    async playPaper(paper) {
        if (!paper) return;

        // If clicking the currently active paper, toggle play/pause
        if (this.activePaper && (this.activePaper.id === paper.id || (paper.doi && this.activePaper.doi === paper.doi))) {
            return this.togglePlay();
        }

        // Stop current audio
        this.stop();

        this.activePaper = paper;
        this.isGenerating = false;
        this.error = null;
        this.currentTime = 0;
        this.duration = 0;
        this._notify();

        // Check if paper already has a valid direct MP3 URL
        const rawUrl = paper.audioUrl;
        if (rawUrl) {
            const resolvedUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
            this._playAudioFile(resolvedUrl);
            return;
        }

        // Try requesting audio generation from backend ElevenLabs
        this.isGenerating = true;
        this._notify();

        try {
            const paperId = paper.id || paper.doi;
            const res = await fetch(`${API_BASE}/api/papers/${encodeURIComponent(paperId)}/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paper })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.audioUrl) {
                    paper.audioUrl = data.audioUrl;
                    this.isGenerating = false;
                    const resolvedUrl = data.audioUrl.startsWith('http') ? data.audioUrl : `${API_BASE}${data.audioUrl}`;
                    this._playAudioFile(resolvedUrl);
                    return;
                }
            }
            // If response not ok or no audioUrl, fallback to speech synthesis
            console.info('Backend audio unavailable, using Web Speech API fallback.');
            this.isGenerating = false;
            this._playWithSpeechSynthesis(paper);
        } catch (err) {
            console.info('Network/Backend audio failed, using Web Speech API fallback:', err.message);
            this.isGenerating = false;
            this._playWithSpeechSynthesis(paper);
        }
    }

    _playAudioFile(src) {
        this.mode = 'file';
        this._stopSpeech();
        this.audioElement.src = src;
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.currentTime = 0;
        this.audioElement.play().then(() => {
            this.isPlaying = true;
            this._notify();
        }).catch(err => {
            console.warn('Audio play() failed, falling back to speech synthesis:', err);
            if (this.activePaper) {
                this._playWithSpeechSynthesis(this.activePaper);
            }
        });
    }

    _playWithSpeechSynthesis(paper) {
        this.mode = 'speech';
        this.audioElement.pause();
        this._stopSpeech();

        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            this.error = 'Audio playback is not supported in this browser environment.';
            this.isPlaying = false;
            this._notify();
            return;
        }

        const textToRead = [
            paper.title,
            paper.summary ? `Summary: ${paper.summary}` : (paper.abstract ? `Abstract: ${paper.abstract}` : ''),
            paper.significance ? `Why it matters: ${paper.significance}` : '',
            paper.limitations ? `Limitations: ${paper.limitations}` : ''
        ].filter(Boolean).join('. ');

        // Estimate duration based on average speaking rate (~150 words per minute)
        const wordCount = textToRead.split(/\s+/).length;
        const estimatedSeconds = Math.max(10, Math.ceil((wordCount / (150 * this.playbackRate)) * 60));
        this.speechEstimatedDuration = estimatedSeconds;
        this.duration = estimatedSeconds;
        this.currentTime = 0;

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = Math.max(0.75, Math.min(2.0, this.playbackRate));
        utterance.pitch = 1.0;
        utterance.lang = paper.language && paper.language !== 'en' ? paper.language : 'en-US';

        // Select an articulate scholarly voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.lang.startsWith(utterance.lang)));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
            this.isPlaying = true;
            this.speechStartTime = Date.now();
            this._startSpeechProgressTimer();
            this._notify();
        };

        utterance.onend = () => {
            this.isPlaying = false;
            this.currentTime = 0;
            this._stopSpeechProgressTimer();
            this._notify();
        };

        utterance.onerror = (e) => {
            console.warn('SpeechSynthesis error:', e);
            this.isPlaying = false;
            this._stopSpeechProgressTimer();
            this._notify();
        };

        this.speechUtterance = utterance;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    _startSpeechProgressTimer() {
        this._stopSpeechProgressTimer();
        this.speechTimer = setInterval(() => {
            if (this.isPlaying && this.mode === 'speech') {
                const elapsed = (Date.now() - this.speechStartTime) / 1000 * this.playbackRate;
                this.currentTime = Math.min(this.duration, elapsed);
                this._notify();
            }
        }, 250);
    }

    _stopSpeechProgressTimer() {
        if (this.speechTimer) {
            clearInterval(this.speechTimer);
            this.speechTimer = null;
        }
    }

    _stopSpeech() {
        this._stopSpeechProgressTimer();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.speechUtterance = null;
    }

    togglePlay() {
        if (!this.activePaper) return;

        if (this.mode === 'file') {
            if (this.isPlaying) {
                this.audioElement.pause();
            } else {
                this.audioElement.play().catch(console.warn);
            }
        } else if (this.mode === 'speech') {
            if (this.isPlaying) {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.pause();
                    this.isPlaying = false;
                    this._stopSpeechProgressTimer();
                    this._notify();
                }
            } else {
                if ('speechSynthesis' in window) {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                        this.isPlaying = true;
                        this._startSpeechProgressTimer();
                        this._notify();
                    } else {
                        this._playWithSpeechSynthesis(this.activePaper);
                    }
                }
            }
        }
    }

    seek(timeInSeconds) {
        const target = Math.max(0, Math.min(this.duration || 0, timeInSeconds));
        this.currentTime = target;

        if (this.mode === 'file') {
            if (this.audioElement && isFinite(target)) {
                this.audioElement.currentTime = target;
            }
        } else if (this.mode === 'speech') {
            // SpeechSynthesis doesn't support seeking to exact time offsets directly,
            // so we restart speech from beginning or keep time indicator
            this.speechStartTime = Date.now() - (target / this.playbackRate * 1000);
        }
        this._notify();
    }

    skip(secondsOffset) {
        this.seek(this.currentTime + secondsOffset);
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.mode === 'file' && this.audioElement) {
            this.audioElement.playbackRate = rate;
        } else if (this.mode === 'speech' && this.speechUtterance) {
            // Note: In speech synthesis, changing rate requires restarting utterance
            if (this.isPlaying) {
                this._playWithSpeechSynthesis(this.activePaper);
            }
        }
        this._notify();
    }

    stop() {
        this.isPlaying = false;
        this.isGenerating = false;
        this.currentTime = 0;
        this.audioElement.pause();
        this.audioElement.src = '';
        this._stopSpeech();
        this.mode = 'idle';
        this._notify();
    }

    close() {
        this.stop();
        this.activePaper = null;
        this.error = null;
        this._notify();
    }
}

// Global Singleton Instance
export const globalAudio = new GlobalAudioManager();
