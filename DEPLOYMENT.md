# Deployment

The root application is split between a Vercel static frontend and a Render
Node.js API. The `client` and `server` directories are not used by this setup.

## Render API

1. Create a Render Blueprint from this repository using `render.yaml`, or create
   a Node web service with the repository root as its root directory.
2. Set `ADDIS_API_KEY` in the Render service's environment to the API key from
   Addis AI. Do not put the real key in this repository.
3. Confirm the service passes its `/healthz` health check and note its public
   hostname, such as `text-to-speech-api.onrender.com`.

The Blueprint uses `npm ci` to build and `npm start` to run the API. Render
provides the `PORT` value at runtime.

## Vercel frontend

1. Import the same repository into Vercel with the repository root as the root
   directory. The Vercel configuration builds the root Vite app into `dist`.
2. Add `RENDER_BACKEND_URL` to the Vercel project's Production, Preview, and
   Development environments. Set its value to the Render hostname only, with
   no protocol or trailing slash (for example,
   `text-to-speech-api.onrender.com`).
3. Redeploy after setting the environment variable.

Vercel serves the frontend and proxies `/api/*` to Render, so browser requests
remain same-origin and the Addis AI key stays on the backend.
