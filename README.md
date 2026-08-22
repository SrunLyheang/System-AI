This is a learning project for me to explore AI systems, workflow design, and AI-assisted product building. This repo is a practical sandbox for understanding how AI can support architecture design, collaboration, and software workflows.

# System AI

System AI is a collaborative system-design platform for turning ideas into architecture diagrams and technical specs.

## What it does

- Create and manage architecture projects
- Work together in a shared real-time canvas
- Generate system designs from natural language prompts
- Import starter templates for common architecture patterns
- Convert the final graph into a Markdown technical specification

## Stack

- Next.js 16 + TypeScript
- Tailwind + shadcn/ui
- Clerk for authentication
- Prisma + PostgreSQL for metadata
- Liveblocks + React Flow for collaboration
- Trigger.dev for background AI workflows
- Vercel Blob for generated artifacts

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Repo structure

- `app/` — app routes and UI
- `components/` — reusable frontend components
- `lib/` — shared infrastructure
- `trigger/` — background AI jobs
- `prisma/` — database schema
