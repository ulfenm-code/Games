# Castle Duel v59

Play: https://ulfenm-code.github.io/Games/Castle/castle_index_59.html

This release addresses iPhone startup, stale GAME OVER state after rematches or a new bot selection, tactical use of the 60-second turn, and inconsistent aiming/shot state.

## Changes

- Start requests fullscreen in the original user gesture without blocking game startup on the fullscreen promise. The game fits the visual viewport, rotates the playing canvas in portrait, and maps touch coordinates through that rotation. A versioned web manifest and iOS web-app metadata support launch from the home screen.
- Every new round clears projectile state, all game timers and intervals, countdowns, input captures, placements, balloons, castle damage and terminal overlays. Responses and callbacks from an older round are ignored. Choosing a new opponent creates a new database match.
- In online rematches, only the host deletes old placements and shots. Both players drain outstanding writes before rematch consent; the guest waits for the host's cleanup acknowledgement. Conditional status updates handle simultaneous requests, and duplicate preparation is ignored.
- Shot resolution locks new input and turn expiry until the impact completes. Delayed callbacks cannot advance a later turn. Auxiliary castle-attack events cannot be mistaken for projectiles or consume the real shot in the same turn.
- A single captured aim supplies the weapon, power, release velocity and dotted preview. Extra touches cannot change the aimed weapon. Preview gravity matches the engine's discrete integration; rockets remain straight. Pointer cancellation clears the drag.
- All three levels remain implemented. Easy uses its existing short reaction delay. Medium can use up to 12 seconds of a favorable turn. Hard can wait within almost the entire 60-second turn, predicting visible balloon travel, bomb descent, health and incoming danger, and rechecking every half-second. The clock also expires on bot turns.
- The v58 protection against shooting friendly balloons remains in all three player-facing levels.

## Validation

See castle_verification_59.json for full results and limits.

- 21 lifecycle, timing, input and transport regression scenarios, including twelve consecutive bot rematches.
- 544 dotted trajectory samples matched the actual projectile engine on both sides with all weapons.
- 3,200 legal placements replayed and 802 ballistic solutions checked.
- 12,990 arrow replays across 12,000 decisions: zero friendly hits.
- 1,000 games per level against the fixed reference: easy 21.0%, medium 49.4%, hard 90.9% bot wins.
- 300 games per level against a reference that also waits tactically: easy 24.67%, medium 48.0%, hard 88.0% bot wins.
- Zero simulation timeouts and zero bot friendly balloon hits in these 3,900 games.

These percentages measure these automated opponents. They are not a guaranteed win rate against a human.

Tests execute the actual game and bot source with a simulated clock, DOM and network. Physical iPhone/Safari behavior and a live two-phone session still require device testing. On iPhone, standard web-page fullscreen is subject to browser support. For an app-like view without the Safari address bar, use Share → Add to Home Screen → Open as Web App, then launch the installed icon.

## Reproduce

From the repository root with Node.js:

```sh
node Castle/castle_simulator_59.mjs --verify --scenes 2000
node Castle/castle_simulator_59.mjs --count 1000 --seed 10000
node Castle/castle_simulator_59.mjs --count 300 --seed 10000 --reference referenceTactical --out castle_simulation_59_tactical_local.json
```

The test transport rejects unexpected real network access and highscore writes. Test data remains in memory.

Browser references:
- https://bugs.webkit.org/show_bug.cgi?id=206854
- https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
- https://support.apple.com/sv-se/guide/iphone/iph42ab2f3a7/ios
