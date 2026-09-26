---
name: frontend
description: 'Get all information of frontend structure needed. Use when editing Svelte components, modifying UI layouts, working with CSS or implementing hash-based routing, and creating/editing .svelte and .css files.'
---

# Frontend Development

## When to Use
- Editing any file in the `src/routes` directory or any Svelte component
- Editing any file with extension `.svelte` or `.css`
- Modifying Svelte components or layouts
- Modifying global CSS variables or layouts
- Adding clickable elements (prefer `button` over `div`)
- Implementing hash-based routing

## Tech Stack
- **Framework**: Svelte 5
- **Routing**: Hash routing (use `goto(#/example)` instead of `goto('/example')`)
- **Global styles**: CSS global variables and visual style is in [`src/routes/+layout.svelte`](../src/routes/+layout.svelte)

## Key Conventions

### Hash Routing
```javascript
// Instead of:
goto('/example')

// Use:
goto('#/example')
```

### Clickable Elements
- **Prefer `button`** over `div` for clickable elements
- If `div` is required, add `aria` attributes for accessibility

### Layout Modifications
- Always check [`+layout.svelte`](../src/routes/+layout.svelte) before editing positions or layouts to understand how elements are already processed and check the CSS variables.
- Take in consideration responsive design and accessibility when modifying layouts.

### Adding New Styles
If the target element is "simple" (no `class` attribute or no reference in style), the agent **may add new classes, elements, and CSS styles** directly to improve or extend the UI without needing to refactor existing code.

## After finishing your changes
- Run `npm run check` to ensure that the code passes all checks and tests.

## Related Documentation

- [frontend.md](../../docs/frontend.md) — Full frontend documentation