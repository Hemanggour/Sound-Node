import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../types';
import musicService from '../services/musicService';

interface ShareSongModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: Song;
}

type ExpiryOption = 'never' | '30m' | '1h' | '3h' | '24h' | 'custom';

export function ShareSongModal({ isOpen, onClose, song }: ShareSongModalProps) {
    const [expiryOption, setExpiryOption] = useState<ExpiryOption>('never');
    const [customExpiry, setCustomExpiry] = useState('');
    const [sharedUrl, setSharedUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState('');
    const [isAlreadyShared, setIsAlreadyShared] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSharedUrl('');
            setError('');
            setIsAlreadyShared(false);
            setCopySuccess(false);
            setExpiryOption('never');
        }
    }, [isOpen]);

    if (!isOpen) return null;

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

    const handleShare = async () => {
        setIsSharing(true);
        setError('');
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

            const response = await musicService.shareSong(song.song_uuid, expireAt);
            const sharedUuid = response.data.shared_uuid;
            const host = window.location.origin;
            setSharedUrl(`${host}/share/${sharedUuid}`);
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to share song';
            if (message === 'Song is already in the shared list') {
                setIsAlreadyShared(true);
            } else {
                setError(message);
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sharedUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Share "{song.title}"</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    {!sharedUrl ? (
                        <>
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

                            {error && <div className="error-message">{error}</div>}

                            {isAlreadyShared && (
                                <div className="info-message">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    <p>
                                        This song is already shared. 
                                        <Link to="/shared-songs" onClick={onClose} className="link-text">Check your shared page</Link> 
                                        to copy the link or manage it.
                                    </p>
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleShare}
                                disabled={isSharing || (expiryOption === 'custom' && !customExpiry)}
                            >
                                {isSharing ? (
                                    <>
                                        <span className="loader-small" />
                                        Generating Link...
                                    </>
                                ) : (
                                    'Generate Sharable Link'
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="share-success animate-in">
                            <div className="success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3>Link Generated!</h3>
                            <p>Anyone with this link can stream this song.</p>
                            
                            <div className="generated-link-box">
                                <input type="text" value={sharedUrl} readOnly />
                                <button className="copy-btn" onClick={handleCopy}>
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            
                            <button className="btn btn-secondary btn-full" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .expiry-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 16px;
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
                .share-success {
                    text-align: center;
                    padding: 10px 0;
                }
                .success-icon {
                    width: 48px;
                    height: 48px;
                    background: var(--success);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }
                .success-icon svg {
                    width: 24px;
                    height: 24px;
                }
                .info-message {
                    display: flex;
                    gap: 12px;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    padding: 16px;
                    border-radius: var(--radius-md);
                    margin-bottom: 20px;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                .info-message svg {
                    width: 20px;
                    height: 20px;
                    flex-shrink: 0;
                    color: var(--accent-primary);
                }
                .link-text {
                    color: var(--accent-primary);
                    text-decoration: underline;
                    margin-left: 4px;
                    font-weight: 600;
                }
                .generated-link-box {
                    display: flex;
                    gap: 8px;
                    background: var(--bg-primary);
                    padding: 4px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    margin: 20px 0;
                }
                .generated-link-box input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    padding: 8px 12px;
                    font-size: 0.875rem;
                    outline: none;
                }
                .copy-btn {
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: var(--radius-sm);
                    font-weight: 600;
                    font-size: 0.8125rem;
                    cursor: pointer;
                    transition: opacity var(--transition-fast);
                    min-width: 80px;
                }
                .copy-btn:hover {
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}
