# <img src="FRONTEND/public/sound-node-logo.svg" width="60" height="60" valign="middle"> Sound-Node

![Django](https://img.shields.io/badge/Django-5.x-green)
![React](https://img.shields.io/badge/React-19-blue)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

A **storage-agnostic, low-latency music streaming platform** built with **Django REST Framework and React**.

Sound-Node is a full-stack media streaming system focused on **performance engineering, scalable storage abstraction, and optimized client playback behavior**.
It is designed to explore real-world backend challenges in audio delivery and streaming optimization.

---

# 🚀 Features

### 🎧 Audio Streaming

* Chunked streaming with HTTP range support
* Optimized first-byte playback performance
* Multi-format audio support
* Background playback compatibility
* Media Session API integration (Play / Pause / Next / Previous)
* Proper lock-screen metadata handling

### 🗂 Storage Abstraction

* Pluggable storage backend

  * Local FileSystem
  * S3-compatible storage (AWS S3 / MinIO)
* Environment-based switching
* Production-ready scalable design

### 🧠 Client Performance Optimization

* Reduced client memory footprint during playback
* Optimized buffering strategy
* Avoided unnecessary re-renders in React
* Efficient audio lifecycle handling

### 🎼 Music Management

* Albums & Artists with structured tracklists
* Playlist creation and management
* Search optimization for GET endpoints
* Media thumbnails and cover images

### 🔐 Secure & Production-Oriented

* JWT-based authentication
* Media upload tracking for consistency in database and storage
* Nginx reverse proxy configuration
* Fully Dockerized stack

---

# ⚡ Streaming Performance Engineering

Sound-Node was optimized to reduce playback startup latency and provide a seamless listening experience.

### 📊 Performance Metrics (Fast 4G Conditions)
**Before Optimization:** ~1–2 seconds

**After Optimization:**
  * At startup: **~500ms**
  * While continuous playback or transition between tracks: **0ms - 10ms**

### 🛠 Key Optimizations

#### 1. Gapless Playback & Instant Transitions
Achieved **0ms - 10ms latency** between songs through a dual-player architecture:
*   **Active/Standby Players**: The system maintains two `<audio>` elements. While the active player is finishing, the standby player pre-buffers the next track.
*   **Predictive Pre-fetching**: The next song begins pre-fetching once the current song reaches 85% completion.
*   **Gapless Switch**: Roles are swapped instantly upon track end, resetting metadata and duration without a full player re-initialization.
*   **Manual Skip Optimization**: If a user manually skips to the next track that is already pre-fetched, the switch happens instantly.

#### 2. Backend Efficiency & Nginx Caching
*   **Consolidated API Responses**: The streaming endpoint returns the signed URL, MIME type, and song metadata in a **single JSON response**, eliminating redundant meta-data fetch calls.
*   **Nginx Reverse Proxy Caching**:
    *   **Keep Connections Open**: `keepalive 32` is used to keep connections open with backend, which reduces connection overhead.
    *   **Static Assets (Frontend build)**: Cached for **30-365 days** with `immutable` and `max-age` headers.
    *   **Buffering Control**: `proxy_buffering` is disabled for streaming endpoints to ensure real-time chunk delivery.
*   **FFmpeg Metadata Stripping**: Song files are processed on upload to strip all non-essential ID3/APIC tags using the `-map_metadata -1` flag with `-c:a copy` to preserve quality.
    *   **The Problem**: Large embedded artwork and metadata often occupy the first few chunks of an audio file. In a throttled environment (e.g., Fast 4G), this can cause a **1-2 second delay** before the first audio frame is even reached by the browser.
    *   **The Solution**: By stripping these tags, the initial chunks contain actual audio data almost immediately. This reduces the **Time to First Playback** to a consistent **~500ms**, while also slightly reducing the storage footprint.

#### 3. Client-Side Resilience
*   **Native Looping**: "Repeat One" mode reuses the active player's buffer for instant replay.
*   **Smart Metadata Caching**: Frontend maintains a local cache of song metadata to prevent API roundtrips during navigation and queue management.
*   **Abort Signal Handling**: In-flight fetch requests are aborted when the song changes, freeing up connection slots and reducing bandwidth waste.

---

# 🏗 Architecture Overview

<p align="center">
  <img src="docs/assets/Sound-Node-Arch.svg"
       alt="Sound-Node Architecture Diagram"
       width="100%"/>
</p>
<p align="center"><em>High-level system architecture of Sound-Node</em></p>

Sound-Node follows a **reverse-proxy–based, storage-agnostic architecture** designed for secure and scalable media delivery.

## 🔄 Media Request Flow

1. **Client → Nginx**

   * All traffic passes through Nginx (reverse proxy).
   * Static frontend assets are served directly.
   * API requests are proxied to the backend.

2. **Authentication & Metadata**

   * The backend validates the request.
   * Metadata is fetched from PostgreSQL.

3. **Signed URL Generation (S3 Mode)**

   * If S3 storage is enabled, the backend generates a **time-limited signed URL**.
   * This ensures secure object access without exposing the bucket publicly.

4. **Media Delivery**

   * The client performs a `GET` request using the signed URL.
   * Nginx proxies the request to S3-compatible storage.
   * If Local storage mode is enabled, media is served from the local filesystem instead.

---

## 🧠 Architectural Principles

* **Storage Abstraction**
  Media storage can switch between Local FS and S3-compatible storage via environment configuration without changing business logic.

* **Backend-Controlled Authorization**
  Clients never access storage directly without backend-issued authorization.

* **Efficient Media Delivery**
  Large media files are not streamed through the backend, reducing server bandwidth load.

* **Separation of Concerns**

  * Nginx → Traffic routing & static serving
  * Backend → Authentication, business logic, signed URL generation
  * Database → Relational metadata
  * Storage → Media object persistence

---

## Project Structure

```
Sound-Node/
├── BACKEND/              # Django REST Framework API
│   ├── account/          # Authentication & User Management
│   ├── music/            # Streaming, Metadata & Media Logic
│   └── project/          # Core Configuration
├── FRONTEND/             # React 19 + Vite + TypeScript
│   ├── components/       # Audio Player & UI Modules
│   ├── pages/            # Views
│   └── services/         # API Layer
├── nginx/                # Reverse Proxy Configuration
├── docker-compose.yml    # Container Orchestration
└── README.md
```

---

# 🧰 Tech Stack

## Backend

* Django 5
* Django REST Framework
* PostgreSQL
* MinIO / AWS S3
* JWT Authentication

## Frontend

* React 19
* Vite
* TypeScript
* Media Session API

## Infrastructure

* Docker
* Docker Compose
* Nginx Reverse Proxy

---

# ⚙️ Environment Configuration

Copy the environment templates:

```bash
cp .env.example .env
cp BACKEND/.env.example BACKEND/.env
```

### Storage Backend Selection

```env
STORAGE_BACKEND=local
```

or

```env
STORAGE_BACKEND=s3
```

The storage system can be switched without modifying application logic.

---

# 🐳 Quick Start (Docker)

## Prerequisites

* Docker
* Docker Compose

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/Hemanggour/Sound-Node.git
cd Sound-Node
```

## 2️⃣ Configure Environment

```bash
cp .env.example .env
cp BACKEND/.env.example BACKEND/.env
```

Adjust environment variables as needed.

## 3️⃣ Launch the Application

```bash
docker-compose up --build
```

## 4️⃣ Access Services

* Frontend: [http://localhost](http://localhost)
* Backend API: [http://localhost/api/](http://localhost/api/)
* MinIO Console: [http://localhost:9001](http://localhost:9001)

---

# 🤝 Contributing

Contributions are welcome.

Performance improvements, architectural suggestions, and refactoring ideas are especially appreciated.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## Notice

This license applies only to the source code.
Music, media files, and third-party assets are not covered under this license.

---

## Third-Party Dependencies

This project uses:

- FFmpeg (LGPL licensed)

These tools are subject to their respective licenses.

---

# 👨‍💻 Author

**Hemang Gour**

GitHub: [https://github.com/Hemanggour](https://github.com/Hemanggour)
