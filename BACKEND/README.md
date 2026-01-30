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

## Project Overview

Sound-Node is a REST API for music management and streaming. It provides features for user authentication, profile management, song uploads, and audio streaming with JWT-based authentication.

## Tech Stack

- **Framework**: Django 5.2.7
- **REST API**: Django REST Framework 3.16.1
- **Authentication**: djangorestframework_simplejwt 5.5.1
- **Database**: PostgreSQL (with psycopg driver)
- **CORS**: django-cors-headers 4.9.0
- **Audio Metadata**: mutagen 1.47.0
- **Image Processing**: Pillow
- **Server**: Gunicorn 23.0.0
- **Environment**: python-dotenv 1.1.1

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Sound-Node
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory with the following variables:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/sound_node
ALLOWED_HOSTS=localhost,127.0.0.1
```

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

Or use the custom management command:
```bash
python manage.py create_superuser
```

## Running the Application

Start the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

## API Documentation

### Base URL
```
http://localhost:8000/api/
```

### Authentication Endpoints

Base Path: `/api/account/`

#### 1. User Registration
- **Endpoint**: `POST /api/account/register/`
- **Description**: Create a new user account
- **Authentication**: Not required
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
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "user": {
        "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "john_doe"
      }
    },
    "message": null,
    "status": 201
  }
  ```
- **Error Response** (400):
  ```json
  {
    "data": [],
    "message": {
      "email": "A user with this email already exists."
    },
    "status": 400
  }
  ```

#### 2. User Login
- **Endpoint**: `POST /api/account/login/`
- **Description**: Authenticate user and obtain JWT tokens
- **Authentication**: Not required
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
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "user": {
        "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "john_doe"
      }
    },
    "message": null,
    "status": 200
  }
  ```
- **Error Responses**:
  - User not found (404):
    ```json
    {
      "data": [],
      "message": {
        "error": "User not found"
      },
      "status": 404
    }
    ```
  - Invalid password (400):
    ```json
    {
      "data": [],
      "message": {
        "error": "Invalid password"
      },
      "status": 400
    }
    ```

#### 3. Refresh Token
- **Endpoint**: `POST /api/account/token/refresh/`
- **Description**: Obtain a new access token using refresh token
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
  ```
- **Sdata": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    },
    "message": null,
    "status": 200
  ```json
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
  ```

#### 4. Change Password
- **Endpoint**: `POST /api/account/change-password/`
- **Description**: Change the authenticated user's password
- **Authentication**: Required (JWT Token)
- **Headers**:
  ```
  Authorization: Bearer <access>
  ```
- **Request Body**:
  ```json
  {
    "old_password": "oldpassword123",
    "new_password": "newpassword456"
  }
  ```data": [],
    "message": {
      "success": "Password changed successfully"
    },
    "status": 200
  }
  ```
- **Error Response** (400):
  ```json
  {
    "data": [],
    "message": {
      "error": "Invalid password"
    },
    "status": 400
    "success": false,
    "message": {

**GET User Profile**
- **Endpoint**: `GET /api/account/profile/`
- **Description**: Retrieve the authenticated user's profile information
- **Authentication**: Required (JWT Token)
- **Headers**:
  ```
  Authorization: Bearer <access>
  ```
- **Success Response** (200 OK):
  ```json
  {
    "data": {
      "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "john_doe"
    },
    "message": null,
    "status": 200
  }
  ```

**UPDATE User Profile**
- **Endpoint**: `PATCH /api/account/profile/`
- **Description**: Update the authenticated user's profile information
- **Authentication**: Required (JWT Token)
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
      "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "new_username"
    },
    "message": null,
    "status": 200
    "success": true,
    "data": {
      "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "new_username"
    }
  }
  ```

### Music Endpoints

Base Path: `/api/`

#### 1. Upload Song
- **Edata": {
      "message": "Song uploaded successfully",
      "song_uuid": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Song Title"
    },
    "message": null,
    "status": 201
  }
  ```
- **Error Response** (400):
  ```json
  {
    "data": [],
    "message": {
      "error": "No file provided"
    },
    "status": 400ated):
  ```json
  {
    "message": "Song uploaded successfully",
    "song_uuid": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Song Title"
  }
  ``` and range request support
- **Error Response** (404):
  ```json
  {
    "data": [],
    "message": {
      "detail": "Not found."
    },
    "status": 404ided"
  }
  ```

#### 2. Stream Song
- **Endpoint**: `GET /api/stream/song/<song_uuid>/`
- **Description**: Stream an audio file by song UUID
- **Authentication**: Not required (currently public)
- **URL Parameters**:
  - `song_uuid`: UUID of the song to stream
- **Success Response** (200 OK):
  - Returns the audio file stream with appropriate MIME type headers
- **Error Response** (404):
  ```json
  {
    "detail": "Not found."
  }
  ```

## Project Structure

```
Sound-Node/
├── manage.py                  # Django management script
├── requirements.txt           # Python dependencies
├── README.md                  # Project documentation
├── project/                   # Main Django project configuration
│   ├── __init__.py
│   ├── settings.py           # Project settings
│   ├── urls.py               # URL routing configuration
│   ├── asgi.py               # ASGI configuration
│   └── wsgi.py               # WSGI configuration
│
├── account/                   # User authentication app
│   ├── models.py             # User model
│   ├── views.py              # Authentication views
│   ├── serializers.py        # User serializers
│   ├── urls.py               # Account routes
│   ├── jwt_utils.py          # JWT utilities
│   ├── admin.py              # Admin configuration
│   └── management/
│       └── commands/
│           └── create_superuser.py
│
├── music/                     # Music management app
│   ├── models.py             # Song, Album, Artist models
│   ├── views.py              # Music views
│   ├── serializers.py        # Music serializers
│   ├── urls.py               # Music routes
│   ├── admin.py              # Admin configuration
│   └── services/             # Business logic
│       ├── upload_service.py # Song upload handling
│       ├── streaming_service.py # Audio streaming
│       ├── storage_service.py # File storage
│       └── metadata_service.py # Metadata extraction
│
├── utils/                     # Utility functions
│   └── response_wrapper.py   # API response formatting
│
├── client/                    # Frontend files
│   └── index.html
│
├── docs/                      # Documentation
│   └── doc.md
│
├── tmp/                       # Temporary files directory
└── songs/                     # Uploaded songs directory
```

## Models

### User Model
- `user_uuid`: Unique identifier (UUID)
- `email`: User email (unique)
- `username`: Display name
- `password`: Hashed password

### Song Model
- `song_uuid`: Unique identifier (UUID)
- `title`: Song title
- `file`: Audio file path
- `artist`: Foreign key to Artist
- `album`: Foreign key to Album (optional)
- `duration`: Duration in seconds
- `size`: File size in bytes
- `mimeType`: MIME type of the file
- `uploadedBy`: User who uploaded the song

### Artist Model
- `artist_uuid`: Unique identifier (UUID)
- `name`: Artist name
- `createdAt`: Creation timestamp

### Album Model
- `album_uuid`: Unique identifier (UUID)
- `artist`: Foreign key to Artist
- `title`: Album title
- `coverImage`: Album cover image
- `releaseYear`: Year of release
- `createdAt`: Creation timestamp

## Usage Examples

### Example: Register and Login

1. **Register a new user**:
```bash
curl -X POST http://localhost:8000/api/account/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "john_doe",
    "password": "securepassword123"
  }'
```

2. **Login**:
```bash
curl -X POST http://localhost:8000/api/account/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }' using the `formatted_response` wrapper:

**Success Response**:
```json
{
  "data": { ... },
  "message": null,
  "status": 200
}
```

**Error Response**:
```json
{
  "data": [],
  "message": { "error": "Error message" },
  "status": 400
}
```

**Response Format Details**:
- `data`: Contains the response payload (array/object). Empty array `[]` for error responses without data.
- `message`: Contains success/error messages. Null for successful requests without messages, or object with error details.
- `status`: HTTP status code matching the response code (200, 201, 400, 404, etc.)
## Error Handling

All API responses follow a consistent format:

**Success Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": { ... }
}
```

## License

This project is open source and available under the MIT License.
