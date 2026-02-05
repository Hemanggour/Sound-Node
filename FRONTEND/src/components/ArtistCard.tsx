import { Link } from 'react-router-dom';
import type { Artist } from '../types';

interface ArtistCardProps {
    artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
    return (
        <div className="playlist-card-list">
            <Link to={`/artist/${artist.artist_uuid}`} className="playlist-card-list-link">
                <div className="playlist-icon-small">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    </svg>
                </div>

                <div className="playlist-info-list">
                    <h3 className="playlist-name">{artist.name}</h3>
                    <p className="playlist-meta">Artist</p>
                </div>
            </Link>
        </div>
    );
}
