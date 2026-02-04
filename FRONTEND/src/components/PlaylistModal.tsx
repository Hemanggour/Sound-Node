import { useState } from 'react';
import type { CreatePlaylistRequest } from '../types';

interface PlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreatePlaylistRequest) => Promise<void>;
    initialName?: string;
    mode: 'create' | 'edit';
}

export function PlaylistModal({ isOpen, onClose, onSubmit, initialName = '', mode }: PlaylistModalProps) {
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Playlist name is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit({ name: name.trim() });
            setName('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save playlist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName(initialName);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'create' ? 'Create New Playlist' : 'Edit Playlist'}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="playlist-name">Playlist Name</label>
                        <input
                            id="playlist-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter playlist name..."
                            autoFocus
                            disabled={isSubmitting}
                        />
                        {error && <div className="error-message">{error}</div>}
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
