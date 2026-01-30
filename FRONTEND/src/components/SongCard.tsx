import type { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface SongCardProps {
    song: Song;
}

export function SongCard({ song }: SongCardProps) {
    const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

    const isCurrentSong = currentSong?.song_uuid === song.song_uuid;

    const handlePlay = () => {
        if (isCurrentSong) {
            togglePlay();
        } else {
            playSong(song);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`song-card ${isCurrentSong ? 'active' : ''}`}>
            <div className="song-cover">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                <button className="song-play-btn" onClick={handlePlay}>
                    {isCurrentSong && isPlaying ? (
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
            </div>
            <div className="song-info">
                <h3 className="song-title">{song.title}</h3>
                <p className="song-artist">{song.artist_name || 'Unknown Artist'}</p>
            </div>
            <span className="song-duration">{formatDuration(song.duration)}</span>
        </div>
    );
}
