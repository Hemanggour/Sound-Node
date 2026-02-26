import { useState, useEffect } from 'react';
import playlistService from '../services/playlistService';
import type { Playlist, Song } from '../types';

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: Song;
    onPlaylistCreated?: () => void;
}

export function AddToPlaylistModal({ isOpen, onClose, song, onPlaylistCreated }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            fetchPlaylists(1);
        }
    }, [isOpen]);

    const fetchPlaylists = async (currentPage: number) => {
        try {
            if (currentPage === 1) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const response = await playlistService.getPlaylistsForSong(song.song_uuid, currentPage);
            if (response && response.results) {
                if (currentPage === 1) {
                    setPlaylists(response.results);
                } else {
                    setPlaylists(prev => {
                        // Avoid duplicates if user adds/removes something mid-pagination
                        const newItems = response.results.filter(
                            newItem => !prev.some(p => p.playlist_uuid === newItem.playlist_uuid)
                        );
                        return [...prev, ...newItems];
                    });
                }
                setHasNext(!!response.next);
                setPage(currentPage);
            }
        } catch (err) {
            setError('Failed to load playlists');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchPlaylists(page + 1);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        setIsCreating(true);
        try {
            const response = await playlistService.createPlaylist({ name: newPlaylistName.trim() });
            if (response.status === 201) {
                // Add song to the newly created playlist
                await playlistService.addSongToPlaylist(response.data.playlist_uuid, { song_uuid: song.song_uuid });
                setNewPlaylistName('');
                setShowCreateNew(false);

                // Fetch from page 1 again to refresh exactly what they're looking at
                setPage(1);
                await fetchPlaylists(1);
                onPlaylistCreated?.();
            }
        } catch (err) {
            setError('Failed to create playlist');
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleSong = async (playlist: Playlist) => {
        const songInPlaylist = playlist.isAdded;

        try {
            if (songInPlaylist) {
                // Remove song from playlist
                await playlistService.removeSongFromPlaylist(playlist.playlist_uuid, song.song_uuid);
            } else {
                // Add song to playlist
                await playlistService.addSongToPlaylist(playlist.playlist_uuid, { song_uuid: song.song_uuid });
            }

            // To maintain pagination state while toggling, we don't refetch everything
            // Let's directly mutate the local state for a snappier feeling and no page reset
            setPlaylists(prev => prev.map(p =>
                p.playlist_uuid === playlist.playlist_uuid
                    ? { ...p, isAdded: !songInPlaylist }
                    : p
            ));
        } catch (err) {
            setError('Failed to update playlist');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content add-to-playlist-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add to Playlist</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="song-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                        <div>
                            <div className="song-title">{song.title}</div>
                            <div className="song-artist">{song.artist_name || 'Unknown Artist'}</div>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {isLoading ? (
                        <div className="loading-state">
                            <span className="loader"></span>
                            <p>Loading playlists...</p>
                        </div>
                    ) : (
                        <>
                            <div className="playlist-list">
                                {playlists.length === 0 ? (
                                    <div className="empty-state-small">
                                        <p>No playlists yet</p>
                                    </div>
                                ) : (
                                    playlists.map((playlist) => {
                                        const isInPlaylist = playlist.isAdded;
                                        return (
                                            <div
                                                key={playlist.playlist_uuid}
                                                className={`playlist-item ${isInPlaylist ? 'active' : ''}`}
                                                onClick={() => handleToggleSong(playlist)}
                                            >
                                                <div className="playlist-item-info">
                                                    <div className="playlist-item-name">{playlist.name}</div>
                                                </div>
                                                <div className="playlist-item-check">
                                                    {isInPlaylist && (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {hasNext && (
                                <div className="load-more-container" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}

                            {showCreateNew ? (
                                <div className="create-playlist-inline">
                                    <input
                                        type="text"
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        placeholder="Playlist name..."
                                        autoFocus
                                        disabled={isCreating}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreatePlaylist();
                                            if (e.key === 'Escape') setShowCreateNew(false);
                                        }}
                                    />
                                    <div className="inline-actions">
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setShowCreateNew(false)}
                                            disabled={isCreating}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={handleCreatePlaylist}
                                            disabled={isCreating || !newPlaylistName.trim()}
                                        >
                                            {isCreating ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-secondary btn-block"
                                    onClick={() => setShowCreateNew(true)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Create New Playlist
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
