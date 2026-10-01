---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#07006c'
  on-tertiary-container: '#7073ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.025em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

This design system delivers an authoritative, high-trust digital workspace engineered for modern legal, tax, and corporate advisory services (Gestoría y Asesoría Inteligente). The interface balances European fintech rigor (inspired by Stripe and Dutch legal-tech platforms) with the rapid keyboard-first density of next-generation productivity suites like Linear. 

The aesthetic is Modern Corporate Precision:
- **Trust & Competence:** Unshakable structural clarity, zero decorative clutter, and meticulously balanced data hierarchies designed for handling critical regulatory and financial documents.
- **Augmented Intelligence:** Subtle, purpose-driven AI accents that suggest proactive insights, automated document auditing, and smart filing without appearing playful or gimmicky.
- **Density with Air:** Maximum functional throughput for power users via compact layouts, crisp micro-borders, and high-readability typographic scales.

## Colors

The palette establishes an austere, institutional grounding punctuated by surgical accents of functional color:

- **Primary Canvas & Anchors:**
  - Base canvas: `#F8FAFC` (Slate-50) for an ultra-clean, glare-reducing workspace backdrop.
  - Surface cards: `#FFFFFF` pure white, bordered by `#E2E8F0` (Slate-200) to partition complex financial ledgers without heavy shadows.
  - Core Brand & High-Contrast Elements: `#0F172A` (Slate-900) for primary buttons, structural chrome, and dominant typographic hierarchy.

- **Interactive & Intelligence Accents:**
  - System Primary Action: `#2563EB` (Cobalt Royal Blue) for primary interactive highlights, focus rings, and action confirmations.
  - Intelligence / AI Tier: `#6366F1` (Indigo-Violet) strictly reserved for machine-assisted reconciliation, OCR extraction badges, and automated advisory suggestions.

- **Functional Status Indicators (Legal & Financial Lifecycle):**
  - **Success / Cleared / Filed:** `#10B981` (Emerald) text and dot indicators; `#ECFDF5` background.
  - **Pending / Action Required / Verification:** `#F59E0B` (Amber) text; `#FFFBEB` background.
  - **Critical / Overdue / Rejected:** `#EF4444` (Rose-Red) text; `#FEF2F2` background.
  - **Processing / Registry / External Sync:** `#0284C7` (Sky Blue) text; `#F0F9FF` background.

## Typography

The type system blends the contemporary, geometric authority of **Plus Jakarta Sans** for section headers and high-level KPIs with the pragmatic legibility of **Inter** across forms, multi-column tables, and document metadata.

- **Tabular Figures:** All financial figures, tax IDs (CIF/NIF), and document reference codes must enforce `font-feature-settings: 'tnum' 1, 'cv05' 1` to ensure numeric alignment across dense reports.
- **Monospace Integration:** Monospaced values (`JetBrains Mono`) are deployed specifically for IBANs, transaction hashes, OCR confidence indicators, and fiscal timestamp tokens.
- **Micro-Hierarchy:** The `label-sm` style operates predominantly in uppercase or title-case to tag legal document statuses with zero ambiguity.

## Layout & Spacing

The structural layout utilizes a strict 12-column responsive fluid grid designed to support complex dual-pane workspaces (e.g., invoice review on the left, automated tax declaration metadata on the right).

- **Grid Dynamics:**
  - **Desktop (≥ 1280px):** 12 columns with `gutter-lg` (24px) and outer margins fixed at `margin-lg` (32px). Secondary detail drawers slide out from the right without breaking the primary data table structure.
  - **Tablet (768px – 1279px):** 8 columns with `gutter` (16px) and `margin-md` (24px). Split screens collapse into segmented tab views.
  - **Mobile (< 768px):** 4 columns with `space-sm` (8px) gutters and `margin` (16px) outer edges. Action strips anchor to bottom viewports.
- **Rhythm Philosophy:** Dense horizontal layouts rely on compact vertical rhythm (`space-sm` for table row heights and form group clusters) to keep comprehensive accounts visible above the fold.

## Elevation & Depth

Visual separation relies on structural hairpins and micro-borders over heavy three-dimensional drop shadows:

- **Border-First Architecture:** Container boundaries use a crisp 1px solid rule in `#E2E8F0`. When layered over `#F8FAFC`, this creates surgical contrast without visual noise.
- **Ambient Elevation (Level 1 - Hover/Resting Cards):**
  - `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02);`
- **Floating Overlay (Level 2 - Menus, Datepickers, Command Bars):**
  - `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);`
  - Subtle top border highlight: `inset 0 1px 0 0 rgba(255, 255, 255, 0.8)`.
- **Modals & Drawers (Level 3):**
  - Backdrop: `rgba(15, 23, 42, 0.4)` with an ambient blur (`backdrop-filter: blur(4px)`).
  - Surface: Crisp `#FFFFFF` card with `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The design system employs a tailored **Soft** (`1`) geometric profile. Formality and precision require restrained corner radii to prevent the system from feeling consumer-playful:

- **Micro Controls & Badges:** `4px` (`rounded-sm`) for status indicators, micro-tags, filter pills, and table action buttons.
- **Standard Controls & Inputs:** `6px` (`rounded-md`) for text fields, selects, segmented controls, and standard action buttons.
- **Panels & Sheet Containers:** `8px` (`rounded-lg`) for workspace cards, data grids, modal bodies, and flyout sheets.
- **Strictly No Pill Shapes:** Buttons and badges must maintain squared, low-radius silhouettes to convey architectural stability.

## Components

### Buttons
- **Primary:** Background `#0F172A`, text `#FFFFFF`, border 1px solid `#0F172A`. On hover, background shifts to `#1E293B`. Active: subtle inset shadow.
- **Secondary / Standard:** Background `#FFFFFF`, text `#0F172A`, border 1px solid `#CBD5E1`. On hover, background `#F8FAFC`, border `#94A3B8`.
- **AI Smart Action:** Background `#6366F1`, text `#FFFFFF`, with an accompanying micro-sparkle glyph. On hover, background shifts to `#4F46E5`.
- **Destructive:** Background `#FEF2F2`, text `#EF4444`, border 1px solid `#FCA5A5`.

### Status Micro-Badges
- Built using 20px height, uppercase `label-sm` typography, and 4px corner radii.
- Composed of an inner 6px solid status circle beside the label:
  - *Filed/Paid:* Background `#ECFDF5`, text `#065F46`, dot `#10B981`.
  - *Pending/Audit:* Background `#FFFBEB`, text `#92400E`, dot `#F59E0B`.
  - *Action Needed:* Background `#FEF2F2`, text `#991B1B`, dot `#EF4444`.

### Data Tables & Tabular Records
- **Header:** Background `#F8FAFC`, border-bottom 1px solid `#CBD5E1`, typography `label-sm` in `#64748B`.
- **Rows:** Alternating transparent and `#FFFFFF` background. Hover triggers background `#F1F5F9` smoothly (100ms transition). Row dividers are 1px solid `#F1F5F9`.
- **Keyboard Navigation:** High-density selection ring: 2px solid `#2563EB` with an offset of -1px.

### Input Fields & Selects
- Height fixed at 36px for high spatial efficiency.
- Border 1px solid `#CBD5E1`, background `#FFFFFF`, text `#0F172A`.
- Focus state: border `#2563EB`, paired with a crisp outer glow: `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15)`.

### Intelligence Suggestions / Advisory Callouts
- Border: 1px solid `#E0E7FF` with a left border accent: 3px solid `#6366F1`.
- Background: `#EEF2FF`.
- Content: Explanatory note rendered in `body-sm` (`#3730A3`) accompanied by rapid inline "Approve" / "Dismiss" micro-actions.