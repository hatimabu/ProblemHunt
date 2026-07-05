---
name: Animated landing page pattern
description: How the unified single-page animated landing page was built and what library/import quirks to watch for
---

The landing page uses the `motion` npm package (Motion for React), not `framer-motion`. Import from `"motion/react"`, e.g. `import { motion, useScroll, useSpring, useTransform } from "motion/react"`.

Unification approach: one persistent fixed-position canvas + gradient background component sits behind all sections (z-0), rather than each section having its own background — this is what makes multiple content sections feel like a single continuous page. Sections use shared `fadeUp`/`stagger`/`scaleIn` motion variants with `whileInView` for scroll-triggered reveals, plus a top scroll-progress rail (`useScroll` + `useSpring` on `scaleX`).

**Why:** User explicitly asked for "a more unified animated single landing page" reusing the same API-driven buttons/routes without losing SPA context — the shared background + shared motion variants achieve visual unity without touching routing/auth logic.

**How to apply:** When redesigning other marketing/landing surfaces in this app, reuse the same `motion/react` import path and the persistent-background + shared-variants pattern for consistency, and keep all interactive elements as `<Link>`/`<Button>` wired to existing routes and `API_ENDPOINTS`.
