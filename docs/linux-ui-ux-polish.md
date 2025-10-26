# Linux UI/UX Polish Plan

The current Linux experience suffers from inconsistent theme hydration, uneven layout primitives, and out-of-date component patterns. The work below focuses on refactoring (no net-new features) so that light/dark handling, Omarchy palette integration, and the overall window chrome feel coherent across Search, Quick Add, and Settings.

## Problems Observed

- **Theme sync gaps**: light/dark toggles in Settings don’t fully switch CSS tokens; Omarchy palette only updates part of the UI; symbolic icons and background surfaces disagree.
- **Component drift**: multiple ad-hoc panes/panels diverge from the newer `@/components/adwaita` primitives; spacing and typography tokens aren’t applied consistently.
- **Window parity**: search, quick-add, and settings each use different padding/grid systems; modal shadows and translucency differ by compositor.
- **Accessibility regression**: color contrast breaks when Omarchy provides lighter palettes, and focus outlines are missing in several controls.
- **Animation + micro-interaction fatigue**: older boxes (e.g. Quick Add) still use bespoke transitions that conflict with the Libadwaita-inspired set.

## Refactoring Strategy

1. **Theme Engine Cleanup**
   - Centralize light/dark + system palette hydration in a single `ThemeController` hook that reads GNOME/KDE state and Omarchy palette, emits CSS custom properties, and broadcasts updates.
   - Introduce granular CSS tokens (`--surface-{level}`, `--accent`, `--border-soft`) that map to Omarchy palette slots; ensure both light and dark palettes provide fallbacks.
   - Align icon + text contrast checks; surface warnings in dev mode when generated colors fail AA contrast.

2. **Component Re-alignment**
   - Replace legacy cards/stacks with adwaita `Pane`, `HeaderBar`, `Toolbar`, and `SegmentedButtons` across all windows.
   - Create shared layout wrappers (`WindowScaffold`, `ContentArea`) that encapsulate padding rules (16px narrow, 24px wide) and responsive gaps.
   - Normalize button/link variants; ensure focus outlines follow GNOME spec and appear in both themes.

3. **Window Polish**
   - Standardize backgrounds: overlay/search use blurred translucent surface; Quick Add/Settings share elevation tokens; ensure window chrome behaves with `window_chrome` preference.
   - Revisit modal sizing to match Libadwaita guidance (Quick Add 640×720, Settings 960×720 baseline) and enforce breakpoints for content sections.
   - Audit scrollbars and list selections for Adwaita expansions or toggles; ensure they adapt to compositor accent.

4. **State + Transition Harmonization**
   - Remove bespoke animation utilities; use Tailwind-based `transition-…` tokens consistent across modals.
   - Ensure all theme transitions respect `prefers-reduced-motion`.
   - Stabilize quick-add show/hide to use same fade+scale as search overlay.

5. **Validation + QA**
   - Add Playwright/Vitest visual assertions for light/dark windows using recorded Omarchy palettes.
   - Update manual test checklist with new focus: theme toggle, window parity across Hyprland/GNOME/KDE.

## Deliverables

- Refactored layout and UI primitives following the plan above.
- Verified light/dark switching and Omarchy sync across Search, Quick Add, and Settings.
- Documentation updates (`README`, `docs/linux.md`) describing light/dark/system theme behavior.
- Updated automated + manual QA scripts/checklists.

Refer back here when breaking the polish work into implementation tasks.
