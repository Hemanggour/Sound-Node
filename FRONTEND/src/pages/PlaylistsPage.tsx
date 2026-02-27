import { useState, useEffect, useMemo } from 'react';
import playlistService from '../services/playlistService';
import { PlaylistCard } from '../components/PlaylistCard';
import { PlaylistModal } from '../components/PlaylistModal';
import { SearchBar } from '../components/SearchBar';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { Playlist, CreatePlaylistRequest } from '../types';

export function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { lastElementRef } = useInfiniteScroll({
        hasNext,
        isLoading: isLoadingMore,
        onLoadMore: () => handleLoadMore()
    });

    useEffect(() => {
        fetchPlaylists(1);
    }, []);

    const fetchPlaylists = async (pageNumber: number) => {
        try {
            if (pageNumber === 1) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const response = await playlistService.getPlaylists(pageNumber);
            if (response && response.results) {
                if (pageNumber === 1) {
                    setPlaylists(response.results);
                } else {
                    setPlaylists(prev => [...prev, ...response.results]);
                }
                setHasNext(!!response.next);
                setPage(pageNumber);
            } else {
                setError('Failed to fetch playlists');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
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

    const handleCreatePlaylist = async (data: CreatePlaylistRequest) => {
        const response = await playlistService.createPlaylist(data);
        if (response.status === 201) {
            await fetchPlaylists(1);
        }
    };

    const handleEditPlaylist = async (data: CreatePlaylistRequest) => {
        if (!editingPlaylist) return;
        const response = await playlistService.updatePlaylist(editingPlaylist.playlist_uuid, data);
        if (response.status === 200) {
            await fetchPlaylists(1);
            setEditingPlaylist(null);
        }
    };

    const handleDeletePlaylist = async (playlist: Playlist) => {
        if (!confirm(`Are you sure you want to delete "${playlist.name}"?`)) return;

        try {
            await playlistService.deletePlaylist(playlist.playlist_uuid);
            await fetchPlaylists(1);
        } catch (err) {
            setError('Failed to delete playlist');
        }
    };

    const filteredPlaylists = useMemo(() => {
        if (!searchQuery) return playlists;
        return playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [playlists, searchQuery]);

    return (
        <div className="page playlists-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>
                        <span className="gradient-text">Your Playlists</span>
                    </h1>
                    <p>Organize your music into collections</p>
                </div>
                <div className="header-actions">
                    <SearchBar onSearch={setSearchQuery} placeholder="Search playlists..." />
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Playlist
                    </button>
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading playlists...</p>
                    </div>
                ) : filteredPlaylists.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <h3>{searchQuery ? 'No playlists found' : 'No playlists yet'}</h3>
                        <p>{searchQuery ? 'Try a different search term' : 'Create your first playlist to organize your music'}</p>
                        {!searchQuery && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                Create Your First Playlist
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="playlist-list-container">
                        {filteredPlaylists.map((playlist, index) => {
                            const isLastItem = index === filteredPlaylists.length - 1;
                            const playlistCard = (
                                <PlaylistCard
                                    key={playlist.playlist_uuid}
                                    playlist={playlist}
                                    onEdit={setEditingPlaylist}
                                    onDelete={handleDeletePlaylist}
                                />
                            );

                            return isLastItem ? (
                                <div key={playlist.playlist_uuid} ref={lastElementRef}>
                                    {playlistCard}
                                </div>
                            ) : (
                                playlistCard
                            );
                        })}

                        {hasNext && !searchQuery && (
                            <div className="load-more-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', width: '100%' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                >
                                    {isLoadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <PlaylistModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePlaylist}
                mode="create"
            />

            {editingPlaylist && (
                <PlaylistModal
                    isOpen={true}
                    onClose={() => setEditingPlaylist(null)}
                    onSubmit={handleEditPlaylist}
                    initialName={editingPlaylist.name}
                    mode="edit"
                />
            )}
        </div>
    );
}
