# Schoolyard Defence home-menu design QA

## Comparison target

- Source visual truth: `C:\Users\jmbow1\AppData\Local\Temp\codex-clipboard-9dd78e08-867d-4d54-9955-fb96fc749b47.png`
- Source pixels: 1672 × 941 (aspect ratio 1.7768:1)
- Implementation desktop evidence: `test-artifacts/menu-hotspot-desktop-1777x850.png`
- Implementation pixels / CSS viewport: 1777 × 850 at deviceScaleFactor 1
- Implementation tablet evidence: `test-artifacts/menu-hotspot-tablet-1024x768.png`
- Implementation mobile evidence: `test-artifacts/menu-hotspot-mobile-390x844.png`
- State: settled home menu after the 1.5-second artwork-only reveal; New Game hovered in the desktop capture
- Density normalization: none required; both source and captures were assessed at 1× density with the source artwork rendered proportionally via `object-fit: contain`

## Full-view comparison evidence

The desktop implementation displays the complete source image at 1510.3 × 850 CSS pixels, centred with narrow dark letterbox columns. No source content is cropped, stretched, reconstructed, or covered by an opaque UI panel. The characters, title board, command brief, dossier, tagline, and bottom controls remain visible in their original proportions. The New Game hover treatment adds only a thin teal border/glow over the painted control.

The tablet capture keeps the complete image visible at 1024 × 576.3 with vertical letterboxing and no horizontal overflow. The mobile capture keeps the complete image visible at 390 × 219.5 and adds 46-pixel-high semantic New Game and Sprite Debug touch buttons beneath it because the painted controls are too small for reliable touch input.

## Focused-region evidence

- Right dossier: transparent New Game, conditional Continue Campaign, and Sprite Debug hit areas track percentage coordinates inside the rendered image bounds. Hover/focus does not obscure the painted labels.
- Bottom utility row: Options, Manual, Achievements, and Exit are semantic buttons with amber focus/hover borders. Placeholder actions return a visible status message rather than silently doing nothing.
- Difficulty state: New Game opens a compact dossier; Easy/Normal/Hard remain functional and Back restores the untouched artwork menu.

## Required fidelity surfaces

- Fonts and typography: all visible source typography remains in the raster artwork, so font family, weight, line height, spacing, wrapping, and antialiasing are exact to the selected visual. Only the post-click difficulty dossier and mobile fallback controls use live text.
- Spacing and layout rhythm: the complete 1672:941 composition is preserved; desktop is centred without crop, tablet letterboxes vertically, and portrait places the artwork/action group in the upper portion without horizontal overflow.
- Colors and visual tokens: the source pixels are unchanged. Interaction borders use restrained teal for campaign actions and amber for debug/utility actions.
- Image quality and asset fidelity: the exact user-selected PNG ships as `public/menu/schoolyard-defence-menu.png`; no visible source asset is recreated with CSS or placeholder art.
- Copy and content: painted menu copy is unchanged. Accessible button names mirror New Game, Continue Campaign, Sprite Debug Lab, Options, Manual, Achievements, and Exit.

## Comparison history

1. Earlier deployed implementation — blocked: giant opaque title panel covered the central artwork; left command/menu elements overlapped and clipped; background was barely visible (P0/P1).
2. First hotspot implementation capture — desktop P0/P1 findings resolved by using the exact full source image with transparent hit areas. Mobile retained a P2 composition issue because the intact artwork/action group sat too low with excessive dead space above.
3. Final capture — mobile group moved to 18vh, retaining the complete artwork and large touch targets. No actionable P0/P1/P2 differences remain.
4. Independent review found mobile utility actions missing, modal focus management incomplete, and invisible intro controls keyboard-focusable. The repair added all mobile actions, a width/coarse-pointer fallback, an inert intro stage, modal focus entry/trapping, Escape/Back close, and trigger-focus restoration. Post-fix evidence is recorded in `test-artifacts/menu-hotspot-results.json`; all assertions pass.

## Verification

- TypeScript typecheck: passed.
- Production build: passed.
- Version 2 smoke suite: passed.
- Browser interaction capture: passed (New Game, difficulty dialog, Back, keyboard focus, no console errors).
- Accessibility repair checks: passed (intro inert/no ghost focus; Easy receives initial modal focus; Tab and Shift+Tab wrap; Escape and Back restore trigger focus; all no-save mobile actions present with 52px touch targets).
- Small-landscape evidence: `test-artifacts/menu-hotspot-landscape-small-740x360.png`; the intact artwork remains uncropped and the menu is an internal vertical scroll container. The browser gate scrolls to and activates Exit at 740×360.
- Horizontal overflow: false at desktop, tablet, and mobile.

## Follow-up polish

- P3: portrait layouts necessarily show unused vertical space because the user explicitly chose an uncropped 16:9 artwork treatment. A separate portrait illustration would be required to eliminate that space without cropping or obscuring the selected image.

final result: passed
