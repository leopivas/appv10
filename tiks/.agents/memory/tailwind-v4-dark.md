---
name: Tailwind v4 dark mode
description: How to correctly configure dark-only mode in Tailwind v4 with the custom variant approach
---

# Tailwind v4 Dark Mode

## The rule

Use this in `index.css`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

Add `class="dark"` directly to `<html>` in `index.html`.

Do NOT use `@apply dark` anywhere in CSS — `dark` is a variant, not a utility class, and Tailwind v4 will throw `Cannot apply unknown utility class 'dark'`.

**Why:** Tailwind v4 changed dark mode from a media query or class-selector pattern. The `@custom-variant` approach requires the selector to match both the element with `.dark` AND its descendants. Using `&:is(.dark *)` only matches descendants (not `html.dark` itself). Using `&:where(.dark, .dark *)` correctly matches both.

**How to apply:** Every new React+Vite artifact that uses dark-only mode should follow this pattern. Never put the dark mode toggle logic in a `useEffect` — set it statically in the HTML file.
