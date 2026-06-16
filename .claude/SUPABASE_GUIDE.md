# Supabase Integration Guide

## Project Setup

The project uses Supabase for:
- **Authentication** - Supabase Auth with SSR
- **Database** - PostgreSQL with migrations
- **Real-time** - WebSocket subscriptions (if needed)

### Key Files
- `proxy.ts` - Middleware for auth handling
- `supabase/` - Migrations and configuration
- `lib/supabase.ts` (if exists) - Client initialization

## Auth Flow

### Middleware (proxy.ts)
```typescript
// Handles auth across all routes
// Unauthenticated users → /login
// Authenticated users on /login → /today
// Cookies managed automatically
```

### Protected Routes
Routes under `app/(app)/` are protected by middleware:
- `/today` - Dashboard
- `/week` - Week planner
- `/calendar` - Calendar view
- `/settings/*` - Settings pages

### Auth Callback
Route `/auth/callback` handles OAuth redirects from Supabase.

## Client Usage

### Server Components
```typescript
import { createServerClient } from '@supabase/ssr'

async function getData() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { /* ... */ },
        setAll(cookies) { /* ... */ },
      }
    }
  )

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  return data
}
```

### Client Components
```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export function useSupabase() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  return supabase
}
```

## Common Queries

### Select with Filtering
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('start_time', { ascending: true })
  .limit(10)
```

### Insert with Error Handling
```typescript
const { data, error } = await supabase
  .from('events')
  .insert({
    user_id: userId,
    title: 'Event Title',
    start_time: new Date(),
    end_time: new Date(),
  })
  .select()

if (error) {
  console.error('Insert failed:', error.message)
}
```

### Update
```typescript
const { data, error } = await supabase
  .from('events')
  .update({ title: 'Updated Title' })
  .eq('id', eventId)
  .eq('user_id', userId)
  .select()
```

### Delete (soft delete pattern)
```typescript
const { error } = await supabase
  .from('events')
  .update({ deleted_at: new Date() })
  .eq('id', eventId)
  .eq('user_id', userId)
```

## Real-time Subscriptions

### Listen for Changes
```typescript
'use client'

import { useEffect } from 'react'
import { useSupabase } from '@/lib/hooks'

export function useEventUpdates(userId: string) {
  const supabase = useSupabase()

  useEffect(() => {
    const subscription = supabase
      .channel(`events:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Event updated:', payload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, userId])
}
```

## Row Level Security (RLS)

All tables should have RLS enabled:

```sql
-- Example policy for events table
create policy "Users can only access their own events"
on public.events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Common Patterns

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  redirect('/login')
}
```

### Handle Auth Changes
```typescript
'use client'

import { useEffect } from 'react'
import { useSupabase } from '@/lib/hooks'

export function useAuthListener() {
  const supabase = useSupabase()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Redirect to login
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])
}
```

### Error Handling
```typescript
interface SupabaseError {
  message: string
  details?: string
  hint?: string
}

function handleError(error: SupabaseError) {
  if (error.message.includes('unique constraint')) {
    return 'This item already exists'
  }
  if (error.message.includes('permission denied')) {
    return 'You do not have permission to do this'
  }
  return 'An error occurred. Please try again.'
}
```

## Migrations

Migrations live in `supabase/migrations/`:

```bash
# Create migration (if using Supabase CLI)
supabase migration new add_events_table

# Apply locally
supabase migration up
```

### Migration Template
```sql
-- Create events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.events enable row level security;

-- Create policy
create policy "Users can only access their own events"
on public.events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create indexes
create index idx_events_user_id on public.events(user_id);
create index idx_events_start_time on public.events(start_time);
```

## Environment Variables

Required for Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

The `NEXT_PUBLIC_` prefix means these are safe to expose (public Supabase credentials).

## Debugging

### Check Auth State
```typescript
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)
```

### Monitor Database Changes
- Visit Supabase Dashboard
- Check the SQL Editor for direct queries
- View realtime logs in Database section

### RLS Issues
If you get "permission denied":
1. Check RLS policies on the table
2. Verify `auth.uid()` matches `user_id`
3. Test with Supabase dashboard directly

### Connection Issues
- Verify environment variables are set
- Check network tab for API calls to Supabase
- Ensure `.env.local` is in `.gitignore`

## Performance Tips

### Pagination
```typescript
const pageSize = 20
const from = (page - 1) * pageSize

const { data } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId)
  .range(from, from + pageSize - 1)
  .order('start_time', { ascending: false })
```

### Selective Columns
```typescript
// Only fetch needed columns
const { data } = await supabase
  .from('events')
  .select('id, title, start_time')  // Not *
  .eq('user_id', userId)
```

### Batch Inserts
```typescript
const { data } = await supabase
  .from('events')
  .insert([
    { user_id: userId, title: 'Event 1', ... },
    { user_id: userId, title: 'Event 2', ... },
    // ...
  ])
  .select()
```

## Useful Supabase Dashboard Links

After signing in:
- **Project URL**: `https://app.supabase.com/project/[id]`
- **Database**: Tables, migrations, SQL editor
- **Auth**: User management, providers
- **Logs**: Monitor requests and errors

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
