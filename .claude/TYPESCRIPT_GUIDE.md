# TypeScript Guide for fire-meet-gasoline

## Project Configuration

- **Target**: ES2017
- **Strict Mode**: Enabled
- **Module Resolution**: Bundler (Next.js default)
- **JSX**: react-jsx (React 19)
- **Path Alias**: `@/*` maps to project root

## Common Patterns

### Component Typing

```typescript
import { ReactNode } from 'react'

// Basic component
interface Props {
  children: ReactNode
  className?: string
}

export function MyComponent({ children, className }: Props) {
  return <div className={className}>{children}</div>
}

// With React.FC (less common now, but valid)
import type { FC } from 'react'

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
}

const Button: FC<ButtonProps> = ({ onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}>Click me</button>
)
```

### Form Validation with Zod

```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Define schema
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormData = z.infer<typeof schema>

// Use in component
function LoginForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  )
}
```

### Supabase Client Types

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Server component
import { createServerClient } from '@supabase/ssr'

const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: { /* ... */ }
  }
)

// Query with types
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId)
```

### Event Handlers

```typescript
// Mouse events
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault()
}

// Form events
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  // submit logic
}

// Input changes
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.currentTarget.value
}
```

### Conditional Rendering with Types

```typescript
// Type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj
}

// Discriminated union
type Result = { status: 'success'; data: User } | { status: 'error'; error: string }

function handleResult(result: Result) {
  if (result.status === 'success') {
    // result.data is typed correctly
    return <div>{result.data.name}</div>
  } else {
    // result.error is typed correctly
    return <div>{result.error}</div>
  }
}
```

### Custom Hooks

```typescript
import { useState, useCallback } from 'react'

interface UseToggleReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useToggle(initialState = false): UseToggleReturn {
  const [isOpen, setIsOpen] = useState(initialState)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  return { isOpen, open, close, toggle }
}
```

## Strict Mode Best Practices

### ✅ Do
- Add explicit return types to functions
- Use `const` for components instead of `function`
- Import types with `import type`
- Use discriminated unions for complex states

### ❌ Don't
- Use `any` type (use `unknown` with type guards instead)
- Skip null checks
- Mix `var` with `let`/`const`
- Assume props exist without checking

## Common Issues

### "Cannot find module" errors
- Check path alias in `tsconfig.json`
- Verify file exists at correct path
- Restart dev server if needed

### Unused variables
- Remove if truly unused
- Prefix with `_` if intentionally unused (e.g., `_error`)

### Type mismatch in props
- Check component interface definitions
- Use `Partial<Type>` for optional object props
- Consider extending base types for flexibility

### Date handling
- Use `date-fns` library (already installed)
- Always be explicit about timezones with Supabase

## Useful TypeScript Patterns

### Utility Types
```typescript
// Make all properties optional
type Partial<T> = { [K in keyof T]?: T[K] }

// Make all properties required
type Required<T> = { [K in keyof T]-?: T[K] }

// Extract just the keys
type Keys = keyof User  // 'id' | 'email' | 'name' | ...

// Omit a property
type UserWithoutEmail = Omit<User, 'email'>

// Pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>
```

### Function Overloads
```typescript
function getId(user: User): string
function getId(id: string | number): string
function getId(value: User | string | number): string {
  if (typeof value === 'object') return value.id
  return String(value)
}
```

### Conditional Types
```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>  // true
type B = IsString<42>       // false
```

## Next.js Specific Types

### Page Component
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description',
}

export default function Page() {
  return <div>Content</div>
}
```

### Layout Component
```typescript
import type { ReactNode } from 'react'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### API Routes
```typescript
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  return NextResponse.json({ id })
}
```

## Debugging Tips

### Type Inference
- Hover over variables in IDE to see inferred type
- Use `satisfies` operator to verify types without explicit declaration

### Build Errors
- Run `npm run build` for full type checking
- Check `tsconfig.json` for strict settings
- Review error messages carefully (they're very specific)

### Type Safety
- Use `as const` for literal types
- Always provide explicit types for public APIs
- Use discriminated unions for complex state

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Next.js with TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
