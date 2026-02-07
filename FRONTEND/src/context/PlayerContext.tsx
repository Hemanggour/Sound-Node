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
    }, [currentSong, currentPlaylist, originalPlaylist, currentIndex]);



    // Restore Audio Source on Mount
    useEffect(() => {
        if (currentSong && audioRef.current && !audioRef.current.src) {
            const streamUrl = musicService.getStreamUrl(currentSong.song_uuid);

            // We need to fetch the JSON url properly if needed, similar to playSong logic
            // But for simplicity, we can reuse playSong logic OR just refactor playSong to distinct "load" and "play".
            // Refactoring is safer.
            // For now, let's just re-run the logic but NOT play.

            const loadSource = async () => {
                try {
                    const response = await fetch(streamUrl, { credentials: 'include' });
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
                    console.error("Error restoring audio:", error);
                }
            };
            loadSource();
        }
    }, []); // Run once on mount

    const playSong = async (song: Song) => {
        if (audioRef.current) {
            const streamUrl = musicService.getStreamUrl(song.song_uuid);

            try {
                const response = await fetch(streamUrl, { credentials: 'include' });
                const contentType = response.headers.get('content-type');

                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    audioRef.current.src = data.url;
                } else {
                    audioRef.current.src = streamUrl;
                }

                audioRef.current.volume = volume;
                await audioRef.current.play();
                setCurrentSong(song);
                setIsPlaying(true);
            } catch (error) {
                console.error("Error playing song:", error);
            }
        }
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
                // Turn Shuffle ON
                // Save current order if not already saved (though we update originalPlaylist on play logic usually)
                // Actually, playPlaylist sets original.
                const shuffled = [...currentPlaylist].sort(() => Math.random() - 0.5);

                // If a song is playing, move it to the start or find it?
                // Better UX: Keep current song playing, shuffle the REST.
                // Simple approach: Shuffle all, find current index.
                if (currentSong) {
                    // Remove current song, shuffle rest, put current at start? 
                    // Or just shuffle and find index. Shuffle and find index is standard.
                    // But standard shuffle often keeps the queue structure relative to played.
                    // Let's do simple shuffle and find index.
                    const index = shuffled.findIndex(s => s.song_uuid === currentSong.song_uuid);
                    if (index !== -1) {
                        // Swap to make sure current index is maintained? No, just set index.
                        setCurrentIndex(index);
                    }
                } else {
                    setCurrentIndex(-1);
                }
                setCurrentPlaylist(shuffled);
            } else {
                // Turn Shuffle OFF
                // Restore original
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
                audioRef.current.play();
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

    const handleEnded = () => {
        if (repeatMode === 'one') {
            if (audioRef.current) {
                audioRef.current.play().catch(console.error);
            }
        } else {
            playNext();
        }
    };

    const playPlaylist = (songs: Song[], startIndex: number = 0) => {
        setOriginalPlaylist(songs);
        setCurrentPlaylist(songs);
        setCurrentIndex(startIndex);
        setIsShuffle(false); // Reset shuffle on new playlist
        // setRepeatMode('off'); // Optional: reset repeat? User preference might be better to keep. Let's keep.
        if (songs.length > startIndex) {
            playSong(songs[startIndex]);
        }
    };

    const playNext = () => {
        if (currentPlaylist.length > 0) {
            let nextIndex = currentIndex + 1;

            // Loop if at end and repeat mode is all
            if (nextIndex >= currentPlaylist.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    setIsPlaying(false);
                    return; // Stop if end of list and no repeat
                }
            }

            setCurrentIndex(nextIndex);
            playSong(currentPlaylist[nextIndex]);
        }
    };

    const playPrevious = () => {
        if (currentPlaylist.length > 0) {
            let prevIndex = currentIndex - 1;

            // Loop if at start and repeat mode is all
            if (prevIndex < 0) {
                if (repeatMode === 'all') {
                    prevIndex = currentPlaylist.length - 1;
                } else {
                    // If standard behavior, maybe go to start of song?
                    // For now just stop or stay at 0.
                    prevIndex = 0;
                }
            }

            setCurrentIndex(prevIndex);
            playSong(currentPlaylist[prevIndex]);
        }
    };

    const removeSong = (songUuid: string) => {
        // 1. Check if the deleted song is the current song
        if (currentSong?.song_uuid === songUuid) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            setCurrentSong(null);
            setIsPlaying(false);
            setProgress(0);
            setDuration(0);
        }

        // 2. Remove from currentPlaylist
        const updatedPlaylist = currentPlaylist.filter(s => s.song_uuid !== songUuid);
        if (updatedPlaylist.length !== currentPlaylist.length) {
            setCurrentPlaylist(updatedPlaylist);

            // Update currentIndex if a song is still playing or if we need to adjust for removal
            if (currentSong && currentSong.song_uuid !== songUuid) {
                const newIndex = updatedPlaylist.findIndex(s => s.song_uuid === currentSong.song_uuid);
                setCurrentIndex(newIndex);
            } else if (currentSong?.song_uuid === songUuid) {
                setCurrentIndex(-1);
            }
        }

        // 3. Remove from originalPlaylist
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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
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
