# My Build Archive — scroll-driven freight experience

A cinematic, scroll-controlled logistics website. Scroll down and a reach stacker lifts a container onto a
**MY BUILD ARCHIVE** truck, the truck drives into a dark road with the services, "Reliability at every milestone"
doors slide open onto an ocean with a top-down container ship, then a cargo plane flies through the clouds.

Pure HTML / CSS / vanilla JS — no build step, no dependencies. Open `index.html` or serve the folder
(e.g. enable **GitHub Pages** on `main` / root).

## Scenes
| Scroll | Scene |
|---|---|
| 0 – 7 % | Sky loader → hero: *We move freight. We own the outcome.* |
| 7 – 28 % | Reach stacker picks the grey container off the stack and lowers it onto the truck |
| 28 – 46 % | Truck drives off, road floods dark, 4 services: customs, warehousing & 3PL, project cargo, domestic & interstate |
| 46 – 64 % | *Reliability at every milestone* — two pages open like doors, live-tracking card, counting stats |
| 60 – 85 % | Ocean: zoom out from container rows to the whole ship, foam wake, rippling reflection text |
| 82 – 96 % | Clouds + air-cargo plane, tiny ship far below |
| after | Quote calculator, shipment tracker, confetti CTA, loop back to start |

## Extras beyond the original
- **Honk the truck** (click it or press `H`) — synthesized WebAudio horn, speech bubble, confetti every 5th honk
- **Sound** (`S`) — procedural engine, sea and wind ambience that follow the scene
- **Night mode** (`N`) — dark theme + truck headlights; **Rain** (`R`) — particle rain overlay
- **Auto tour** (`Space` or "Watch the journey") — cinematic auto-scroll; any input stops it
- Chapter rail, scroll progress bar, cursor spotlight in the dark scene, mouse parallax
- **Instant quote + CO₂e estimate** (road / sea / air) and **live shipment tracker** with animated route (demo data)
- Fully responsive (desktop → phone) and respects `prefers-reduced-motion`

## Real photos
The scenes are drawn in SVG so they work offline, but three **photo slots** layer real photography on top when present.
Drop files into `images/` (any landscape JPG, ~1600px wide):

| File | Used for |
|---|---|
| `images/road.jpg` | hero thumbnail (aerial highway) |
| `images/ocean.jpg` | blended over the water in the ship scene |
| `images/clouds.jpg` | blended over the sky in the plane scene |

Missing files are skipped silently (the generated art shows instead).

## Notes
Stats, tracking data and prices are placeholders for demonstration only.
