---
name: Structured Minimalist
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e1'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#615e57'
  on-secondary: '#ffffff'
  secondary-container: '#e7e2d9'
  on-secondary-container: '#67645d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e7e2d9'
  secondary-fixed-dim: '#cbc6bd'
  on-secondary-fixed: '#1d1c16'
  on-secondary-fixed-variant: '#494740'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e1'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  h1-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 48px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style
The design system adopts a "document-first" aesthetic, prioritizing information density, clarity, and utility over decorative flourish. It is heavily influenced by minimalist and architectural design principles, evoking the feeling of a high-end digital workspace or a meticulously typeset publication.

The target audience consists of professionals, knowledge workers, and organizations that value focus and longevity. The UI aims to evoke a sense of calm, order, and infinite canvas.

**Key Style Attributes:**
- **Minimalism:** Aggressive use of white space to separate concerns rather than lines or colors.
- **Monochrome:** A restricted palette that ensures content remains the primary focus.
- **Structural Integrity:** Elements are aligned to a strict grid, using thin borders to define functional zones without adding visual weight.

## Colors
This design system utilizes a high-contrast monochrome palette. The background is a stark white to mimic paper, while text is a "near-black" to reduce eye strain while maintaining maximum legibility.

- **Primary:** Used for the most critical text and iconography.
- **Secondary:** A slightly softer dark gray for secondary information and metadata.
- **Neutral:** A very light gray used for subtle hover states, callouts, and background layering.
- **Border:** A consistent light gray (#e5e5e5) used for all structural divisions.
- **Accent:** A single blue shade, used sparingly for specific interactive highlights or links.

## Typography
Typography is the primary driver of hierarchy in this system. By using **Inter**, the design remains systematic and functional. 

- **Weight as Signal:** Use `600` and `700` weights to differentiate headers from body copy. 
- **Line Height:** Generous line heights (1.6 for body) are used to ensure long-form text remains readable and "breathable."
- **Scale:** On mobile devices, the H1 scale is reduced to maintain screen real estate while maintaining the heavy weight.

## Layout & Spacing
The layout follows a fluid-to-fixed model. Main content areas are centered with a maximum width of 1200px to prevent excessively long line lengths, which degrades readability.

- **The 4px Grid:** All spacing units are multiples of 4, ensuring a mathematical rhythm across the interface.
- **Padding:** Containers should use generous internal padding (`space-lg`) to maintain the "document" feel.
- **Alignment:** Left-alignment is preferred for almost all text-heavy content to maintain a strong vertical "axis of read."

## Elevation & Depth
This design system avoids physical metaphors like drop shadows. Instead, it uses **Tonal Layers** and **Outlines** to create depth.

- **Level 0 (Surface):** The primary white background.
- **Level 1 (Sub-surface):** Used for sidebars or secondary panels, utilizing the `neutral_color_hex` (#f1f1f0).
- **Level 2 (Overlays):** Modals or menus use a thin 1px border (#e5e5e5) and a very subtle, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)) only when necessary to separate from the background.
- **Interaction:** Hover states are indicated by a subtle background color change to the neutral gray rather than a lift effect.

## Shapes
Shapes are controlled and geometric. A "Soft" roundedness level is applied to provide a modern touch without becoming overly playful or organic.

- **Base Radius:** 4px (0.25rem) for small components like inputs, checkboxes, and buttons.
- **Large Radius:** 8px (0.5rem) for cards and modals.
- **Pill:** Reserved exclusively for tags or specific status indicators.

## Components
Components are designed to be utilitarian and unobtrusive.

- **Buttons:** 
  - *Primary:* Black background with white text. 
  - *Secondary:* White background with a 1px #e5e5e5 border and #1a1a1a text.
  - *Ghost:* No border/background, turns into #f1f1f0 on hover.
- **Input Fields:** 1px #e5e5e5 border, 4px radius. Focus state uses a subtle 1px #1a1a1a border or a soft blue halo.
- **Cards:** White background, 1px #e5e5e5 border, no shadow. Content inside should have ample padding.
- **Lists:** Clean lines, no bullets by default. Use 1px bottom borders between items only when necessary for high-density data.
- **Chips/Tags:** Small font size, light gray background (#f1f1f0), and a 4px corner radius.
- **Checkboxes:** Square with a 2px radius. When checked, use the primary black or the accent blue.