/** Curated per-component page sections rendered between the preview and settings. */
import { buttonDetailSections } from "./button-page-details.ts";
import type { UiComponent } from "./shared.ts";

export function componentDetailSections(
  component: UiComponent,
  packageImport: string,
): string[] {
  const planBadgeDetails =
    component.importPath === "components/plan-badge"
      ? [
          "## Tier palettes",
          "",
          "Every plan badge animates its gradient background independently of the white sheen.",
          "",
          "Teams uses the vertical three-stop Silk Blend palette from [21st.dev](https://21st.dev/community/gradients/bg-9204599f-25c3-4b59-ba38-5053bc3fde79): `#031C26`, `#1B6AA7`, and `#57D2F4`, with the pale white stop removed.",
          "",
          "A Major Pass uses an animated dark indigo, violet, rose, and amber gradient inspired by the [21st.dev Animated Gradient Background](https://21st.dev/@hammamikhairi/components/animated-gradient-background); Desktop now uses the former champagne-gold A Major Pass palette. Business uses a wider 500% field to soften its repeated cyan, green, yellow, blue, violet, pink, and amber stops.\n\nPro keeps its soft holographic pastel palette. Subscription pricing borders reuse each plan badge palette. The standalone Ryu Gateway PAYG card uses the supplied [Ryu logo palette](https://irp.cdn-website.com/bb3e50d5/dms3rep/multi/logo+container2.svg) on its animated hover border. Self-Hosted Free keeps champagne-gold. Hover speeds up the rings. Reduced-motion preferences disable gradient drift and sheen.",
          "",
        ]
      : [];
  const textMorphDetails =
    component.importPath === "components/text-morph"
      ? [
          "## Text morphing",
          "",
          "This Ryu primitive is backed by [Torph](https://github.com/lochie/torph), a dependency-free text morphing library. It accepts text-only children and keeps the current value available to assistive technology while visual segments move between values.",
          "",
          "The shared default is a 240 ms ease-out transition with `respectReducedMotion` enabled. Use `disabled` for a host-controlled static state, `numbers={false}` for ordinary character matching, or `as` to choose the semantic element when a heading or other text element is appropriate.",
          "",
        ]
      : component.importPath === "components/text-swap"
        ? [
            "## Text morphing behavior",
            "",
            "`TextSwap` is the compatibility entry point for short button-state changes. Its existing API now uses the shared Torph-backed text morph with a 160 ms duration, while the component continues to respect reduced-motion preferences.",
            "",
          ]
        : [];
  const tabsOverflowDetails =
    component.importPath === "components/tabs"
      ? [
          "## Scrollable tab strips",
          "",
          "Set `manageLayout={false}` to keep every tab in a single horizontally scrollable strip. When the strip overflows, left and right arrow controls appear at its edges, with the edge fade showing which direction still has content. An arrow fades out and becomes disabled when the strip reaches that edge.",
          "",
          "The arrows page through roughly 80% of the visible strip. Selecting or focusing an offscreen tab scrolls it into view without moving the surrounding page, and scrolling respects reduced-motion preferences.",
          "",
        ]
      : [];
  const colorPickerDetails =
    component.importPath === "components/color-picker"
      ? [
          "## Recent colors",
          "",
          "The complete panel follows the Fluid Functionalism interaction model with saturation/brightness, hue, alpha, and format controls for HEX, RGB, HSL, and OKLCH values. The built-in swatch strip shows recent selections above any supplied `swatches` presets.",
          "",
          "Recent colors are shared by Ryu picker instances and retained in local browser storage. Set `showRecentColors={false}` when a surface should show only its supplied presets. Use `ColorPickerPanel` to compose the complete panel while preserving a custom trigger, or use `ColorPickerPopover` for the compact swatch trigger and panel together.",
          "",
        ]
      : [];
  const otpInputDetails =
    component.importPath === "components/motion/otp-input"
      ? [
          "## Device-code display",
          "",
          'Use `readOnly` to show a populated code with the same slots as an editable one-time-code field. Set `size="compact"` for a code shown inside a dialog or list. `OTPCodeDisplay` normalizes alphanumeric auth and device codes, sizes itself from the actual code, and splits even codes of six or more characters into two groups (for example, eight as 4+4 or six as 3+3).',
          "",
          "```tsx",
          `import { OTPCodeDisplay } from "${packageImport}";`,
          "",
          '<OTPCodeDisplay aria-label="Device code" code="ABCD1234" size="compact" />',
          "```",
          "",
        ]
      : [];
  const catalogBadgeDetails =
    component.importPath === "components/badge"
      ? [
          "## Catalog labels",
          "",
          "| Appearance | Purpose |",
          "| --- | --- |",
          "| `catalog-label` | Compact evaluator mode or community disclosure label. |",
          "",
          "This appearance uses the native compact type treatment, narrow horizontal padding, and no vertical padding. Keep the badge variant, label content, and disclosure action at the calling site.",
          "",
        ]
      : [];
  return [
    ...tabsOverflowDetails,
    ...planBadgeDetails,
    ...textMorphDetails,
    ...colorPickerDetails,
    ...otpInputDetails,
    ...buttonDetailSections(component),
    ...catalogBadgeDetails,
  ];
}

export function logoDetailSections(component: UiComponent): string[] {
  return component.importPath === "components/logo"
    ? [
        "## Trace loader",
        "",
        'Use `variant="trace"` for a short stroke that loops around the ghost outline. Set `loading={false}` or `isComplete={true}` to close the outline and fade into the filled mark with transparent eye cutouts.',
        "",
        "```tsx",
        '<Logo variant="trace" size="64px" loading={loading} onDone={handleRevealDone} />',
        "```",
        "",
        "`loading` defaults to true. `onDone` fires once after the fill is visible, and resets when a new loading cycle starts. The reveal uses timers so it also completes without animation events. `animated={false}` or reduced motion shows the filled mark immediately and calls `onDone`.",
        "",
        "The trace uses `currentColor` and keeps its dimensions stable; `size` accepts CSS lengths. `strokeWidth` defaults to 1.5 SVG units, `loopDurationSeconds` to 1.6, and `fillFadeSeconds` to 0.3. `ariaLabel` defaults to Loading; provide a label that describes your task. `showEyes={false}` removes the cutouts. When enabled, the eye cutouts stay transparent with the shared theme stylesheet or the component’s built-in fallback.",
        "",
        "## Rounded 3D ghost",
        "",
        'Use `variant="3d"` for a real, closed WebGL mesh with a smoothly rounded body, face, and tail. Drag horizontally or focus the model and use the left/right arrow keys to rotate it; Home restores the front view.',
        "",
        "`animated={false}` disables motion, blinking, expression cycling, and rotation controls, displaying a representative still pose of the selected animation. Reduced-motion preferences also stop automatic motion while keeping deliberate rotation available. Rendering pauses while offscreen or when the tab is hidden.",
        "",
        '`bodyStyle="orb"` wraps the 3D body in flowing colors from the default logo palette. Customize it',
        "with `colors={{ bg, c1, c2, c3 }}`; CSS colors including OKLCH are supported. `animationDuration`",
        "controls the color-flow speed in seconds (default 20). The solid pearl body remains the default;",
        "`colors.bg` sets its color. Color flow also stops with `animated={false}` or reduced motion.",
        "",
        "`size` accepts CSS lengths, `eyeScale` adjusts the oval eyes, and `showEyes={false}` hides them. All",
        "17 named `expression` values are supported in 3D, including the crossed eyes of `dead`.",
        '`expression="random"` changes the face every four seconds while motion is enabled. Eye width,',
        "openness, tilt, spacing, and gaze share the 2D expression definitions. Expressions blend smoothly over",
        "450 ms.",
        "",
        'All 14 named `animation` values and `animation="random"` work in 3D, including wink, thinking, sleep,',
        "orbit, burst, and comet. The shared timeline drives the body and eye poses, with three-dimensional dots",
        "and marks. Orbit, burst, and comet use rounded particle trails in the body palette; the ghost dissolves",
        "and reforms during burst and comet. Idle eye blinks close and reopen smoothly; wink, sleep, and crossed",
        "eyes retain their own poses.",
        "",
        "The 3D renderer loads only when this variant is used. A static outline appears while it loads and if WebGL is unavailable or its context is lost.",
        "",
      ]
    : [];
}
