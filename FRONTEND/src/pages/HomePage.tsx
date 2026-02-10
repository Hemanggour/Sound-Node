import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/SongCard';
import { SearchBar } from '../components/SearchBar';
import musicService from '../services/musicService';
import type { Song } from '../types';

export function HomePage() {
    const { user } = useAuth();
    const { playPlaylist, removeSong } = usePlayer();
    const location = useLocation();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('homeViewMode');
        return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'grid';
    });

    // Check navigation state for welcome message
    const state = location.state as { newlyLoggedIn?: boolean; newlyRegistered?: boolean } | null;
    const showWelcome = state?.newlyLoggedIn || state?.newlyRegistered;
    const isNewUser = state?.newlyRegistered;

    useEffect(() => {
        localStorage.setItem('homeViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                setIsLoading(true);
                const params = searchQuery ? { q: searchQuery } : undefined;
                const response = await musicService.getSongs(params);
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
    }, [searchQuery]);
    const handleDeleteSong = async (songUuid: string) => {
        try {
            const response = await musicService.deleteSong(songUuid);
            if (response.status === 200) {
                setSongs(songs.filter(song => song.song_uuid !== songUuid));
                removeSong(songUuid);
            } else {
                alert(response.message?.error || 'Failed to delete song');
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete song');
        }
    };

    return (
        <div className="page home-page">
            {showWelcome && (
                <header className="page-header">
                    <div className="welcome-section">
                        <h1>
                            {isNewUser ? 'Welcome' : 'Welcome back'}, <span className="gradient-text">{user?.username}</span>
                        </h1>
                        <p>{isNewUser ? 'Thanks for joining us!' : 'Ready to discover new music?'}</p>
                    </div>
                </header>
            )}

            <section className="content-section">
                <div className="section-header">
                    <h2>Your Library</h2>
                    <div className="header-actions">
                        <SearchBar onSearch={setSearchQuery} placeholder="Search your songs..." />
                        <div className="view-toggle">
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
                        </div>
                        <Link to="/upload" className="btn btn-primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Upload Music
                        </Link>
                    </div>
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
                    <div className={viewMode === 'grid' ? "song-grid" : "song-list-container"}>
                        {songs.map((song, index) => (
                            <SongCard
                                key={song.song_uuid}
                                song={song}
                                viewMode={viewMode}
                                onPlay={() => playPlaylist(songs, index)}
                                onDelete={() => handleDeleteSong(song.song_uuid)}
                            />
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
