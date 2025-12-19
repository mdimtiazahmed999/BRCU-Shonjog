# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deployment (Vercel)

This frontend is ready for Vercel. It expects two environment variables to point to your backend:

- `VITE_API_URL`: The base API URL (e.g. `https://your-backend.example.com/api/v1`)
- `VITE_SOCKET_URL`: The Socket.io server URL (e.g. `https://your-backend.example.com`)

Steps:

1. Create a new Vercel project and select the repo.
2. Configure project root as `frontend`.
3. Build Command: `npm run build` — Output Directory: `dist`.
4. Add env vars in Vercel Project → Settings → Environment Variables.
5. Deploy.

Optional: If you deploy the backend under a different domain and want same-origin requests from the frontend, you can set up Vercel rewrites to proxy `/api/*` to your backend. Alternatively, keep using `VITE_API_URL` directly.

## Environment Variables

Copy `.env.example` to `.env` and set the variables locally:

```
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
```

When deploying, set these in Vercel instead of using a local `.env`.
