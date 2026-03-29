import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import musicService from '../services/musicService';
import type { Song } from '../types';

export function SharedSongPage() {
    const { sharedUuid } = useParams<{ sharedUuid: string }>();
    const navigate = useNavigate();
    const { playSong, setIsNowPlayingOpen, currentSong } = usePlayer();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sharedData, setSharedData] = useState<{ song: Song; url: string } | null>(null);
    const [hasPlayed, setHasPlayed] = useState(false);

    useEffect(() => {
        const fetchSharedSong = async () => {
            if (!sharedUuid) return;

            try {
                setLoading(true);
                const response = await musicService.getSharedSongStream(sharedUuid);
                if (response.shared_song && response.shared_song.song) {
                    setSharedData({
                        song: response.shared_song.song,
                        url: response.url
                    });
                } else {
                    setError('Invalid shared song data');
                }
            } catch (err: any) {
                console.error('Error fetching shared song:', err);
                setError(err.response?.data?.message || 'This shared link may have expired or is invalid.');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedSong();
    }, [sharedUuid]);

    const handleListen = () => {
        if (sharedData) {
            playSong(sharedData.song, sharedData.url);
            setIsNowPlayingOpen(true);
            setHasPlayed(true);
        }
    };

    if (loading) {
        return (
            <div className="shared-page-container">
                <div className="loader-wrapper">
                    <div className="loader"></div>
                    <p>Fetching shared track...</p>
                </div>
                <style>{`
                    .shared-page-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: var(--bg-primary);
                    }
                    .loader-wrapper {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 16px;
                        color: var(--text-secondary);
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-page-error">
                <div className="modal-content animate-in">
                    <div className="error-icon-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h1>Link Expired</h1>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button className="btn btn-primary btn-full" onClick={() => navigate('/')}>
                            Back to Home
                        </button>
                    </div>
                </div>
                <style>{`
                    .shared-page-error {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.15), transparent 400px), var(--bg-primary);
                        padding: 20px;
                    }
                    .shared-page-error .modal-content {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius-xl);
                        padding: 40px;
                        max-width: 400px;
                        width: 100%;
                        text-align: center;
                        box-shadow: var(--shadow-lg), 0 0 40px rgba(0,0,0,0.4);
                    }
                    .error-icon-wrapper {
                        width: 64px;
                        height: 64px;
                        background: rgba(239, 68, 68, 0.1);
                        color: var(--error);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                    }
                `}</style>
            </div>
        );
    }

    if (!sharedData) return null;

    const { song } = sharedData;
    const isThisPlaying = currentSong?.song_uuid === song.song_uuid;

    return (
        <div className="shared-landing">
            <div className="landing-bg">
                {song.thumbnail && <img src={song.thumbnail} alt="" />}
                <div className="landing-overlay" />
            </div>

            <div className="landing-content animate-in">
                <div className="song-card-hero">
                    <div className="hero-art">
                        {song.thumbnail ? (
                            <img src={song.thumbnail} alt={song.title} />
                        ) : (
                            <div className="art-placeholder">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                            </div>
                        )}
                        {isThisPlaying && <div className="playing-indicator">Playing Now</div>}
                    </div>

                    <div className="hero-info">
                        <span className="badge">Shared Track</span>
                        <h1>{song.title}</h1>
                        <p className="artist-name">{song.artist_name || 'Unknown Artist'}</p>
                    </div>

                    <div className="hero-actions">
                        <button className="btn btn-primary btn-lg play-btn" onClick={handleListen}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            Listen Now
                        </button>
                    </div>
                </div>

                {!isAuthenticated && (
                    <div className="guest-cta animate-in" style={{ animationDelay: '0.2s' }}>
                        <h3>Enjoying the music?</h3>
                        <p>Join Sound-Node to create playlists, follow artists, and upload your own tracks.</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn btn-secondary">Create Account</Link>
                            <Link to="/login" className="btn btn-ghost">Sign In</Link>
                        </div>
                    </div>
                )}

                {isAuthenticated && hasPlayed && (
                    <div className="auth-footer animate-in">
                        <button className="btn btn-ghost" onClick={() => navigate('/')}>
                            Go to my Library
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .shared-landing {
                    position: relative;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    overflow: hidden;
                }
                .landing-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                }
                .landing-bg img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    filter: blur(60px) brightness(0.3);
                    transform: scale(1.1);
                }
                .landing-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.2), var(--bg-primary));
                }
                .landing-content {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 600px;
                    display: flex;
                    flex-direction: column;
                    gap: 60px;
                }
                .song-card-hero {
                    text-align: center;
                }
                .hero-art {
                    width: 280px;
                    height: 280px;
                    margin: 0 auto 32px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    position: relative;
                }
                .hero-art img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .art-placeholder {
                    width: 100%;
                    height: 100%;
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-tertiary);
                }
                .art-placeholder svg {
                    width: 80px;
                    height: 80px;
                }
                .playing-indicator {
                    position: absolute;
                    bottom: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--accent-primary);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .hero-info .badge {
                    display: inline-block;
                    padding: 4px 12px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--accent-primary);
                    margin-bottom: 16px;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }
                .hero-info h1 {
                    font-size: 3rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                    letter-spacing: -1px;
                }
                .hero-info .artist-name {
                    font-size: 1.25rem;
                    color: var(--text-secondary);
                    margin-bottom: 40px;
                }
                .play-btn {
                    padding: 16px 48px;
                    font-size: 1.125rem;
                    border-radius: 40px;
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                }
                .play-btn svg {
                    width: 20px;
                    height: 20px;
                }
                .guest-cta {
                    background: rgba(255,255,255,0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 32px;
                    border-radius: var(--radius-xl);
                    text-align: center;
                }
                .guest-cta h3 {
                    font-size: 1.5rem;
                    margin-bottom: 8px;
                }
                .guest-cta p {
                    color: var(--text-tertiary);
                    margin-bottom: 24px;
                    font-size: 0.9375rem;
                }
                .cta-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .auth-footer {
                    text-align: center;
                }

                @media (max-width: 480px) {
                    .hero-art {
                        width: 200px;
                        height: 200px;
                    }
                    .hero-info h1 {
                        font-size: 2rem;
                    }
                    .cta-buttons {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}
