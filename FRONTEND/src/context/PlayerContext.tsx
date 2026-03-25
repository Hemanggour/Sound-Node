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
    refreshCurrentQueue: () => Promise<void>;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    activeAudioRef: React.RefObject<HTMLAudioElement | null>;
    standbyAudioRef: React.RefObject<HTMLAudioElement | null>;
    repeatMode: RepeatMode;
    isShuffle: boolean;
    toggleRepeat: () => void;
    toggleShuffle: () => Promise<void>;
    removeSong: (songUuid: string) => void;
    isNowPlayingOpen: boolean;
    setIsNowPlayingOpen: (open: boolean) => void;
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
    const [playbackContext, setPlaybackContext] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('player_context');
        return saved ? JSON.parse(saved) : {};
    });
    const [playbackShuffleState, setPlaybackShuffleState] = useState<boolean>(() => {
        const saved = localStorage.getItem('player_shuffle_state');
        return saved === 'true';
    });
    const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
        const saved = localStorage.getItem('player_repeat');
        return (saved === 'one' || saved === 'all') ? saved : 'off';
    });
    const [isShuffle, setIsShuffle] = useState(() => {
        const saved = localStorage.getItem('player_shuffle');
        return saved === 'true';
    });
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);
    const standbyAudioRef = useRef<HTMLAudioElement | null>(null);
    const prefetchTriggeredRef = useRef<boolean>(false);
    const prefetchSongUuidRef = useRef<string | null>(null);
    const repeatModeRef = useRef<RepeatMode>(repeatMode);
    const isShuffleRef = useRef<boolean>(isShuffle);
    const isPlayingRef = useRef<boolean>(isPlaying);
    const abortControllerRef = useRef<AbortController | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const currentPlaylistRef = useRef<string[]>([]);
    const currentIndexRef = useRef<number>(-1);
    const mediaSessionHandlersRef = useRef<Array<() => void>>([]);

    const createAudioPlayer = () => {
        const audio = new Audio();
        audio.crossOrigin = 'use-credentials';
        audio.preload = 'metadata';
        return audio;
    };

    const attachPlayerEvents = (audio: HTMLAudioElement) => {
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('abort', handleAbort);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);
    };

    const detachPlayerEvents = (audio: HTMLAudioElement) => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('abort', handleAbort);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
    };

    // Cleanup function for audio resources
    const cleanupAudio = () => {
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            detachPlayerEvents(activeAudioRef.current);
            activeAudioRef.current.src = '';
            activeAudioRef.current.removeAttribute('src');
            activeAudioRef.current.load();
        }
        if (standbyAudioRef.current) {
            standbyAudioRef.current.pause();
            detachPlayerEvents(standbyAudioRef.current);
            standbyAudioRef.current.src = '';
            standbyAudioRef.current.removeAttribute('src');
            standbyAudioRef.current.load();
        }

        prefetchTriggeredRef.current = false;
        prefetchSongUuidRef.current = null;

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
        if (activeAudioRef.current) {
            const playPromise = activeAudioRef.current.play();
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
        return playSong(songId);
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
                if (activeAudioRef.current) {
                    activeAudioRef.current.pause();
                    setIsPlaying(false);
                    navigator.mediaSession.playbackState = 'paused';
                }
            };

            navigator.mediaSession.setActionHandler('pause', pauseHandler);
            mediaSessionHandlersRef.current.push(() =>
                navigator.mediaSession?.setActionHandler('pause', null)
            );

            // Seek handler - allows seeking from OS media control progress
            const seekToHandler = (details: MediaSessionActionDetails) => {
                if (activeAudioRef.current && details.seekTime !== undefined) {
                    activeAudioRef.current.currentTime = details.seekTime;
                    setProgress(details.seekTime);
                }
            };

            navigator.mediaSession.setActionHandler('seekto', seekToHandler);
            mediaSessionHandlersRef.current.push(() =>
                navigator.mediaSession?.setActionHandler('seekto', null)
            );

            // Seek forward handler (skip forward ~15 seconds)
            const seekForwardHandler = () => {
                if (activeAudioRef.current) {
                    const skipTime = 15; // seconds
                    activeAudioRef.current.currentTime = Math.min(
                        activeAudioRef.current.currentTime + skipTime,
                        activeAudioRef.current.duration
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
                if (activeAudioRef.current) {
                    const skipTime = 15; // seconds
                    activeAudioRef.current.currentTime = Math.max(0, activeAudioRef.current.currentTime - skipTime);
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
                    const currentRepeatMode = repeatModeRef.current;
                    if (nextIndex >= playlist.length) {
                        if (currentRepeatMode === 'all') {
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
                    const currentRepeatMode = repeatModeRef.current;
                    if (prevIndex < 0) {
                        if (currentRepeatMode === 'all') {
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

        localStorage.setItem('player_context', JSON.stringify(playbackContext));
        localStorage.setItem('player_shuffle_state', playbackShuffleState.toString());
    }, [currentSong, currentPlaylist, originalPlaylist, currentIndex, playbackContext, playbackShuffleState]);

    // Persist Settings and Keep Refs updated
    useEffect(() => {
        localStorage.setItem('player_volume', volume.toString());
        localStorage.setItem('player_repeat', repeatMode);
        localStorage.setItem('player_shuffle', isShuffle.toString());

        // Update refs to avoid stale closures in event handlers
        repeatModeRef.current = repeatMode;
        isShuffleRef.current = isShuffle;
    }, [volume, repeatMode, isShuffle]);

    // Keep isPlayingRef in sync
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Invalidate prefetch when settings change that affect "next track"
    useEffect(() => {
        if (prefetchTriggeredRef.current) {
            prefetchTriggeredRef.current = false;
            prefetchSongUuidRef.current = null;
            if (standbyAudioRef.current) {
                standbyAudioRef.current.pause();
                standbyAudioRef.current.src = '';
                standbyAudioRef.current.load();
            }
        }
    }, [isShuffle, currentPlaylist]);

    // Restore Audio Source on Mount
    useEffect(() => {
        // Initialize players on mount
        if (!activeAudioRef.current) activeAudioRef.current = createAudioPlayer();
        if (!standbyAudioRef.current) standbyAudioRef.current = createAudioPlayer();
        attachPlayerEvents(activeAudioRef.current);
        attachPlayerEvents(standbyAudioRef.current);

        if (currentSong && activeAudioRef.current && !activeAudioRef.current.src) {
            const loadSource = async () => {
                try {
                    let src = '';

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
                        if (data.song) {
                            setCurrentSong(data.song);
                        }
                    }

                    if (activeAudioRef.current) {
                        activeAudioRef.current.src = src;
                        activeAudioRef.current.volume = volume;
                    }
                } catch (error) {
                    console.warn("Restoration error:", error);
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

        // Initial queue refresh if we have a context
        if (Object.keys(playbackContext).length > 0 || currentPlaylist.length > 0) {
            refreshCurrentQueue();
        }

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
        const songUuid = typeof song === 'string' ? song : song.song_uuid;

        // If we have the full song object, seed the cache
        if (typeof song !== 'string') {
            setSongMetadataCache(prev => ({ ...prev, [song.song_uuid]: song }));
        }

        // Check if we can reuse prefetched standby player
        if (prefetchSongUuidRef.current === songUuid && standbyAudioRef.current?.src) {
            const playlist = currentPlaylistRef.current;
            let targetIndex = currentIndexRef.current;

            // Update index if it's the next one or find it
            if (playlist[targetIndex + 1] === songUuid) {
                targetIndex = targetIndex + 1;
            } else if (playlist[targetIndex] !== songUuid) {
                targetIndex = playlist.indexOf(songUuid);
            }

            if (targetIndex !== -1) {
                const success = await performGaplessSwitch(targetIndex, songUuid);
                if (success) return;
            }
        }

        cleanupAudio();
        // Re-initialize players
        activeAudioRef.current = createAudioPlayer();
        standbyAudioRef.current = createAudioPlayer();
        attachPlayerEvents(activeAudioRef.current);
        attachPlayerEvents(standbyAudioRef.current);

        const loadAndPlay = async () => {
            if (!activeAudioRef.current) return;

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
                let songMetadataFromResponse = null;

                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    audioSrc = data.url;
                    songMetadataFromResponse = data.song;
                }

                if (activeAudioRef.current) {
                    activeAudioRef.current.src = audioSrc;
                    activeAudioRef.current.volume = volume;

                    activeAudioRef.current.play().catch(async (error) => {
                        if (error.name !== 'AbortError') {
                            console.error("Error playing song:", error.message);
                        }
                    });

                    // Update current song metadata
                    let songMetadata = songMetadataFromResponse || (typeof song !== 'string' ? song : songMetadataCache[songUuid]);

                    if (!songMetadata) {
                        try {
                            songMetadata = await musicService.getSong(songUuid);
                            setSongMetadataCache(prev => ({ ...prev, [songUuid]: songMetadata }));
                        } catch (error) {
                            console.error('Failed to fetch metadata for song:', songUuid);
                        }
                    } else if (songMetadataFromResponse) {
                        // Seed/update cache with fresh metadata from response
                        setSongMetadataCache(prev => ({ ...prev, [songUuid]: songMetadataFromResponse }));
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
        const nextShuffle = !isShuffle;
        setIsShuffle(nextShuffle);

        if (nextShuffle) {
            // Shuffle ON: Shuffle current queue locally
            if (currentSong) {
                const others = currentPlaylist.filter(uuid => uuid !== currentSong.song_uuid);
                // Fisher-Yates shuffle
                for (let i = others.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [others[i], others[j]] = [others[j], others[i]];
                }
                const shuffled = [currentSong.song_uuid, ...others];
                setCurrentPlaylist(shuffled);
                setCurrentIndex(0);
            }
        } else {
            // Shuffle OFF: Restore original order
            let baseQueue = originalPlaylist;

            if (baseQueue.length === 0 && playbackContext) {
                try {
                    const { queue } = await musicService.getPlaybackQueue({ ...playbackContext, shuffle: false });
                    baseQueue = queue;
                    setOriginalPlaylist(queue);
                } catch (error) {
                    console.error("Failed to fetch original queue:", error);
                }
            }

            if (currentSong && baseQueue.length > 0) {
                const newIndex = baseQueue.indexOf(currentSong.song_uuid);
                setCurrentPlaylist(baseQueue);
                setCurrentIndex(newIndex >= 0 ? newIndex : 0);
            }
        }
    };

    const togglePlay = () => {
        if (activeAudioRef.current) {
            if (isPlaying) {
                activeAudioRef.current.pause();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
                setIsPlaying(false);
            } else {
                // Recovery logic: if we have a song but no source (e.g. restoration failed or URL expired)
                if (currentSong && !activeAudioRef.current.src) {
                    playSong(currentSong);
                    return;
                }

                activeAudioRef.current.play().catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error('Error resuming playback:', error);
                        // If standard play fails, try a full re-load
                        if (currentSong) {
                            playSong(currentSong);
                        }
                    }
                });
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
                setIsPlaying(true);
            }
        }
    };

    const seek = (time: number) => {
        if (activeAudioRef.current) {
            activeAudioRef.current.currentTime = time;
            setProgress(time);
        }
    };

    const setVolume = (newVolume: number) => {
        if (activeAudioRef.current) {
            activeAudioRef.current.volume = newVolume;
        }
        if (standbyAudioRef.current) {
            standbyAudioRef.current.volume = newVolume;
        }
        setVolumeState(newVolume);
    };

    const handleTimeUpdate = async () => {
        const audio = activeAudioRef.current;
        if (audio) {
            setProgress(audio.currentTime);

            // Prefetch logic
            if (audio.duration && audio.currentTime / audio.duration > 0.85 && !prefetchTriggeredRef.current) {
                prefetchNextTrack();
            }

            // Update Media Session position state
            if ('mediaSession' in navigator && audio.duration) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audio.duration,
                        playbackRate: audio.playbackRate,
                        position: audio.currentTime
                    });
                } catch (error) {
                    // Position state update failed
                }
            }
        }
    };

    const prefetchNextTrack = async () => {
        const playlist = currentPlaylistRef.current;
        const currentIdx = currentIndexRef.current;
        const currentRepeatMode = repeatModeRef.current;

        if (playlist.length === 0) return;

        let nextIndex = currentIdx + 1;
        // Even in "Repeat One", we prefetch the *next* song in the list
        // This ensures that manual "Next" skips remain instant.
        if (nextIndex >= playlist.length) {
            if (currentRepeatMode === 'all' || currentRepeatMode === 'one') {
                nextIndex = 0;
            } else {
                return;
            }
        }

        const nextSongUuid = playlist[nextIndex];
        if (!nextSongUuid) return;

        // Optimization: If next song is the same as current song (e.g. 1-song playlist),
        // don't prefetch into standby; we'll use native looping on the active player.
        if (nextSongUuid === playlist[currentIdx]) return;

        // Optimization: If already prefetched this song, don't do it again
        if (prefetchSongUuidRef.current === nextSongUuid && standbyAudioRef.current?.src) {
            prefetchTriggeredRef.current = true;
            return;
        }

        prefetchTriggeredRef.current = true;

        try {
            const streamUrl = musicService.getStreamUrl(nextSongUuid);
            const response = await fetch(streamUrl, { credentials: 'include' });
            if (!response.ok) return;

            const contentType = response.headers.get('content-type');
            let nextSrc = streamUrl;

            if (contentType?.includes('application/json')) {
                const data = await response.json();
                nextSrc = data.url;
                // Pre-cache metadata
                if (data.song) {
                    setSongMetadataCache(prev => ({ ...prev, [nextSongUuid]: data.song }));
                }
            }

            if (standbyAudioRef.current) {
                standbyAudioRef.current.src = nextSrc;
                standbyAudioRef.current.preload = 'auto';
                standbyAudioRef.current.load();
                prefetchSongUuidRef.current = nextSongUuid;
            }
        } catch (error) {
            console.warn('[Gapless] Prefetch failed:', error);
            prefetchTriggeredRef.current = false;
        }
    };

    const handleLoadedMetadata = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        if (audio === activeAudioRef.current) {
            setDuration(audio.duration);
        }
    };

    const handleError = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        // Only log meaningful errors
        if (audio.error && audio.src) {
            const errorMsg = audio.error.message || `Code ${audio.error.code}`;
            console.error('Audio playback error:', errorMsg);
        }

        if (audio === activeAudioRef.current) {
            audio.src = '';
        }
    };

    const handleAbort = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        if (audio === activeAudioRef.current && isPlaying) {
            console.warn('Audio playback aborted');
        }
    };

    // Handle unexpected pause events (e.g., when browser suspends audio)
    const handlePause = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        if (audio === activeAudioRef.current && isPlaying && !audio.paused === false) {
            setIsPlaying(false);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    };

    // Handle play events to ensure isPlaying state stays in sync
    const handlePlay = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        if (audio === activeAudioRef.current && !isPlaying) {
            setIsPlaying(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        }
    };

    const performGaplessSwitch = async (nextIndex: number, nextSongUuid: string) => {
        if (!standbyAudioRef.current || !standbyAudioRef.current.src) return false;

        const oldActive = activeAudioRef.current;
        const newActive = standbyAudioRef.current;

        // Swap roles
        activeAudioRef.current = newActive;
        standbyAudioRef.current = createAudioPlayer(); // Recreate standby

        // Destroy old active
        if (oldActive) {
            detachPlayerEvents(oldActive);
            oldActive.pause();
            oldActive.src = '';
            oldActive.removeAttribute('src');
            oldActive.load();
        }

        // Prepare new active
        attachPlayerEvents(activeAudioRef.current);
        activeAudioRef.current.play().catch(error => {
            if (error.name !== 'AbortError') {
                console.error('[Gapless] Play failed after switch:', error);
            }
        });
        setIsPlaying(true);

        // Update duration immediately since metadata is already loaded
        if (activeAudioRef.current.duration) {
            setDuration(activeAudioRef.current.duration);
        }

        // Update state
        setCurrentIndex(nextIndex);
        prefetchTriggeredRef.current = false;
        prefetchSongUuidRef.current = null;

        // Update metadata
        const songMetadata = songMetadataCache[nextSongUuid];
        if (songMetadata) {
            setCurrentSong(songMetadata);
            setupMediaSession(songMetadata);
        } else {
            try {
                const fullMetadata = await musicService.getSong(nextSongUuid);
                setCurrentSong(fullMetadata);
                setupMediaSession(fullMetadata);
                setSongMetadataCache(prev => ({ ...prev, [nextSongUuid]: fullMetadata }));
            } catch (error) {
                console.error('[Gapless] Failed to fetch metadata for switched track:', error);
            }
        }

        return true;
    };

    const handleEnded = async () => {
        const currentRepeatMode = repeatModeRef.current;
        const playlist = currentPlaylistRef.current;
        const currentIdx = currentIndexRef.current;

        if (playlist.length === 0) return;

        // Optimized Repeat One: Natively loop the active player
        // This reuses the existing buffer and avoids a full refetch/swap
        if (currentRepeatMode === 'one') {
            if (activeAudioRef.current) {
                activeAudioRef.current.currentTime = 0;
                activeAudioRef.current.play().catch(() => { });
                setIsPlaying(true);
                return;
            }
        }

        let nextIndex = currentIdx + 1;
        if (nextIndex >= playlist.length) {
            if (currentRepeatMode === 'all') {
                nextIndex = 0;
            } else {
                setIsPlaying(false);
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
                return;
            }
        }

        const nextSongUuid = playlist[nextIndex];

        // Gapless Switch if standby matches
        if (prefetchSongUuidRef.current === nextSongUuid && standbyAudioRef.current?.src) {
            await performGaplessSwitch(nextIndex, nextSongUuid);
        } else {
            setCurrentIndex(nextIndex);
            playSong(playlist[nextIndex]);
        }
    };

    const refreshCurrentQueue = async () => {
        try {
            const { queue } = await musicService.getPlaybackQueue({
                ...playbackContext,
                shuffle: isShuffle
            });

            if (isShuffle) {
                setCurrentPlaylist(queue);
                if (currentSong) {
                    const newIndex = queue.indexOf(currentSong.song_uuid);
                    setCurrentIndex(newIndex >= 0 ? newIndex : 0);
                }
            } else {
                setOriginalPlaylist(queue);
                setCurrentPlaylist(queue);
                if (currentSong) {
                    const newIndex = queue.indexOf(currentSong.song_uuid);
                    setCurrentIndex(newIndex >= 0 ? newIndex : 0);
                }
            }
            setPlaybackShuffleState(isShuffle);
        } catch (error) {
            console.error("Failed to refresh playback queue:", error);
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

        if (isSameContext && isSameShuffle && !isShuffle && currentPlaylist.length > 0) {
            // Context and shuffle are the same, just play the song at startIndex
            setCurrentIndex(startIndex);
            const songId = currentPlaylist[startIndex];
            const cachedSong = songMetadataCache[songId];
            const initialSong = initialSongs?.find(s => s.song_uuid === songId);
            playSong(initialSong || cachedSong || songId);
            return;
        }

        try {
            const startSongUuid = initialSongs?.[startIndex]?.song_uuid;

            const { queue } = await musicService.getPlaybackQueue({
                ...context,
                shuffle: isShuffle,
                start_song_uuid: startSongUuid
            });

            if (isShuffle) {
                // If started with shuffle, we only fetch the shuffled queue
                // We keep the old originalPlaylist if it was already set for this context
                // OR we'll lazy-load it if they toggle shuffle OFF later
                if (JSON.stringify(context) !== JSON.stringify(playbackContext)) {
                    setOriginalPlaylist([]);
                }
                setCurrentPlaylist(queue);
                setCurrentIndex(0); // Backend ensures start_song_uuid is at index 0
            } else {
                setOriginalPlaylist(queue);
                setCurrentPlaylist(queue);
                setCurrentIndex(startIndex);
            }

            setPlaybackContext(context);
            setPlaybackShuffleState(isShuffle);

            if (queue.length > 0) {
                const songId = isShuffle ? queue[0] : queue[startIndex];
                const initialSong = initialSongs?.find(s => s.song_uuid === songId);
                playSong(initialSong || songId);
            }
        } catch (error) {
            console.error("Failed to load playback queue:", error);
        }
    };

    const playNext = () => {
        const playlist = currentPlaylistRef.current;
        if (playlist.length > 0) {
            let nextIndex = currentIndexRef.current + 1;
            const currentRepeatMode = repeatModeRef.current;

            if (nextIndex >= playlist.length) {
                if (currentRepeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    return;
                }
            }

            const nextSongUuid = playlist[nextIndex];

            // Reuse prefetch if available
            if (prefetchSongUuidRef.current === nextSongUuid && standbyAudioRef.current?.src) {
                performGaplessSwitch(nextIndex, nextSongUuid);
            } else {
                setCurrentIndex(nextIndex);
                playSong(nextSongUuid);
            }
        }
    };

    const playPrevious = () => {
        const playlist = currentPlaylistRef.current;
        if (playlist.length > 0) {
            let prevIndex = currentIndexRef.current - 1;
            const currentRepeatMode = repeatModeRef.current;

            if (prevIndex < 0) {
                if (currentRepeatMode === 'all') {
                    prevIndex = playlist.length - 1;
                } else {
                    prevIndex = 0;
                }
            }

            const prevSongUuid = playlist[prevIndex];

            // Reuse prefetch if available (mostly for Repeat One or rapid skipping)
            if (prefetchSongUuidRef.current === prevSongUuid && standbyAudioRef.current?.src) {
                performGaplessSwitch(prevIndex, prevSongUuid);
            } else {
                setCurrentIndex(prevIndex);
                playSong(prevSongUuid);
            }
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

    const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);

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
                refreshCurrentQueue,
                seek,
                setVolume,
                activeAudioRef,
                standbyAudioRef,
                repeatMode,
                isShuffle,
                toggleRepeat,
                toggleShuffle,
                removeSong,
                isNowPlayingOpen,
                setIsNowPlayingOpen,
            }}
        >
            {children}
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
