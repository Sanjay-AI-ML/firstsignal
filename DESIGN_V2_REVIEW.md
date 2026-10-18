# FindIn V2 design and owner-portal implementation

18 October 2026. This pass implements the supplied creative-director brief and a new owner-only admin portal. It extends the selected lavender/Manrope system instead of replacing the recently completed design with unrelated artwork.

## Research and direction

[Linear's triage documentation](https://linear.app/docs/triage) describes reviewing incoming work before choosing a disposition. FindIn applies that task sequence to a report queue with explicit review statuses and required reasoning. [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics) supports a task-oriented overview and drill-down; FindIn uses actual aggregate counts with searchable record lists rather than invented charts. These sources were retrieved as text; authenticated competitor dashboards were not visually inspected this turn.

[Clerk's authorization guidance](https://clerk.com/docs/guides/secure/basic-rbac) demonstrates protecting admin pages and server actions. FindIn adapts the server-enforcement principle to one deployment-configured account ID, without introducing an editable role manager. [OWASP's authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) informs least privilege, default denial and checking every request. These are implementation references, not security certifications.

The public visual work also draws on the previously researched [Linear refresh](https://linear.app/now/behind-the-latest-design-refresh), [Stripe India](https://stripe.com/in) and [Notion product](https://www.notion.com/product). The transferable idea is to explain the real workflow visually and keep supporting structure quiet. No claim of endorsement, conversion uplift or funding outcomes is made.

## Visual asset plan and implementation

| Asset | Purpose and medium | Integration |
| --- | --- | --- |
| Interactive connection map | Original HTML/SVG diagram explains profile visibility, discovery, recipient acceptance and private discussion. Real text stays accessible; no fictional interface screenshot or generated-person evidence is added. | Replaces the thin four-step marketing strip; selected step shows an explanation and control boundary. Arrow/Home/End navigation, responsive rules and reduced motion are implemented. |
| `public/illustrations/connection-path.svg` | Original 506-byte vector connector in the existing palette. Decorative, not evidence. | Reserves dimensions, scales within the step composition and is hidden from assistive technology. |
| `findin-mark-64.webp` | Unchanged existing generated F mark, resized for small displays: 2,500 bytes. | Marketing, workspace, authentication, admin and favicon use the appropriately sized mark. |
| `findin-mark-128.webp` | 2× delivery variant, 4,926 bytes. | Responsive `srcSet` on major brand marks. |
| `findin-mark-256.webp` | Larger reusable delivery variant, 10,106 bytes. | Available for later larger placements. |
| Existing photographs and PNG source | Existing credited licensed stock photography and generated logo source retained. | No new people, endorsements, partner logos or proof claims are invented. Original logo is 598,071 bytes and remains available for source preservation. |

Code-native diagrams suit the visibility/consent explanation better than raster artwork. No new AI-generated raster asset was necessary. The PNG-to-WebP work changes delivery dimensions/format, not the logo composition. Byte differences are asset measurements, not measured page-speed improvements. See `MARKETING_ASSETS.md` for provenance and existing photo credits.

## Admin experience

An efficient desktop sidebar becomes compact phone navigation. The overview uses actual profile/report counts, a report queue and links to useful work. Reports, listings and activity have search, pagination, loading/retry and empty states. Detail sheets keep context beside a decision. Listing restrictions require explicit confirmation and a reason visible to the affected owner. Report review notes are distinct from those reasons. Settings show configuration presence without exposing secrets.

The server checks the exact configured Clerk account ID before reading admin data. The public product only shows the admin entry to that account; the API remains protected if a link or client flag is manipulated. Reversible moderation preserves the founder's underlying sharing preference and data. See `ADMIN_PORTAL.md` for exact behavior, schema and activation.

## Final scoped audit

| Category | Implemented result and verification boundary |
| --- | --- |
| Visual originality | Original connection map and purpose-built operator queue; rendered browser appearance remains unverified this turn. |
| Image quality | Source mark inspected; optimized variants preserve composition. Existing credited photographs remain. |
| Typography | Existing Manrope/type tokens; admin labels and controls follow the shared system. |
| Layout | Desktop content/sidebar and phone rules implemented; actual reflow needs browser QA. |
| Color | Shared semantic tokens, status text/icons and explicit boundaries; no new competing palette. |
| Navigation | Five admin sections and existing public routes preserved; HTTP and component structure checks are scoped separately. |
| Components | Typed API-driven lists, detail sheets, confirmation, pagination and feedback; backend workflows have isolated integration tests. |
| Motion | Map detail transition and loading feedback; reduced-motion overrides present. Device preference behavior remains unverified. |
| Responsiveness | Narrow-layout CSS and responsive logo variants present; no claim of observed overflow/focus behavior without browser access. |
| Accessibility | Semantic headings, labels, tabs, status messages and existing Radix dialogs; full keyboard/screen-reader conformance is unverified. |
| Performance | Logo delivery bytes reduced; no new dependency or external runtime asset fetch; Core Web Vitals not measured. |
| Functionality | Actual server permissions, report reviews, moderation, searches and audit persistence; no operational placeholders presented as implemented services. |
| Visual storytelling | Map explains the real choice at each step, including mutual acceptance and non-binding proposals. |
| Brand identity | Existing light FindIn mark, typography and palette retained across public, app, auth and admin. |

## Verification and limits

The current implementation passes TypeScript and the production build. Isolated API/SQLite admin checks and existing workspace privacy, profile-policy, sector, fit, suggestion and bounds regressions are recorded in the handoff. Added backend/admin/marketing files have scoped lint checks; legacy workflow lint errors remain documented from the prior release.

Browser automation is disabled in Work settings, so this is not a completed visual or accessibility sign-off. The current Sites connection cannot locate the existing project, so this update is not published. The owner's existing verified-email Clerk account is now bound locally. Hosted admin access remains unconfigured and denied until the binding is securely applied to the existing Site. Source and local verification can be completed independently of those blockers.

Next: apply the local owner binding securely to hosting, reconnect the existing Site account, apply migration 0003 through its established deployment path, verify real owner/nonowner sessions and phone/keyboard interactions, and then publish. Keep production auth, email, monitoring, restore and support work visible rather than claiming the pilot is fully production-ready.
