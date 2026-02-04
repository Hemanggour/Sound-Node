import { usePlayer } from '../context/PlayerContext';

export function AudioPlayer() {
    const { currentSong, isPlaying, progress, duration, volume, togglePlay, seek, setVolume, playNext, playPrevious } = usePlayer();

    if (!currentSong) return null;

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
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                </div>
                <div className="player-details">
                    <h4 className="player-title">{currentSong.title}</h4>
                    <p className="player-artist">{currentSong.artist_name || 'Unknown Artist'}</p>
                </div>
            </div>

            <div className="player-controls">
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
