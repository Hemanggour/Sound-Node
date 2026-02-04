import { Link } from 'react-router-dom';
import type { Playlist } from '../types';

interface PlaylistCardProps {
    playlist: Playlist;
    onEdit?: (playlist: Playlist) => void;
    onDelete?: (playlist: Playlist) => void;
}

export function PlaylistCard({ playlist, onEdit, onDelete }: PlaylistCardProps) {
    const songCount = playlist.songs.length;

    return (
        <div className="playlist-card-list">
            <Link to={`/playlist/${playlist.playlist_uuid}`} className="playlist-card-list-link">
                <div className="playlist-icon-small">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                    </svg>
                </div>

                <div className="playlist-info-list">
                    <h3 className="playlist-name">{playlist.name}</h3>
                    <p className="playlist-meta">
                        {songCount} {songCount === 1 ? 'song' : 'songs'}
                    </p>
                </div>
            </Link>

            {(onEdit || onDelete) && (
                <div className="playlist-actions-list">
                    {onEdit && (
                        <button
                            className="action-btn-list"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit(playlist);
                            }}
                            title="Edit playlist"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="action-btn-list danger"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(playlist);
                            }}
                            title="Delete playlist"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
