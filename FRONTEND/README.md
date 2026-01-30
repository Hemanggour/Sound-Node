# Sound Node - Frontend

A modern, responsive music streaming and management platform built with React 19, TypeScript, and Vite. This is the client-side application for the Sound Node Project.

## 🚀 Teck Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 7](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Routing:** [React Router 7](https://reactrouter.com/)
- **API Client:** [Axios](https://axios-http.com/)
- **Authentication:** JWT (JSON Web Tokens) with `jwt-decode`

## ✨ Features

- **User Authentication:** Secure login and registration flows.
- **Music Library:** Browse and stream music uploaded to the platform.
- **Audio Player:** Full-featured audio player with playback controls.
- **Song Uploads:** Upload your own music files with metadata.
- **User Profiles:** Manage user information and view personal library.
- **Protected Routes:** Unauthorized access prevention for sensitive pages.

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Hemanggour/Sound-Node.git
cd Sound-Node/FRONTEND
```

2. Install dependencies:
```bash
npm install
```

### Configuration

Create a `.env` file in the `FRONTEND` directory by copying the example:

```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your backend API (default is `http://localhost:8000/api`).

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Production Build

To create a production-ready build:

```bash
npm run build
```

## 📂 Project Structure

- `src/components`: Reusable UI components (Navbar, AudioPlayer, etc.)
- `src/pages`: Main application views (HomePage, LoginPage, etc.)
- `src/services`: API communication logic (Auth, Music)
- `src/context`: React context for state management.
- `src/assets`: Static assets like images and icons.
- `src/types`: TypeScript interfaces and types.

## 📜 Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production bundle.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run preview`: Locally previews the production build.
