import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import musicService from '../services/musicService';
import { SearchBar } from '../components/SearchBar';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { SharedSong } from '../types';

type ExpiryOption = 'never' | '30m' | '1h' | '3h' | '24h' | 'custom';

export function MySharedSongsPage() {
    const [sharedSongs, setSharedSongs] = useState<SharedSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    
    const [editingSong, setEditingSong] = useState<SharedSong | null>(null);
    const [expiryOption, setExpiryOption] = useState<ExpiryOption>('never');
    const [customExpiry, setCustomExpiry] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [copyMessage, setCopyMessage] = useState<{ id: string; text: string } | null>(null);

    const { lastElementRef } = useInfiniteScroll({
        hasNext,
        isLoading: isLoadingMore,
        onLoadMore: () => handleLoadMore()
    });

    useEffect(() => {
        fetchSharedSongs(1, true);
    }, [searchQuery]);

    const fetchSharedSongs = async (pageNumber: number, isInitial: boolean = false) => {
        try {
            if (isInitial) setIsLoading(true);
            else setIsLoadingMore(true);

            const response = await musicService.getSharedSongs({
                page: pageNumber,
                ...(searchQuery ? { q: searchQuery } : {})
            });

            if (isInitial) {
                setSharedSongs(response.results);
            } else {
                setSharedSongs(prev => [...prev, ...response.results]);
            }

            setHasNext(!!response.next);
            setPage(pageNumber);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch shared songs');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasNext) {
            fetchSharedSongs(page + 1);
        }
    };

    const handleDelete = async (sharedUuid: string) => {
        if (!window.confirm('Are you sure you want to delete this shared link?')) return;

        try {
            await musicService.deleteSharedSong(sharedUuid);
            setSharedSongs(prev => prev.filter(s => s.shared_uuid !== sharedUuid));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete shared link');
        }
    };

    const getLocalISOString = (date: Date) => {
        const tzOffset = -date.getTimezoneOffset();
        const diff = tzOffset >= 0 ? '+' : '-';
        const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, '0');
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes()) +
            ':' + pad(date.getSeconds()) +
            diff + pad(tzOffset / 60) +
            ':' + pad(tzOffset % 60);
    };

    const handleUpdateExpiry = async () => {
        if (!editingSong) return;
        
        setIsUpdating(true);
        try {
            let expireAt: string | null = null;
            const now = new Date();

            if (expiryOption !== 'never') {
                let expiryDate = new Date();
                if (expiryOption === '30m') expiryDate.setMinutes(now.getMinutes() + 30);
                else if (expiryOption === '1h') expiryDate.setHours(now.getHours() + 1);
                else if (expiryOption === '3h') expiryDate.setHours(now.getHours() + 3);
                else if (expiryOption === '24h') expiryDate.setHours(now.getHours() + 24);
                else if (expiryOption === 'custom' && customExpiry) {
                    expiryDate = new Date(customExpiry);
                }
                expireAt = getLocalISOString(expiryDate);
            }

            const response = await musicService.updateSharedSong(editingSong.shared_uuid, expireAt);
            
            setSharedSongs(prev => prev.map(s => 
                s.shared_uuid === editingSong.shared_uuid ? response.data : s
            ));
            setEditingSong(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update expiry');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCopy = (sharedUuid: string) => {
        const host = window.location.origin;
        const url = `${host}/share/${sharedUuid}`;
        navigator.clipboard.writeText(url);
        setCopyMessage({ id: sharedUuid, text: 'Copied!' });
        setTimeout(() => setCopyMessage(null), 2000);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isExpired = (dateString: string | null) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    return (
        <div className="page shared-management-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>My <span className="gradient-text">Shared Songs</span></h1>
                    <p>Manage tracked links and access permissions for your music.</p>
                </div>
            </header>

            <section className="content-section">
                <div className="section-header">
                    <div className="header-actions">
                        <SearchBar onSearch={setSearchQuery} placeholder="Search shared tracks..." />
                        <Link to="/" className="btn btn-secondary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Share More
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <span className="loader"></span>
                        <p>Loading your shared songs...</p>
                    </div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : sharedSongs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </div>
                        <h3>No shared songs yet</h3>
                        <p>When you share a song from your library, it will appear here.</p>
                        <Link to="/" className="btn btn-primary">Go to Library</Link>
                    </div>
                ) : (
                    <div className="shared-list">
                        {sharedSongs.map((shared, index) => {
                            const isLast = index === sharedSongs.length - 1;
                            const expired = isExpired(shared.expire_at);
                            
                            return (
                                <div 
                                    key={shared.shared_uuid} 
                                    className={`shared-item ${expired ? 'expired' : ''}`}
                                    ref={isLast ? lastElementRef : null}
                                >
                                    <div className="song-thumbnail">
                                        {shared.song.thumbnail ? (
                                            <img src={shared.song.thumbnail} alt={shared.song.title} />
                                        ) : (
                                            <div className="thumb-placeholder">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="item-info">
                                        <h3 className="song-title">{shared.song.title}</h3>
                                        <p className="song-artist">{shared.song.artist_name || 'Unknown Artist'}</p>
                                        <div className="share-meta">
                                            <span className="meta-tag">
                                                Shared: {new Date(shared.shared_at).toLocaleDateString()}
                                            </span>
                                            <span className={`meta-tag expiry ${expired ? 'status-expired' : ''}`}>
                                                Expires: {formatDate(shared.expire_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="item-actions">
                                        <button 
                                            className="btn btn-ghost copy-btn" 
                                            onClick={() => handleCopy(shared.shared_uuid)}
                                            title="Copy Sharable Link"
                                        >
                                            {copyMessage?.id === shared.shared_uuid ? (
                                                <span className="success-text">{copyMessage.text}</span>
                                            ) : (
                                                <>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                    Copy Link
                                                </>
                                            )}
                                        </button>
                                        <button 
                                            className="btn btn-ghost" 
                                            onClick={() => {
                                                setEditingSong(shared);
                                                setExpiryOption('custom');
                                                setCustomExpiry(shared.expire_at ? new Date(shared.expire_at).toISOString().slice(0, 16) : '');
                                            }}
                                            title="Edit Expiry"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button 
                                            className="btn btn-ghost delete-btn" 
                                            onClick={() => handleDelete(shared.shared_uuid)}
                                            title="Delete Shared Link"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {editingSong && (
                <div className="modal-overlay" onClick={() => setEditingSong(null)}>
                    <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Expiry</h2>
                            <button className="close-btn" onClick={() => setEditingSong(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-subtitle">Updating expiry for <strong>{editingSong.song.title}</strong></p>
                            
                            <div className="form-group">
                                <label>Link Expiry</label>
                                <div className="expiry-options">
                                    {(['never', '30m', '1h', '3h', '24h', 'custom'] as ExpiryOption[]).map((opt) => (
                                        <button
                                            key={opt}
                                            className={`expiry-btn ${expiryOption === opt ? 'active' : ''}`}
                                            onClick={() => setExpiryOption(opt)}
                                        >
                                            {opt === 'never' ? 'Never' :
                                             opt === '30m' ? '30 Mins' :
                                             opt === '1h' ? '1 Hour' :
                                             opt === '3h' ? '3 Hours' :
                                             opt === '24h' ? '24 Hours' : 'Custom'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {expiryOption === 'custom' && (
                                <div className="form-group animate-in">
                                    <label>Custom Expiry Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={customExpiry}
                                        onChange={(e) => setCustomExpiry(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                    <span className="form-hint">Selected time is in your local timezone</span>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setEditingSong(null)}>Cancel</button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleUpdateExpiry}
                                    disabled={isUpdating || (expiryOption === 'custom' && !customExpiry)}
                                >
                                    {isUpdating ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .shared-management-page {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding-bottom: 100px;
                }
                .shared-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 24px;
                }
                .shared-item {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: var(--bg-secondary);
                    padding: 16px 20px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    transition: all var(--transition-normal);
                }
                .shared-item:hover {
                    border-color: var(--border-hover);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .shared-item.expired {
                    opacity: 0.7;
                    background: var(--bg-tertiary);
                }
                .song-thumbnail {
                    width: 60px;
                    height: 60px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .song-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .thumb-placeholder {
                    width: 100%;
                    height: 100%;
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-tertiary);
                }
                .item-info {
                    flex: 1;
                    min-width: 0;
                }
                .item-info .song-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-info .song-artist {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .share-meta {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .meta-tag {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    color: var(--text-tertiary);
                }
                .meta-tag.status-expired {
                    color: var(--error);
                    background: rgba(239, 68, 68, 0.1);
                }
                .item-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .copy-btn {
                    min-width: 110px;
                }
                .copy-btn .success-text {
                    color: var(--success);
                    font-weight: 600;
                }
                .delete-btn:hover {
                    color: var(--error);
                    background: rgba(239, 68, 68, 0.1) !important;
                }
                .expiry-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .expiry-btn {
                    padding: 10px 4px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .expiry-btn:hover {
                    background: var(--bg-hover);
                    border-color: var(--border-hover);
                }
                .expiry-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .modal-subtitle {
                    margin-bottom: 20px;
                    color: var(--text-secondary);
                    overflow-wrap: break-word;
                    line-height: 1.5;
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                }
                
                @media (max-width: 768px) {
                    .shared-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }
                    .item-info {
                        width: 100%;
                        overflow: hidden;
                    }
                    .item-actions {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .song-thumbnail {
                        width: 48px;
                        height: 48px;
                    }
                }
            `}</style>
        </div>
    );
}
