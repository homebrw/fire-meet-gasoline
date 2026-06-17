---
name: Famille Sync
description: Calm, minimal coordination for co-parenting families
colors:
  primary-dark: "#18181b"
  primary-foreground: "#fafafa"
  secondary-surface: "#f4f4f5"
  muted-text: "#71717a"
  destructive: "#ef4444"
  border: "#e4e4e7"
  ring: "#18181b"
  person-damien: "#3b82f6"
  person-ma: "#ec4899"
  person-both-kids: "#06b6d4"
  status-available: "#22c55e"
  status-transition: "#f97316"
  status-unavailable: "#6b7280"
  background-light: "#ffffff"
  background-dark: "#09090b"
rounded:
  md: "4px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-default: 
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  badge-damien:
    backgroundColor: "#dbeafe"
    textColor: "#1e40af"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  badge-ma:
    backgroundColor: "#fce7f3"
    textColor: "#be123c"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  badge-both-kids:
    backgroundColor: "#a5f3fc"
    textColor: "#164e63"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  badge-status-available:
    backgroundColor: "#dcfce7"
    textColor: "#166534"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  badge-status-transition:
    backgroundColor: "#ffedd5"
    textColor: "#c2410c"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.background-light}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Famille Sync

## 1. Overview

**Creative North Star: "The Shared Calendar"**

Famille Sync is a calm, minimal interface for co-parenting families coordinating custody and events. The design prioritizes legibility and trust—every piece of information is easy to find, every action has clear affordance, and nothing competes for attention. The system uses semantic color (person-based: blue, pink, cyan; status-based: green, orange, gray) to make patterns recognizable at a glance, but text and icons always provide the same information so color is never the sole signal. Dark and light modes are equally supported and equally refined.

The design explicitly rejects cute/playful aesthetics, visual chaos, and stock imagery. It avoids overly corporate or clinical coldness while maintaining the precision needed for serious family coordination. This is a tool for adults managing high-stakes logistics; the interface should feel steady, organized, and trustworthy.

**Key Characteristics:**
- **Calm**: Light backgrounds with breathing room; low visual density
- **Minimal**: Data-driven; every element serves information, not decoration
- **Semantic color**: Color carries consistent meaning (person identity, status, intent); text always reinforces color
- **Accessible**: WCAG AA contrast, reduced-motion support, works in dark and light modes equally
- **Trustworthy**: Patterns are consistent and predictable; the system behaves as expected

## 2. Colors

The palette uses three color systems: **Person Identity** (who is involved), **Status** (what's happening), and **UI** (interaction and hierarchy).

### Person Identity

These colors represent individuals in the family system. They appear in badges, avatars, and left-border accents on status cards. The light variant (bg) + dark variant (text) ensures 4.5:1 contrast for all uses.

- **Damien (Blue)** (#3b82f6 primary, #dbeafe background): Person 1 color across the system. Used for Damien's custody periods, availability, and actions.
- **Ma (Pink)** (#ec4899 primary, #fce7f3 background): Person 2 color. Used for Ma's custody periods, availability, and actions.
- **Both Kids (Cyan)** (#06b6d4 primary, #cffafe background): Joint custody color. Used when both people have custody. Distinct from both Damien and Ma for clear visual differentiation.

### Status

These colors indicate states and actions in the schedule.

- **Available (Green)** (#22c55e primary, #dcfce7 background): Both people are free; no children, no blocking events. Indicates opportunity.
- **Transition (Orange)** (#f97316 primary, #ffedd5 background): Pickup or dropoff event. Indicates action needed.
- **Unavailable (Gray)** (#6b7280 primary, #f3f4f6 background): Not available; person has children or blocking event. Neutral/informational.

### UI

- **Primary Dark** (#18181b): Text, icons, and primary interactive elements. Foreground ink.
- **Primary Foreground** (#fafafa): Text on dark backgrounds. Off-white.
- **Secondary Surface** (#f4f4f5): Secondary UI backgrounds, borders, dividers. Light gray.
- **Muted Text** (#71717a): Secondary, de-emphasized text. Medium gray.
- **Destructive** (#ef4444): Dangerous actions (delete, cancel, error). Red.
- **Border** (#e4e4e7): Borders, dividers, strokes.
- **Ring** (#18181b): Focus ring color. Same as primary for consistency.
- **Background** (#ffffff light mode, #09090b dark mode): Page background.
- **Card** (#ffffff light mode, #18181b dark mode): Card and container backgrounds.

### Named Rules

**The Person-First Rule.** Person identity colors (blue, pink, cyan) carry meaning and should never be arbitrary. When a UI element is colored by person identity, use the light + dark pair to ensure legible contrast. Do not tint or desaturate person colors for "elegance"; the contrast is the point.

**The Status-Second Rule.** Status colors (green, orange, gray) are secondary signals. They should always be accompanied by text labels and icons. Never let color carry information alone—e.g., a "Transition" cell must have the text "Transition" or an icon, not just orange.

## 3. Typography

**Display Font:** Geist Sans (system fallback: Arial, Helvetica, sans-serif)
**Mono Font:** Geist Mono (for dates, times, technical content if needed)

**Character:** Clean, geometric, modern. Geist is neutral and efficient; it doesn't impose personality, allowing content to lead. The pairing is minimalist: one sans-serif, one mono. No decorative scripts or complex pairings.

### Hierarchy

- **Display** (font-weight 600–700, size: clamp(1.5rem, 5vw, 2.5rem), line-height 1.2): Page titles, hero headings. Rare; only on dashboard hero or large section openers.
- **Headline** (font-weight 600, size: 1.25rem / 20px, line-height 1.4): Section headings, card titles, major navigation labels.
- **Title** (font-weight 600, size: 1rem / 16px, line-height 1.5): Subheadings, card header titles, form labels. Semantic emphasis through weight, not size.
- **Body** (font-weight 400, size: 0.875rem / 14px, line-height 1.5): Main content, descriptions, form content. Max line length 65–75ch on desktop. Provides the "calm" by being readable and not cramped.
- **Label** (font-weight 500, size: 0.75rem / 12px, line-height 1.5, letter-spacing: 0): UI labels, badges, small callouts. Intentionally small to signal secondary importance.

### Named Rules

**The Weight-Over-Size Rule.** Emphasis within a section is achieved through font-weight (400 → 500 → 600), not size increase. This keeps visual density low and maintains the calm aesthetic.

## 4. Elevation

The system uses **subtle shadows and tonal layering** for depth. Shadows are minimal and serve a functional purpose: distinguishing interactive elements and containers from the background. There is no "floating" or "lifted" aesthetic; elements are grounded.

### Shadow Vocabulary

- **Shadow-SM** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`): Input fields, subtle containers. Light, diffuse. Barely visible.
- **Shadow-MD** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`): Cards at rest, standard containers. Readable but not assertive.

No drop shadows on buttons; hover states use opacity or background shifts instead.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest (no shadow). Shadow-MD appears on cards as a subtle depth cue. Shadows do not grow or animate on hover; state changes use color, opacity, or underline instead. This maintains calm and minimizes motion.

## 5. Components

### Buttons

- **Shape:** Slightly rounded (4px radius) for modern feel without cuteness
- **Primary (Default):** Dark background (#18181b), off-white text (#fafafa), padding 8px 16px (h-9). Hover: opacity-90, no shadow growth.
- **Secondary:** Light gray background (#f4f4f5), dark text (#18181b), padding 8px 16px. Hover: opacity-80.
- **Ghost:** No background; text-only (#18181b). Hover: light gray background (#f4f4f5).
- **Outline:** Transparent background with border (#e4e4e7). Hover: light gray background.
- **Destructive:** Red background (#ef4444), white text (#fafafa). Hover: opacity-90.
- **Link:** Text (#18181b) with underline-offset-4. Hover: underline. No background.

**Focus state:** Ring-2 ring-[var(--color-ring)] (dark ring) appears on all interactive elements. The ring is visible and purposeful, never hidden.

### Badges

Badges carry person identity or status. Shape is fully rounded (9999px radius, pill shape).

- **Damien:** Light blue background (#dbeafe), dark blue text (#1e40af)
- **Ma:** Light pink background (#fce7f3), dark pink text (#be123c)
- **Both Kids:** Light cyan background (#cffafe), dark cyan text (#155e75)
- **Available:** Light green background (#dcfce7), dark green text (#166534)
- **Transition:** Light orange background (#ffedd5), dark orange text (#c2410c)
- **Outline:** No background, border (#e4e4e7), dark text (#18181b)

Padding: 10px 16px (small horizontal, standard vertical). Size is x-small font (text-xs).

### Cards

- **Corner Style:** Extra-large radius (12px) for modern friendliness without cuteness
- **Background:** Card background color (white in light mode, dark-gray in dark mode)
- **Border:** 1px solid (#e4e4e7 light mode, #27272a dark mode)
- **Shadow:** Shadow-MD (subtle depth cue)
- **Internal Padding:** 24px (generous breathing room)
- **Distinctive accent:** Left border stripe (4px, colored by status or person) on key status cards (e.g., TodayStatus, NextAvailableSlot). This accent is intentional and carries meaning—it is never purely decorative.

### Inputs

- **Style:** Transparent background (inherits page bg), 1px border (#e4e4e7), height h-9 (36px), rounded 4px
- **Focus:** Ring-1 ring-[var(--color-ring)] (dark ring), no background change
- **Placeholder text:** Medium gray (#71717a) at 4.5:1 contrast
- **Error / Disabled:** Disabled has opacity-50; errors use red border or red text, never red background alone

### Navigation

**Sidebar (desktop):** Vertical list of nav items. Active state: light gray background (#f4f4f5), dark text (#18181b), medium weight. Hover: background shift. Font size: text-sm (14px). Gap between items: 4px.

**Bottom Nav (mobile):** Icon + label, responsive visibility. Active state: dark text, secondary surface background. Same hover/focus treatment as sidebar.

### Signature Component: Left-Border Status Card

The status card (TodayStatus, NextAvailableSlot) combines a person/status color on the left border (4px stripe, rounded top-left corner to match card radius) with tonal badge and content inside. The border carries visual meaning: green for available, orange for transition, gray for unavailable, person color for custody info. The stripe height matches the card's full height or content height (not just card header). This is a deliberate design pattern, not an anti-pattern in this context, because: (1) the color always has a text label and icon reinforcing it, (2) it's only used on status cards, not generically, (3) it signals high-importance information that co-parents need to scan quickly.

## 6. Do's and Don'ts

### Do:

- **Do use person identity colors consistently** (blue for Damien, pink for Ma, cyan for both). These carry meaning; every person-colored element should represent that person.
- **Do pair every color with text or icon** to reinforce meaning. Never rely on color alone to convey status or person.
- **Do maintain 4.5:1 contrast** on all text. Body text and placeholder text must hit this standard; large text (18px+) needs 3:1 minimum. This is non-negotiable in a tool for high-stakes coordination.
- **Do respect `prefers-reduced-motion`**. Transitions and hover effects should be instant or very brief (100–200ms) and can be disabled entirely for users who opt out.
- **Do use calm spacing** (padding and line-height ≥1.5 on body). Let content breathe; high visual density obscures clarity.
- **Do test in both light and dark modes equally.** Neither is secondary; both are production.

### Don't:

- **Don't use cute or playful language, imagery, or effects.** This is serious family logistics. No mascots, no cartoonish illustrations, no gamification.
- **Don't create visual chaos or bright color overload.** The design is calm and minimal. Accent colors should be rare (≤10% of any screen). The primary palette is neutral + semantic status colors; all else fades.
- **Don't use side-stripe borders (left/right borders >1px) as a generic accent** on every card or list item. This is reserved for high-importance status cards where the border color carries functional meaning. For generic grouping, use full borders, background tints, or icons instead.
- **Don't add stock family imagery or cutesy illustrations.** Serve information with typography and color, not pictures. Avatars (colored circles or initials) are fine; happy-family photos are not.
- **Don't mix font families decoratively.** Stick to Geist Sans (main) and Geist Mono (code/dates). One font pairing keeps the system coherent and minimal.
- **Don't use gradients for decoration** (e.g., gradient text, gradient backgrounds on UI elements). Solid colors are cleaner and more accessible. Gradients can be used functionally (e.g., a smooth color transition on a hero section if it serves the design), but not as a default reflex.
- **Don't shadow-stack or add multiple shadow layers** to "add depth". One subtle shadow per card is enough. More layers add visual noise.
- **Don't change button size or spacing to "balance" layouts.** Use consistent padding and hit the target sizes (h-8, h-9, h-10 for icon/text/lg variants). Resize typography or use layout grid adjustments instead.
