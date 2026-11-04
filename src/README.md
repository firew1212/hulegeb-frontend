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
as the `brand` token. Existing interface colors are intentionally preserved in
this architecture milestone; applying the complete design system is deferred.

## Permanent design guidelines

Use the [Apple website](https://www.apple.com/) as inspiration for design
principles, not as a template. Create an original Hulegeb identity appropriate
for an Ethiopian multi-vendor marketplace; do not copy Apple's branding, logos,
content, assets, or exact layouts.

Apply these principles to current and future frontend work:

- Keep layouts clean, simple, and intuitive, with clear navigation and hierarchy.
- Use confident, readable typography, balanced spacing, and generous whitespace.
- Present marketplace products attractively with high-quality imagery when
  available.
- Keep responsive behavior and visual consistency across mobile, tablet, and
  desktop.
- Use subtle, purposeful interaction feedback; avoid excess animation and
  decorative effects that do not improve usability.
- Prioritize accessibility, keyboard use, contrast, and readability.
- Build a consistent system of colors and interaction states around Hulegeb's
  primary brand color `#7752F7` and complementary neutral colors.
- Before implementing a page, check that it is simple, attractive, intuitive,
  accessible, usable, and consistent with Hulegeb's design identity.

Keep server rendering where practical, retain accessible keyboard and focus
behavior, and avoid implementing roadmap features outside their planned milestone.
