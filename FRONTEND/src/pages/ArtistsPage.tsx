import { useState, useEffect, useMemo } from 'react';
import artistService from '../services/artistService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { ArtistCard } from '../components/ArtistCard';
import { SearchBar } from '../components/SearchBar';
import type { Artist } from '../types';

export function ArtistsPage() {
    const [artists, setArtists] = useState<Artist[]>([]);
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
        fetchArtistsData(1, true);
    }, []);

    const fetchArtistsData = async (pageNumber: number, isInitial: boolean = false) => {
        try {
            if (isInitial) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const response = await artistService.getArtists(pageNumber);

            if (isInitial) {
                setArtists(response.results);
            } else {
                setArtists(prev => [...prev, ...response.results]);
            }

            setHasNext(!!response.next);
            setPage(pageNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch artists');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchArtistsData(page + 1);
        }
    };

    const filteredArtists = useMemo(() => {
        if (!searchQuery) return artists;
        return artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [artists, searchQuery]);

    return (
        <div className="page artists-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>
                        <span className="gradient-text">Artists</span>
                    </h1>
                    <p>Browse music by artists</p>
                </div>
                <div className="header-actions">
                    <SearchBar onSearch={setSearchQuery} placeholder="Search artists..." />
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading artists...</p>
                    </div>
                ) : filteredArtists.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            </svg>
                        </div>
                        <h3>{searchQuery ? 'No artists found' : 'No artists found'}</h3>
                        <p>{searchQuery ? 'Try a different search term' : "Your uploaded music doesn't have any artists associated yet."}</p>
                    </div>
                ) : (
                    <div className="playlist-list-container">
                        {filteredArtists.map((artist, index) => {
                            const isLastItem = index === filteredArtists.length - 1;
                            const artistCard = (
                                <ArtistCard
                                    key={artist.artist_uuid}
                                    artist={artist}
                                />
                            );

                            return isLastItem ? (
                                <div key={artist.artist_uuid} ref={lastElementRef}>
                                    {artistCard}
                                </div>
                            ) : (
                                artistCard
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
        </div>
    );
}
