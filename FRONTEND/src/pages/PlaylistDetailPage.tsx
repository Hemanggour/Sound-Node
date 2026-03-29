import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import playlistService from '../services/playlistService';
import { PlaylistModal } from '../components/PlaylistModal';
import { SearchBar } from '../components/SearchBar';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/SongCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { Playlist, PlaylistSong, UpdatePlaylistRequest } from '../types';


export function PlaylistDetailPage() {
    const { playlistUuid } = useParams<{ playlistUuid: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentSong, togglePlay, playPlaylist } = usePlayer();

    const [playlist, setPlaylist] = useState<Playlist | null>(location.state?.playlist || null);
    const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('playlistViewMode');
        return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'list';
    });

    const { lastElementRef } = useInfiniteScroll({
        hasNext,
        isLoading: isLoadingMore,
        onLoadMore: () => handleLoadMore()
    });

    useEffect(() => {
        localStorage.setItem('playlistViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (playlistUuid) {
            const shouldFetchInfo = !playlist;
            fetchPlaylistData(1, true, shouldFetchInfo);
        }
    }, [playlistUuid, searchQuery]);

    const fetchPlaylistData = async (pageNumber: number = 1, isInitial: boolean = false, fetchInfo: boolean = false) => {
        if (!playlistUuid) return;

        try {
            if (isInitial) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            // Fetch playlist info first
            if (fetchInfo) {
                const response = await playlistService.getPlaylist(playlistUuid);
                if (response.status === 200) {
                    setPlaylist(response.data);
                }
            }

            // Fetch the songs separately since the playlist API no longer embeds them
            const songsResponse = await playlistService.getPlaylistSongs(playlistUuid, pageNumber, searchQuery);
            if (songsResponse) {
                if (isInitial) {
                    setPlaylistSongs(songsResponse.results);
                } else {
                    setPlaylistSongs(prev => {
                        const existingUuids = new Set(prev.map(ps => ps.playlist_song_uuid));
                        const newUniqueSongs = songsResponse.results.filter((ps: PlaylistSong) => !existingUuids.has(ps.playlist_song_uuid));
                        return [...prev, ...newUniqueSongs];
                    });
                }
                setHasNext(!!songsResponse.next);
                setPage(pageNumber);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load playlist');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchPlaylistData(page + 1);
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
            await playlistService.removeSongFromPlaylist(playlistUuid, playlistSong.song.song_uuid);
            // Optimistically update local state instead of doing expensive refetching
            setPlaylistSongs(prev => prev.filter(ps => ps.song.song_uuid !== playlistSong.song.song_uuid));
        } catch (err) {
            setError('Failed to remove song');
        }
    };

    // Filter playlist songs based on search query
    const filteredPlaylistSongs = useMemo(() => {
        return playlistSongs;
    }, [playlistSongs]);

    const handlePlayAll = () => {
        if (filteredPlaylistSongs.length > 0 && playlistUuid) {
            const songs = filteredPlaylistSongs.map(ps => ps.song);
            playPlaylist({ playlist_uuid: playlistUuid }, 0, songs);
        }
    };

    const handlePlaySong = (playlistSong: PlaylistSong, index: number) => {
        const isCurrentSong = currentSong?.song_uuid === playlistSong.song.song_uuid;
        if (isCurrentSong) {
            togglePlay();
        } else if (playlistUuid) {
            const songs = filteredPlaylistSongs.map(ps => ps.song);
            playPlaylist({ playlist_uuid: playlistUuid }, index, songs);
        }
    };


    if (isLoading && !playlist) {
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
                                {filteredPlaylistSongs.length} {filteredPlaylistSongs.length === 1 ? 'song' : 'songs'}
                                {searchQuery && ` (filtered)`}
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
                            {filteredPlaylistSongs.length > 0 && (
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
                </div>

                {filteredPlaylistSongs.length > 0 && (
                    <div className="play-all-mobile">
                        <button className="btn btn-primary" onClick={handlePlayAll}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            Play All Songs
                        </button>
                    </div>
                )}
            </header>

            <section className="content-section">
                <div className="section-header">
                    <h2>Songs</h2>
                    <div className="header-actions">
                        <SearchBar onSearch={setSearchQuery} placeholder="Search in playlist..." />
                    </div>
                </div>
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Updating songs...</p>
                    </div>
                ) : filteredPlaylistSongs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>{searchQuery ? 'No songs found' : 'No songs in this playlist'}</h3>
                        <p>{searchQuery ? 'Try a different search term' : 'Add songs from your library to get started'}</p>
                        {!searchQuery && (
                            <Link to="/" className="btn btn-primary">
                                Go to Library
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "song-grid" : "song-list-container"}>
                        {filteredPlaylistSongs.map((playlistSong, index) => {
                            const isLastItem = index === filteredPlaylistSongs.length - 1;

                            const songCard = (
                                <SongCard
                                    key={playlistSong.playlist_song_uuid}
                                    song={playlistSong.song}
                                    viewMode={viewMode}
                                    onPlay={() => handlePlaySong(playlistSong, index)}
                                    onRemove={() => handleRemoveSong(playlistSong)}
                                    showNumber={viewMode === 'list' ? index + 1 : undefined}
                                />
                            );

                            return isLastItem ? (
                                <div key={playlistSong.playlist_song_uuid} ref={lastElementRef}>
                                    {songCard}
                                </div>
                            ) : (
                                songCard
                            );
                        })}
                    </div>
                )}

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
            </section>

            {showEditModal && playlist && (
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
