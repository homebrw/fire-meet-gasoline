# Fire Meet Gasoline 🔥

A modern calendar and event management web application built with **Next.js 16**, **React 19**, and **Supabase** for organizing events, custody schedules, and transition rules.

## Features

✨ **Core Capabilities**
- 📅 Full calendar view with event management
- 📋 Weekly planning with drag-and-drop support
- 👥 Custody schedule management
- ⚙️ Customizable event rules and exceptions
- 🔐 Secure authentication with Supabase
- 📱 Responsive mobile-first design
- 🎨 Modern UI with Radix components

## Tech Stack

- **Frontend**: Next.js 16.2.9, React 19.2.4, TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI, shadcn components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Hosting**: Vercel-ready (or self-hosted)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/homebrw/fire-meet-gasoline.git
cd fire-meet-gasoline
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get these values from your [Supabase Dashboard](https://supabase.com/dashboard)

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
fire-meet-gasoline/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Protected routes with auth
│   │   ├── today/                # Today's events view
│   │   ├── week/                 # Weekly planner
│   │   ├── calendar/             # Calendar views
│   │   ├── settings/             # Configuration pages
│   │   │   ├── rules/            # Event rules management
│   │   │   ├── custody/          # Custody schedule setup
│   │   │   ├── events/           # Event definitions
│   │   │   └── exceptions/       # Exception handling
│   │   └── layout.tsx            # App shell (sidebar + nav)
│   ├── (auth)/                   # Auth routes
│   │   └── login/                # Login page
│   ├── api/                      # API routes
│   │   ├── upload/               # File upload endpoint
│   │   └── auth/callback/        # OAuth callback
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Tailwind styles
├── components/
│   ├── ui/                       # Radix UI primitives
│   ├── layout/                   # Sidebar, BottomNav components
│   ├── dashboard/                # Dashboard cards
│   ├── calendar/                 # Calendar components
│   └── week/                     # Week planning components
├── lib/                          # Utilities & helpers
│   └── supabase.ts               # Supabase client config
├── supabase/                     # Database migrations
├── public/                       # Static assets
└── proxy.ts                      # Middleware & auth logic
```

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint linter |

## Development Guide

### Code Style
- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS utilities only (no CSS modules)
- **Imports**: Use `@/` alias for project root imports

### Import Examples
```typescript
import { Button } from "@/components/ui/button"
import { client } from "@/lib/supabase"
import { calculateDates } from "@/lib/utils"
```

### Adding Features
1. Create page in `app/(app)/feature-name/`
2. Add components in `components/feature-name/`
3. Use React Hook Form + Zod for form validation
4. Query Supabase using the provided client

## Authentication

The app uses **Supabase Authentication** with middleware protection:
- Unauthenticated users are redirected to `/login`
- Auth state is managed in `proxy.ts` middleware
- OAuth callback handler at `/auth/callback`
- All `/(app)/*` routes require authentication

## Database

Database schema and migrations are in `supabase/` directory:
- Run migrations via Supabase dashboard or CLI
- Use type-safe Supabase client for queries
- Real-time subscriptions available

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy with Vercel CLI or Git push
```

### Self-Hosted
```bash
npm run build
npm start
```

Ensure environment variables are set in your hosting platform.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Troubleshooting

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

### Supabase connection errors
- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure network connectivity

### Build errors
- Run `npm install` to update dependencies
- Clear `.next` folder: `rm -rf .next`
- Check Node.js version: `node --version`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- 📧 Create an issue on GitHub
- 💬 Check existing issues for solutions
- 📚 Review the [CLAUDE.md](./CLAUDE.md) for technical details

---

Built with ❤️ using Next.js and Supabase
