import { useRef, useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

function ScrollingText({ text, className }: { text: string; className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && contentRef.current) {
                const isOverflowing = contentRef.current.offsetWidth > containerRef.current.offsetWidth;
                setShouldScroll(isOverflowing);
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

export function AudioPlayer() {
    const {
        currentSong, isPlaying, progress, duration, volume,
        togglePlay, seek, setVolume, playNext, playPrevious,
        repeatMode, isShuffle, toggleRepeat, toggleShuffle
    } = usePlayer();

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated || !currentSong) return null;

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        seek(Number(e.target.value));
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(Number(e.target.value));
    };

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <div className="audio-player">
            <div className="player-song-info">
                <div className="player-cover">
                    {currentSong.thumbnail ? (
                        <img
                            src={`${currentSong.thumbnail}`}
                            alt={currentSong.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    )}
                </div>
                <div className="player-details" style={{ minWidth: 0, flex: 1 }}>
                    <ScrollingText text={currentSong.title} className="player-title" />
                    <ScrollingText text={currentSong.artist_name || 'Unknown Artist'} className="player-artist" />
                </div>
            </div>

            <div className="player-controls">
                <button
                    className={`player-btn ${isShuffle ? 'active' : ''}`}
                    onClick={toggleShuffle}
                    title="Shuffle"
                    style={{ color: isShuffle ? 'var(--accent-primary)' : 'inherit' }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                    </svg>
                </button>

                <button
                    className="player-btn"
                    onClick={playPrevious}
                    title="Previous"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                </button>

                <button className="player-btn player-btn-main" onClick={togglePlay}>
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

                <button
                    className="player-btn"
                    onClick={playNext}
                    title="Next"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>

                <button
                    className={`player-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                    onClick={toggleRepeat}
                    title="Repeat"
                    style={{ color: repeatMode !== 'off' ? 'var(--accent-primary)' : 'inherit' }}
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

                <div className="player-progress">
                    <span className="player-time">{formatTime(progress)}</span>
                    <div className="progress-bar-container">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={progress}
                            onChange={handleSeek}
                            className="progress-bar"
                            style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
                        />
                    </div>
                    <span className="player-time">{formatTime(duration)}</span>
                </div>
            </div>

            <div className="player-volume">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    onChange={handleVolume}
                    className="volume-slider"
                    style={{ '--volume': `${volume * 100}%` } as React.CSSProperties}
                />
            </div>
        </div>
    );
}
