import { useState, useEffect } from 'react';
import artistService from '../services/artistService';
import { ArtistCard } from '../components/ArtistCard';
import type { Artist } from '../types';

export function ArtistsPage() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchArtists();
    }, []);

    const fetchArtists = async () => {
        try {
            setIsLoading(true);
            const response = await artistService.getArtists();
            if (response.status === 200) {
                setArtists(response.data);
            } else {
                setError(response.message?.error || 'Failed to fetch artists');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch artists');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page artists-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>
                        <span className="gradient-text">Artists</span>
                    </h1>
                    <p>Browse music by artists</p>
                </div>
            </header>

            <section className="content-section">
                {error && <div className="error-message">{error}</div>}

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading artists...</p>
                    </div>
                ) : artists.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            </svg>
                        </div>
                        <h3>No artists found</h3>
                        <p>Your uploaded music doesn't have any artists associated yet.</p>
                    </div>
                ) : (
                    <div className="playlist-list-container">
                        {artists.map((artist) => (
                            <ArtistCard
                                key={artist.artist_uuid}
                                artist={artist}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
