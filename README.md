# 🎵 Sound-Node

Sound-Node is a modern, full-stack music streaming and management platform. It features a robust **Django REST Framework** backend and a sleek, responsive **React 19** frontend. Designed with scalability and ease of use in mind, it supports multiple audio formats, secure JWT authentication, and seamless media handling.

---

## 🏗️ Project Structure

```text
Sound-Node/
├── BACKEND/             # Django REST Framework API
│   ├── account/         # Authentication & User Management
│   ├── music/           # Song Metadata & Streaming Logic
│   └── project/         # Core Settings & Configuration
├── FRONTEND/            # React 19 + Vite + TypeScript
│   ├── src/components/  # UI Components (Audio Player, Navbar, etc.)
│   ├── src/pages/       # Page Views
│   └── src/services/    # API Interaction
├── nginx/               # Nginx Configuration (Reverse Proxy)
├── docker-compose.yml   # Multi-container Orchestration
└── README.md            # This File
```

---

## 🚀 Getting Started (Docker)

The easiest way to get the entire platform running is using Docker.

### Prerequisites
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Hemanggour/Sound-Node.git
   cd Sound-Node
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env` in the root directory.
   ```bash
   cp .env.example .env
   ```
   - Copy `.env.example` to `.env` in `BACKEND/` directory.
   ```bash
   cp BACKEND/.env.example BACKEND/.env
   ```

   *(Refer to `.env.example` in respective directories for required variables)*

3. **Launch the application**:
```bash
docker-compose up --build
```

4. **Access the platform**:
   - **Frontend**: `http://localhost` (via Nginx)
   - **Backend API**: `http://localhost/api/`
   - **MinIO Console**: `http://localhost:9001`

---

## 🛠️ Manual Setup (Without Docker)

If you prefer to run the components individually for development, please follow the detailed setup guides in their respective directories:

- **Backend Guide**: [BACKEND/README.md](./BACKEND/README.md)
- **Frontend Guide**: [FRONTEND/README.md](./FRONTEND/README.md)

---

## ✨ Why This Project?

This repository is designed to be a high-quality example of a modern full-stack application, making it perfect for open-source contributions:

- **Clean Architecture**: Separation of concerns between API, Client, and Infrastructure.
- **Dockerized Environment**: Consistent development and deployment experience.
- **Modern Tech Stack**: React 19, Django 5, PostgreSQL, and MinIO (S3-compatible storage).
- **Comprehensive Docs**: Each component is well-documented to help new contributors get started quickly.
- **Production Ready**: Includes Nginx configuration, media storage handling, and secure authentication flows.

---

## 🤝 Contributing

We welcome contributions! Whether it's fixing a bug, adding a feature, or improving documentation:

1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
