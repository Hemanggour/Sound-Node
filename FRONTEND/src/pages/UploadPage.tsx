import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import musicService from '../services/musicService';

export function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const acceptedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];

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

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && validateFile(droppedFile)) {
            setFile(droppedFile);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        setError('');
        const selectedFile = e.target.files?.[0];
        if (selectedFile && validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError('');
        setUploadProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
            const response = await musicService.uploadSong(file);
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.status === 201) {
                setSuccess(`"${response.data.title}" uploaded successfully!`);
                setFile(null);
                setTimeout(() => navigate('/'), 2000);
            } else {
                throw new Error(response.message?.error || 'Upload failed');
            }
        } catch (err) {
            clearInterval(progressInterval);
            setError(err instanceof Error ? err.message : 'Upload failed');
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="page upload-page">
            <header className="page-header">
                <h1>Upload Music</h1>
                <p>Share your tracks with the world</p>
            </header>

            <div className="upload-container">
                {success ? (
                    <div className="upload-success">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22,4 12,14.01 9,11.01" />
                            </svg>
                        </div>
                        <h2>{success}</h2>
                        <p>Redirecting to home...</p>
                    </div>
                ) : (
                    <>
                        <div
                            className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileSelect}
                                hidden
                            />

                            {file ? (
                                <div className="file-preview">
                                    <div className="file-icon">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                        </svg>
                                    </div>
                                    <div className="file-info">
                                        <h3>{file.name}</h3>
                                        <p>{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                        className="btn btn-ghost remove-file"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="dropzone-content">
                                    <div className="dropzone-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17,8 12,3 7,8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                    <h3>Drag and drop your audio file</h3>
                                    <p>or click to browse</p>
                                    <span className="file-types">MP3, WAV, OGG, FLAC, AAC (max 50MB)</span>
                                </div>
                            )}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {isUploading && (
                            <div className="upload-progress">
                                <div className="progress-bar-upload">
                                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <span>{uploadProgress}%</span>
                            </div>
                        )}

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <span className="loader-small"></span>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17,8 12,3 7,8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Upload Song
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
