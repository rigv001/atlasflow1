# EnterpriseAtlasFlow

This project is a Vite + React single-page app and can be deployed directly to Vercel.

## Vercel deployment

### 1. Import the project

Import this repository into Vercel.

### 2. Build settings

Use these settings if Vercel does not detect them automatically:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### 3. Environment variables

Add these variables in the Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are required by [src/supabase/client.ts](./src/supabase/client.ts).

### 4. SPA routing

This app uses client-side routing with `BrowserRouter`. The included [vercel.json](./vercel.json) rewrites all routes to `index.html` so direct visits to routes like `/reports` or `/admin/settings` work correctly.

## Local verification

```bash
npm install
npm run build
```
