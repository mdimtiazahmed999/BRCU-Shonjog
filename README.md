# Shonjog

Full-stack social app: React + Vite frontend, Express + Socket.io backend, MongoDB Atlas, Cloudinary uploads.

## Deploy Overview
- Frontend: Vercel (project root `frontend`, build `npm run build`, output `dist`).
- Backend: Render/Railway (service root `backend`, start `node index.js`).
- Configure frontend env: `VITE_API_URL`, `VITE_SOCKET_URL`.
- Configure backend env: see `backend/.env.example`.

## Quick Start
```bash
# Frontend dev
cd frontend
npm install
npm run dev

# Backend dev
cd ../backend
npm install
npm run dev
```

## Frontend (Vercel)
- Set env: `VITE_API_URL=https://YOUR-BACKEND/api/v1`, `VITE_SOCKET_URL=https://YOUR-BACKEND`.
- Deploy via Vercel UI or CLI.

## Backend (Render/Railway)
- Set env per `backend/.env.example`.
- Start: `node index.js`.

## Repo Hygiene
- See `.gitignore` for ignored files.
