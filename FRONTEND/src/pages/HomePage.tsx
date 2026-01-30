import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SongCard } from '../components/SongCard';
import musicService from '../services/musicService';
import type { Song } from '../types';

export function HomePage() {
    const { user } = useAuth();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                setIsLoading(true);
                const response = await musicService.getSongs();
                if (response.status === 200) {
                    setSongs(response.data);
                } else {
                    setError(response.message?.error || 'Failed to fetch songs');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch songs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSongs();
    }, []);

    return (
        <div className="page home-page">
            <header className="page-header">
                <div className="welcome-section">
                    <h1>
                        Welcome back, <span className="gradient-text">{user?.username}</span>
                    </h1>
                    <p>Ready to discover new music?</p>
                </div>
            </header>

            <section className="content-section">
                <div className="section-header">
                    <h2>Your Library</h2>
                    <Link to="/upload" className="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Upload Music
                    </Link>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading your songs...</p>
                    </div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : songs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>No songs yet</h3>
                        <p>Upload your first song to get started</p>
                        <Link to="/upload" className="btn btn-primary">
                            Upload Your First Song
                        </Link>
                    </div>
                ) : (
                    <div className="song-grid">
                        {songs.map((song) => (
                            <SongCard key={song.song_uuid} song={song} />
                        ))}
                    </div>
                )}
            </section>

            <section className="features-section">
                <h2>Quick Actions</h2>
                <div className="feature-cards">
                    <Link to="/upload" className="feature-card">
                        <div className="feature-icon upload">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17,8 12,3 7,8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <h3>Upload Music</h3>
                        <p>Share your tracks with the world</p>
                    </Link>
                    <Link to="/profile" className="feature-card">
                        <div className="feature-icon profile">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <h3>My Profile</h3>
                        <p>Manage your account settings</p>
                    </Link>
                </div>
            </section>
        </div>
    );
}
