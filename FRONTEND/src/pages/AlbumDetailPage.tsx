import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import albumService from '../services/albumService';
import musicService from '../services/musicService';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/SongCard';
import { SearchBar } from '../components/SearchBar';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { Album, Song } from '../types';

export function AlbumDetailPage() {
    const { albumUuid } = useParams<{ albumUuid: string }>();
    const { currentSong, togglePlay, playPlaylist } = usePlayer();

    const location = useLocation();
    const [album, setAlbum] = useState<Album | null>(location.state?.album || null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [songs, setSongs] = useState<Song[]>([]);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('albumViewMode');
        return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'list';
    });

    const { lastElementRef } = useInfiniteScroll({
        hasNext,
        isLoading: isLoadingMore,
        onLoadMore: () => handleLoadMore()
    });

    useEffect(() => {
        localStorage.setItem('albumViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (albumUuid) {
            fetchAlbumData(1);
        }
    }, [albumUuid, searchQuery]);

    const fetchAlbumData = async (pageNumber: number = 1) => {
        if (!albumUuid) return;

        try {
            if (pageNumber === 1) {
                setIsLoading(true);
                // Fetch album metadata only if not passed via state
                const albumPromise = album
                    ? Promise.resolve({ status: 200, data: album, message: null })
                    : albumService.getAlbum(albumUuid);

                const [albumResponse, songsResponse] = await Promise.all([
                    albumPromise,
                    musicService.getSongs({
                        album_uuid: albumUuid,
                        page: pageNumber,
                        ...(searchQuery ? { q: searchQuery } : {})
                    })
                ]);

                if (albumResponse.status === 200) {
                    setAlbum(albumResponse.data);
                } else {
                    setError(albumResponse.message?.error || 'Failed to fetch album details');
                }

                if (songsResponse) {
                    setSongs(songsResponse.results);
                    setHasNext(!!songsResponse.next);
                }
            } else {
                setIsLoadingMore(true);
                const songsResponse = await musicService.getSongs({
                    album_uuid: albumUuid,
                    page: pageNumber,
                    ...(searchQuery ? { q: searchQuery } : {})
                });

                setSongs(prev => {
                    const existingUuids = new Set(prev.map(s => s.song_uuid));
                    const newUniqueSongs = songsResponse.results.filter((s: Song) => !existingUuids.has(s.song_uuid));
                    return [...prev, ...newUniqueSongs];
                });
                setHasNext(!!songsResponse.next);
            }
            setPage(pageNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load album data');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchAlbumData(page + 1);
        }
    };

    const filteredSongs = useMemo(() => {
        return songs;
    }, [songs]);

    const handlePlayAll = () => {
        if (filteredSongs.length > 0 && albumUuid) {
            playPlaylist({ album_uuid: albumUuid }, 0, filteredSongs);
        }
    };

    const handlePlaySong = (song: Song, index: number) => {
        const isCurrentSong = currentSong?.song_uuid === song.song_uuid;
        if (isCurrentSong) {
            togglePlay();
        } else if (albumUuid) {
            playPlaylist({ album_uuid: albumUuid }, index, filteredSongs);
        }
    };


    if (isLoading && !album) {
        return (
            <div className="page album-detail-page">
                <div className="loading-state">
                    <span className="loader"></span>
                    <p>Loading album...</p>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="page album-detail-page">
                <div className="error-message">Album not found</div>
            </div>
        );
    }

    return (
        <div className="page album-detail-page">
            <header className="playlist-header">
                <Link to="/albums" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Albums
                </Link>

                <div className="playlist-header-content">
                    <div className="playlist-info-section">
                        <div className="playlist-icon" style={{ overflow: 'hidden' }}>
                            {album.cover_image ? (
                                <img
                                    src={`${album.cover_image}`}
                                    alt={album.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h1>{album.title}</h1>
                            <p className="playlist-meta">
                                {album.release_year ? `${album.release_year} • ` : ''}
                                {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
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
                            {filteredSongs.length > 0 && (
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

                {filteredSongs.length > 0 && (
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
                        <SearchBar onSearch={setSearchQuery} placeholder="Search in album..." />
                    </div>
                </div>
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Updating songs...</p>
                    </div>
                ) : filteredSongs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>{searchQuery ? 'No songs found' : 'No songs in this album'}</h3>
                        {searchQuery && <p>Try a different search term</p>}
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "song-grid" : "song-list-container"}>
                        {filteredSongs.map((song, index) => {
                            const isLastItem = index === filteredSongs.length - 1;

                            const songCard = (
                                <SongCard
                                    key={song.song_uuid}
                                    song={song}
                                    viewMode={viewMode}
                                    onPlay={() => handlePlaySong(song, index)}
                                    showNumber={viewMode === 'list' ? index + 1 : undefined}
                                />
                            );

                            return isLastItem ? (
                                <div key={song.song_uuid} ref={lastElementRef}>
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
        </div>
    );
}
