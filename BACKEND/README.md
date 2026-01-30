# Sound-Node

A Django REST Framework-based music streaming and management API that allows users to upload, stream, and manage songs.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Music Endpoints](#music-endpoints)
- [Project Structure](#project-structure)
- [Response Format](#response-format)
- [Models](#models)

## Project Overview

Sound-Node is a REST API for music management and streaming. It provides features for user authentication, profile management, song uploads, and audio streaming with JWT-based authentication (via cookies or headers).

## Tech Stack

- **Framework**: Django 5.2.7
- **REST API**: Django REST Framework 3.16.1
- **Authentication**: djangorestframework-simplejwt 5.5.1 (Custom Cookie-based)
- **Database**: PostgreSQL
- **CORS**: django-cors-headers
- **Audio Metadata**: mutagen
- **Image Processing**: Pillow
- **Server**: Gunicorn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Sound-Node-Project/BACKEND
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory (see `.env.example`).

## Configuration

- **Settings File**: `project/settings.py`
- **WSGI Config**: `project/wsgi.py`
- **ASGI Config**: `project/asgi.py`

### Database Setup

1. Run migrations:
```bash
python manage.py migrate
```

2. Create a superuser:
```bash
python manage.py createsuperuser
```

Or use the custom management command (This uses `SUPERUSER_USERNAME`, `SUPERUSER_EMAIL`, and `SUPERUSER_PASSWORD` environment variables):
```bash
python manage.py create_superuser
```

## Running the Application

Start the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

---

## API Documentation

### Base URL
```
http://localhost:8000/api/
```

### Authentication Endpoints

Base Path: `/api/account/`

#### 1. User Registration
- **Endpoint**: `POST /api/account/register/`
- **Description**: Create a new user account. On success, sets `access` and `refresh` tokens as HTTP-only cookies.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "username": "john_doe",
    "password": "securepassword123"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "data": {
      "tokens": {
        "refresh": "eyJ0eXAi... (Refresh Token)",
        "access": "eyJ0eXAi... (Access Token)"
      }
    },
    "message": null,
    "status": 201
  }
  ```

#### 2. User Login
- **Endpoint**: `POST /api/account/login/`
- **Description**: Authenticate user and obtain JWT tokens. Sets `access` and `refresh` tokens as HTTP-only cookies.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "data": {
      "tokens": {
        "refresh": "eyJ0eXAi...",
        "access": "eyJ0eXAi..."
      }
    },
    "message": null,
    "status": 200
  }
  ```

#### 3. Refresh Token
- **Endpoint**: `POST /api/account/token/refresh/`
- **Description**: Obtain a new access token using refresh token.
- **Request Body**:
  ```json
  {
    "refresh": "eyJ0eXAi..."
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "access": "eyJ0eXAi..."
  }
  ```

#### 4. Change Password
- **Endpoint**: `POST /api/account/change-password/`
- **Description**: Change the authenticated user's password.
- **Authentication**: Required (Cookie: `access` or Header: `Authorization: Bearer <access>`)
- **Request Body**:
  ```json
  {
    "old_password": "oldpassword123",
    "new_password": "newpassword456"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "data": [],
    "message": {
      "success": "Password changed successfully"
    },
    "status": 200
  }
  ```

#### 5. Get User Profile
- **Endpoint**: `GET /api/account/profile/`
- **Description**: Retrieve the authenticated user's profile information.
- **Authentication**: Required
- **Success Response** (200 OK):
  ```json
  {
    "data": {
      "id": 1,
      "email": "user@example.com",
      "username": "john_doe"
    },
    "message": null,
    "status": 200
  }
  ```

#### 6. Update User Profile
- **Endpoint**: `PATCH /api/account/profile/`
- **Description**: Update the authenticated user's profile information.
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "username": "new_username"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "data": {
      "id": 1,
      "email": "user@example.com",
      "username": "new_username"
    },
    "message": null,
    "status": 200
  }
  ```

---

### Music Endpoints

Base Path: `/api/`

#### 1. List Songs
- **Endpoint**: `GET /api/songs/`
- **Description**: Retrieve a list of songs uploaded by the authenticated user.
- **Authentication**: Required
- **Success Response** (200 OK):
  ```json
  {
    "data": [
      {
        "song_uuid": "...",
        "title": "Song Title",
        "file": "/media/songs/song.mp3",
        "artist": "...",
        "duration": 180,
        "size": 5000000,
        "mimeType": "audio/mpeg"
      }
    ],
    "message": null,
    "status": 200
  }
  ```

#### 2. Upload Song
- **Endpoint**: `POST /api/song/upload/`
- **Description**: Upload a new audio file.
- **Authentication**: Required
- **Request Body** (Multipart Form Data):
  - `file`: Audio file (mp3, wav, etc.)
- **Success Response** (201 Created):
  ```json
  {
    "data": {
      "song_uuid": "...",
      "title": "Uploaded Song Title",
      "file": "/media/songs/song.mp3",
      "artist": null,
      "album": null,
      "duration": 210,
      "size": 4200000,
      "mimeType": "audio/mpeg"
    },
    "message": "Song uploaded successfully",
    "status": 201
  }
  ```

#### 3. Stream Song
- **Endpoint**: `GET /api/song/stream/<uuid:song_uuid>/`
- **Description**: Stream an audio file by its UUID. Supports range requests for seeking.
- **Authentication**: Not required
- **Success Response** (200 OK or 206 Partial Content):
  - Returns the audio file stream.

---

## Project Structure

```
BACKEND/
├── account/            # User authentication and profile app
├── music/              # Song management and streaming app
├── project/            # Django project configuration
├── utils/              # Common utilities (response wrappers)
├── songs/              # Locally uploaded media files (songs, covers)
├── manage.py           # Django management script
├── requirements.txt    # Python dependencies
└── README.md           # This documentation
```

## Response Format

All API responses follow a consistent wrapped format:

**Success Response**:
```json
{
  "data": { ... } or [ ... ],
  "message": "Optional message string or object",
  "status": 200
}
```

**Error Response**:
```json
{
  "data": [],
  "message": { "error": "Error details" },
  "status": 400
}
```

---

## Models

### User
- `email`: User's unique email address.
- `username`: Display name.

### Song
- `song_uuid`: Unique identifier for the song.
- `title`: Title extracted from metadata or filename.
- `file`: Path to the stored audio file.
- `duration`: In seconds.
- `size`: In bytes.
- `mimeType`: The file's MIME type (e.g., `audio/mpeg`).

---

## License

This project is open source and available under the MIT License.
