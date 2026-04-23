# Maria Chevskaya — Design System

> Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.

This design system documents the visual language, components, and content voice of **Maria Chevskaya**'s portfolio site — a quiet, image-first presence that lets the photography do the talking. The chrome is intentionally thin: a centered name plate, a black-and-white masonry grid, a floating `BOOK` button, and a minimal booking page. Everything else gets out of the way.

## Sources

- **Codebase:** [github.com/kulichevskiy/masha2](https://github.com/kulichevskiy/masha2) (Next.js 16, React 19, Tailwind 4, shadcn/ui, Supabase). Public site + admin CMS for managing a photo portfolio.
- **Live brand surfaces we modeled:** `app/page.tsx` (home masonry), `app/book/page.tsx` (booking), `app/components/top-nav.tsx`, `app/components/footer.tsx`, `app/components/floating-book-button.tsx`, `components/login-form.tsx`, `app/admin/**` (photographer CMS).
- **Imagery:** 16 portfolio photographs imported from `public/photos/` into `assets/photos/`. All are black-and-white portrait / editorial frames — the whole visual weight of the brand.

## Products in scope

1. **Public portfolio site** — one-page masonry gallery + a single booking page. In two languages of tone: English marketing copy (home, booking, SEO) and Russian UI copy (auth, admin CMS). Serves as the photographer's calling card.
2. **Photographer admin** — password/Google-protected CMS to upload, reorder (drag handles), edit metadata, and toggle visibility on photos. Uses shadcn/ui primitives (Card, Input, Button, Switch) on a neutral surface, Russian labels throughout.

## Index

- `README.md` — this file
- `colors_and_type.css` — CSS variables for color + type (base + semantic)
- `fonts/` — locally hosted webfont files used by the system
- `assets/` — logos, wordmark, favicons, photographs
- `assets/photos/` — 16 sample portfolio frames
- `preview/` — Design System tab cards (type specimens, color swatches, components)
- `ui_kits/portfolio/` — interactive recreation of the public site (home + booking + login)
- `SKILL.md` — Agent Skill manifest for portable use

---

## CONTENT FUNDAMENTALS

**Voice.** Quiet, intimate, and written as if Maria is speaking to one person at a time. Not a business; a studio practice. Copy is sparing — most pages get by on one image and five short paragraphs. When a sentence can be shorter, it is.

**Pronouns.** Third person for the photographer ("Maria Chevskaya, Portrait and editorial photographer"), but inside body copy she writes as **I** — "People **I** work with are seen, not just photographed… write to **me** and tell a few words about yourself." The reader is always **you**.

**Casing rules** (these are rigid — they make the brand):
- **UPPERCASE, condensed display type** for the wordmark and primary CTAs: `MARIA CHEVSKAYA`, `BOOK`, `EMAIL ME`.
- **lowercase, spaced** for section headers and supporting labels: `booking`, `portrait and editorial photographer`.
- **Sentence case** for body paragraphs. Normal punctuation.

**Tone words.** calm, attentive, luminous, cinematic, collaborative, presence, rhythm, character, quiet confidence, inner shifts, moments of transition.

**No emoji. No exclamation marks. No ALL-CAPS shouting inside body copy.** Emphasis comes from *italicized price lines* ("Portrait sessions — from 450 €") rendered in pure black on an otherwise warm-gray page.

**Bilingual.** Public marketing copy is English. Authenticated surfaces (login, admin, error states) are **Russian** — "Вход", "Введите email для входа в аккаунт", "Личный кабинет фотографа", "Управление фотографиями портфолио", "Нет загруженных фотографий". This split is intentional: the public face courts international editorial clients, the backstage is Maria's own workspace.

**Example copy — home:**
> MARIA CHEVSKAYA
> portrait and editorial photographer

**Example copy — booking:**
> People I work with are seen, not just photographed. Each session is built around presence, character and rhythm, not poses or time slots. It is a collaborative process, calm and attentive, with space to arrive into yourself.
>
> *Portrait sessions — from 450 €*
> For personal portraits, moments of transition, inner shifts and quiet confidence.
>
> *Editorial / personal projects — upon request*
> For magazines, artists, authors and long-term collaborations.

**CTAs.** One per page, always. Solid black block, white text, condensed display caps, generous horizontal padding (`px-14` on booking, `px-20` on the floating button). Never stroked, never outline, never ghost — the button is a plate.

---

## VISUAL FOUNDATIONS

**The whole system is: paper-white page, black-and-white photography, a single bold display word, thin gray text, and one slab-of-black call to action.** Nothing else. If a new element doesn't fit that grammar, it doesn't go on the page.

### Color
- `--bg`: pure white (`oklch(1 0 0)` / `#ffffff`). The page is paper.
- `--fg`: near-black (`oklch(0.145 0 0)` / `#252525`) for display type and the BOOK button.
- `--text`: Tailwind `gray-600` (`#4b5563`) for body copy on booking — it's warm and readable, not clinical.
- `--muted`: `gray-500` (`#6b7280`) for supporting tagline and footer meta, always used at **50% opacity** in the footer for a "dimmed" presence.
- `--border`: `gray-200` (`#e5e7eb`) — footer top border, card divisions.
- `--image-plate`: `gray-100` (`#f3f4f6`) — the placeholder color behind loading images in the grid.
- `--destructive` (admin only): `oklch(0.577 0.245 27.325)`, red, only shown on delete actions in the CMS.
- **Dark mode variables exist in the codebase but are not actively surfaced on the public site.** The brand is white-only in practice.

### Typography
Four typefaces, loaded from Google Fonts via `next/font`. Each has exactly one job:

| Face | Role | Specimen |
|---|---|---|
| **Bebas Neue** (400) | Display / wordmark / CTAs / page titles. UPPERCASE for the brand, lowercase for page titles like `booking`. | `MARIA CHEVSKAYA`, `BOOK`, `booking` |
| **Inter** (400) | Supporting tagline and footer meta. Tracked out (`tracking-wider` / `tracking-widest`), lowercase. | `portrait and editorial photographer` |
| **Playfair Display** | Available for editorial long-form/serif moments (OG image uses it). Not used on the primary site — held in reserve. | `Maria Chevskaya` (editorial) |
| **Roboto Mono** | Held in reserve for metadata / technical labels (EXIF, timestamps). Loaded but unused on live pages today. | `f/1.8  1/200s  ISO 400` |

**Geist Sans** and **Geist Mono** are also loaded as base UI typefaces (shadcn/ui defaults) — these power admin chrome and form controls where Inter/Bebas would feel wrong.

**Scale** (home + booking, measured from the live site):
- Wordmark: `text-3xl` → `md:text-4xl` → `lg:text-5xl` (30 → 36 → 48 px)
- Footer wordmark: `text-2xl` (24 px) at 50% opacity
- Booking title: `text-3xl` (30 px)
- Body: default (16 px) `gray-600`
- Tagline / meta: `text-sm` (14 px), `tracking-wider`, lowercase
- Floating BOOK button: `text-xl` (20 px)

### Imagery rules (the most important section)
This is a portfolio for a portrait and editorial photographer — **the photograph is the hero, always**. Every rule below serves that.

- **Black & white only** on the portfolio grid. Full tonal range, deep blacks, pearly highlights, visible film grain. No color toning, no split tones.
- **Cinematic, low-light sources.** Window light, overcast sky, interior lamps. Shadows are allowed to go to pure black.
- **Tight crops + breathing room.** Portraits crop close; editorial frames include negative space (trees, fabric, architecture). Don't compose a frame without **one deliberate empty quadrant**.
- **No borders, no shadows, no rounded corners on photographs.** Images sit flush to their cell. `overflow-hidden`, `object-cover`.
- **Hover is a 5% scale-up over 500 ms.** `transition-transform duration-500 group-hover:scale-105` — the photograph subtly breathes into the viewer's attention.
- **Masonry cadence.** Three columns on desktop, cells alternate `row-span-2` and `row-span-3` in a repeating 10-cell pattern to produce a calm but not mechanical rhythm. Gap is `4` (16 px). Auto-row height is 200 px.
- **Color photography is permissible only on the booking page**, for the single full-width portrait of Maria herself — and even there it reads warm-neutral, not saturated.

### Spacing & layout
- **Single content column, centered.** `max-w-7xl` on home, `max-w-xl` on booking (tight editorial column).
- **Generous vertical rhythm.** `py-8` on the grid; `py-16` → `md:py-24` on the booking page; `mt-24` before the footer.
- **Horizontal padding scales.** `px-4` mobile → `px-6` tablet+. Never zero — there's always a breathing margin.
- **The page never feels full.** If in doubt, add more top/bottom padding and less density.

### Borders, shadows, radii
- **Radius: 0 on the public site.** The floating BOOK button, images, and email CTA are all hard rectangles. This is a deliberate anti-shadcn-ness. Radius > 0 only appears in admin chrome (`rounded-md` on inputs, `rounded-xl` on Card).
- **Borders are almost invisible.** Only one: `border-t border-gray-200` above the footer. That's it.
- **Shadows are almost absent.** Exactly one lives on the floating BOOK button: `shadow-[0_4px_20px_rgba(0,0,0,0.3)]` — heavy and single-source, like a poster tacked to a wall, not a soft UI card shadow.

### Backgrounds, transparency, blur
- Top nav: `bg-white/50 backdrop-blur-md` — a pane of frosted glass over the content that scrolls beneath.
- Floating BOOK button: `bg-black/80 backdrop-blur-sm` — black, but not pure, so the image showing through at the edges reads as layered.
- No gradients. No patterns. No textures. No illustrations. **The "pattern" of this site is the grid of photographs.**

### Motion
- `transition-transform duration-500` on image hover — slow, filmic.
- `transition-opacity` on every footer link — default Tailwind timing (150 ms), hover lifts from `opacity-50` to `opacity-100`.
- `hover:opacity-70` on the wordmark — it dims, it doesn't change color.
- `hover:bg-gray-800` / `hover:bg-black` on the solid buttons — darken only, never recolor.
- `md:hover:scale-105` on the floating BOOK button — tactile on desktop, disabled on mobile.
- **No bounces, no springs, no staggered entrance animations.** The page doesn't perform.

### Hover & press states
- **Links** — `hover:opacity-70` (wordmark) or `opacity-50 → opacity-100` (footer). Opacity, not color.
- **Solid buttons** — darken one step (`bg-black` → `bg-gray-800`), no size change on touch devices.
- **Desktop-only lift** — `md:hover:scale-105` on the primary CTA.
- **No active/press styles** — the browser default depress is enough.
- **Focus ring** — only in admin, via shadcn's `focus-visible:ring-ring/50 ring-[3px]`.

### Layout rules (fixed elements)
- **Fixed floating BOOK button** — `fixed bottom-4 left-4 right-4 md:bottom-6 z-50`, anchored bottom-right on desktop, full-width on mobile. Uses `pointer-events-none` on the track and `pointer-events-auto` on the button itself so the outer margin never intercepts clicks.
- **Top nav is static** (not sticky) — you scroll past it.
- **Footer is static** — you scroll into it at the end of the grid.

### Cards (admin only)
On public pages, cards don't exist — images are bare. Inside the admin CMS, shadcn's default Card is used: `rounded-xl border shadow-sm bg-card` with `py-6` internal padding. These never appear on the public site.

---

## ICONOGRAPHY

See **ICONOGRAPHY** section below.

(Continued after the stylesheet is ready — iconography, UI kits, SKILL.)
