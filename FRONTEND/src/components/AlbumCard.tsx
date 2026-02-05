import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import type { Album } from '../types';

interface AlbumCardProps {
    album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
    return (
        <div className="playlist-card-list">
            <Link to={`/album/${album.album_uuid}`} className="playlist-card-list-link">
                <div className="playlist-icon-small" style={{ overflow: 'hidden' }}>
                    {album.cover_image ? (
                        <img
                            src={`${API_BASE_URL}${album.cover_image}`}
                            alt={album.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </div>

                <div className="playlist-info-list">
                    <h3 className="playlist-name">{album.title}</h3>
                    <p className="playlist-meta">
                        {album.release_year ? `${album.release_year} • ` : ''}Album
                    </p>
                </div>
            </Link>
        </div>
    );
}
