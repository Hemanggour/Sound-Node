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
    playPlaylist: (songs: Song[], startIndex?: number) => void;
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

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('player_volume', volume.toString());
        localStorage.setItem('player_repeat', repeatMode);
        localStorage.setItem('player_shuffle', isShuffle.toString());
    }, [volume, repeatMode, isShuffle]);

    // Persist Playback State
    useEffect(() => {
        if (currentSong) {
            localStorage.setItem('player_song', JSON.stringify(currentSong));
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

        // Cleanup on unmount
        return () => {
            cleanupAudio();
        };
    }, []);

    const playSong = (song: Song) => {
        if (!audioRef.current) return;

        // Aggressively clean up previous audio to ensure buffer is cleared
        cleanupAudio();
        
        // Small delay to ensure cleanup completed before loading new song
        requestAnimationFrame(async () => {
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
                }
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error("Error in playSong:", error.message);
                }
            }
        });
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
            } else {
                audioRef.current.play().catch(console.error);
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

    const handleEnded = () => {
        if (repeatMode === 'one') {
            if (audioRef.current) {
                audioRef.current.play().catch(console.error);
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
                    } else {
                        setIsPlaying(false);
                        return;
                    }
                }

                setCurrentIndex(nextIndex);
                playSong(playlist[nextIndex]);
            }
        }
    };

    const playPlaylist = (songs: Song[], startIndex: number = 0) => {
        setOriginalPlaylist(songs);
        setCurrentPlaylist(songs);
        setCurrentIndex(startIndex);
        setIsShuffle(false);
        if (songs.length > startIndex) {
            playSong(songs[startIndex]);
        }
    };

    const playNext = () => {
        if (currentPlaylist.length > 0) {
            let nextIndex = currentIndex + 1;

            if (nextIndex >= currentPlaylist.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0;
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
