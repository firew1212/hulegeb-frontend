# Hulegeb Frontend Design Direction

## Visual reference

Apple's official website (https://www.apple.com/) is the ongoing UI/UX reference for
the Hulegeb frontend. Every future frontend milestone must follow the same
Apple-inspired design direction: clarity, confident typography, deliberate
whitespace, balanced composition, simplicity, subtle interaction states, and
accessibility.

Hulegeb must keep its own marketplace identity. Do not clone Apple's website, copy
its branding, logos, proprietary assets, exact content, or product-specific
interface.

## Design tokens

Semantic color, typography, spacing, radius, and layout tokens are defined in
`src/app/globals.css` using Tailwind CSS v4 `@theme` and CSS custom properties.

## Reusable components

- UI primitives: `src/components/ui/` (Button, Container, SectionHeading).
- Shared layout: `src/components/layout/` (Header, Footer).

## Signature color

Hulegeb uses a single signature brand color: **Hulegeb Deep Teal `#0F5F52`**
(light theme) and **`#2DD4BF`** (dark theme). It is used sparingly and only where it
adds brand recognition or interaction clarity, such as small eyebrow labels and
focus indicators. It must never become a page/section background, be applied to
every heading/icon/card/border/button, replace Apple's neutral backgrounds,
or form large colored gradients/blocks. All other elements follow the
Apple-inspired neutral palette (white `#FFFFFF`, light gray `#F5F5F7`,
near-black `#1D1D1F`, muted gray `#6E6E73`, borders `#D2D2D7`).


- Preserve server rendering where possible and minimize client JavaScript.
- Maintain keyboard usability, visible focus, semantic landmarks, and contrast.
- Verify each milestone (lint, typecheck, build, and visual checks) before proceeding.
- Do not introduce future-milestone features (auth, API integration, localization,
  cart, checkout, etc.) unless explicitly in scope.
