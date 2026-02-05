from mutagen import File as MutagenFile
from mutagen.id3 import ID3, APIC
from mutagen.mp4 import MP4, MP4Cover


def extract_metadata(file_path):
    audio = MutagenFile(file_path)

    if not audio:
        raise ValueError("Unsupported or corrupted audio file")

    metadata = {}
    
    tags = audio.tags
    if not tags:
        metadata = {
            "title": None,
            "artist": None,
            "album": None,
            "duration": int(audio.info.length),
            "mime_type": audio.mime[0] if audio.mime else None,
            "album_art": None,
        }
        return metadata

    # Title, Artist, Album extraction based on format
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

    metadata["duration"] = int(audio.info.length)
    metadata["mime_type"] = audio.mime[0] if audio.mime else None

    return metadata
