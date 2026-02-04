import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import playlistService from '../services/playlistService';
import { PlaylistModal } from '../components/PlaylistModal';
import { usePlayer } from '../context/PlayerContext';
import type { Playlist, PlaylistSong, UpdatePlaylistRequest } from '../types';

export function PlaylistDetailPage() {
    const { playlistUuid } = useParams<{ playlistUuid: string }>();
    const navigate = useNavigate();
    const { playSong, currentSong, isPlaying, togglePlay, playPlaylist } = usePlayer();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        if (playlistUuid) {
            fetchPlaylistData();
        }
    }, [playlistUuid]);

    const fetchPlaylistData = async () => {
        if (!playlistUuid) return;

        try {
            setIsLoading(true);
            const [playlistResponse, songsResponse] = await Promise.all([
                playlistService.getPlaylists(),
                playlistService.getPlaylistSongs(playlistUuid)
            ]);

            const foundPlaylist = playlistResponse.data.find(p => p.playlist_uuid === playlistUuid);
            if (foundPlaylist) {
                setPlaylist(foundPlaylist);
            }

            if (songsResponse.status === 200) {
                setPlaylistSongs(songsResponse.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load playlist');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePlaylist = async (data: UpdatePlaylistRequest) => {
        if (!playlistUuid) return;
        const response = await playlistService.updatePlaylist(playlistUuid, data);
        if (response.status === 200) {
            setPlaylist(response.data);
        }
    };

    const handleDeletePlaylist = async () => {
        if (!playlistUuid || !playlist) return;
        if (!confirm(`Are you sure you want to delete "${playlist.name}"?`)) return;

        try {
            await playlistService.deletePlaylist(playlistUuid);
            navigate('/playlists');
        } catch (err) {
            setError('Failed to delete playlist');
        }
    };

    const handleRemoveSong = async (playlistSong: PlaylistSong) => {
        if (!playlistUuid) return;

        try {
            await playlistService.removeSongFromPlaylist(playlistUuid, playlistSong.playlist_song_uuid);
            await fetchPlaylistData();
        } catch (err) {
            setError('Failed to remove song');
        }
    };

    const handlePlayAll = () => {
        if (playlistSongs.length > 0) {
            const songs = playlistSongs.map(ps => ps.song);
            playPlaylist(songs);
        }
    };

    const handlePlaySong = (playlistSong: PlaylistSong) => {
        const isCurrentSong = currentSong?.song_uuid === playlistSong.song.song_uuid;
        if (isCurrentSong) {
            togglePlay();
        } else {
            playSong(playlistSong.song);
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
            <div className="page playlist-detail-page">
                <div className="loading-state">
                    <span className="loader"></span>
                    <p>Loading playlist...</p>
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="page playlist-detail-page">
                <div className="error-message">Playlist not found</div>
            </div>
        );
    }

    return (
        <div className="page playlist-detail-page">
            <header className="playlist-header">
                <Link to="/playlists" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Playlists
                </Link>

                <div className="playlist-header-content">
                    <div className="playlist-info-section">
                        <div className="playlist-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <div>
                            <h1>{playlist.name}</h1>
                            <p className="playlist-meta">
                                {playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}
                            </p>
                        </div>
                    </div>

                    <div className="playlist-actions">
                        {playlistSongs.length > 0 && (
                            <button className="btn btn-primary" onClick={handlePlayAll}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5,3 19,12 5,21" />
                                </svg>
                                Play All
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                        </button>
                        <button className="btn btn-danger" onClick={handleDeletePlaylist}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {playlistSongs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>No songs in this playlist</h3>
                        <p>Add songs from your library to get started</p>
                        <Link to="/" className="btn btn-primary">
                            Go to Library
                        </Link>
                    </div>
                ) : (
                    <div className="song-list">
                        {playlistSongs.map((playlistSong, index) => {
                            const song = playlistSong.song;
                            const isCurrentSong = currentSong?.song_uuid === song.song_uuid;

                            return (
                                <div
                                    key={playlistSong.playlist_song_uuid}
                                    className={`song-list-item ${isCurrentSong ? 'active' : ''}`}
                                >
                                    <div className="song-number">{index + 1}</div>
                                    <button className="song-play-btn-small" onClick={() => handlePlaySong(playlistSong)}>
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
                                        <div className="song-title">{song.title}</div>
                                        <div className="song-artist">{song.artist_name || 'Unknown Artist'}</div>
                                    </div>
                                    <div className="song-duration">{formatDuration(song.duration)}</div>
                                    <button
                                        className="song-remove-btn"
                                        onClick={() => handleRemoveSong(playlistSong)}
                                        title="Remove from playlist"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {showEditModal && (
                <PlaylistModal
                    isOpen={true}
                    onClose={() => setShowEditModal(false)}
                    onSubmit={handleUpdatePlaylist}
                    initialName={playlist.name}
                    mode="edit"
                />
            )}
        </div>
    );
}
