import musicService from './musicService';
import type { UploadSongResponse } from '../types';

export type UploadState = 'pending' | 'uploading' | 'completed' | 'failed';

export interface QueuedFile {
    id: string;
    file: File;
    state: UploadState;
    progress: number;
    error?: string;
    result?: UploadSongResponse;
}

type ProgressCallback = (files: QueuedFile[]) => void;
type CompleteCallback = (files: QueuedFile[]) => void;

export class UploadQueueManager {
    private queue: Map<string, QueuedFile> = new Map();
    private activeUploads: Set<string> = new Set();
    private maxConcurrent = 3;
    private progressCallbacks: Set<ProgressCallback> = new Set();
    private completeCallbacks: Set<CompleteCallback> = new Set();

    constructor(maxConcurrent: number = 3) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add files to the upload queue
     */
    addFiles(files: File[]): QueuedFile[] {
        const addedFiles: QueuedFile[] = [];

        for (const file of files) {
            const id = `${file.name}-${Date.now()}-${Math.random()}`;
            const queuedFile: QueuedFile = {
                id,
                file,
                state: 'pending',
                progress: 0,
            };

            this.queue.set(id, queuedFile);
            addedFiles.push(queuedFile);
        }

        return addedFiles;
    }

    /**
     * Get all files in the queue
     */
    getAllFiles(): QueuedFile[] {
        return Array.from(this.queue.values());
    }

    /**
     * Get files by state
     */
    getFilesByState(state: UploadState): QueuedFile[] {
        return Array.from(this.queue.values()).filter((f) => f.state === state);
    }

    /**
     * Start processing the queue (call after user confirms)
     */
    startProcessing(): void {
        this.processQueue();
    }

    /**
     * Remove a file from the queue
     */
    removeFile(fileId: string): void {
        const file = this.queue.get(fileId);
        if (file && file.state !== 'uploading') {
            this.queue.delete(fileId);
            this.notifyProgress();
        } else if (file?.state === 'uploading') {
            console.warn('Cannot remove file while uploading');
        }
    }

    /**
     * Clear all files from the queue (only pending/failed/completed)
     */
    clearQueue(): void {
        for (const [id, file] of this.queue.entries()) {
            if (file.state !== 'uploading') {
                this.queue.delete(id);
            }
        }
        this.notifyProgress();
    }

    /**
     * Process the queue, uploading up to maxConcurrent files at a time
     */
    private async processQueue(): Promise<void> {
        while (this.activeUploads.size < this.maxConcurrent) {
            const pendingFile = this.getFilesByState('pending')[0];

            if (!pendingFile) {
                // Check if queue is complete
                if (this.activeUploads.size === 0) {
                    this.notifyComplete();
                }
                break;
            }

            this.activeUploads.add(pendingFile.id);
            pendingFile.state = 'uploading';
            this.notifyProgress();

            try {
                const response = await musicService.uploadSong(pendingFile.file);

                if (response.status === 201) {
                    pendingFile.state = 'completed';
                    pendingFile.progress = 100;
                    pendingFile.result = response.data;
                } else {
                    throw new Error(response.message?.error || 'Upload failed');
                }
            } catch (err) {
                pendingFile.state = 'failed';
                pendingFile.error = err instanceof Error ? err.message : 'Upload failed';
                pendingFile.progress = 0;
            } finally {
                this.activeUploads.delete(pendingFile.id);
                this.notifyProgress();
                // Continue processing the queue
                this.processQueue();
            }
        }
    }

    /**
     * Retry a failed file upload
     */
    retryFile(fileId: string): void {
        const file = this.queue.get(fileId);
        if (file && file.state === 'failed') {
            file.state = 'pending';
            file.error = undefined;
            file.progress = 0;
            this.notifyProgress();
            this.processQueue();
        }
    }

    /**
     * Retry all failed uploads
     */
    retryAllFailed(): void {
        for (const file of this.getFilesByState('failed')) {
            file.state = 'pending';
            file.error = undefined;
            file.progress = 0;
        }
        this.notifyProgress();
        this.processQueue();
    }

    /**
     * Subscribe to progress updates
     */
    onProgress(callback: ProgressCallback): () => void {
        this.progressCallbacks.add(callback);
        return () => this.progressCallbacks.delete(callback);
    }

    /**
     * Subscribe to completion
     */
    onComplete(callback: CompleteCallback): () => void {
        this.completeCallbacks.add(callback);
        return () => this.completeCallbacks.delete(callback);
    }

    /**
     * Notify progress subscribers
     */
    private notifyProgress(): void {
        const files = this.getAllFiles();
        this.progressCallbacks.forEach((callback) => callback(files));
    }

    /**
     * Notify completion subscribers
     */
    private notifyComplete(): void {
        const files = this.getAllFiles();
        this.completeCallbacks.forEach((callback) => callback(files));
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const files = this.getAllFiles();
        return {
            total: files.length,
            pending: files.filter((f) => f.state === 'pending').length,
            uploading: files.filter((f) => f.state === 'uploading').length,
            completed: files.filter((f) => f.state === 'completed').length,
            failed: files.filter((f) => f.state === 'failed').length,
        };
    }

    /**
     * Check if queue is empty
     */
    isEmpty(): boolean {
        return this.queue.size === 0;
    }

    /**
     * Check if queue is active (has uploading files)
     */
    isActive(): boolean {
        return this.activeUploads.size > 0;
    }
}

export default UploadQueueManager;
