from django.core.files.storage import default_storage


def save_temp_file(uploaded_file):
    temp_path = f"tmp/{uploaded_file.name}"

    with default_storage.open(temp_path, "wb+") as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    return temp_path


def move_to_final(temp_path, final_path):
    with default_storage.open(temp_path, "rb") as src:
        default_storage.save(final_path, src)

    default_storage.delete(temp_path)

    return final_path
