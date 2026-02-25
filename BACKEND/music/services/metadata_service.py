import os
import shutil
import subprocess
import tempfile

from mutagen import File as MutagenFile
from mutagen.flac import FLAC
from mutagen.id3 import ID3
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
from mutagen.oggopus import OggOpus
from mutagen.oggvorbis import OggVorbis


def strip_metadata(file_path: str):
    """
    Remove ALL metadata from an audio file using ffmpeg.
    Copies audio stream without re-encoding to preserve quality.
    Supports: MP3, MP4, FLAC, OGG Vorbis, OGG Opus, WAV, etc.
    """
    try:
        # Create a temporary file with same extension
        _, ext = os.path.splitext(file_path)
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
            temp_output = tmp_file.name

        try:
            # Use ffmpeg to strip all metadata while preserving audio quality
            # -c:a copy: copy audio codec without re-encoding (preserves quality)
            # -map_metadata -1: remove all metadata
            # -y: overwrite output file
            # -loglevel error: suppress ffmpeg output
            subprocess.run(
                [
                    "ffmpeg",
                    "-i",
                    file_path,
                    "-map",
                    "0:a:0",  # keep only audio stream
                    "-vn",  # drop video/cover streams
                    "-c:a",
                    "copy",  # no re-encode, no quality loss
                    "-map_metadata",
                    "-1",
                    "-y",
                    temp_output,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=300,
            )

            # Replace original file with metadata-stripped version
            shutil.move(temp_output, file_path)

        except subprocess.TimeoutExpired:
            # Cleanup temp file if timeout
            if os.path.exists(temp_output):
                os.unlink(temp_output)
            raise Exception("ffmpeg timeout: file too large or corrupted")
        except FileNotFoundError:
            # ffmpeg not installed, fallback to mutagen-based stripping
            if os.path.exists(temp_output):
                os.unlink(temp_output)
            _strip_metadata_fallback(file_path)
        except Exception:
            # Cleanup temp file on any error
            if os.path.exists(temp_output):
                os.unlink(temp_output)
            # Fallback to mutagen if ffmpeg fails
            _strip_metadata_fallback(file_path)

    except Exception:
        # If everything fails, at least try the basic stripping
        _strip_metadata_fallback(file_path)


def _strip_metadata_fallback(file_path: str):
    """
    Fallback metadata removal using mutagen only (less effective than ffmpeg).
    Used if ffmpeg is not available.
    """
    try:
        audio = MutagenFile(file_path)

        if not audio:
            return  # Not a supported audio file

        # MP3 / ID3
        if isinstance(audio, MP3):
            try:
                if audio.tags:
                    audio.delete(delete_v1=True, delete_v2_version=4)
                audio.save(v2_version=4)
            except Exception:
                pass
            return

        # MP4 / M4A / AAC / ALAC
        if isinstance(audio, MP4):
            try:
                audio.clear()
                audio.save()
            except Exception:
                pass
            return

        # FLAC
        if isinstance(audio, FLAC):
            try:
                audio.clear()
                audio.save()
            except Exception:
                pass
            return

        # OGG Vorbis / Opus
        if isinstance(audio, (OggVorbis, OggOpus)):
            try:
                audio.clear()
                audio.save()
            except Exception:
                pass
            return

        # Fallback: if it has tags, try clearing them
        try:
            if hasattr(audio, "tags") and audio.tags:
                audio.tags.clear()
                audio.save()
        except Exception:
            pass

    except Exception:
        pass


def extract_metadata(file_path):
    try:
        audio = MutagenFile(file_path)

        if not audio:
            # Return defaults if file cannot be read
            return {
                "title": None,
                "artist": None,
                "album": None,
                "duration": 0,
                "mime_type": "application/octet-stream",
                "album_art": None,
            }

        metadata = {}

        # Try to get duration and mime type first (most important)
        try:
            duration = (
                int(audio.info.length)
                if audio.info and hasattr(audio.info, "length")
                else 0
            )
            mime_type = audio.mime[0] if audio.mime else "application/octet-stream"
        except Exception:
            duration = 0
            mime_type = "application/octet-stream"

        # Handle missing tags gracefully
        tags = audio.tags
        if not tags:
            metadata = {
                "title": None,
                "artist": None,
                "album": None,
                "duration": duration,
                "mime_type": mime_type,
                "album_art": None,
            }
            return metadata

        # Title, Artist, Album extraction based on format
        try:
            if isinstance(audio, MP4):
                metadata["title"] = tags.get("\xa9nam", [None])[0]
                metadata["artist"] = tags.get("\xa9ART", [None])[0]
                metadata["album"] = tags.get("\xa9alb", [None])[0]
                # Cover for MP4
                if "covr" in tags:
                    metadata["album_art"] = bytes(tags["covr"][0])
                else:
                    metadata["album_art"] = None
            else:
                # Assume ID3/MP3 or similar
                metadata["title"] = tags.get("TIT2", [None])[0]
                metadata["artist"] = tags.get("TPE1", [None])[0]
                metadata["album"] = tags.get("TALB", [None])[0]

                # In case we used EasyID3 before, let's fall back or try common keys
                if not metadata["title"] and hasattr(tags, "get"):
                    metadata["title"] = tags.get("title", [None])[0]
                    metadata["artist"] = tags.get("artist", [None])[0]
                    metadata["album"] = tags.get("album", [None])[0]

                # Cover for ID3
                metadata["album_art"] = None
                if isinstance(tags, ID3):
                    for key in tags.keys():
                        if key.startswith("APIC"):
                            metadata["album_art"] = tags[key].data
                            break
                elif hasattr(audio, "pictures") and audio.pictures:
                    # FLAC etc
                    metadata["album_art"] = audio.pictures[0].data
        except Exception:
            # If tag extraction fails, just use None values
            metadata["title"] = None
            metadata["artist"] = None
            metadata["album"] = None
            metadata["album_art"] = None

        metadata["duration"] = duration
        metadata["mime_type"] = mime_type

        return metadata
    except Exception:
        # Return safe defaults if anything goes wrong
        return {
            "title": None,
            "artist": None,
            "album": None,
            "duration": 0,
            "mime_type": "application/octet-stream",
            "album_art": None,
        }
