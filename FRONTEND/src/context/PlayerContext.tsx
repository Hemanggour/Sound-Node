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
    currentPlaylist: string[];
    currentIndex: number;
    playSong: (song: Song | string) => void;
    playPlaylist: (context: { artist_uuid?: string; album_uuid?: string; playlist_uuid?: string; q?: string }, startIndex?: number, initialSongs?: Song[]) => void;
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
    const [currentPlaylist, setCurrentPlaylist] = useState<string[]>(() => {
        const saved = localStorage.getItem('player_queue');
        return saved ? JSON.parse(saved) : [];
    });
    const [originalPlaylist, setOriginalPlaylist] = useState<string[]>(() => {
        const saved = localStorage.getItem('player_original_queue');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        const saved = localStorage.getItem('player_index');
        return saved ? Number(saved) : -1;
    });

    const [songMetadataCache, setSongMetadataCache] = useState<Record<string, Song>>({});
    const [playbackContext, setPlaybackContext] = useState<Record<string, string>>({});
    const [playbackShuffleState, setPlaybackShuffleState] = useState<boolean>(false);
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
    const currentPlaylistRef = useRef<string[]>([]);
    const currentIndexRef = useRef<number>(-1);
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

    // Helper to load and play a song by UUID
    const playSongById = async (songId: string) => {
        if (!audioRef.current) return;

        cleanupAudio();

        try {
            const streamUrl = musicService.getStreamUrl(songId);
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

                resumeAudioPlayback();
                setIsPlaying(true);

                // Fetch full metadata for Media Session and UI
                let songMetadata = songMetadataCache[songId];
                if (!songMetadata) {
                    try {
                        songMetadata = await musicService.getSong(songId);
                        setSongMetadataCache(prev => ({ ...prev, [songId]: songMetadata }));
                    } catch (error) {
                        console.error('Failed to fetch metadata for song:', songId);
                    }
                }

                if (songMetadata) {
                    setCurrentSong(songMetadata);
                    setupMediaSession(songMetadata);
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Error in playSongById:', error.message);
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
                        } else {
                            return;
                        }
                    }

                    setCurrentIndex(nextIndex);
                    currentIndexRef.current = nextIndex;

                    const nextSongUuid = playlist[nextIndex];
                    await playSongById(nextSongUuid);
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
                    const prevSongUuid = playlist[prevIndex];
                    await playSongById(prevSongUuid);
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
                    let src = '';

                    if (currentSong.file) {
                        src = currentSong.file;
                    } else {
                        const streamUrl = musicService.getStreamUrl(currentSong.song_uuid);
                        const response = await fetch(streamUrl, {
                            credentials: 'include',
                        });

                        if (!response.ok) {
                            console.warn("Failed to restore audio source:", response.status);
                            return;
                        }

                        const contentType = response.headers.get('content-type');
                        src = streamUrl;

                        if (contentType?.includes('application/json')) {
                            const data = await response.json();
                            src = data.url;
                        }
                    }

                    if (audioRef.current) {
                        audioRef.current.src = src;
                        audioRef.current.volume = volume;
                    }
                } catch (error) {
                    // Silently fail
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

    const playSong = async (song: Song | string) => {
        if (!audioRef.current) return;
        const songUuid = typeof song === 'string' ? song : song.song_uuid;

        // If we have the full song object, seed the cache
        if (typeof song !== 'string') {
            setSongMetadataCache(prev => ({ ...prev, [song.song_uuid]: song }));
        }

        cleanupAudio();

        const loadAndPlay = async () => {
            if (!audioRef.current) return;

            try {
                const streamUrl = musicService.getStreamUrl(songUuid);
                const response = await fetch(streamUrl, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    console.error("Failed to fetch audio stream:", response.status);
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

                    audioRef.current.play().catch(async (error) => {
                        if (error.name !== 'AbortError') {
                            console.error("Error playing song:", error.message);
                        }
                    });

                    // Update current song metadata
                    let songMetadata = typeof song !== 'string' ? song : songMetadataCache[songUuid];

                    if (!songMetadata) {
                        try {
                            songMetadata = await musicService.getSong(songUuid);
                            setSongMetadataCache(prev => ({ ...prev, [songUuid]: songMetadata }));
                        } catch (error) {
                            console.error('Failed to fetch metadata for song:', songUuid);
                        }
                    }

                    if (songMetadata) {
                        setCurrentSong(songMetadata);
                        setupMediaSession(songMetadata);
                    }

                    setIsPlaying(true);
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

        loadAndPlay();
    };

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    };

    const toggleShuffle = async () => {
        setIsShuffle(prev => !prev);
        // We will fetch the new queue in the next effect or here
        // For simplicity, let's just trigger a reload of the queue if we have context
        // This is a bit simplified, but follows the backend shuffle logic
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
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Error restarting track:', error);
                    }
                });
            }
        } else {
            const playlist = currentPlaylistRef.current;
            const currentIdx = currentIndexRef.current;

            if (playlist.length > 0) {
                let nextIndex = currentIdx + 1;

                if (nextIndex >= playlist.length) {
                    if (repeatMode === 'all') {
                        nextIndex = 0;
                    } else {
                        setIsPlaying(false);
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.playbackState = 'paused';
                        }
                        return;
                    }
                }

                setCurrentIndex(nextIndex);
                playSong(playlist[nextIndex]);
            }
        }
    };

    const playPlaylist = async (context: { artist_uuid?: string; album_uuid?: string; playlist_uuid?: string; q?: string }, startIndex: number = 0, initialSongs?: Song[]) => {
        // Seed cache with initial songs if provided
        if (initialSongs && initialSongs.length > 0) {
            setSongMetadataCache(prev => {
                const newCache = { ...prev };
                initialSongs.forEach(song => {
                    newCache[song.song_uuid] = song;
                });
                return newCache;
            });
        }

        // Check if we already have this queue cached to avoid redundant network calls
        const isSameContext = JSON.stringify(context) === JSON.stringify(playbackContext);
        const isSameShuffle = isShuffle === playbackShuffleState;

        if (isSameContext && isSameShuffle && currentPlaylist.length > 0) {
            // Context and shuffle are the same, just play the song at startIndex
            setCurrentIndex(startIndex);
            const songId = currentPlaylist[startIndex];
            const cachedSong = songMetadataCache[songId];
            const initialSong = initialSongs?.find(s => s.song_uuid === songId);
            playSong(initialSong || cachedSong || songId);
            return;
        }

        try {
            const { queue } = await musicService.getPlaybackQueue({ ...context, shuffle: isShuffle });
            setOriginalPlaylist(queue);
            setCurrentPlaylist(queue);
            setCurrentIndex(startIndex);
            setPlaybackContext(context);
            setPlaybackShuffleState(isShuffle);

            if (queue.length > startIndex) {
                const songId = queue[startIndex];
                // Check if we already have metadata in the initialSongs
                const initialSong = initialSongs?.find(s => s.song_uuid === songId);
                playSong(initialSong || songId);
            }
        } catch (error) {
            console.error("Failed to load playback queue:", error);
        }
    };

    const playNext = () => {
        if (currentPlaylist.length > 0) {
            let nextIndex = currentIndex + 1;

            if (nextIndex >= currentPlaylist.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0;
                } else {
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
        if (currentSong?.song_uuid === songUuid) {
            cleanupAudio();
            setCurrentSong(null);
            setIsPlaying(false);
            setProgress(0);
            setDuration(0);
        }

        const updatedPlaylist = currentPlaylist.filter(uuid => uuid !== songUuid);
        if (updatedPlaylist.length !== currentPlaylist.length) {
            setCurrentPlaylist(updatedPlaylist);
            if (currentSong && currentSong.song_uuid !== songUuid) {
                const newIndex = updatedPlaylist.findIndex(uuid => uuid === currentSong.song_uuid);
                setCurrentIndex(newIndex >= 0 ? newIndex : -1);
            }
        }

        const updatedOriginal = originalPlaylist.filter(uuid => uuid !== songUuid);
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
