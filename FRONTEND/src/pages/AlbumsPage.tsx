import { useState, useEffect } from 'react';
import albumService from '../services/albumService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { AlbumCard } from '../components/AlbumCard';
import { SearchBar } from '../components/SearchBar';
import type { Album } from '../types';

export function AlbumsPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { lastElementRef } = useInfiniteScroll({
        hasNext,
        isLoading: isLoadingMore,
        onLoadMore: () => handleLoadMore()
    });

    useEffect(() => {
        fetchAlbumsData(1, true);
    }, [searchQuery]);

    const fetchAlbumsData = async (pageNumber: number, isInitial: boolean = false) => {
        try {
            if (isInitial) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const response = await albumService.getAlbums(pageNumber, searchQuery);

            if (isInitial) {
                setAlbums(response.results);
            } else {
                setAlbums(prev => {
                    const existingUuids = new Set(prev.map(a => a.album_uuid));
                    const newUniqueAlbums = response.results.filter((a: Album) => !existingUuids.has(a.album_uuid));
                    return [...prev, ...newUniqueAlbums];
                });
            }

            setHasNext(!!response.next);
            setPage(pageNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch albums');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchAlbumsData(page + 1);
        }
    };


    return (
        <div className="page albums-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>
                        <span className="gradient-text">Albums</span>
                    </h1>
                    <p>Browse music by albums</p>
                </div>
                <div className="header-actions">
                    <SearchBar onSearch={setSearchQuery} placeholder="Search albums..." />
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading albums...</p>
                    </div>
                ) : albums.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </div>
                        <h3>{searchQuery ? 'No albums found' : 'No albums found'}</h3>
                        <p>{searchQuery ? 'Try a different search term' : "Your uploaded music doesn't have any albums associated yet."}</p>
                    </div>
                ) : (
                    <div className="playlist-list-container">
                        {albums.map((album, index) => {
                            const isLastItem = index === albums.length - 1;
                            const albumCard = (
                                <AlbumCard
                                    key={album.album_uuid}
                                    album={album}
                                />
                            );

                            return isLastItem ? (
                                <div key={album.album_uuid} ref={lastElementRef}>
                                    {albumCard}
                                </div>
                            ) : (
                                albumCard
                            );
                        })}

                        {hasNext && (
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
        </div>
    );
}
