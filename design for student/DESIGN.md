---
name: Bridging Intelligence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is anchored in the concept of the "Bridge" (Setu)—a connection between current knowledge and future potential. It balances the rigor of academic excellence with the fluid intelligence of modern AI. The aesthetic is **Corporate Modern** with a refined **Minimalist** overlay, prioritizing clarity and cognitive ease to ensure users feel both supported and empowered.

The visual language avoids clinical coldness, instead opting for a "human-centric tech" vibe. This is achieved through generous whitespace, high-quality typography, and a deliberate focus on "focus-first" layouts that minimize distractions while maintaining a sophisticated, high-end feel.

## Colors

The palette uses **Deep Navy Blue** as the primary anchor to symbolize stability and professional trust. The **Growth Green** serves as the secondary accent, representing progress and the successful crossing of the learning "bridge."

- **Primary:** Deep Navy for text, headers, and core brand elements.
- **Secondary:** Emerald Green for success states, progress indicators, and growth-related motifs.
- **Tertiary:** AI Blue, used sparingly for interactive AI features and subtle highlighting.
- **Neutrals:** A range of soft grays and cool whites to maintain a breathable, airy interface that prevents cognitive overload.

## Typography

The typographic strategy pairs a sophisticated serif with a modern geometric sans-serif to bridge tradition and innovation. 

- **Headings:** Use the serif font for all major titles and section headers. This adds a layer of academic authority and "literary" sophistication.
- **Body & Interface:** Use the sans-serif font for all instructional content, buttons, and UI labels. This ensures maximum legibility across all screen sizes and maintains a high-tech, functional feel.
- **Hierarchy:** Maintain a clear distinction between editorial content (serif) and functional UI (sans-serif).

## Layout & Spacing

This design system utilizes a **12-column fixed grid** for desktop environments to ensure a focused, centered learning experience. The layout philosophy is built on an 8px rhythmic scale.

- **Vertical Rhythm:** Use generous padding (64px+) between major content blocks to facilitate "deep work" and focus.
- **AI Sidebar:** AI-driven tools should reside in a persistent or collapsible side-sheet, distinct from the primary learning content.
- **Responsive Behavior:** Transitions from a 12-column desktop grid to a single-column stack on mobile, maintaining the 16px safe-area margins.

## Elevation & Depth

To reflect a modern, high-tech feel, depth is conveyed through **Tonal Layers** and **Ambient Shadows**. 

1.  **Level 0 (Base):** The primary background color (White/Soft Gray).
2.  **Level 1 (Cards):** Subsurface elements with a subtle 1px border (#E2E8F0) and a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)).
3.  **Level 2 (Modals/Overlays):** Elevated elements that use a slightly stronger shadow and, where appropriate, a backdrop blur effect (12px) to simulate "Glassmorphism" for AI interfaces.

Avoid heavy black shadows; instead, use shadows tinted with the primary navy color at very low opacities (2-5%).

## Shapes

The shape language is consistently **Rounded**, evoking a sense of approachability and safety. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Content cards and feature blocks use a 1rem (16px) radius to create a soft, modern container.
- **Interactive Prompts:** AI chat bubbles or "bridge" elements may use larger, asymmetric rounding to feel more organic and human.

## Components

The components within this design system are designed to be tactile and clear, minimizing friction in the educational journey.

- **Buttons:** Primary CTAs should be solid Navy or Emerald with white text, featuring a subtle lift effect on hover. Secondary buttons should use a "Ghost" style with a 1px border.
- **Input Fields:** Large, clean fields with 16px internal padding. Focus states are indicated by a 2px Emerald Green ring.
- **Cards:** Used for course modules or AI insights. They must include a clear heading (serif) and a short summary (sans-serif) with a subtle bottom-aligned progress bar.
- **Chips:** Small, rounded pills for tags or categories, using low-saturation versions of the primary/secondary colors (e.g., light blue background with dark blue text).
- **Progress Bridge:** A custom component representing the 'Setu', showing a path from left to right, transitioning from Navy to Green as the user completes tasks.
- **AI Interaction Node:** A specifically styled component with a subtle gradient border and a backdrop blur, indicating where the AI is processing or providing feedback.