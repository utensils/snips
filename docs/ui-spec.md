# Linux-Native Component Spec (Hyprland/Wayland Focus)

This spec defines the first-pass component system required to deliver a native-feeling Snips UI on Omarchy Linux (Hyprland Wayland session). It draws from GNOME Human Interface Guidelines (Libadwaita) and existing Omarchy theme palette contracts.

## Design Tokens

### Colors

- `--color-surface-window`: base background (derived from Omarchy palette `surface-0`, fallback `#1f2329`).
- `--color-surface-raised`: elevated surfaces (`surface-1`, fallback `#272c33`).
- `--color-surface-subtle`: sidebar/backdrop surfaces (`surface-2`, fallback `#2d333b`).
- `--color-outline-soft`: 1px border (`surface-outline`, alpha 0.35).
- `--color-outline-strong`: 1px focus/selected border (`accent-muted`, alpha 0.6).
- `--color-accent`: primary accent (Omarchy `accent-primary`, fallback `#5e81ac`).
- `--color-accent-strong`: focus ring accent (alpha 1.0).
- `--color-text-primary`: body text (target contrast 4.8+).
- `--color-text-secondary`: helper text (target contrast 3.5+).
- `--color-critical`: error state (Omarchy warning color).

### Typography (Cantarell-Compatible)

- Title: 20px / 28px, weight 600.
- Section Heading: 16px / 22px, weight 600.
- Body: 13px / 20px, weight 400.
- Caption: 12px / 18px, weight 400.
- Button Label: 13px / 16px, weight 500.

### Spacing Grid

- XS: 8px (icon padding).
- SM: 12px (inter-component spacing).
- MD: 16px (default padding).
- LG: 24px (content gutters, surface spacing).
- XL: 32px (window-level margins where required).

### Radii & Elevation

- Window radius: 12px (when frameless).
- Surface radius: 9px.
- Control radius: 6px (buttons, inputs).
- Focus outline offset: 2px.
- Shadow (Wayland-friendly, subtle): `0 8px 24px rgba(0,0,0,0.24)` for raised surfaces, degrade gracefully under tiling WMs.

## Component Set

### Layout Primitives

1. `Surface`: wraps content with `surface-raised` background, 1px soft outline, 12/16 padding.
2. `Sidebar`: vertical navigation container (surface-subtle, 16px padding, 12px gap).
3. `ContentArea`: flex column with 24px padding, 16px section gap.
4. `Toolbar`: horizontal container with accent bottom border for use in Search/Quick Add headers.

### Navigation

- `NavigationSidebar`: items with an icon (16px symbolic) + label; selected state uses tonal accent fill (`accent` with 12% alpha) and 2px accent stripe on the left. Supports collapse to icon-only at widths under 640px.

### Controls

- `SegmentedControl`: horizontal container, each segment uses tonal fill, selected segment uses accent fill + contrasting text, focus ring when keyboarded.
- `PreferenceCard`: surface with heading, description, optional icon slot, and control area. Maintains 16px gap between description and controls.
- `CheckboxRow`, `SwitchRow`: align label/description with control on right (Libadwaita style).
- `ToolbarIconButton`: 32px square button with 6px radius, uses accent on hover, includes accessible tooltip.
- `PrimaryButton` & `TonalButton`: accent fill vs muted fill; both include 2px focus outline and disabled states (60% opacity for tonal, 40% for primary).

### Feedback

- `InfoBanner`: uses accent background at 12% alpha, left stripe, icon + text, close button.
- `Toast`: anchored to window bottom, 40px height, auto dismiss, matches Adwaita toast spec.

## Interaction & Behavior

- All focusable components must expose keyboard focus ring (2px accent).
- Segment controls cycle with arrow keys; Enter/Space toggles.
- Preference groups animate with 100ms ease-in-out transitions, disabled if `prefers-reduced-motion`.
- Surfaces adjust palette automatically when Omarchy theme updates; use CSS custom properties emitted by `ThemeController`.

## Accessibility

- Minimum contrast: 4.5:1 for text, 3:1 for icons.
- Focus states must remain visible under colorblind filters; accent color validated against neutral surfaces.
- Provide ARIA roles for navigation and segments; ensure button groups announce selection state.

## Deliverables

1. Tailwind theme extension mapping tokens.
2. Storybook stories for each component (light/dark/Omarchy palette).
3. Playwright snapshot tests verifying layout in GNOME and Hyprland contexts (using CSS env toggles).
4. Integration plan to migrate Settings, Quick Add, Search windows to new components.
