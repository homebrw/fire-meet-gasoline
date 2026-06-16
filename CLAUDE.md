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

## Directory Structure

```
├── app/                      # Next.js app directory
│   ├── (app)/               # Protected routes
│   │   ├── today/
│   │   ├── week/
│   │   ├── calendar/
│   │   ├── settings/        # Rules, custody, events, exceptions
│   │   └── layout.tsx       # App shell
│   ├── (auth)/              # Auth routes
│   │   └── login/
│   ├── api/                 # API routes
│   │   ├── upload/
│   │   └── auth/callback/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Tailwind styles
├── components/
│   ├── ui/                  # Radix UI + shadcn primitives
│   ├── layout/              # Sidebar, BottomNav
│   ├── dashboard/           # Dashboard cards
│   ├── calendar/            # Calendar views
│   └── week/                # Week planning
├── lib/                     # Utilities
├── supabase/                # Supabase migrations & config
├── public/                  # Static assets
└── proxy.ts                 # Supabase middleware + auth logic
```

## Development Setup

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

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
import { client } from "@/lib/supabase"
```

## Database & Auth

- Supabase SSR library handles auth in middleware (`proxy.ts`)
- Unauthenticated users redirect to `/login`
- Auth callback: `/auth/callback`
- Protected routes: `/(app)/*`

## Component Library

Radix UI primitives wrapped in shadcn-style components:
- Button, Input, Dialog, Select, Tabs, Toast
- Avatar, Badge, Card, Label, Separator, TextArea
- Sheet (mobile-friendly drawer)
- Custom compound components in `/components/`
