import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadQueueManager, { type QueuedFile } from '../services/uploadQueueManager';

export function UploadPage() {
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const [allCompleted, setAllCompleted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queueRef = useRef(new UploadQueueManager(3));
    const navigate = useNavigate();

    const acceptedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];

    // Subscribe to queue updates
    useEffect(() => {
        const unsubscribeProgress = queueRef.current.onProgress((files) => {
            setQueuedFiles([...files]);
        });

        const unsubscribeComplete = queueRef.current.onComplete((files) => {
            setQueuedFiles([...files]);
            setAllCompleted(true);
            // Redirect after 3 seconds if all uploads completed without failures
            if (files.every((f) => f.state === 'completed')) {
                setTimeout(() => navigate('/'), 3000);
            }
        });

        return () => {
            unsubscribeProgress();
            unsubscribeComplete();
        };
    }, [navigate]);

    const validateFile = (file: File): boolean => {
        if (!acceptedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac|aac)$/i)) {
            setError('Please upload an audio file (MP3, WAV, OGG, FLAC, or AAC)');
            return false;
        }
        if (file.size > 50 * 1024 * 1024) {
            setError('File size must be less than 50MB');
            return false;
        }
        return true;
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError('');

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(validateFile);

        if (validFiles.length === 0 && droppedFiles.length > 0) {
            return; // Error already set by validateFile
        }

        if (validFiles.length > 0) {
            queueRef.current.addFiles(validFiles);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        setError('');
        const selectedFiles = Array.from(e.target.files || []);
        const validFiles = selectedFiles.filter(validateFile);

        if (validFiles.length === 0 && selectedFiles.length > 0) {
            return; // Error already set by validateFile
        }

        if (validFiles.length > 0) {
            queueRef.current.addFiles(validFiles);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleRemoveFile = (fileId: string) => {
        queueRef.current.removeFile(fileId);
        setQueuedFiles([...queueRef.current.getAllFiles()]);
    };

    const handleRetryFile = (fileId: string) => {
        queueRef.current.retryFile(fileId);
        setQueuedFiles([...queueRef.current.getAllFiles()]);
    };

    const handleRetryAllFailed = () => {
        queueRef.current.retryAllFailed();
        setQueuedFiles([...queueRef.current.getAllFiles()]);
        setAllCompleted(false);
    };

    const handleClearQueue = () => {
        queueRef.current.clearQueue();
        setQueuedFiles([...queueRef.current.getAllFiles()]);
        setAllCompleted(false);
        setError('');
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getStateIcon = (state: string) => {
        switch (state) {
            case 'pending':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-pending">
                        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                    </svg>
                );
            case 'uploading':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-uploading">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                );
            case 'completed':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="icon-completed">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="icon-failed">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const stats = queueRef.current.getStats();
    const hasUploading = stats.uploading > 0;
    const hasFailed = stats.failed > 0;

    return (
        <div className="page upload-page">
            <header className="page-header">
                <h1>Upload Music</h1>
                <p>Share your tracks with the world</p>
            </header>

            <div className="upload-container">
                {allCompleted && stats.failed === 0 ? (
                    <div className="upload-success">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22,4 12,14.01 9,11.01" />
                            </svg>
                        </div>
                        <h2>All files uploaded successfully!</h2>
                        <p>Redirecting to home...</p>
                    </div>
                ) : (
                    <>
                        {/* Dropzone */}
                        <div
                            className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${queuedFiles.length > 0 ? 'has-files' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => queuedFiles.length < 20 && !hasUploading && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                multiple
                                onChange={handleFileSelect}
                                hidden
                            />

                            {queuedFiles.length > 0 ? (
                                <div className="dropzone-content">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '32px', height: '32px' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <p>
                                        {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''} selected
                                        {queuedFiles.length < 20 ? ' (click to add more, max 20)' : ' (max reached)'}
                                    </p>
                                </div>
                            ) : (
                                <div className="dropzone-content">
                                    <div className="dropzone-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                    <h3>Drag and drop your audio files</h3>
                                    <p>or click to browse</p>
                                    <span className="file-types">MP3, WAV, OGG, FLAC, AAC (max 50MB each, up to 20 files)</span>
                                </div>
                            )}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {/* Queue Statistics */}
                        {queuedFiles.length > 0 && (
                            <div className="queue-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total:</span>
                                    <span className="stat-value">{stats.total}</span>
                                </div>
                                {stats.uploading > 0 && (
                                    <div className="stat-item uploading">
                                        <span className="stat-label">Uploading:</span>
                                        <span className="stat-value">{stats.uploading}</span>
                                    </div>
                                )}
                                {stats.pending > 0 && (
                                    <div className="stat-item pending">
                                        <span className="stat-label">Queued:</span>
                                        <span className="stat-value">{stats.pending}</span>
                                    </div>
                                )}
                                {stats.completed > 0 && (
                                    <div className="stat-item completed">
                                        <span className="stat-label">Completed:</span>
                                        <span className="stat-value">{stats.completed}</span>
                                    </div>
                                )}
                                {stats.failed > 0 && (
                                    <div className="stat-item failed">
                                        <span className="stat-label">Failed:</span>
                                        <span className="stat-value">{stats.failed}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Queue List */}
                        {queuedFiles.length > 0 && (
                            <div className="queue-list">
                                {queuedFiles.map((queuedFile) => (
                                    <div key={queuedFile.id} className={`queue-item queue-item-${queuedFile.state}`}>
                                        <div className="item-icon">{getStateIcon(queuedFile.state)}</div>

                                        <div className="item-content">
                                            <div className="item-header">
                                                <h4>{queuedFile.file.name}</h4>
                                                <span className="item-size">{formatFileSize(queuedFile.file.size)}</span>
                                            </div>

                                            {queuedFile.state === 'completed' && queuedFile.result && (
                                                <p className="item-title">{queuedFile.result.title}</p>
                                            )}

                                            {queuedFile.state === 'failed' && queuedFile.error && (
                                                <p className="item-error">{queuedFile.error}</p>
                                            )}

                                            {(queuedFile.state === 'uploading' || queuedFile.state === 'pending') && (
                                                <div className="progress-bar-small">
                                                    <div className="progress-fill" style={{ width: `${queuedFile.progress}%` }}></div>
                                                </div>
                                            )}

                                            {queuedFile.state === 'uploading' && (
                                                <p className="item-status">{queuedFile.progress}% uploaded</p>
                                            )}

                                            {queuedFile.state === 'pending' && (
                                                <p className="item-status">Waiting in queue...</p>
                                            )}

                                            {queuedFile.state === 'completed' && (
                                                <p className="item-status success">Upload complete</p>
                                            )}
                                        </div>

                                        <div className="item-actions">
                                            {queuedFile.state === 'failed' && (
                                                <button className="btn btn-small btn-secondary" onClick={() => handleRetryFile(queuedFile.id)}>
                                                    Retry
                                                </button>
                                            )}
                                            {queuedFile.state === 'pending' && (
                                                <button className="btn btn-small btn-ghost" onClick={() => handleRemoveFile(queuedFile.id)}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {queuedFiles.length > 0 && (
                            <div className="upload-actions">
                                {hasFailed && (
                                    <button className="btn btn-secondary" onClick={handleRetryAllFailed}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36" />
                                        </svg>
                                        Retry Failed
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={handleClearQueue} disabled={hasUploading}>
                                    Clear Queue
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
