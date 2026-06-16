# Claude Code Workflow Guide for fire-meet-gasoline

This document provides best practices for working with Claude Code on this Next.js + Supabase project.

## Quick Start

### Development Environment
```bash
# Install dependencies (first time)
npm install

# Start dev server (port 3000)
npm run dev

# In another terminal, run linter
npm run lint

# Build for production check
npm run build
```

### Branch Strategy
- Always work on feature branches: `claude/feature-description`
- Main branch is protected
- Push and create PRs with `git push -u origin <branch-name>`

## Common Tasks

### 1. Adding a New Page/Feature
1. Create route in `app/(app)/feature-name/page.tsx`
2. Add navigation in `components/layout/Sidebar.tsx` and `components/layout/BottomNav.tsx`
3. Create any supporting components in `components/feature-name/`
4. Test with `npm run dev` and `npm run lint`

### 2. Creating a New Component
1. If it's a UI primitive, add to `components/ui/`
2. If it's a feature component, add to `components/{feature}/`
3. Use Radix UI + Tailwind CSS
4. Export from component barrel (index files if present)

### 3. Working with Forms
- Use `react-hook-form` + `zod` for validation
- Example pattern in settings pages
- Always provide clear error messages to users

### 4. Database/Auth Changes
- Update Supabase migrations in `supabase/` directory
- Test auth flow in `proxy.ts` if modifying middleware
- Ensure protected routes are wrapped with `(app)` layout

### 5. Styling
- Use Tailwind CSS classes directly in components
- No CSS modules or styled-components
- Use `cn()` utility (from `clsx`) to merge class names conditionally

## File Organization

### Components
- `components/ui/` - Radix UI wrapped primitives
- `components/layout/` - Sidebar, BottomNav, page layouts
- `components/dashboard/` - Dashboard widgets
- `components/calendar/` - Calendar-specific components
- `components/week/` - Week planning components

### App Routes
- `app/(auth)/` - Public auth routes (login, signup)
- `app/(app)/` - Protected app routes
- `app/api/` - API endpoints
- `app/layout.tsx` - Root layout

### Utilities
- `lib/` - Utility functions, hooks, constants
- `supabase/` - Database migrations and config

## Important Gotchas

### ⚠️ Next.js 16 Breaking Changes
This project uses Next.js 16.2.9, which has significant differences from earlier versions:
- Check `node_modules/next/dist/docs/` for API changes
- Some App Router APIs may differ from documentation
- Pay attention to deprecation warnings in terminal

### Auth Flow
- User redirects in `proxy.ts` middleware
- Unauthenticated → `/login`
- Authenticated + on `/login` → `/today`
- Session management via Supabase cookies

### Environment Variables
Keep `.env.local` in `.gitignore`:
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role (server-only)

## Claude Code CLI Features

### Useful Commands
```bash
# Run with fast mode (faster output)
claude code /fast

# Type check only
npm run build  # Includes type checking

# Clean rebuild
rm -rf .next && npm run build

# See what changed
git diff

# Preview changes before commit
git diff --cached
```

### Code Review
Use `/code-review` skill for comprehensive review:
```bash
/code-review --effort high
```

### Verification
Use `/verify` skill to test changes in the running app:
```bash
/verify
```

## Git Workflow

### Before Pushing
1. Ensure `npm run build` passes (type checking)
2. Run `npm run lint` for style issues
3. Test feature manually with `npm run dev`
4. Review changes: `git diff`

### Committing
- Write clear, descriptive commit messages
- Reference the feature/fix briefly
- Use conventional commits if possible (feat:, fix:, refactor:, etc.)

### Creating PRs
- Include summary of changes
- Link any relevant issues
- Provide test plan for reviewers

## Performance Tips

### Dev Server Hot Reload
- Changes to `.tsx` files reload instantly
- Styles (Tailwind) update without full page refresh
- Use `npm run dev` with file watching enabled

### Type Checking
- TypeScript strict mode is enabled
- ESLint runs automatically (some rules are warnings)
- Fix type errors before pushing

### Build Optimization
- Next.js automatically code-splits pages
- Components are tree-shaken if unused
- CSS is optimized by Tailwind's JIT compiler

## Debugging

### Browser DevTools
- React DevTools extension recommended
- Network tab shows API calls to Supabase
- Console shows auth state and errors

### Next.js Debug Output
- Check terminal for build errors
- Look for TypeScript compilation errors
- ESLint warnings appear during dev

### Supabase Debugging
- Check Supabase dashboard for database state
- Review auth logs in Supabase console
- Check RLS policies if data access fails

## Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

## When to Use Claude Code Skills

| Skill | When to Use |
|-------|-----------|
| `/verify` | Test a UI feature in the running app |
| `/code-review` | Before pushing, check for bugs/improvements |
| `/run` | Start the dev server if needed |
| `/simplify` | Clean up code duplication or inefficiency |
| `/security-review` | Check for security issues before merging |

## Project-Specific Notes

- **User Email**: berger.damien@gmail.com
- **Current Date**: 2026-06-16
- **Next.js Version**: 16.2.9 (with breaking changes - check docs!)
- **Auth Provider**: Supabase with SSR
- **Mobile Support**: Yes (bottom nav + responsive sidebar)

## Related Files

- `CLAUDE.md` - Project overview and conventions
- `AGENTS.md` - Agent-specific rules
- `.claude/settings.json` - Claude Code CLI configuration
- `.claude/WORKFLOW.md` - This file
