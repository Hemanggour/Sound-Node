import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import type { Song } from '../types';
import musicService from '../services/musicService';

type RepeatMode = 'off' | 'one' | 'all';

interface PlayerContextType {
    currentSong: Song | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
    currentPlaylist: Song[];
    currentIndex: number;
    playSong: (song: Song) => void;
    playPlaylist: (songs: Song[], startIndex?: number, onLoadMore?: () => Promise<Song[] | null>) => void;
    playNext: () => void;
    playPrevious: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    repeatMode: RepeatMode;
    isShuffle: boolean;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
    removeSong: (songUuid: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [currentSong, setCurrentSong] = useState<Song | null>(() => {
        const saved = localStorage.getItem('player_song');
        return saved ? JSON.parse(saved) : null;
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem('player_volume');
        return saved ? Number(saved) : 1;
    });
    const [currentPlaylist, setCurrentPlaylist] = useState<Song[]>(() => {
        const saved = localStorage.getItem('player_queue');
        return saved ? JSON.parse(saved) : [];
    });
    const [originalPlaylist, setOriginalPlaylist] = useState<Song[]>(() => {
        const saved = localStorage.getItem('player_original_queue');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        const saved = localStorage.getItem('player_index');
        return saved ? Number(saved) : -1;
    });
    const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
        const saved = localStorage.getItem('player_repeat');
        return (saved === 'one' || saved === 'all') ? saved : 'off';
    });
    const [isShuffle, setIsShuffle] = useState(() => {
        const saved = localStorage.getItem('player_shuffle');
        return saved === 'true';
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const currentPlaylistRef = useRef<Song[]>([]);
    const currentIndexRef = useRef<number>(-1);
    const onLoadMoreRef = useRef<(() => Promise<Song[] | null>) | undefined>(undefined);
    const mediaSessionHandlersRef = useRef<Array<() => void>>([]);

    // Cleanup function for audio resources
    const cleanupAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            // Only clear src if it has one to avoid triggering error events
            if (audioRef.current.src) {
                audioRef.current.src = '';
                audioRef.current.removeAttribute('src');
            }
            audioRef.current.currentTime = 0;
         }

        // Revoke old blob URL if exists
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        // Abort any pending fetch requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    // Setup Media Session API for system media controls
    const setupMediaSession = (song: Song) => {
        if (!('mediaSession' in navigator)) {
            return; // Media Session API not supported
        }

        try {
            // Build artwork array for better OS support
            const artwork: MediaImage[] = [];
            if (song.thumbnail) {
                artwork.push({
                    src: song.thumbnail,
                    sizes: '256x256',
                    type: 'image/jpeg'
                });
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist_name || 'Unknown Artist',
                album: song.album || 'Unknown Album',
                artwork
            });

            navigator.mediaSession.playbackState = 'none'; // Will be updated by play/pause
        } catch (error) {
            console.warn('Failed to setup Media Session metadata:', error);
        }
    };

    // Helper to safely resume audio playback and handle audio context suspension
    const resumeAudioPlayback = () => {
        if (audioRef.current) {
            const playPromise = audioRef.current.play();
            if (playPromise) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        console.warn('Error resuming playback:', error.message);
                    }
                });
            }
        }
    };

    // Helper to load and play a song immediately (used by media session handlers)
    const playSongImmediate = async (song: Song) => {
        if (!audioRef.current) return;

        cleanupAudio();

        try {
            const streamUrl = musicService.getStreamUrl(song.song_uuid);
            const response = await fetch(streamUrl, {
                credentials: 'include',
            });

            if (!response.ok) {
                console.error('Failed to fetch audio stream:', response.status);
                return;
            }

            const contentType = response.headers.get('content-type');
            let audioSrc = streamUrl;

            if (contentType?.includes('application/json')) {
                const data = await response.json();
                audioSrc = data.url;
            }

            if (audioRef.current) {
                audioRef.current.src = audioSrc;
                audioRef.current.volume = volume;

                // Play immediately - critical for background media key presses
                resumeAudioPlayback();
                setCurrentSong(song);
                setIsPlaying(true);
                setupMediaSession(song);

                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Error in playSongImmediate:', error.message);
            }
        }
    };

    // Setup Media Session action handlers for OS media controls
    const setupMediaSessionHandlers = () => {
        if (!('mediaSession' in navigator)) {
            return; // Media Session API not supported
        }

        // Clean up any existing handlers
        const cleanupHandlers = () => {
            mediaSessionHandlersRef.current.forEach(cleanup => cleanup());
            mediaSessionHandlersRef.current = [];
        };

        cleanupHandlers();

        try {
            // Play handler - must work even when browser is not in focus
            const playHandler = () => {
                resumeAudioPlayback();
                setIsPlaying(true);
                navigator.mediaSession.playbackState = 'playing';
            };

            navigator.mediaSession.setActionHandler('play', playHandler);
            mediaSessionHandlersRef.current.push(() => 
                navigator.mediaSession?.setActionHandler('play', null)
            );

            // Pause handler
            const pauseHandler = () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                    navigator.mediaSession.playbackState = 'paused';
                }
            };

            navigator.mediaSession.setActionHandler('pause', pauseHandler);
            mediaSessionHandlersRef.current.push(() => 
                navigator.mediaSession?.setActionHandler('pause', null)
            );

            // Next track handler - CRITICAL: must work in background without requestAnimationFrame
            const nextTrackHandler = async () => {
                const playlist = currentPlaylistRef.current;
                const currentIdx = currentIndexRef.current;

                if (playlist.length > 0) {
                    let nextIndex = currentIdx + 1;
                    if (nextIndex >= playlist.length) {
                        if (repeatMode === 'all') {
                            nextIndex = 0;
                        } else if (onLoadMoreRef.current) {
                            // Try loading more songs in background
                            const newSongs = await onLoadMoreRef.current();
                            if (newSongs && newSongs.length > 0) {
                                // Update index via state setter
                                const newIndex = playlist.length;
                                setCurrentPlaylist(prev => [...prev, ...newSongs]);
                                setCurrentIndex(newIndex);
                                currentIndexRef.current = newIndex;
                                await playSongImmediate(newSongs[0]);
                                return;
                            }
                            return;
                        } else {
                            return; // Don't wrap if not in repeat all mode
                        }
                    }

                    // Update index via state setter
                    setCurrentIndex(nextIndex);
                    currentIndexRef.current = nextIndex;

                    // Play the next song immediately without requestAnimationFrame
                    const nextSong = playlist[nextIndex];
                    await playSongImmediate(nextSong);
                }
            };

            navigator.mediaSession.setActionHandler('nexttrack', nextTrackHandler);
            mediaSessionHandlersRef.current.push(() => 
                navigator.mediaSession?.setActionHandler('nexttrack', null)
            );

            // Previous track handler - CRITICAL: must work in background without requestAnimationFrame
            const previousTrackHandler = async () => {
                const playlist = currentPlaylistRef.current;
                const currentIdx = currentIndexRef.current;

                if (playlist.length > 0) {
                    let prevIndex = currentIdx - 1;
                    if (prevIndex < 0) {
                        if (repeatMode === 'all') {
                            prevIndex = playlist.length - 1;
                        } else {
                            prevIndex = 0;
                        }
                    }

                    // Update index via state setter
                    setCurrentIndex(prevIndex);
                    currentIndexRef.current = prevIndex;

                    // Play the previous song immediately without requestAnimationFrame
                    const prevSong = playlist[prevIndex];
                    await playSongImmediate(prevSong);
                }
            };

            navigator.mediaSession.setActionHandler('previoustrack', previousTrackHandler);
            mediaSessionHandlersRef.current.push(() => 
                navigator.mediaSession?.setActionHandler('previoustrack', null)
            );

            // Seek handler - allows seeking from OS media control progress
            const seekToHandler = (details: MediaSessionActionDetails) => {
                if (audioRef.current && details.seekTime !== undefined) {
                    audioRef.current.currentTime = details.seekTime;
                    setProgress(details.seekTime);
                }
            };

            navigator.mediaSession.setActionHandler('seekto', seekToHandler);
            mediaSessionHandlersRef.current.push(() => 
                navigator.mediaSession?.setActionHandler('seekto', null)
            );

            // Seek forward handler (skip forward ~15 seconds)
            const seekForwardHandler = () => {
                if (audioRef.current) {
                    const skipTime = 15; // seconds
                    audioRef.current.currentTime = Math.min(
                        audioRef.current.currentTime + skipTime,
                        audioRef.current.duration
                    );
                }
            };

            try {
                navigator.mediaSession.setActionHandler('seekforward', seekForwardHandler);
                mediaSessionHandlersRef.current.push(() => 
                    navigator.mediaSession?.setActionHandler('seekforward', null)
                );
            } catch {
                // seekforward might not be supported
            }

            // Seek backward handler (skip backward ~15 seconds)
            const seekBackwardHandler = () => {
                if (audioRef.current) {
                    const skipTime = 15; // seconds
                    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
                }
            };

            try {
                navigator.mediaSession.setActionHandler('seekbackward', seekBackwardHandler);
                mediaSessionHandlersRef.current.push(() => 
                    navigator.mediaSession?.setActionHandler('seekbackward', null)
                );
            } catch {
                // seekbackward might not be supported
            }

            // Update playback state
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        } catch (error) {
            console.warn('Failed to setup Media Session handlers:', error);
        }
    };

    // Update Media Session playback state when playing state changes
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);

    // Re-setup Media Session handlers when repeatMode changes (needed for nexttrack/previoustrack behavior)
    useEffect(() => {
        setupMediaSessionHandlers();
    }, [repeatMode]);

    // Reinitialize Media Session handlers when window regains focus
    useEffect(() => {
        const handleFocus = () => {
            // When window regains focus, reinitialize handlers to ensure they work
            setupMediaSessionHandlers();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Persist Playback State
    useEffect(() => {
        if (currentSong) {
            localStorage.setItem('player_song', JSON.stringify(currentSong));
            // Update Media Session metadata when song changes
            setupMediaSession(currentSong);
        } else {
            localStorage.removeItem('player_song');
        }
        localStorage.setItem('player_queue', JSON.stringify(currentPlaylist));
        localStorage.setItem('player_original_queue', JSON.stringify(originalPlaylist));
        localStorage.setItem('player_index', currentIndex.toString());
        
        // Keep refs in sync to avoid stale closures in event handlers
        currentPlaylistRef.current = currentPlaylist;
        currentIndexRef.current = currentIndex;
    }, [currentSong, currentPlaylist, originalPlaylist, currentIndex]);

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('player_volume', volume.toString());
        localStorage.setItem('player_repeat', repeatMode);
        localStorage.setItem('player_shuffle', isShuffle.toString());
    }, [volume, repeatMode, isShuffle]);

    // Restore Audio Source on Mount
    useEffect(() => {
        if (currentSong && audioRef.current && !audioRef.current.src) {
            const loadSource = async () => {
                try {
                    const streamUrl = musicService.getStreamUrl(currentSong.song_uuid);
                    const response = await fetch(streamUrl, { 
                        credentials: 'include',
                    });
                    
                    if (!response.ok) {
                        console.warn("Failed to restore audio source:", response.status);
                        return;
                    }

                    const contentType = response.headers.get('content-type');
                    let src = streamUrl;

                    if (contentType?.includes('application/json')) {
                        const data = await response.json();
                        src = data.url;
                    }

                    if (audioRef.current) {
                        audioRef.current.src = src;
                        audioRef.current.volume = volume;
                    }
                } catch (error) {
                    // Silently fail - don't log errors on restore, it's not critical
                    // User can manually play the song if needed
                }
            };
            loadSource();
        }

        // Setup Media Session on mount
        setupMediaSessionHandlers();

        // Handle visibility changes to maintain media session in background
        const handleVisibilityChange = () => {
            // When page becomes visible again, ensure media session is still active
            if (!document.hidden) {
                // Page is now visible - update media session state
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            cleanupAudio();
            // Cleanup Media Session handlers
            mediaSessionHandlersRef.current.forEach(cleanup => cleanup());
            mediaSessionHandlersRef.current = [];
        };
    }, []);

    const playSong = (song: Song) => {
        if (!audioRef.current) return;

        // Aggressively clean up previous audio to ensure buffer is cleared
        cleanupAudio();
        
        // Execute immediately without requestAnimationFrame
        // CRITICAL FIX: requestAnimationFrame doesn't execute in background tabs
        // This was preventing auto-next from working when browser was minimized/backgrounded
        const loadAndPlay = async () => {
            if (!audioRef.current || !song) return;

            const streamUrl = musicService.getStreamUrl(song.song_uuid);
            
            try {
                // Fetch to get the actual URL (for S3: gets presigned URL, for local: gets stream directly)
                const response = await fetch(streamUrl, {
                    credentials: 'include',
                });
                
                if (!response.ok) {
                    console.error("Failed to fetch audio stream:", response.status);
                    return;
                }

                const contentType = response.headers.get('content-type');
                let audioSrc = streamUrl;

                // If response is JSON (S3 with presigned URL), extract the URL
                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    audioSrc = data.url;
                }
                // For local storage, response is the audio stream itself
                // So we just use the streamUrl directly

                // Set audio source and play
                if (audioRef.current) {
                    audioRef.current.src = audioSrc;
                    audioRef.current.volume = volume;
                    
                    // Play without await - fire and forget
                    audioRef.current.play().catch(error => {
                        if (error.name !== 'AbortError') {
                            console.error("Error playing song:", error.message);
                        }
                    });
                    
                    setCurrentSong(song);
                    setIsPlaying(true);

                    // Update Media Session metadata and playback state
                    setupMediaSession(song);
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = 'playing';
                    }
                }
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error("Error in playSong:", error.message);
                }
            }
        };

        // Call immediately without requestAnimationFrame to ensure works in background
        loadAndPlay();
    };

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    };

    const toggleShuffle = () => {
        setIsShuffle(prev => {
            const newShuffleState = !prev;
            if (newShuffleState) {
                // Turn Shuffle ON - shuffle a copy, don't mutate
                const shuffled = [...currentPlaylist].sort(() => Math.random() - 0.5);
                
                if (currentSong) {
                    const index = shuffled.findIndex(s => s.song_uuid === currentSong.song_uuid);
                    if (index !== -1) {
                        setCurrentIndex(index);
                    }
                } else {
                    setCurrentIndex(-1);
                }
                setCurrentPlaylist(shuffled);
            } else {
                // Turn Shuffle OFF - restore original order
                setCurrentPlaylist(originalPlaylist);
                if (currentSong) {
                    const index = originalPlaylist.findIndex(s => s.song_uuid === currentSong.song_uuid);
                    setCurrentIndex(index);
                }
            }
            return newShuffleState;
        });
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
            } else {
                audioRef.current.play().catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Error resuming playback:', error);
                    }
                });
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
            }
            setIsPlaying(!isPlaying);
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    };

    const setVolume = (newVolume: number) => {
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setVolumeState(newVolume);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            
            // Update Media Session position state to show in OS UI
            if ('mediaSession' in navigator && audioRef.current.duration) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audioRef.current.duration,
                        playbackRate: audioRef.current.playbackRate,
                        position: audioRef.current.currentTime
                    });
                } catch (error) {
                    // Position state update failed - this is non-critical
                }
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleError = () => {
        // Only log meaningful errors (not empty src errors which are expected)
        if (audioRef.current?.error && audioRef.current.src) {
            const errorMsg = audioRef.current.error.message || `Code ${audioRef.current.error.code}`;
            console.error('Audio playback error:', errorMsg);
        }
        
        // Reset on error to allow retry
        if (audioRef.current) {
            audioRef.current.src = '';
        }
    };

    const handleAbort = () => {
        // Don't log or clear src on abort - it's often just cleanup
        // Only clear if it's a real abort during playback
        if (audioRef.current && isPlaying) {
            console.warn('Audio playback aborted');
        }
    };

    // Handle unexpected pause events (e.g., when browser suspends audio)
    const handlePause = () => {
        // If we expected to be playing but paused, update state
        // This handles cases where browser pauses audio due to focus loss or other reasons
        if (isPlaying && audioRef.current && !audioRef.current.paused === false) {
            // Audio unexpectedly paused - update UI state to reflect reality
            setIsPlaying(false);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    };

    // Handle play events to ensure isPlaying state stays in sync
    const handlePlay = () => {
        if (!isPlaying) {
            setIsPlaying(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        }
    };

    const handleEnded = async () => {
        if (repeatMode === 'one') {
            // Repeat current track - restart it
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Error restarting track:', error);
                    }
                });
            }
        } else {
            // Use refs to avoid stale closure - get fresh playlist and index
            const playlist = currentPlaylistRef.current;
            const currentIdx = currentIndexRef.current;

            if (playlist.length > 0) {
                let nextIndex = currentIdx + 1;

                if (nextIndex >= playlist.length) {
                    if (repeatMode === 'all') {
                        nextIndex = 0;
                    } else if (onLoadMoreRef.current) {
                        // Attempt to load more songs seamlessly
                        const newSongs = await onLoadMoreRef.current();
                        if (newSongs && newSongs.length > 0) {
                            // Update state with new songs appended
                            const startIndex = playlist.length;
                            setCurrentPlaylist(prev => [...prev, ...newSongs]);
                            setCurrentIndex(startIndex);
                            playSong(newSongs[0]);
                            return;
                        } else {
                            // No more songs to load
                            setIsPlaying(false);
                            if ('mediaSession' in navigator) {
                                navigator.mediaSession.playbackState = 'paused';
                            }
                            return;
                        }
                    } else {
                        // End of playlist and no repeat - stop playing
                        setIsPlaying(false);
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.playbackState = 'paused';
                        }
                        return;
                    }
                }

                // Use state setters to properly update the context state
                setCurrentIndex(nextIndex);
                // playSong will be called synchronously before the next render
                playSong(playlist[nextIndex]);
            }
        }
    };

    const playPlaylist = (songs: Song[], startIndex: number = 0, onLoadMore?: () => Promise<Song[] | null>) => {
        setOriginalPlaylist(songs);
        setCurrentPlaylist(songs);
        setCurrentIndex(startIndex);
        setIsShuffle(false);
        onLoadMoreRef.current = onLoadMore;
        if (songs.length > startIndex) {
            playSong(songs[startIndex]);
        }
    };

    const playNext = async () => {
        if (currentPlaylist.length > 0) {
            let nextIndex = currentIndex + 1;

            if (nextIndex >= currentPlaylist.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0;
                } else if (onLoadMoreRef.current) {
                    const newSongs = await onLoadMoreRef.current();
                    if (newSongs && newSongs.length > 0) {
                        const startIndex = currentPlaylist.length;
                        setCurrentPlaylist(prev => [...prev, ...newSongs]);
                        setCurrentIndex(startIndex);
                        playSong(newSongs[0]);
                        return;
                    }
                    return;
                } else {
                    setIsPlaying(false);
                    return;
                }
            }

            setCurrentIndex(nextIndex);
            playSong(currentPlaylist[nextIndex]);
        }
    };

    const playPrevious = () => {
        if (currentPlaylist.length > 0) {
            let prevIndex = currentIndex - 1;

            if (prevIndex < 0) {
                if (repeatMode === 'all') {
                    prevIndex = currentPlaylist.length - 1;
                } else {
                    prevIndex = 0;
                }
            }

            setCurrentIndex(prevIndex);
            playSong(currentPlaylist[prevIndex]);
        }
    };

    const removeSong = (songUuid: string) => {
        // If current song is deleted, stop playback and cleanup
        if (currentSong?.song_uuid === songUuid) {
            cleanupAudio();
            setCurrentSong(null);
            setIsPlaying(false);
            setProgress(0);
            setDuration(0);
        }

        // Remove from playlists efficiently
        const updatedPlaylist = currentPlaylist.filter(s => s.song_uuid !== songUuid);
        if (updatedPlaylist.length !== currentPlaylist.length) {
            setCurrentPlaylist(updatedPlaylist);

            if (currentSong && currentSong.song_uuid !== songUuid) {
                const newIndex = updatedPlaylist.findIndex(s => s.song_uuid === currentSong.song_uuid);
                setCurrentIndex(newIndex >= 0 ? newIndex : -1);
            }
        }

        const updatedOriginal = originalPlaylist.filter(s => s.song_uuid !== songUuid);
        if (updatedOriginal.length !== originalPlaylist.length) {
            setOriginalPlaylist(updatedOriginal);
        }
    };

    return (
        <PlayerContext.Provider
            value={{
                currentSong,
                isPlaying,
                progress,
                duration,
                volume,
                currentPlaylist,
                currentIndex,
                playSong,
                playPlaylist,
                playNext,
                playPrevious,
                togglePlay,
                seek,
                setVolume,
                audioRef,
                repeatMode,
                isShuffle,
                toggleRepeat,
                toggleShuffle,
                removeSong,
            }}
        >
            {children}
            <audio
                ref={audioRef}
                crossOrigin="use-credentials"
                preload="none"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={handleError}
                onAbort={handleAbort}
                onPause={handlePause}
                onPlay={handlePlay}
            />
        </PlayerContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}
