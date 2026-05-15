# Notes App

A multi-user Notes backend REST API — think backend for Google Keep or Apple Notes.

## Stack

- **Node.js + TypeScript** — Express.js
- **Prisma ORM** — PostgreSQL
- **JWT** authentication
- **Zod** request validation

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in values
cp .env.example .env

# 3. Run database migrations
npm run db:migrate

# 4. Start dev server
npm run dev
```

## API

See `GET /openapi.json` for the full OpenAPI 3.0 spec once the server is running.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | — | Register a new user |
| POST | /login | — | Login, receive JWT |
| GET | /notes | Bearer | List all accessible notes |
| GET | /notes/:id | Bearer | Get a specific note |
| POST | /notes | Bearer | Create a note |
| PUT | /notes/:id | Bearer | Update a note |
| DELETE | /notes/:id | Bearer | Delete a note |
| POST | /notes/:id/share | Bearer | Share a note with another user |
| GET | /notes/:id/history | Bearer | View revision history |
| POST | /notes/:id/history/:historyId/restore | Bearer | Restore a past version |
| GET | /search?q= | Bearer | Full-text search across notes |
| GET | /about | — | About this app |
| GET | /openapi.json | — | OpenAPI 3.0 spec |

## Deployment

Deployed on [Render.com](https://render.com). Set `DATABASE_URL`, `JWT_SECRET`, and `PORT` as environment variables, then run `npm run db:deploy` as a pre-deploy command.
