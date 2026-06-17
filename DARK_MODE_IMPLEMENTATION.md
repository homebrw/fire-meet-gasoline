# Dark Mode Implementation & Debugging Guide

## Problem Statement
The dark mode toggle button appeared in the UI but clicking it had no effect on the application's appearance. The user confirmed multiple times that the toggle was "useless" and non-functional despite various fix attempts.

## Root Cause Analysis

The issue had **three layers** that needed fixing:

### 1. Context Provider Gate (First Issue)
**Problem**: The `ThemeProvider` used a `mounted` state gate that delayed context availability until after hydration, causing the toggle button to receive a no-op `toggleTheme` function.

**Symptom**: Button visible but unresponsive, especially on first render.

**Fix**: Removed the `mounted` gate and provided context immediately. The context now has an initial theme value ("light") that gets updated via `useLayoutEffect` without blocking access.

```typescript
// BEFORE: gated behind mounted
const [mounted, setMounted] = useState(false);
// ... only provided context if mounted

// AFTER: always available
const [theme, setTheme] = useState<Theme>("light");
useLayoutEffect(() => {
  // Initialize theme without blocking context
  const savedTheme = localStorage.getItem("theme") as Theme | null;
  const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
  setTheme(initialTheme);
  applyTheme(initialTheme);
}, []);
```

### 2. CSS Variable Cascade (Main Issue)
**Problem**: CSS variables weren't cascading properly between light and dark modes. Using `@theme inline` in Tailwind 4 doesn't cascade CSS variables correctly when the DOM class changes.

**Symptom**: User reported: "On crame des tokens dans le vide, le clic sur le toggle n'a toujours aucun impact sur l'affichage" (We're wasting tokens, clicking the toggle has no impact on display).

**Root Cause**: The `@theme inline` directive in `globals.css` didn't properly set up CSS variable rules that would cascade when the `dark` class was added/removed from `<html>`.

**Fix**: Restructure `globals.css` to use `@layer base` with proper CSS variable declarations:

```css
@import "tailwindcss";

@layer base {
  :root {
    --color-background: #ffffff;
    --color-foreground: #09090b;
    /* ... light mode variables ... */
  }

  html.dark {
    --color-background: #09090b;
    --color-foreground: #fafafa;
    /* ... dark mode variables ... */
  }
}
```

**Why this works**: 
- `:root` selector has universal specificity for the base state
- `html.dark` selector has higher specificity (element + class) and overrides `:root` when the class is present
- `@layer base` ensures this sits in Tailwind's base layer, maintaining proper cascade order
- CSS variables now properly cascade when the `dark` class is toggled on `<html>`

### 3. Tailwind Config (Configuration Issue)
**Problem**: Tailwind CSS 4 needs explicit configuration to recognize class-based dark mode switching.

**Fix**: Create `tailwind.config.js` with `darkMode: 'class'`:

```javascript
/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
```

**Why needed**: Tells Tailwind to listen for the `dark` class on `<html>` and apply dark mode styles accordingly, rather than using media queries.

## How It All Works Together

```
User clicks ThemeToggle button
  ↓
useTheme() hook returns toggleTheme function (no gate)
  ↓
toggleTheme() → applyTheme(newTheme)
  ↓
applyTheme():
  - Adds/removes "dark" class on <html>
  - Saves theme to localStorage
  - Triggers React state update
  ↓
CSS cascade happens:
  - If "dark" class added: html.dark rule takes precedence
  - CSS variables update (--color-background, --color-foreground, etc.)
  - bg-[var(--color-*)] classes now use dark values
  ↓
Tailwind recognizes dark class via darkMode: 'class' config
  ↓
Component re-renders with new theme
```

## Key Learning: CSS Variable Cascade in Tailwind 4

The critical insight: **Tailwind 4 requires proper `@layer` directives for CSS variables to cascade correctly.**

- ❌ `@theme inline { ... }` - Does NOT cascade properly
- ✅ `@layer base { :root { ... } html.dark { ... } }` - Cascades correctly

The cascade works because:
1. `:root` applies variables to all elements
2. `html.dark` selector (element + class) has higher specificity
3. CSS variable lookup follows the normal cascade rules
4. When `dark` class is on `<html>`, the more-specific `html.dark` rule wins

## Implementation Checklist

- [x] Create `tailwind.config.js` with `darkMode: 'class'`
- [x] Update `app/globals.css` to use `@layer base` with `:root` and `html.dark`
- [x] Remove mounted gate from `ThemeProvider`
- [x] Use `useLayoutEffect` for synchronous theme initialization
- [x] Add `ThemeToggle` component to login page header
- [x] Test localStorage persistence
- [x] Test system preference detection (prefers-color-scheme)
- [x] Verify CSS cascade on toggle

## Testing Notes

To verify dark mode works:
1. Visit login page → toggle appears in top-right
2. Click toggle → page switches between light/dark
3. Refresh page → theme persists (localStorage)
4. Clear localStorage → system preference (prefers-color-scheme) is used
5. After login → toggle continues to work throughout app

## Files Modified

- `app/globals.css` - Fixed CSS variable cascade
- `lib/providers/theme-provider.tsx` - Removed context gate
- `components/ui/theme-toggle.tsx` - Simplified, removed mounted gate
- `app/(auth)/login/page.tsx` - Added ThemeToggle to header
- `tailwind.config.js` - Created new file with dark mode config

## Future Considerations

- The dark mode now works via CSS variables and class toggling
- All colors are defined in `globals.css` under `:root` and `html.dark`
- To add new themed colors, add to both `:root` and `html.dark` rules
- The approach is performant: single DOM mutation (class toggle) triggers CSS cascade, no JavaScript color manipulation needed
