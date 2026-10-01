# Weather Forecast App: Redesign Plan

Stack: plain HTML, CSS, JavaScript (`index.html`, `style.css`, `app.js`). No React, no Tailwind, no build step.
Scope: visual design, layout and UX only. Do NOT change functionality, API calls, data logic, or `.env` handling.

---

## 0. Skills (read before any code)

All skills live in `.agents/skills/<name>/SKILL.md`. List the directory and read the `SKILL.md` of EVERY subfolder in full. Also read `.agents/skills/stitch-design-taste/DESIGN.md`.

Priority order when skills conflict:

1. `redesign-existing-projects` (primary workflow, follow first)
2. `design-taste-frontend`
3. `high-end-visual-design`
4. `stitch-design-taste` (+ its `DESIGN.md`)
5. `gpt-taste`, `design-taste-frontend-v1`, `brandkit`
6. `minimalist-ui`, `industrial-brutalist-ui` (borrow only compatible ideas, never mix clashing styles)
7. `image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile` (use design principles only; skip image generation tooling and report what was skipped)

`full-output-enforcement` always applies: output complete files, no placeholders, no "rest of the code here".

Checkpoint: before coding, write a short summary of (a) which SKILL.md files were read, (b) the single aesthetic chosen for a weather product, (c) the rules that will be applied.

---

## 1. Audit the current UI

Open `index.html`, `style.css`, `app.js`. List every element ID and class that `app.js` depends on. These must stay intact (or `app.js` is updated without changing its logic).

Known problems to fix:

| # | Problem | Fix |
|---|---------|-----|
| 1 | UI is a narrow ~500px card floating in a huge empty dark screen | Responsive dashboard layout that uses the viewport well |
| 2 | Content touches card edges | Consistent inner padding on every card and section |
| 3 | Inconsistent borders and radii, double borders on header, search and icon box | Border and radius tokens, one border style, correct nested radius |
| 4 | Hourly forecast is clipped on the right (06:00 cut off) | Proper horizontal scroller with scroll-snap and edge fade |
| 5 | Weather icon sits in an awkward double-bordered box | Remove the box, integrate a larger icon into the hero |
| 6 | Header and search are separate stacked blocks | Merge into one top bar aligned to the content grid |

---

## 2. Design system (tokens first)

Define everything as CSS variables in `:root`, with a dark and a light theme.

- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48
- **Radius tokens:** small, medium, large. Inner radius = outer radius minus padding.
- **Border:** single 1px, low-contrast. Never stack two borders on one element.
- **Typography:** a distinctive, readable font pairing (no default Inter/Roboto look), with a clear type scale. The current temperature is the focal point.
- **Color:** cohesive palette plus weather-condition accents (sunny, cloudy, rainy, snowy, stormy, night).
- **Elevation:** one consistent shadow system.
- **Motion:** short, subtle transitions. Respect `prefers-reduced-motion`.

---

## 3. Layout

**Desktop (>= 1024px):** dashboard grid, max-width about 1200px, centered.

- Top bar: logo, search (prominent, visible focus state), theme toggle, all on one grid line
- Hero: city, date, large temperature, condition, integrated weather icon
- Detail cards beside or below the hero: humidity, wind, feels like, visibility (plus any extra the API returns)
- Hourly forecast as a full-width row below

**Tablet (>= 640px):** two-column where it fits, otherwise single column.

**Mobile (< 640px):** single column, 16px side padding, hourly row scrolls horizontally.

No large dead space at any width. No horizontal page scroll.

---

## 4. Components

1. **Top bar:** merged header and search. Icon-only buttons get `aria-label`.
2. **Hero:** large temperature, condition text, larger icon or illustration without a boxed frame.
3. **Detail cards:** equal sizing, consistent padding, icon + label + value.
4. **Hourly scroller:** equal card widths, `scroll-snap-type`, side padding, subtle edge fade, hidden or styled scrollbar.
5. **Weather-reactive background:** gradient and accent change by condition and day/night.
6. **Footer:** small attribution line aligned to the grid.

---

## 5. States

Design and verify each:

- Loading (skeletons)
- Error (network or API)
- Empty (no search yet)
- City not found
- Success

---

## 6. Accessibility

- Text contrast of at least 4.5:1
- Visible focus states on all interactive elements
- Semantic HTML (`header`, `main`, `section`, `form`, `button`)
- Reduced-motion support
- Touch targets of at least 44px on mobile

---

## 7. Implementation order

1. Read skills, post the checkpoint summary
2. Audit current files and list the dependencies of `app.js` on IDs and classes
3. Write tokens and base styles in `style.css`
4. Restructure `index.html` (semantic, same IDs and classes as needed)
5. Build the layout (grid, top bar, hero, cards, hourly scroller)
6. Add weather-reactive theming and the theme toggle
7. Add states, skeletons and micro-interactions
8. Responsive pass and accessibility pass
9. Final verification

---

## 8. Acceptance checklist

Verify at 375px, 768px and 1440px:

- [ ] No clipped content (the hourly scroller shows full cards, scrolls cleanly)
- [ ] No horizontal page scroll
- [ ] No element touches a card edge
- [ ] No double borders anywhere
- [ ] Radii are consistent and nested correctly
- [ ] No large empty dead space on desktop
- [ ] Light and dark themes both work
- [ ] All five states render correctly
- [ ] Search, fetch, and display behavior is identical to before the redesign
- [ ] Complete files delivered, no placeholders

---

## 9. Final report

When finished, provide:

- The chosen aesthetic and why
- Key design decisions
- Skills used and anything skipped
- List of changed files
