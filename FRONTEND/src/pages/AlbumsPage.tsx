import { useState, useEffect, useMemo } from 'react';
import albumService from '../services/albumService';
import { AlbumCard } from '../components/AlbumCard';
import { SearchBar } from '../components/SearchBar';
import type { Album } from '../types';

export function AlbumsPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            setIsLoading(true);
            const response = await albumService.getAlbums();
            if (response.status === 200) {
                setAlbums(response.data);
            } else {
                setError(response.message?.error || 'Failed to fetch albums');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch albums');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAlbums = useMemo(() => {
        if (!searchQuery) return albums;
        return albums.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [albums, searchQuery]);

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
                ) : filteredAlbums.length === 0 ? (
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
                        {filteredAlbums.map((album) => (
                            <AlbumCard
                                key={album.album_uuid}
                                album={album}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
