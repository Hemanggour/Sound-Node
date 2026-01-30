from mutagen import File as MutagenFile


def extract_metadata(file_path):
    audio = MutagenFile(file_path, easy=True)

    if not audio:
        raise ValueError("Unsupported or corrupted audio file")

    metadata = {}

    metadata["title"] = audio.get("title", [None])[0]

    metadata["artist"] = audio.get("artist", [None])[0]

    metadata["album"] = audio.get("album", [None])[0]

    metadata["duration"] = int(audio.info.length)
    metadata["mimeType"] = audio.mime[0] if audio.mime else None

    return metadata
