# Claude Code Configuration

This directory contains Claude Code configuration and documentation for the **fire-meet-gasoline** project.

## Quick Navigation

### 📖 Documentation
- **[WORKFLOW.md](./WORKFLOW.md)** - Development workflow, common tasks, and best practices
- **[TYPESCRIPT_GUIDE.md](./TYPESCRIPT_GUIDE.md)** - TypeScript patterns, strict mode, and typing conventions
- **[SUPABASE_GUIDE.md](./SUPABASE_GUIDE.md)** - Authentication, database queries, migrations, and RLS
- **[API_CONVENTIONS.md](./API_CONVENTIONS.md)** - API routes, components, forms, error handling

### ⚙️ Configuration
- **[settings.json](./settings.json)** - Claude Code CLI configuration with allowlist and hooks

### 📋 Project Documentation
- **[../CLAUDE.md](../CLAUDE.md)** - Main project overview
- **[../AGENTS.md](../AGENTS.md)** - Agent-specific rules for Next.js

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start dev server**: `npm run dev`
3. **Run linter**: `npm run lint`
4. **Check types**: `npm run build`

## Key Points

### Tech Stack
- ✅ Next.js 16.2.9 (watch for breaking changes!)
- ✅ React 19.2.4
- ✅ TypeScript 5 (strict mode)
- ✅ Supabase (Auth + Database)
- ✅ Radix UI + Tailwind CSS 4
- ✅ React Hook Form + Zod

### Protected Routes
All routes under `app/(app)/` require authentication:
- `/today` - Dashboard
- `/week` - Week planner
- `/calendar` - Calendar
- `/settings/*` - Settings pages

### Authentication Flow
1. Middleware (`proxy.ts`) validates user session
2. Unauthenticated users redirect to `/login`
3. Authenticated users can access `/(app)` routes
4. Session stored in secure cookies via Supabase SSR

### Development Tips
- Use path alias `@/` for imports
- No CSS modules - use Tailwind directly
- Forms use `react-hook-form` + `zod`
- Database queries via Supabase client

## File Organization

```
.claude/
├── README.md                 # This file
├── settings.json            # Claude Code CLI config
├── WORKFLOW.md              # Dev workflow guide
├── TYPESCRIPT_GUIDE.md       # TypeScript patterns
├── SUPABASE_GUIDE.md        # Supabase integration
└── API_CONVENTIONS.md       # API & component patterns
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check & build |
| `npm run lint` | Lint with ESLint |
| `npm start` | Run production server |
| `git status` | Check changes |
| `git diff` | Review changes |

## Claude Code Skills

These skills are useful for this project:

### `/verify`
Test UI changes in the running app. Use before pushing.

```bash
npm run dev  # First start dev server
/verify      # Then use skill to test feature
```

### `/code-review`
Check code for bugs and improvements.

```bash
/code-review --effort high
```

### `/security-review`
Review changes for security issues.

```bash
/security-review
```

### `/simplify`
Clean up code duplication.

```bash
/simplify
```

### `/run`
Start the dev server (if not running).

```bash
/run
```

## Important Notes

### ⚠️ Next.js 16 Breaking Changes
This project uses Next.js 16.2.9, which differs significantly from earlier versions.
- Always check `node_modules/next/dist/docs/` before writing new code
- Pay attention to deprecation warnings in terminal output
- API signatures may differ from online tutorials

### 🔐 Auth Security
- Never commit `.env.local` to git (it's in `.gitignore`)
- Supabase keys are public (but still handle with care)
- Service role key is sensitive - keep in secrets only
- RLS policies control database access

### 📱 Responsive Design
- Mobile-first approach with Tailwind
- Bottom nav for mobile, sidebar for desktop
- Test on different screen sizes regularly

### 🏗️ Project Structure
- Pages in `app/(app)/` are protected
- Public pages in `app/`
- Auth pages in `app/(auth)/`
- API routes in `app/api/`
- Components in `components/`
- Utilities in `lib/`

## Database

Supabase PostgreSQL with:
- Auth table (managed by Supabase)
- Custom tables for events, rules, schedules, etc.
- RLS policies for access control
- Migrations in `supabase/`

## Environment Setup

Required `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Debugging

### Local Development
- Browser DevTools: Check Network and Console tabs
- Terminal: Watch for TypeScript errors and ESLint warnings
- Supabase Dashboard: Verify data and auth state

### Common Issues
- "Cannot find module" - Check path alias in `tsconfig.json`
- Type errors - Run `npm run build` for full checking
- Auth issues - Verify `.env.local` and Supabase configuration
- Styling issues - Check Tailwind purge settings

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

## Tips for Claude Code Users

1. **Before pushing**: Run `npm run build` and `npm run lint`
2. **Use `/verify`**: Test features before committing
3. **Read guides**: Check relevant `.md` files in this folder
4. **Check types**: TypeScript strict mode catches many issues
5. **Review changes**: Use `git diff` before committing

## Getting Help

### Within This Project
1. Check the relevant guide (WORKFLOW, TYPESCRIPT, SUPABASE, API)
2. Review CLAUDE.md in project root
3. Check AGENTS.md for Next.js specific rules

### Outside This Project
- Claude Code: Type `/help` in Claude Code CLI
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- React: https://react.dev/learn

## Contributing

When adding features:
1. Create a feature branch: `git checkout -b feature/description`
2. Follow code conventions in guides
3. Run `npm run build` and `npm run lint`
4. Use `/verify` to test UI changes
5. Push and create PR
6. Ask for review

## Next Steps

1. Review [WORKFLOW.md](./WORKFLOW.md) for development patterns
2. Check [TYPESCRIPT_GUIDE.md](./TYPESCRIPT_GUIDE.md) for typing
3. Read [SUPABASE_GUIDE.md](./SUPABASE_GUIDE.md) for database
4. Reference [API_CONVENTIONS.md](./API_CONVENTIONS.md) while coding

---

**Happy coding!** 🚀

For more info, see [../CLAUDE.md](../CLAUDE.md) or ask Claude Code with `/help`.
