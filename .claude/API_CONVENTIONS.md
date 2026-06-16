# API and Component Conventions

## REST API Routes

### File Structure
```
app/api/
├── upload/
│   └── route.ts
└── auth/
    └── callback/
        └── route.ts
```

### Route Handler Pattern

```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    // Fetch data
    const data = await fetchData(id)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/resource failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Process request
    const result = await createResource(body)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/resource failed:', error)
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
```

### HTTP Status Codes
- `200` - OK (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Response Format
Always return consistent JSON structure:

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

## Component Patterns

### UI Component
```typescript
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
```

### Feature Component with Data Fetching
```typescript
import { ReactNode } from 'react'
import { createServerClient } from '@supabase/ssr'

interface EventListProps {
  userId: string
}

export async function EventList({ userId }: EventListProps) {
  const supabase = createServerClient(/* ... */)

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  if (error) {
    return <div>Error loading events</div>
  }

  if (!events?.length) {
    return <div>No events found</div>
  }

  return (
    <ul>
      {events.map(event => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  )
}
```

### Interactive Client Component
```typescript
'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface AddEventFormProps {
  onSuccess?: () => void
}

export function AddEventForm({ onSuccess }: AddEventFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient(/* ... */)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      try {
        const formData = new FormData(e.currentTarget)
        const title = formData.get('title') as string

        const { error: insertError } = await supabase
          .from('events')
          .insert({ title })

        if (insertError) {
          throw new Error(insertError.message)
        }

        onSuccess?.()
        e.currentTarget.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [supabase, onSuccess]
  )

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        type="text"
        placeholder="Event title"
        required
        disabled={loading}
      />
      {error && <div className="text-red-600">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Event'}
      </button>
    </form>
  )
}
```

## Form Handling

### Basic Form with Validation
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input
          {...register('password')}
          type="password"
          placeholder="Password"
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <button type="submit">Sign In</button>
    </form>
  )
}
```

## Error Handling

### API Error Wrapper
```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
  }
}

export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options)

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      data.error?.message || response.statusText,
      data
    )
  }

  return response.json()
}
```

### Component Error Boundary
```typescript
'use client'

import { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2>Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Utility Functions

### Common Helpers
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

## Testing Patterns

### Unit Test
```typescript
// __tests__/lib/utils.test.ts
import { cn, formatDate } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      const result = cn('px-2', 'px-4')
      expect(result).toBe('px-4')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2026-06-16')
      expect(formatDate(date)).toBe('Jun 16, 2026')
    })
  })
})
```

## Performance Considerations

### Memoization
```typescript
'use client'

import { memo, useMemo, useCallback } from 'react'

// Memoize entire component
const MemoizedList = memo(function List({ items }: Props) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  )
})

// Memoize calculations
const expensiveValue = useMemo(() => {
  return items.filter(item => item.active).map(item => item.id)
}, [items])

// Memoize callbacks
const handleClick = useCallback(() => {
  onItemSelect(itemId)
}, [itemId, onItemSelect])
```

## Export Patterns

### Barrel Exports
```typescript
// components/ui/index.ts
export { Button } from './button'
export { Card } from './card'
export { Dialog } from './dialog'

// Usage
import { Button, Card } from '@/components/ui'
```

## Type Safety in APIs

### Typed Responses
```typescript
interface ApiResponse<T> {
  data: T | null
  error: { message: string; code: string } | null
  timestamp: number
}

async function fetchEvents(): Promise<ApiResponse<Event[]>> {
  const response = await fetch('/api/events')
  return response.json()
}
```

## Documentation

### JSDoc Comments
```typescript
/**
 * Formats a date to a localized string
 * @param date - The date to format
 * @param locale - The locale to use (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale = 'en-US'
): string {
  // implementation
}
```

## Resources

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Patterns](https://react.dev/learn/keeping-components-pure)
- [Error Handling in React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
