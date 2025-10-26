# Snips Settings UI Teardown (Hyprland Wayland Snapshot)

Source screenshot: `~/Pictures/2025-10-26-120221_hyprshot.png` (Hyprland, dark theme).

## High-Level Diagnosis

- Overuse of neon outlines creates low-contrast, high-glare surfaces that clash with Omarchy palettes and GNOME HIG guidance.
- Layout feels boxed-in with multiple nested rounded rectangles; no clear hierarchy between navigation, content headings, and controls.
- Typography lacks scale: headings, labels, and descriptive copy all render in similar size/weight, making scanning difficult.
- Component spacing is inconsistent (e.g., 8px gaps in segmented controls vs 32px gutters), breaking visual rhythm.
- Buttons mimic pill toggles but render flat; hover/focus feedback is unclear against dark backgrounds.

## Detailed Findings

### Navigation Sidebar

- Sidebar replicates window frame outline rather than using a dedicated navigation list.
- Active state relies on a thin cyan border, hard to perceive on dark surfaces.
- Items lack icons, destructive spacing (top/bottom) mismatched with content area.

### Content Surface

- “General Settings” card has double border stack (outer/inner) that introduces unnecessary noise.
- Section headers (“Appearance”, “Window Chrome”) lack typographic differentiation.
- Helper text sits too close to controls and uses same color as body copy, reducing readability.

### Theme Segment Control

- Three pills spaced evenly but without natural affordance; selected state relies purely on border thickness.
- No accessible focus ring or key-navigation hint; not aligned with GTK/libadwaita segmented button style.

### Window Chrome Options

- Card grid uses identical visual treatment to theme segment, causing ambiguous grouping.
- Copy blocks inside cards have inconsistent padding; bullet structure absent.
- Checkboxes bleed into border area due to minimal spacing, making alignment sloppy.

### Background & Elevation

- Background gradient leaks from wallpaper, while cards use transparent surfaces with cyan strokes — appears as layered wireframe, not native.
- No soft shadow/elevation cues to identify interactive regions; everything sits on same depth plane.

## Native Alignment Targets

- Adopt GNOME libadwaita patterns: muted elevation, soft corner radii (12px for windows, 9px surfaces), subtle 1px border only for outer surfaces.
- Use Cantarell-based typography scale (Title 3 = 20px/Medium, Heading = 16px/Semibold, Body = 13px/Regular).
- Align segmented controls and preference panes with AdwPreferencesPage/AdwPreferencesGroup analogues.
- Ensure focus state uses 2px accent outline with 3px corner radius, matching Wayland accessibility guidelines.

## Immediate Remediation Checklist

- Replace current outline-based container with layered surfaces (window background, sidebar surface, content surface).
- Introduce dedicated navigation sidebar component with iconography and active indicators matching GNOME.
- Redesign segmented buttons using tonal fill and accent stroke for selected state; add keyboard focus ring.
- Normalize spacing tokens (12/16/24) across padding, card gaps, and typographic margins.
- Update typography scale and color tokens to maintain contrast ratios ≥ 4.5:1 for body text.
- Prepare Storybook/Playwright baseline for Settings, Quick Add, and Search windows to guard future regressions.
