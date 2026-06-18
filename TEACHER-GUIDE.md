# Teacher Guide

This guide is designed for teachers, assessors, and reviewers who want to understand, run, and evaluate AtlasFlow as a working digital product.

## How to use AtlasFlow

### For a teacher, assessor, or reviewer

If you are reviewing this project, the best way to explore it is:

1. Open the deployed application.
2. Create an account or sign in.
3. Land in the client dashboard.
4. Add suppliers manually or import them via CSV.
5. Open the network map to explore supplier relationships.
6. Open simulations to test different carbon-intensity scenarios.
7. Open reports to generate executive-style outputs.
8. Review settings to see the customisable workspace identity.

If an admin account is available, you can also inspect the admin dashboard to see the platform-level oversight experience.

### Typical user journey

A typical workflow inside AtlasFlow looks like this:

1. A user signs in.
2. Their workspace loads supplier data from Supabase.
3. They add or update suppliers.
4. AtlasFlow saves those changes.
5. The network map reveals hotspots and structural patterns.
6. The user tests alternative scenarios.
7. A final report is generated and exported.

## Local setup

### Requirements

Before running the project locally, make sure you have:

- Node.js installed
- npm installed
- a Supabase project with valid credentials

### Environment variables

Create a local `.env` file with the following values:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run the project locally

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

## Deployment on Vercel

AtlasFlow is configured to deploy on Vercel.

Use these settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

You must also add these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

This project uses client-side routing with `BrowserRouter`, and [vercel.json](./vercel.json) rewrites all routes to `index.html` so direct visits to pages such as `/reports` or `/admin/settings` work correctly.

## Educational value

This project demonstrates more than front-end styling. It shows:

- interface design for multiple user roles
- real-world CRUD workflows
- cloud-backed authentication and persistence
- data visualisation through interactive network mapping
- scenario modelling for decision support
- exportable reporting for communication and evidence

In other words, AtlasFlow is not just a concept. It is a usable digital product with a clear audience, a coherent workflow, and a practical purpose.

## Project status

AtlasFlow is currently functional as a deployable web application and can be used as:

- a software engineering project
- a digital product showcase
- a sustainability analytics prototype
- a teacher demonstration piece
- a portfolio project

## Repository structure

```text
src/
  admin/
  components/
  hooks/
  pages/
  services/
  supabase/
  types/
  utils/
public/
supabase/
```

## Final note

AtlasFlow was created to feel like a credible product, not just a classroom mock-up. The interface, workflow, role separation, simulation tooling, and reporting layer were all designed to make the system understandable, demonstrable, and genuinely useful.
