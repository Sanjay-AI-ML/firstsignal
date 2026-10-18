# FindIn design system

Updated 18 October 2026. Implemented foundations: [`app/design-system.css`](app/design-system.css), loaded after the existing globals in [`app/layout.tsx`](app/layout.tsx). This is the selected light lavender identity, shared by the marketing site, workspace and account routes. It adds no runtime dependency, font download service or alternative theme.

The visual direction is a clear working brief: give a founder's idea, an investor's interests and the next useful action more prominence than decoration. Marketing has more generous composition; the workspace keeps related facts close together. Borders describe grouping, colour describes selection or status, and elevation is reserved for layers and restrained hover feedback. Existing private/public controls, required stars, optional information popovers and honest fictional/self-reported labels remain part of the design.

## Token contract

Use the `--fi-*` variables for new styles. Existing shadcn and Tailwind variables (`--background`, `--foreground`, `--primary`, `--input`, `--ring`, sidebar variables and others) alias these foundations. Page-specific variables can alias them without duplicating palette values.

| Purpose | Token | Value |
| --- | --- | --- |
| Main action / selected text | `--fi-primary` | `#6934b5` |
| Action hover / pressed | `--fi-primary-hover`, `--fi-primary-active` | `#572998`, `#49217f` |
| Text on a filled action | `--fi-on-primary` | `#ffffff` |
| Page background | `--fi-background` | `#fbf9fd` |
| Base / floating surface | `--fi-surface`, `--fi-surface-elevated` | `#ffffff` |
| Quiet / selected surface | `--fi-surface-muted`, `--fi-surface-accent` | `#f5effb`, `#ede3f8` |
| Surface hover | `--fi-surface-hover` | `#faf6fe` |
| Primary / supporting / muted text | `--fi-text`, `--fi-text-secondary`, `--fi-text-muted` | `#282134`, `#51485f`, `#6b6176` |
| Decorative separator | `--fi-border` | `#e4ddec` |
| Recognisable control boundary | `--fi-border-strong` | `#8c7c9e` |
| Keyboard focus | `--fi-focus` | `#6934b5` |
| Positive state | `--fi-success`, `--fi-success-surface` | `#276244`, `#edf6f0` |
| Caution / different preference | `--fi-warning`, `--fi-warning-surface` | `#805014`, `#fff5e6` |
| Error | `--fi-error`, `--fi-error-surface` | `#a12d3f`, `#fff1f3` |
| Information | `--fi-info`, `--fi-info-surface` | `#325fa0`, `#eef4fc` |
| Disabled control | `--fi-disabled-text`, `--fi-disabled-surface` | `#6b6176`, `#ebe6ef` |

`--fi-secondary` aliases the muted surface and `--fi-accent` aliases the primary colour. The pale decorative border is not sufficient for identifying an input or an essential control. Use the strong border in those contexts.

## Typography

Manrope is the existing self-hosted variable font, now available globally from `/fonts/manrope-latin-variable.woff2` with `font-display: swap`. Its SIL licence remains in `public/fonts/Manrope-OFL.txt`. The file is 24,836 bytes. `--fi-font-family` uses Manrope followed by Segoe UI, Arial and a generic sans serif. Monospace text uses the system stack in `--fi-font-mono`.

| Role | Token suffix after `--fi-type-` | Size | Use |
| --- | --- | --- | --- |
| Large display | `display-large` | `clamp(3.25rem, 6.2vw, 5.5rem)` | Selected marketing statements |
| Display | `display` | `clamp(2.75rem, 5.5vw, 4.75rem)` | Main marketing heading |
| Page | `page` | `clamp(1.75rem, 2.8vw, 2.375rem)` | Workspace page title |
| Section | `section` | `clamp(1.5rem, 2.7vw, 2rem)` | A major content group |
| Subsection | `subsection` | `1.25rem` | Detail and form sections |
| Card | `card` | `1.125rem` | Profile / conversation title |
| Large body | `body-large` | `1.125rem` | Short marketing introduction |
| Body | `body` | `1rem` | Reading and text entry |
| Small body | `body-small` | `.875rem` | Supporting application text |
| Caption | `caption` | `.75rem` | Secondary metadata, never the only action label |
| Label / button | `label`, `button` | `.875rem` | Controls and labels |
| Numeric | `numeric` | `1.75rem` | Small operational totals, paired with a label |
| Code | `code` | `.875rem` | Actual code or identifiers |

Weight tokens are `regular` 450, `medium` 550, `semibold` 650 and `bold` 750. Heading and display line-height tokens are 1.25 and 1.08; reading copy uses 1.65, labels use 1.45. Display tracking is `-.045em`, heading tracking `-.025em`, and labels have normal tracking. Use tight tracking on headings only. Numeric facts can use `font-variant-numeric: tabular-nums` where alignment matters. Keep reading copy near `--fi-reading-width` (68ch); avoid stretching explanatory text across a data view.

Native text fields use a 1rem text size. Do not shrink form-entry text to create visual density. The application can use tighter grouping and smaller supporting labels while retaining clear controls.

## Space, shape and density

The spacing scale uses a four-pixel unit at the default root size. `--fi-space-1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, `24`, `32` correspond to 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 and 128px. Choose spacing by relationship: 4–8px inside a compact fact, 12–16px between related controls, 24–32px between groups, and larger intervals between marketing sections.

| Foundation | Token | Value |
| --- | --- | --- |
| Small label / control / card / panel radius | `--fi-radius-sm`, `control`, `card`, `panel` | 6 / 10 / 14 / 20px |
| Circle / pill | `--fi-radius-pill` | 999px |
| Main / compact control height | `--fi-control-height`, `--fi-control-height-compact` | 44 / 36px |
| Standard card inset | `--fi-card-padding` | 24px |
| Field label gap | `--fi-field-gap` | 8px |
| Responsive outer inset | `--fi-page-gutter` | `clamp(1rem, 3vw, 2.5rem)` |
| Content / reading width | `--fi-content-width`, `--fi-reading-width` | 80rem / 68ch |

Use `--fi-shadow-raised` for restrained emphasis, `--fi-shadow-floating` for menus/popovers, and `--fi-shadow-dialog` for the active overlay. Do not put a floating shadow on every card. The existing Lucide icon family remains the standard: generally 16–20px, aligned with the label, with consistent stroke weight. Decorative icons should be hidden from assistive technology; icon-only controls need an accessible name.

## Shared components and states

The foundations refine the existing `.primary-button`, `.outline-button` and `.text-button` classes. Primary identifies the next committed action, outline is a secondary action, and text is a lower-emphasis action. Main actions have a 44px minimum height. Hover and pressed colours are explicit; focus is a three-pixel outline with separation from the control. Disabled styles use solid text and backgrounds instead of reduced whole-control opacity. Loading behaviour remains owned by each existing component; `aria-busy="true"` can indicate a progress cursor.

Form controls retain their labels, help text, validation and persisted values. Strong boundaries, a clear placeholder colour and visible keyboard focus are shared. Error colour accompanies actual error text; selection and status must retain a label or icon as well as colour. Required stars include an accessible “required” label. Optional information controls retain their keyboard/touch popovers. Do not replace that meaning with unexplained symbols.

Not every pale line is a control boundary. Do not use a decorative separator as the only way to identify an editable field or a critical state. Native, shadcn and Clerk controls retain their existing behaviour; page styles should consume tokens without indiscriminate selectors that alter third-party layout.

## Motion

`--fi-duration-fast`, `normal`, `slow` are 120, 180 and 240ms, with `--fi-ease-out: cubic-bezier(.2,.75,.25,1)`. Shared controls transition colour/border/shadow rather than moving away from the pointer. Use transforms or opacity for optional decorative movement. Never delay data, navigation or a form action until an animation ends. Reduced-motion preference reduces these duration tokens to zero; the existing global reduced-motion override also disables nonessential animation and smooth scrolling.

## Calculated solid-colour contrast

Ratios below were computed with sRGB linearisation and WCAG relative luminance: convert each channel using `c / 12.92` when `c <= .04045`, otherwise `((c + .055) / 1.055) ** 2.4`; combine using `.2126 R + .7152 G + .0722 B`, then divide `(lighter + .05) / (darker + .05)`. These are token-pair calculations, not a complete accessibility audit of composed pages, transparency, images, third-party controls or every interaction state.

| Pair | Ratio |
| --- | ---: |
| Main text on page background | 14.79:1 |
| Supporting text on white | 8.60:1 |
| Muted text on white / page background | 5.84:1 / 5.58:1 |
| Muted text on muted / selected surface | 5.18:1 / 4.71:1 |
| White on primary / hover / active | 7.61:1 / 9.65:1 / 11.62:1 |
| Primary on selected surface | 6.14:1 |
| Strong boundary on white / muted surface / page background | 3.82:1 / 3.39:1 / 3.65:1 |
| Success text on success surface | 6.53:1 |
| Warning text on warning surface | 6.33:1 |
| Error text on error surface | 6.46:1 |
| Information text on information surface | 5.79:1 |
| Disabled text on disabled surface | 4.75:1 |

All documented ordinary-text pairs meet 4.5:1 and the documented control-boundary pairs exceed 3:1. Muted text is a semantic colour, not an opacity instruction. Check the actual rendered foreground/background combination when introducing a new surface.

## Maintenance and verification

Prefer extending these semantic tokens and the current components to introducing another local palette. Keep product logic, account permissions and stored data separate from visual refinements. Test rendered forms, navigation, focus, overlays and 320px reflow after changes to shared styles. Browser performance measurements, full WCAG conformance, production authentication and launch operations require their own verification; the design system does not certify them.

Foundation verification on 18 October 2026: TypeScript `--noEmit` passed, the new stylesheet parsed successfully with the existing Lightning CSS compiler, and the scoped tracked diff passed whitespace checks. Rendered page checks and the integrated production build belong to the complete release validation.


Clerk appearance uses the same Manrope/palette, 44px form and sign-in actions, strong field boundaries and compact card padding. These are presentation changes only, using documented `appearance.elements` customisation. Provider authentication and the development-mode disclosure are preserved.
