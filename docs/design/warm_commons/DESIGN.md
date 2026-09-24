---
name: Warm Commons
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0daee'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff3ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dfe9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#594139'
  inverse-surface: '#273140'
  inverse-on-surface: '#ebf1ff'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3500'
  primary: '#8f2b00'
  on-primary: '#ffffff'
  primary-container: '#b83a00'
  on-primary-container: '#ffddd3'
  inverse-primary: '#ffb59c'
  secondary: '#236b3b'
  on-secondary: '#ffffff'
  secondary-container: '#a9f4b6'
  on-secondary-container: '#2a7240'
  tertiary: '#783f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#9b5300'
  on-tertiary-container: '#ffdec7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59c'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832700'
  secondary-fixed: '#a9f4b6'
  secondary-fixed-dim: '#8ed79c'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#005226'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 19px
    fontWeight: '700'
    lineHeight: 26px
  body-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 29px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-bold:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 28px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '700'
    lineHeight: 22px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  margin: 1.25rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.375rem
  space-sm: 0.625rem
  space-md: 1.125rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is crafted for a residential and neighborhood community platform connecting co-owners, tenants, and neighbors across generations. The brand personality embodies warmth, mutual aid, neighborly conviviality, and uncompromised dignity. 

Rather than clinical assistive software or sterile corporate proptech, the aesthetic marries the hospitality and organic charm of community-first editorial design with strict, uncompromising **WCAG AAA** universal design practices. The emotional resonance is welcoming, reassuring, grounding, and easy to navigate for users with differing visual fidelities, tremors, or digital literacy levels.

Key visual principles:
- **Warm Tactility:** Cream-paper canvases, deliberate borders, and solid geometries that feel grounded and physical.
- **Cognitive Clarity:** Immediate affordances, self-explanatory iconography paired with clear text, unambiguous labels, and generous touch targets.
- **Uncompromised Inclusivity:** High visual contrast (7:1+ for core content) paired with gentle, humanizing earth tones (terracotta, sage, and deep marine ink).

## Colors

The palette balances cozy domestic comfort with strict accessibility contrast ratios:

- **Canvas & Surfaces:**
  - `canvas-default`: `#FDFBF7` (Warm cream/linen background, prevents screen glare fatigue).
  - `surface-elevated`: `#FFFFFF` (Pure crisp white cards for optimal legibility).
  - `surface-muted`: `#F4EFE6` (Subtle warm stone container for secondary blocks).

- **Brand & Semantic Accents:**
  - `primary` (`#B83A00`): Deep terracotta/fired ochre. Exceeds WCAG AAA requirements on cream surfaces when paired with bold strokes or dark contrast text, and achieves > 7:1 against pure white for display headings and interactive tags.
  - `secondary` (`#1F6838`): Deep forest sage. Provides an authoritative yet friendly positive/confirmation signal with > 7:1 contrast on `#FDFBF7`.
  - `tertiary` (`#874B00`): Dark warm amber for warnings and building alerts without clinical alarmism.

- **Typography & Structural Lines:**
  - `ink-primary` (`#182230`): Midnight marine navy. Serves as the ultimate dark anchor (14.5:1+ contrast on cream and white surfaces) for all body text, primary actions, and key frame borders.
  - `ink-secondary` (`#384556`): Deep slate navy (> 7:1 contrast) for supporting metadata and secondary labels.
  - `border-distinct` (`#2D312E`): Solid charcoal border tone used at 1.5px–2px to definitively separate interactive modules.
  - `focus-indicator` (`#0D3B66` with `#FFFFFF` inner halo): Distinctive 3px high-contrast rings ensuring unambiguous accessibility focus states.

## Typography

The type system prioritizes letterform legibility and senior-friendly reading rhythms without sacrificing warmth:

- **Headings (Plus Jakarta Sans):** Brings soft, approachable curves and sturdy stems that avoid sharp, clinical geometry. Headlines are rendered in weights `700` and `800` to maintain character recognition against colored cards.
- **Body & Captions (Atkinson Hyperlegible Next):** Specifically designed to disambiguate easily confused glyphs (such as `1`, `l`, `I`, and `0`, `O`). An open aperture and distinguished stems support low-vision readers.
- **Reading Rules:**
  - Absolute minimum font size across all standard content is `14px` for auxiliary tags, with all main body text defaulting between `18px` and `20px`.
  - Line height defaults to a comfortable `1.55`–`1.65` scale to prevent text lines from blurring during reading.
  - Paragraph blocks limit line length to a maximum of 65 characters to optimize scanning.

## Layout & Spacing

Layouts are designed for single-column mobile ergonomics and fluid multi-column tablet/desktop views:

- **Touch Targets:** All primary mobile interactions respect a minimum target area of `52px × 52px` (optimal `56px` vertical height) to account for motor limitations and screen navigation.
- **Spacing Rhythm:** Generous vertical rhythm using an 8pt-derived base allows natural resting spaces between announcements, neighbor messages, and event cards.
- **Responsive Adaptations:**
  - **Mobile (< 640px):** Single-column layout with 20px outer margin, sticky bottom action bar within the natural thumb zone.
  - **Tablet (640px - 1024px):** 2-column asymmetric grid, splitting community noticeboards from building utility actions.
  - **Desktop (> 1024px):** Centered fixed max-width container (980px) to maintain comfortable, non-stretched reading widths.

## Elevation & Depth

To avoid optical haze, low-contrast shadows, and hard-to-distinguish elevations common in minimalist apps, visual depth is achieved via tactile framing and crisp structural contrast:

- **Boundary-Driven Contrast:** Cards and interactive modules do not rely solely on drop shadows for layering. Every card utilizes a distinct 1.5px solid border (`#2D312E` at 15–20% opacity on standard states, 100% on interactive focus).
- **Physical "Paper Layer" Elevation:**
  - **Level 0 (Canvas):** `#FDFBF7` warm linen background.
  - **Level 1 (Card/List item):** Solid `#FFFFFF` fill with a subtle tactile offset: `box-shadow: 0 3px 0 0 rgba(24, 34, 48, 0.08)`.
  - **Level 2 (Modals / Floating action bar):** Solid `#FFFFFF` surface with `box-shadow: 0 8px 24px -4px rgba(24, 34, 48, 0.16)`.
- **Keyboard & Touch Feedback:** State changes do not merely lighten opacity; active buttons physically depress slightly (`translateY(2px)`) to provide immediate mechanical reassurance.

## Shapes

The design uses roundedness tier `2` to balance approachability and structural clarity:

- **Cards & Modals:** `rounded-lg` (16px) creates a soft, friendly silhouette reminiscent of high-quality physical paper stationery, avoiding clinical harshness.
- **Buttons & Interactive Tags:** Rounded corners at `12px` to `16px` provide an organic thumb-friendly contour.
- **Badges & Accessibility Chips:** Pill shapes (`9999px`) are reserved exclusively for contextual tags and accessibility badges (e.g., "Ascenseur disponible") to instantly differentiate them from clickable rectangular cards and form fields.

## Components

### Buttons
- **Primary Action (Midnight Marine):** 56px minimum height, background `#182230`, foreground `#FFFFFF`, font `Plus Jakarta Sans 18px Bold`. Equipped with a subtle border and 16px corner radius.
- **Secondary Action (Terracotta Ochre):** Background `#B83A00`, foreground `#FFFFFF`, high visual prominence for community initiatives and urgent neighbor help requests.
- **Tertiary / Outlined Action:** Background `#FFFFFF`, 2px solid `#182230`, foreground `#182230`. Always high-contrast.

### Accessibility & Logistics Badges
- High-visibility rounded capsules pairing a clear SVG icon (minimum 20px) with explicit text:
  - *Mobility:* Sage green container (`#E8F5E9`), green ink (`#1F6838`), icon of elevator or level access with text "Ascenseur dispo".
  - *Equipment:* Warm sand container (`#F4EFE6`), dark ink (`#182230`), icon with text "Chaises prévues".
  - *Audience:* Ochre tint container (`#FFF3E0`), deep terracotta ink (`#B83A00`), text "Tous voisins bienvenus".

### Cards & Community Posts
- Base surface is crisp white (`#FFFFFF`) framed with a 1.5px `#2D312E` border and 16px radius.
- Author avatars are accompanied by clear names and apartment/floor labels in `18px Atkinson Hyperlegible Next`.
- Inter-card action triggers (e.g., "Prêter cet outil", "Participer") span full width on mobile with prominent, tactile buttons.

### Form Inputs & Selectors
- Minimum touch field height: 56px.
- Input backgrounds: Pure white with 2px borders in `#2D312E` for maximum field boundary recognition.
- Floating helper and label text never shrink below `16px` to avoid eye strain.
- Checkboxes and radio targets: 28px × 28px explicit touch box with high-contrast checkmarks.

### Participant & Solidarity Gauges
- Progress indicators for community drives (e.g., neighbor gathering quotas or emergency supplies) use solid high-contrast bar tracks: a `#F4EFE6` channel with a `#1F6838` (forest sage) fill bar.
- Always accompanied by clear textual indicators: "7 sur 10 voisins inscrits" displayed alongside numerical percentages.