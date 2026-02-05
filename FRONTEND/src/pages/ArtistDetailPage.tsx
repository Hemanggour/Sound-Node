import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import artistService from '../services/artistService';
import { usePlayer } from '../context/PlayerContext';
import type { ArtistDetail, Song } from '../types';
import { IMAGE_BASE_URL } from '../config/api';

export function ArtistDetailPage() {
    const { artistUuid } = useParams<{ artistUuid: string }>();
    const { currentSong, isPlaying, togglePlay, playPlaylist } = usePlayer();

    const [artist, setArtist] = useState<ArtistDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('artistViewMode');
        return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'list';
    });

    useEffect(() => {
        localStorage.setItem('artistViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (artistUuid) {
            fetchArtistData();
        }
    }, [artistUuid]);

    const fetchArtistData = async () => {
        if (!artistUuid) return;

        try {
            setIsLoading(true);
            const response = await artistService.getArtist(artistUuid);
            if (response.status === 200) {
                setArtist(response.data);
            } else {
                setError(response.message?.error || 'Failed to fetch artist details');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load artist');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (artist && artist.songs.length > 0) {
            playPlaylist(artist.songs);
        }
    };

    const handlePlaySong = (song: Song, index: number) => {
        const isCurrentSong = currentSong?.song_uuid === song.song_uuid;
        if (isCurrentSong) {
            togglePlay();
        } else if (artist) {
            playPlaylist(artist.songs, index);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="page artist-detail-page">
                <div className="loading-state">
                    <span className="loader"></span>
                    <p>Loading artist...</p>
                </div>
            </div>
        );
    }

    if (!artist) {
        return (
            <div className="page artist-detail-page">
                <div className="error-message">Artist not found</div>
            </div>
        );
    }

    return (
        <div className="page artist-detail-page">
            <header className="playlist-header">
                <Link to="/artists" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Artists
                </Link>

                <div className="playlist-header-content">
                    <div className="playlist-info-section">
                        <div className="playlist-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            </svg>
                        </div>
                        <div>
                            <h1>{artist.name}</h1>
                            <p className="playlist-meta">
                                {artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'}
                            </p>
                        </div>
                    </div>

                    <div className="playlist-actions-group">
                        <div className="view-toggle">
                            <button
                                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="8" y1="6" x2="21" y2="6" />
                                    <line x1="8" y1="12" x2="21" y2="12" />
                                    <line x1="8" y1="18" x2="21" y2="18" />
                                    <line x1="3" y1="6" x2="3.01" y2="6" />
                                    <line x1="3" y1="12" x2="3.01" y2="12" />
                                    <line x1="3" y1="18" x2="3.01" y2="18" />
                                </svg>
                            </button>
                            <button
                                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" />
                                    <rect x="14" y="3" width="7" height="7" />
                                    <rect x="14" y="14" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" />
                                </svg>
                            </button>
                        </div>

                        <div className="playlist-actions">
                            {artist.songs.length > 0 && (
                                <button className="btn btn-primary" onClick={handlePlayAll}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5,3 19,12 5,21" />
                                    </svg>
                                    Play All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {artist.songs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>No songs by this artist</h3>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "song-grid" : "song-list"}>
                        {artist.songs.map((song, index) => {
                            const isCurrentSong = currentSong?.song_uuid === song.song_uuid;

                            if (viewMode === 'grid') {
                                return (
                                    <div key={song.song_uuid} className={`song-card ${isCurrentSong ? 'active' : ''}`}>
                                        <div className="song-cover">
                                            {song.thumbnail ? (
                                                <img
                                                    src={`${IMAGE_BASE_URL}${song.thumbnail}`}
                                                    alt={song.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                                </svg>
                                            )}
                                            <button className="song-play-btn" onClick={() => handlePlaySong(song, index)}>
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
                                            <p className="song-artist">{artist.name}</p>
                                        </div>
                                        <div className="song-actions" style={{ justifyContent: 'flex-end' }}>
                                            <span className="song-duration">{formatDuration(song.duration)}</span>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={song.song_uuid}
                                    className={`song-list-item ${isCurrentSong ? 'active' : ''}`}
                                >
                                    <div className="song-number">{index + 1}</div>
                                    <button className="song-play-btn-small" onClick={() => handlePlaySong(song, index)}>
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
                                    <div className="song-info-list" style={{ flex: 1 }}>
                                        <div className="song-title">{song.title}</div>
                                    </div>
                                    <div className="song-duration">{formatDuration(song.duration)}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
