import { useState, useRef, useEffect } from 'react';
import type { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { ShareSongModal } from './ShareSongModal';

interface SongCardProps {
    song: Song;
    viewMode?: 'grid' | 'list';
    onPlay?: () => void;
    onDelete?: () => void;
    onRemove?: () => void;
    showNumber?: number;
}

export function SongCard({ song, viewMode = 'grid', onPlay, onDelete, onRemove, showNumber }: SongCardProps) {
    const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };

        if (showOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showOptions]);

    if (viewMode === 'list') {
        return (
            <>
                <div className={`song-list-item ${isCurrentSong ? 'active' : ''}`}>
                    {showNumber !== undefined && <div className="song-number">{showNumber}</div>}
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
                    <div className="song-actions-list" ref={dropdownRef}>
                        <button
                            className={`song-more-btn ${showOptions ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowOptions(!showOptions);
                            }}
                            title="More options"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="1" fill="currentColor" />
                                <circle cx="12" cy="5" r="1" fill="currentColor" />
                                <circle cx="12" cy="19" r="1" fill="currentColor" />
                            </svg>
                        </button>

                        {showOptions && (
                            <div className="song-options-dropdown">
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowPlaylistModal(true);
                                        setShowOptions(false);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add to playlist
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowShareModal(true);
                                        setShowOptions(false);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                        <polyline points="16 6 12 2 8 6" />
                                        <line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                    Share song
                                </button>
                                {onRemove && (
                                    <button
                                        className="dropdown-item"
                                        onClick={() => {
                                            onRemove();
                                            setShowOptions(false);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                        Remove from playlist
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        className="dropdown-item delete-item"
                                        onClick={(e) => {
                                            handleDelete(e);
                                            setShowOptions(false);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Delete song
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <AddToPlaylistModal
                    isOpen={showPlaylistModal}
                    onClose={() => setShowPlaylistModal(false)}
                    song={song}
                />
                <ShareSongModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
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
                        <button
                            className="song-action-btn"
                            onClick={() => setShowShareModal(true)}
                            title="Share song"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
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

            <ShareSongModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                song={song}
            />
        </>
    );
}

