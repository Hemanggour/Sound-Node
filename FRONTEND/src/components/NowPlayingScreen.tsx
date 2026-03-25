import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

function ScrollingText({ text, className }: { text: string; className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && contentRef.current) {
                setShouldScroll(contentRef.current.offsetWidth > containerRef.current.offsetWidth);
            }
        };
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [text]);

    return (
        <div ref={containerRef} className={`scrolling-text-container ${className || ''}`} title={text}>
            <div className={`scrolling-text-content ${shouldScroll ? 'animate' : ''}`}>
                <span ref={contentRef}>{text}</span>
                {shouldScroll && (
                    <>
                        <span style={{ display: 'inline-block', width: '50px' }}></span>
                        <span>{text}</span>
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Drag-to-dismiss constants
// ─────────────────────────────────────────────────────────────
const DISMISS_THRESHOLD = 120; // px — drag more than this to close
const VELOCITY_THRESHOLD = 0.5; // px/ms — fast flick also closes

export function NowPlayingScreen() {
    const {
        currentSong, isPlaying, progress, duration, volume,
        togglePlay, seek, setVolume, playNext, playPrevious,
        repeatMode, isShuffle, toggleRepeat, toggleShuffle,
        isNowPlayingOpen, setIsNowPlayingOpen,
    } = usePlayer();

    const panelRef = useRef<HTMLDivElement>(null);

    // ── Drag state ──────────────────────────────────────────
    const dragStartY = useRef(0);
    const dragStartTime = useRef(0);
    const dragCurrentY = useRef(0);
    const isDragging = useRef(false);
    const [dragOffset, setDragOffset] = useState(0); // live Y translation while dragging
    const [isSnapping, setIsSnapping] = useState(false); // re-enable transition for snap-back

    // ── Close helper ────────────────────────────────────────
    const close = useCallback(() => {
        setIsNowPlayingOpen(false);
    }, [setIsNowPlayingOpen]);

    // ── History back-button support ─────────────────────────
    useEffect(() => {
        if (isNowPlayingOpen) {
            // Push a synthetic state so back button can catch it
            history.pushState({ nowPlaying: true }, '');
        }
    }, [isNowPlayingOpen]);

    useEffect(() => {
        const handlePop = (e: PopStateEvent) => {
            // If we're open and the back button was pressed, close instead
            if (isNowPlayingOpen) {
                e.preventDefault?.();
                close();
            }
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [isNowPlayingOpen, close]);

    // ── Escape key ──────────────────────────────────────────
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isNowPlayingOpen) close();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isNowPlayingOpen, close]);

    // ── Body scroll lock ────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = isNowPlayingOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isNowPlayingOpen]);

    // ─────────────────────────────────────────────────────────
    // Drag handlers (touch + mouse)
    // ─────────────────────────────────────────────────────────
    const onDragStart = useCallback((clientY: number) => {
        isDragging.current = true;
        dragStartY.current = clientY;
        dragStartTime.current = Date.now();
        dragCurrentY.current = 0;
        setIsSnapping(false);
    }, []);

    const onDragMove = useCallback((clientY: number) => {
        if (!isDragging.current) return;
        const delta = Math.max(0, clientY - dragStartY.current); // only allow downward drag
        dragCurrentY.current = delta;
        setDragOffset(delta);
    }, []);

    const onDragEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const delta = dragCurrentY.current;
        const elapsed = Date.now() - dragStartTime.current;
        const velocity = elapsed > 0 ? delta / elapsed : 0;

        if (delta > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
            // Fast dismiss - animate out smoothly
            setIsSnapping(true);
            setDragOffset(delta + 20); // Small extra movement for natural feel
            setTimeout(() => {
                close();
                setDragOffset(0);
            }, 200);
        } else {
            // Snap back
            setIsSnapping(true);
            setDragOffset(0);
        }
    }, [close]);

    // Touch events
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        onDragStart(e.touches[0].clientY);
    }, [onDragStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        onDragMove(e.touches[0].clientY);
    }, [onDragMove]);

    const handleTouchEnd = useCallback(() => {
        onDragEnd();
    }, [onDragEnd]);

    // Mouse events (desktop drag)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        onDragStart(e.clientY);

        const handleMouseMove = (ev: MouseEvent) => onDragMove(ev.clientY);
        const handleMouseUp = () => {
            onDragEnd();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [onDragStart, onDragMove, onDragEnd]);

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    if (!currentSong) return null;

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    // Panel style: translate while dragging, transition only when snapping back
    const panelStyle: React.CSSProperties = {
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: isSnapping ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out' : 'transform 0.05s ease-out',
        // Smoother opacity change during drag
        opacity: dragOffset > 0 ? Math.max(0.85, 1 - dragOffset / 600) : undefined,
    };

    return (
        <div
            className={`now-playing-overlay ${isNowPlayingOpen ? 'open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Now Playing"
        >
            {/* Blurred ambient background */}
            <div className="now-playing-bg">
                {currentSong.thumbnail && (
                    <img
                        src={currentSong.thumbnail}
                        alt=""
                        aria-hidden="true"
                        className="now-playing-bg-img"
                    />
                )}
                <div className="now-playing-bg-overlay" />
            </div>

            {/* Main panel — draggable */}
            <div
                ref={panelRef}
                className="now-playing-content"
                style={panelStyle}
            >
                {/* ── Drag handle (touch target at top) ── */}
                <div
                    className="now-playing-drag-handle"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    aria-hidden="true"
                >
                    <div className="drag-handle-bar" />
                </div>

                {/* ── Album Art ── */}
                <div className="now-playing-art-wrapper">
                    <div className={`now-playing-art ${isPlaying ? 'playing' : ''}`}>
                        {currentSong.thumbnail ? (
                            <img
                                src={currentSong.thumbnail}
                                alt={currentSong.title}
                                className="now-playing-art-img"
                            />
                        ) : (
                            <div className="now-playing-art-placeholder">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Song Info ── */}
                <div className="now-playing-info">
                    <ScrollingText text={currentSong.title} className="now-playing-title" />
                    <ScrollingText
                        text={currentSong.artist_name || 'Unknown Artist'}
                        className="now-playing-artist"
                    />
                </div>

                {/* ── Seek Bar ── */}
                <div className="now-playing-seek">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={progress}
                        onChange={e => seek(Number(e.target.value))}
                        className="now-playing-progress-bar"
                        style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
                        aria-label="Seek"
                    />
                    <div className="now-playing-times">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* ── Playback Controls ── */}
                <div className="now-playing-controls">
                    <button
                        className={`np-btn ${isShuffle ? 'active' : ''}`}
                        onClick={toggleShuffle}
                        title="Shuffle"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                        </svg>
                    </button>

                    <button className="np-btn np-btn-skip" onClick={playPrevious} title="Previous">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                        </svg>
                    </button>

                    <button className="np-btn np-btn-play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                        )}
                    </button>

                    <button className="np-btn np-btn-skip" onClick={playNext} title="Next">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                    </button>

                    <button
                        className={`np-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                        onClick={toggleRepeat}
                        title="Repeat"
                    >
                        {repeatMode === 'one' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                <text x="10" y="15" fontSize="8" stroke="none" fill="currentColor" fontWeight="bold">1</text>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* ── Volume ── */}
                <div className="now-playing-volume">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="np-vol-icon">
                        {volume === 0 ? (
                            <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                        ) : volume < 0.5 ? (
                            <>
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </>
                        ) : (
                            <>
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </>
                        )}
                    </svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={e => setVolume(Number(e.target.value))}
                        className="now-playing-volume-slider"
                        style={{ '--volume': `${volume * 100}%` } as React.CSSProperties}
                        aria-label="Volume"
                    />
                </div>
            </div>
        </div>
    );
}
