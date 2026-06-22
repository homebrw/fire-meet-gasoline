# 🚀 Quick Start Guide

Get up and running with fire-meet-gasoline in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account and project URL
- Claude Code CLI (optional but recommended)

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/homebrw/fire-meet-gasoline
cd fire-meet-gasoline

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

## Environment Variables

See `.env.example` for the required variables. Get the values from your
Supabase project settings (Project Settings > API).

## Development

```bash
# Start dev server (port 3000)
npm run dev

# Open http://localhost:3000 in your browser
# You'll be redirected to /login if not authenticated
```

## First Steps

1. **Sign up** - Create an account via Supabase auth
2. **Explore** - Visit `/today` for the dashboard
3. **Configure** - Go to `/settings` to set up rules, schedules, etc.
4. **Plan** - Use `/week` to plan your week
5. **Calendar** - Check `/calendar` for the full month view

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | Sign in/up |
| `/today` | Dashboard (today's view) |
| `/week` | Week planner |
| `/calendar` | Calendar view |
| `/settings` | Configuration hub |
| `/settings/rules` | Event rules |
| `/settings/custody` | Custody schedules |
| `/settings/events` | Event management |
| `/settings/exceptions` | Exception handling |

## Common Commands

```bash
# Type checking and building
npm run build

# Linting
npm run lint

# Production build
npm run build
npm start
```

## With Claude Code

```bash
# Start Claude Code
claude code

# Essential commands
/run                    # Start dev server
/verify                 # Test your changes
/code-review            # Check code quality
/help                   # Get help
```

## Project Structure

```
fire-meet-gasoline/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected routes
│   ├── (auth)/            # Auth routes
│   ├── api/               # API endpoints
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI primitives
│   ├── layout/           # Layout components
│   └── {feature}/        # Feature components
├── lib/                   # Utilities and helpers
├── supabase/             # Database migrations
├── .claude/              # Claude Code config
└── public/               # Static assets
```

## Key Technologies

- **Next.js 16.2.9** - React framework
- **React 19.2.4** - UI library
- **TypeScript 5** - Type safety
- **Supabase** - Auth & database
- **Radix UI** - Component library
- **Tailwind CSS 4** - Styling
- **React Hook Form + Zod** - Form handling

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Project overview
- **[.claude/README.md](./.claude/README.md)** - Claude Code setup
- **[.claude/WORKFLOW.md](./.claude/WORKFLOW.md)** - Development workflow
- **[.claude/TYPESCRIPT_GUIDE.md](./.claude/TYPESCRIPT_GUIDE.md)** - TypeScript patterns
- **[.claude/SUPABASE_GUIDE.md](./.claude/SUPABASE_GUIDE.md)** - Database & auth
- **[.claude/API_CONVENTIONS.md](./.claude/API_CONVENTIONS.md)** - API patterns
- **[.claude/CLAUDE_CODE_COMMANDS.md](./.claude/CLAUDE_CODE_COMMANDS.md)** - CLI reference

## Troubleshooting

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Environment variables not loading
- Make sure `.env.local` exists in project root
- Restart dev server after changing `.env.local`
- Check that keys are valid from Supabase dashboard

### Database connection errors
- Verify Supabase credentials in `.env.local`
- Check Supabase project is running
- Ensure RLS policies allow your auth user

### Type errors on build
- Run `npm run build` to see full error details
- Check TypeScript configuration in `tsconfig.json`
- Ensure all dependencies are installed: `npm install`

## Next Steps

1. **Create a feature** - Check [.claude/WORKFLOW.md](./.claude/WORKFLOW.md)
2. **Learn TypeScript** - Read [.claude/TYPESCRIPT_GUIDE.md](./.claude/TYPESCRIPT_GUIDE.md)
3. **Understand auth** - See [.claude/SUPABASE_GUIDE.md](./.claude/SUPABASE_GUIDE.md)
4. **Use Claude Code** - Review [.claude/CLAUDE_CODE_COMMANDS.md](./.claude/CLAUDE_CODE_COMMANDS.md)

## Getting Help

- **Project questions** - Check CLAUDE.md and guides in `.claude/`
- **Next.js docs** - https://nextjs.org/docs
- **Supabase docs** - https://supabase.com/docs
- **React docs** - https://react.dev
- **TypeScript docs** - https://www.typescriptlang.org/docs

## Development Tips

✅ **Do**
- Use `/verify` to test UI changes
- Run `npm run build` before pushing
- Check types with `npm run build`
- Follow conventions in CLAUDE.md

❌ **Don't**
- Commit `.env.local` to git (it's in `.gitignore`)
- Skip linting before push
- Use `any` type in TypeScript
- Hard-code database credentials

## License

[Your License Here]

## Contributors

- Built with ❤️ using Claude Code
- Maintained by the team

---

**Ready to code?** Start with `npm run dev` and open http://localhost:3000!

Questions? Check the guides in `.claude/` or read CLAUDE.md for more info. 🚀
