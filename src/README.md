# Frontend architecture

The frontend is a Next.js App Router application using React, TypeScript, Tailwind
CSS v4, and pnpm. Preserve existing authentication, API behavior, localized routes,
and user-facing functionality when changing its structure.

## Source layout

- `app/`: root document and localized App Router pages/layouts.
- `components/`: reusable UI, layout, authentication, catalog, dashboard, and
  localization components.
- `config/`: stable application metadata and validated API URL configuration.
- `i18n/`: locale definitions, typed dictionaries, and provider/hooks.
- `lib/`: shared API transport, feature API modules, authentication, and helpers.
- `types/`: API-facing domain types.

Catalog and order requests live in `lib/api/`; the shared HTTP client remains in
`lib/api.ts`, and authentication endpoints remain in `lib/auth-api.ts`. The
client resolves only API-relative paths against `NEXT_PUBLIC_API_BASE_URL`,
attaches in-memory access tokens to protected requests, and uses credentialed
requests for the backend's HttpOnly refresh-cookie flow.

## Localization and design tokens

English (`en`) and Amharic (`am`) routes are rooted at `app/[locale]/`. Shared
strings and locale-specific metadata are maintained in `i18n/dictionaries/`.
The proxy selects the locale from the URL, locale cookie, or `Accept-Language`,
and forwards the active route locale so the root layout can render the matching
`<html lang>` value on the server. `LanguageSwitcher` preserves query parameters
for equivalent localized routes and falls back to the locale home for unsupported
paths. Keep both typed dictionaries key- and placeholder-compatible; user-facing
API failures should use the localized messages in `i18n/errors.ts`.

Semantic style tokens are defined in `app/globals.css` using CSS custom properties
and Tailwind CSS v4 `@theme`. Hulegeb's official brand color is `#7752F7`, exposed
as the `brand` token. Treat these shared tokens, semantic colors, container width,
and section spacing as the source of truth; extend them only when a reusable
design need cannot be met with the existing foundation.

## Permanent design guidelines

Use the ASOS Men's shopping experience as inspiration for clear product
discovery, image-led merchandising, and simple navigation, not as a template.
Create an original Hulegeb identity appropriate for an Ethiopian multi-vendor
marketplace; do not copy another brand's identity, content, assets, or exact
layouts.

Apply these principles to current and future frontend work:

- Favor simple, attractive layouts with clear hierarchy, intuitive navigation,
  readable typography, consistent spacing, and generous whitespace.
- Center product discovery around real marketplace data and its available
  imagery; never invent listings, categories, discounts, or popularity claims.
- Use the `#7752F7` brand token with complementary neutral surfaces and
  intentional interaction states. Keep text readable and controls clearly
  distinguishable.
- Design mobile-first and verify that content, controls, and navigation remain
  usable across phone, tablet, and desktop widths.
- Make interfaces accessible by default: semantic landmarks and headings,
  keyboard-operable controls, visible focus, meaningful labels, adequate
  contrast, and localized English and Amharic copy.
- Use motion only to clarify interaction or state changes. Keep it subtle and
  smooth, and honor `prefers-reduced-motion`.
- Preserve loading, error, and empty states, existing API contracts, and the
  established application architecture when improving a page.

Keep server rendering where practical, retain accessible keyboard and focus
behavior, and avoid implementing roadmap features outside their planned milestone.
