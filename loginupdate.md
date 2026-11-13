# WATeamInbox — Exact Login Page Redesign Implementation

**Target:** Existing application at `https://wateam.ayyansystems.com/login`  
**Task:** Replace only the current login page presentation with the supplied, approved visual design.  
**Visual reference:** `login-reference.png` (keep this image beside this Markdown file in the Antigravity project).  
**Priority:** **Visual fidelity first, with all existing authentication and application functions preserved.**

## 0. Read this before editing

You are Antigravity acting as a senior frontend engineer, UI designer and QA engineer. **Implement the design shown in `login-reference.png` as closely as possible, not a loosely inspired variation.** Use the image as the ultimate authority for composition, typography, spacing, radii, shadows, visual hierarchy, gradient shapes, and colors. This is an update to a live existing application: **do not rebuild or replace its backend, routes, or authentication flow.**

1. Inspect the existing application structure and identify the current `/login` page, styles, reusable components, theme variables, authentication hooks/services, validation, navigation, image assets and mobile-store URLs.
2. Before changing files, identify existing sign-in submit logic, loading/error behavior, password reset, registration, session handling, redirect-after-login and input/autofill behavior. Keep them working.
3. Change the login page markup and scoped styles; introduce only the minimal presentational components/assets needed. Avoid changes to unrelated pages, DB migrations, API endpoints, authorization rules or global CSS that could alter other screens.
4. Treat the reference screenshot as a **visual specification**, not as a bitmap to put behind the page. Implement real, accessible HTML components and responsive CSS. Create an accurate CSS/SVG representation of the promotional chat illustration. No static image overlay that prevents text selection or interaction.
5. Finish by rendering the app in a browser and compare screenshots at **1586 × 992** against `login-reference.png`. Refine until the page is visually very close.

## 1. Exact desktop composition

Reference canvas: **1586 × 992 pixels**, approximately 16:10. The web page fills the viewport (no mock-browser chrome). Entire design has a **light theme**. Use the project's existing font if it matches closely; otherwise prefer **Inter**, with system sans-serif fallback. Large headlines have heavy weight, tight tracking, and clean line breaks.

- **Page background:** very pale off-white (#F8FCFA or comparable) with subtle mint washes. Oversized soft green abstract circles/curves near upper left, mid-right, and lower-right edge. Sparse, tiny teal dot grids at upper right and lower left. These shapes should sit behind all meaningful content, never intercept pointer events.
- **Overall layout:** a left white login card and a larger right marketing/illustration region aligned side by side. At the reference viewport the left card begins near **x=128, y=45**, extends to **x=645, y=927** (~517 × 882). The right region begins near **x=714** and extends towards the right edge. Outer layout centered in a max-width roughly **1330 px** container. Maintain the open negative space above and around the right illustration.
- **Login card:** pure white, large **~30 px** radius, airy internal padding around **54–58 px** horizontally, soft diffused elevated shadow. Card is taller than the form alone because it includes download links and a footer security note.
- **Right section:** transparent background (no heavy dark panel), with a large headline at the top, a colorful floating app preview centered below, and a three-benefit strip along the bottom. Visually engaging but refined; no dark theme.
- **Brand:** green/emerald accent system; use existing WATeamInbox brand asset if found. Do not substitute the Ayyan Systems logo.

## 2. Left login card — required content and visual order

### A. Brand header

At the top-left of the card, show a green speech-bubble logo with three white dots and the word **WATeamInbox** in bold almost-black text; approximate logo group height **34–38 px**. Use existing project logo if accurate, otherwise recreate a simple crisp vector mark.

### B. Welcome pill and heading

After ~35 px vertical gap:
- Tiny soft mint pill, uppercase letter-spaced dark-green label: **WELCOME BACK ✨**.
- Main heading in black/dark-charcoal, bold ~**42 px** on desktop, line-height ~1.04, with the explicit two-line composition:
  - `Sign in to your`
  - `team inbox`
- Description, muted slate, ~15–16 px, 1.5 line-height: **Manage customer conversations, assignments, and context — all in one place with your team.**

### C. Login error

Reference illustrates a **pale pink/red alert** below intro, spanning the available form width, with a red alert-circle icon and text **Invalid email or password**. **Important:** this is a demonstrated error state, **not** a permanent message. Only show the error when the existing authentication/validation code has produced an error. Do not trigger errors on initial page load. Preserve real backend error handling, sanitize messages and use `role="alert"` / `aria-live` appropriately. Match screenshot appearance when an error exists.

### D. Inputs

The two form controls are stacked with generous spacing. Both are ~**42–46 px** tall, white, subtly outlined gray, **10–12 px** rounded corners and slight shadow. Labels appear **above**, in semibold navy with small outline icons:
- Envelope icon + **Work email** label. Input `type="email"`, appropriate `name`, `autocomplete="username"`, required validation. Use existing bound form state; no hardcoded credentials. The address shown in reference is sample content only, not a default credential.
- Lock icon + **Password** label. `type="password"`, `autocomplete="current-password"`. The eye icon on the right must toggle visibility, be keyboard operable, and have an accessible name. If the application currently includes password-manager buttons or autofill decorations, do not create fake red ellipsis icons; browser/extension controls should be allowed to render normally.
- **Forgot password?** on the next line, aligned right, emerald-green bold link. Wire to existing password reset route/function.

### E. Submit CTA

Full width, ~**46–49 px** tall, green gradient ranging from emerald to deep green, rounded **~11 px**, white bold text **Sign in to WATeamInbox** followed by a right arrow. Subtle green-tinted shadow/glow. Include tasteful hover, focus-visible and pressed states; retain existing loading spinner, disabled state and submission behavior. Submit on Enter using an actual `<form>`.

### F. Security note

Light mint bordered rounded box, ~**58 px** height, underneath CTA. Left green shield/check icon; 12–13 px muted text: **Your sign-in is protected, and workspace access stays private to approved team members.** This is UI copy, not an assertion of audited security; confirm with existing product policy before publishing if necessary.

### G. Registration and mobile downloads

- Centered line: **New to WATeamInbox?** followed by underlined/bold green **Create an account** link. Preserve existing registration route; if registration is disabled in current app, respect that feature flag rather than exposing an unusable path.
- Thin horizontal divider with ample spacing.
- Centered uppercase letter-spaced tiny label: **GET THE MOBILE APP**.
- Horizontal row of two genuine store badges/buttons: **Get it on Google Play** and **Download on the App Store** plus a small QR control at far right if a valid existing app/deep-link QR is available. **Reuse existing real URLs; do not invent published app links or nonfunctional QR codes.** If no real app URLs exist, preserve existing configured behavior and make feature availability explicit.
- Bottom tiny centered lock icon and caption: **Secure login · Your data stays private and encrypted.** Only use the exact security claim if supported by deployed configuration; otherwise use approved product copy.

## 3. Right hero — exact hierarchy and product illustration

### A. Headline

Starting approximately **x=729, y=71**, place a dark-green nearly-black, bold ~**42 px** heading over three lines, resembling this wrap:

**Keep every customer**  
**conversation _in sync_**  
**with your team**

The phrase **in sync** sits on a rounded light-mint highlight, in slightly italic/bold deep green, with small decorative green accent strokes beside it. Use semantic HTML and an inline span for highlight.

Description below in muted slate at ~**19–20 px**, with two-line wrap: **A shared team inbox for faster replies, clear ownership, and complete customer context.**

### B. Floating collaborative inbox graphic

Primary focus is a sophisticated, **browser-style product mockup** floating with slight perspective/tilt and a generous diffuse mint-green shadow, at roughly **x=790–1370, y=350–690**. The graphic must be recreated with CSS/HTML/SVG (or an original locally generated vector) so it scales crisply.

Composition details:
- Main chat window: rounded **24–28 px** white/pale-gray shell, translucent/glassy surface, delicate shadow. Small red/yellow/green circular window dots across the top-left edge.
- Narrow left rail (~160 px wide within mockup), topped with WATeamInbox icon/text. Menu options with compact stroke icons: **Inbox** (active mint pill and green `12` counter), **Assigned to me**, **Team**, **Customers**, **Analytics**. These are *illustrative* menu items only, not an extra interactive application navigation.
- Right chat pane: small green WhatsApp-style round icon (do not imply an official integration if none exists), contact **Sara Mitchell** with subtitle **Online now · Acme & Co.**, plus star and three-dot outline icons.
- White incoming speech bubble: **Thanks! Could you send the updated quote before 3pm?** and small `10:42` time.
- Mint outgoing reply bubble: **Absolutely—Maya is preparing it now. We’ll send it shortly.** and small `10:43` double check.
- Lower assignment status bar: left icon and **Assigned to Maya**; pale green status chip at right **In progress**.
- Floating rounded badge at upper right of mockup with green people icon + **Your team is waiting**.
- Three small circular profile photos/avatars surround the graphic: one above-left, one bottom-left, one to the far-right, all with small vivid green online indicator. Use project-approved/licensed assets if available, otherwise use attractive illustrated/initial avatars, not third-party personal photos copied without authorization.
- Mint-tinted circles, soft blobs, curved dotted green connector arcs around the floating application, and a distinct floating green WhatsApp-like tile at bottom-right. Keep decorative arcs behind content and avoid clutter.

The screenshot's illustration has a subtle depth effect, but **all text inside the preview must remain readable**. Avoid excessive perspective skew, visual noise or animation that harms usability.

### C. Benefits row

At roughly y=768–860 on the 992px reference canvas, beneath the illustration, create a row of **three evenly spaced compact feature summaries**, separated by very light vertical rules:
1. Pale mint rounded icon tile with lightning bolt; bold **Reply faster together**; muted caption **Collaborate and resolve queries as a team.**
2. Pale mint rounded icon tile with group/people; bold **Clear ownership & handoffs**; muted caption **Assign, track, and never lose context.**
3. Pale mint rounded icon tile with layered-sheets icon; bold **Full conversation history**; muted caption **Keep the complete customer journey in one place.**

Each block includes a small left icon tile and text column, not large independent cards. Use compact 13–15 px text and preserve generous overall whitespace.

## 4. Visual tokens (tune against screenshot)

Use these as **starting targets**, then visually refine against the reference image:

| Token | Target |
|---|---|
| Background | `#F9FCFB` with very light mint gradients |
| Card/surface | `#FFFFFF` |
| Primary text | `#092420` or `#0D1818` |
| Secondary text | `#506278` |
| Main emerald | `#007B4A` to `#008E56` |
| Deep green | `#006C46` |
| Mint accent | `#D8FADE`, `#E7F9EF` |
| Input border | `#DDE5EA` |
| Error surface | `#FFF1F2` |
| Error border | `#FFB9BD` |
| Error text | `#DC1414` |
| Login card radius | `28–32px` |
| Input/CTA radius | `10–12px` |
| Font | `Inter`, system sans-serif fallback |
| Shadows | Soft multi-layer, low-opacity, natural light |

Use minimal decorative animation only if already supported by the project, and honor `prefers-reduced-motion`. Default layout should be static and faithful to image.

## 5. Responsive requirements

- **≥ 1200px:** preserve split composition, proportions and promotional mockup; support common laptop heights without cutting off the card or CTA. Allow page scrolling if necessary.
- **768–1199px:** reduce spacing, heading font sizes and mockup scale; keep both regions only where legible; never overflow the viewport horizontally.
- **≤ 767px:** single-column, **login first**. Use a white or near-white compact card with 20–24 px side padding and ~24 px radius. Hide or position the full marketing art **below** the login card; never put promotional UI ahead of required form inputs. Store badges may wrap. All interactive controls must be at least ~44px touch-friendly.
- **≤ 360px:** handle narrow devices, long translated error text, mobile keyboard, browser zoom up to 200%, and password manager overlays.
- Respect safe areas, use a viewport meta tag if not already present, and prevent clipping of the form.

## 6. Functionality preservation — non-negotiable

The redesign must retain **all** current behavior: API request URL, HTTP method/body, CSRF protection, session/cookie/token handling, login redirects, field validation, error mapping, password visibility, reset link, registration availability, existing auth guards, and existing configured store links. No fake sign-in action, mocked API responses, credentials committed to source, or unintended changes in auth security. No additional tracking or analytics SDKs without approval.

Use semantic `<form>`, `<label>`, `<input>` and `<button>` elements, visible keyboard focus, proper tab order and accessible contrast. Keep validation messages linked to fields; preserve localization/i18n wiring if it exists. Decorative marketing graphics should be `aria-hidden="true"` or have one concise meaningful accessible label, not dozens of noisy decorative elements in the accessibility tree.

## 7. Recommended implementation workflow

1. **Inspect:** locate current login page, styles, components, branding, auth hooks, store URLs and tests. Take a screenshot of the current login page for rollback comparison.
2. **Implement:** update the existing login component in place; prefer scoped CSS/SCSS/Tailwind conventions from the repository. Build `LoginForm`, `LoginHero`, `ConversationPreview`, `FeatureStrip` components **only if** consistent with existing architecture.
3. **Asset matching:** source brand logo from repo; create lightweight inline SVG for decorative icons/patterns. Recreate the picture's hero illustration with real components. Use supplied `login-reference.png` solely for visual comparison, not embedded as the complete webpage.
4. **Visual QA:** compare the rendered desktop page at 1586×992 side by side with the supplied reference. Check card x/y/width, heading wraps, position of app mockup, badge/avatars, benefits row, green shapes and typography. Iterate where mismatched.
5. **Functional QA:** test success, bad credentials, empty/invalid email, API errors, loading state, Enter submit, eye toggle, forgot password, account creation, redirect, app links, password manager autofill and keyboard navigation.
6. **Responsive QA:** capture **1586×992**, **1440×900**, **1024×768**, **768×1024**, **390×844** and **320×700**. Fix clipping, overlap and horizontal scrolling.
7. **Build/test:** run existing lint, typecheck, test and production build commands (when available); fix only problems introduced by this change.
8. **Deliver:** report files changed, screenshots, all testing outcomes, any missing assets/URLs and any remaining visual deviations. Do not claim pixel-perfect completion without screenshot comparison.

## 8. Acceptance criteria

- [ ] New `/login` desktop page matches `login-reference.png` as closely as feasible in positioning, typography, color, illustration and detail.
- [ ] Login card shows brand, welcome label, form, error **when applicable**, security note, register link and mobile badges.
- [ ] Marketing side shows highlighted headline, floating shared-inbox preview, avatars/badge, green decorative shapes and three benefits.
- [ ] UI is a functioning, accessible web page, **not a single flattened image**.
- [ ] Existing login API, authentication security and all real navigation remain unchanged.
- [ ] Error message is conditional; credentials are not hardcoded.
- [ ] Mobile and tablet layouts are clean, accessible and free of horizontal overflow.
- [ ] No unrelated application features or pages have changed.
- [ ] Desktop and mobile screenshots and test results are provided.

**Final instruction:** Do not improvise a new design, swap in a generic login template, turn the page dark, remove features from the existing login page, or declare success based only on compilation. **The attached reference image is the approved design and the implementation must reproduce it faithfully.**
