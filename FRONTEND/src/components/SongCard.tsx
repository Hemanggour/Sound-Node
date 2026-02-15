import { useState } from 'react';
import type { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { AddToPlaylistModal } from './AddToPlaylistModal';

interface SongCardProps {
    song: Song;
    viewMode?: 'grid' | 'list';
    onPlay?: () => void;
    onDelete?: () => void;
}

export function SongCard({ song, viewMode = 'grid', onPlay, onDelete }: SongCardProps) {
    const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);

    const isCurrentSong = currentSong?.song_uuid === song.song_uuid;

    const handlePlay = () => {
        if (isCurrentSong) {
            togglePlay();
        } else if (onPlay) {
            onPlay();
        } else {
            playSong(song);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${song.title}"?`)) {
            onDelete?.();
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (viewMode === 'list') {
        return (
            <>
                <div className={`song-list-item ${isCurrentSong ? 'active' : ''}`}>
                    <button className="song-play-btn-small" onClick={handlePlay}>
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
                    <div className="song-info-list">
                        <h3 className="song-title">{song.title}</h3>
                        <p className="song-artist">{song.artist_name || 'Unknown Artist'}</p>
                    </div>
                    <div className="song-duration">{formatDuration(song.duration)}</div>
                    <div className="song-actions-list">
                        {onDelete && (
                            <button
                                className="song-action-btn-small delete-btn"
                                onClick={handleDelete}
                                title="Delete song"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        )}
                        <button
                            className="song-action-btn-small"
                            onClick={() => setShowPlaylistModal(true)}
                            title="Add to playlist"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <AddToPlaylistModal
                    isOpen={showPlaylistModal}
                    onClose={() => setShowPlaylistModal(false)}
                    song={song}
                />
            </>
        );
    }

    return (
        <>
            <div className={`song-card ${isCurrentSong ? 'active' : ''}`}>
                <div className="song-cover">
                    {song.thumbnail ? (
                        <img
                            src={`${song.thumbnail}`}
                            alt={song.title}
                            className="song-thumbnail-img"
                        />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    )}
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
                <div className="song-actions">
                    <span className="song-duration">{formatDuration(song.duration)}</span>
                    <div className="action-buttons">
                        {onDelete && (
                            <button
                                className="song-action-btn delete-btn"
                                onClick={handleDelete}
                                title="Delete song"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        )}
                        <button
                            className="song-action-btn"
                            onClick={() => setShowPlaylistModal(true)}
                            title="Add to playlist"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <AddToPlaylistModal
                isOpen={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                song={song}
            />
        </>
    );
}

