# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# fire-meet-gasoline

A Next.js 16 + React 19 web app for managing events, custody schedules, and transition rules with Supabase backend.

## Project Overview

**fire-meet-gasoline** is a calendar and event management application built with:
- **Frontend**: Next.js 16.2.9, React 19.2.4, TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Key Features

- **Authentication**: Supabase-based auth with middleware protection
- **Dashboard**: Today view, week planning, calendar view
- **Settings**: Event rules, custody schedules, exception management
- **File Upload**: API route for file uploads
- **Responsive Design**: Mobile-friendly with bottom nav + sidebar layouts

## Documentation Map

- **README.md** — human-facing overview, install/quickstart, deployment (French).
- **CLAUDE.md** (this file) — canonical architecture/patterns reference for agents.
- **`.claude/*.md`** — deep-dive guides: `WORKFLOW.md`, `TYPESCRIPT_GUIDE.md`,
  `SUPABASE_GUIDE.md`, `API_CONVENTIONS.md`.
- **`lib/recurrence/README.md`** — mental model + file map for the recurrence
  engine; read before editing anything under `lib/recurrence/`.
- **PRODUCT.md / DESIGN.md / STATES.md** — product intent and UI/design system.
- **`docs/ATTACHMENTS_SETUP.md`** — file upload storage & RLS setup.

Avoid re-describing architecture details across multiple files — extend this
file (or the relevant deep-dive guide) instead of duplicating in README.md.

## Directory Structure

```
├── app/
│   ├── (app)/                    # Protected routes
│   │   ├── today/
│   │   ├── week/
│   │   ├── calendar/
│   │   ├── settings/
│   │   │   ├── rules/            # Recurrence rule management
│   │   │   ├── custody/          # Custody schedule view
│   │   │   ├── events/           # Event definitions
│   │   │   ├── exceptions/       # Exception overrides
│   │   │   ├── children/         # Child/person management
│   │   │   └── activity/         # Activity log
│   │   └── layout.tsx            # App shell
│   ├── (auth)/
│   │   └── login/
│   ├── api/
│   │   ├── upload/
│   │   └── attachments/download/
│   ├── auth/callback/             # OAuth callback
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Tailwind styles
├── components/
│   ├── ui/                   # Radix UI + shadcn primitives
│   ├── layout/                # Sidebar, BottomNav
│   ├── dashboard/              # Dashboard cards
│   ├── calendar/                # Calendar views
│   ├── custody/                  # Custody-specific UI
│   ├── week/                      # Week planning
│   ├── forms/, events/, settings/, state/, shared/, file-upload/
├── lib/
│   ├── actions/               # Server actions: children, custody, events, recurrence, revalidate
│   ├── recurrence/            # Custody scheduling engine — see lib/recurrence/README.md
│   ├── hooks/                 # useEventAttachments, useEventParticipants
│   ├── providers/             # theme-provider, etc.
│   ├── types/                 # Shared TypeScript types
│   ├── supabase/              # client.ts (browser) / server.ts (SSR)
│   └── datetime.ts, timezone.ts, utils.ts
├── supabase/migrations/       # Schema migrations
├── public/                    # Static assets
└── proxy.ts                   # Supabase middleware + auth logic
```

## Development Setup

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values from the Supabase
dashboard (Project Settings > API).

## Code Conventions

- **TypeScript**: Strict mode enabled, path aliases `@/*` map to root
- **Components**: Functional, React 19 with hooks
- **Forms**: React Hook Form + Zod for validation
- **Styling**: Tailwind classes, no CSS modules
- **Database**: Supabase with type-safe client

## Critical Notes

⚠️ **Next.js 16 Breaking Changes**: This version differs from earlier Next.js. Always check `node_modules/next/dist/docs/` for API changes before writing code. Pay attention to deprecation notices.

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |

## File Import Paths

Use `@/` alias for imports from project root (configured in `tsconfig.json`):
```typescript
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client" // browser
import { createClient } from "@/lib/supabase/server" // server / server actions
```

## Architecture & Patterns

### Server Actions
Most data mutations use Next.js server actions (files in `lib/actions/`) with:
- `"use server"` directive at the top of each action file
- Zod validation schemas inline with each action
- `revalidatePath()` to invalidate cached data after mutations
- Direct Supabase client calls (no API routes for CRUD)

Example: `lib/actions/events.ts`, `lib/actions/custody.ts`, `lib/actions/recurrence.ts`

### Recurrence Engine
Complex business logic in `lib/recurrence/` handles custody scheduling with three
pattern types (`weekly_alternating`, `custom_cycle`, `manual`). The engine
(`engine.ts`) expands `RecurrenceRule` into `GeneratedPeriod[]` over a date
range and applies `RecurrenceException` overrides (cancel/move/extend/shorten/add).
**See `lib/recurrence/README.md` for the full mental model and a map of
`availability.ts`/`display.ts`/`labels.ts`/`persist.ts` before editing this
directory.**

### Data Model
Core entities stored in Supabase:
- **Person**: Individuals (e.g., parent/guardian) with color + avatar
- **RecurrenceRule**: Custody schedule template with pattern + timing
- **RecurrenceException**: Overrides to a single occurrence (cancel/move/extend/shorten/add)
- **ChildPresence**: Generated custody period for a person (time-bounded)
- **CustodyTransition**: Pickup/dropoff event with location
- **CalendarEvent**: Shared or individual events with optional attachments

## Database & Auth

- Supabase middleware in `proxy.ts` checks auth on every request via SSR cookies
- Unauthenticated users redirect to `/login`
- Auth callback: `/auth/callback` (OAuth flow redirects here)
- Protected routes: `/(app)/*` (checked by middleware)
- All auth state flows through Supabase session cookies

## Component Library

Radix UI primitives wrapped in shadcn-style components:
- Button, Input, Dialog, Select, Tabs, Toast
- Avatar, Badge, Card, Label, Separator, TextArea
- Sheet (mobile-friendly drawer)
- Custom compound components in `/components/`

## Git & Pull Request Policy

⚠️ **IMPORTANT**: Claude should **NOT create pull requests automatically**. Only create a PR when explicitly requested by the user with commands like:
- "Create a PR"
- "Open a pull request"
- "Make a PR for this"

This policy conserves Vercel credits by avoiding unnecessary deployments for draft changes. Always push code to the branch, then wait for explicit user request before creating a PR.
