# Backend Deployment Guide

This backend runs an Express + Socket.io server and a lightweight scheduler for scheduled stories. It is not suitable for Vercel Serverless. Host it on a persistent Node platform like Render or Railway.

## Requirements
- Node.js (LTS)
- MongoDB Atlas connection string (`MONGO_URI`)
- Environment variables (see `.env.example`)

## Environment Variables
Configure at your host:
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUD_NAME`, `API_KEY`, `API_SECRET` (Cloudinary)
- Optional SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Render/Railway Setup
1. Create a new Web Service from this repo, set **Root Directory** to `backend`.
2. **Start Command**: `node index.js`
3. Add environment variables.
4. Deploy.

`index.js` binds to `process.env.PORT || 8000` and initializes Socket.io + the scheduled story publisher.

## CORS & Cookies
- Middleware sets `credentials: true`. Restrict origins to your Vercel domain if desired.
- If you do cross-site cookies (no proxy), use `SameSite=None; Secure` for auth cookies.

## Health Check
After deploy, open:
- `GET /` → should return a JSON greeting.
- `GET /api/v1/user/me` with cookies to verify auth.
