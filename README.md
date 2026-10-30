# NOCTIS — The City Is Asleep

A premium, minimal scrollytelling website for **NOCTIS**, a fictional electric vehicle marque.

> *"A city in total blackout at night where the car's light is the only light in the world."*

---

## Highlights

- **Scroll-Scrubbed Canvas Sequences:** Plain `<canvas>` frame scrubbing with zero `<img>` swapping and no `<video>` elements.
- **Strict Aesthetic Discipline:** 
  - Zero gradients (no linear, radial, conic, or gradient masks).
  - Zero glassmorphism (no blur, no backdrop-filter).
  - Zero glows or drop shadows.
  - Pure flat solid colors, 1px hairlines, photography, and typography.
- **High-Performance Priority Queue:** 6 parallel frame loaders prioritizing frames closest to the user's scroll position for immediate response.
- **Hardware-Accelerated Lineup Accordion:** Dual-layer GPU composition smoothly transitioning between closed front-light thumbnails and full side-profile models.
- **Zero Libraries or Frameworks:** Built strictly with vanilla HTML5, CSS3, and JavaScript.

---

## Tech Stack & Design Tokens

- **Fonts:** Archivo (Variable Width 125), Inter (400), JetBrains Mono (400)
- **Colors:**
  - `--asphalt`: `#07080A` (Page Background)
  - `--graphite`: `#121418`
  - `--fog`: `#8A8F98`
  - `--bone`: `#EDEAE4` (Typography)
  - `--xenon`: `#CFE3FF` (Light Signature Accent)
  - `--taillight`: `#E1251B` (Telemetry Tick & Status)
  - `--hairline`: `rgba(237, 234, 228, 0.12)`
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)`

---

## Getting Started

Run with any local static server:

```bash
# Using Python
python -m http.server 8000

# Or double click start_server.bat on Windows
```

Then visit [http://localhost:8000/index.html](http://localhost:8000/index.html).

---

## License

Creative Commons Zero (CC0) / MIT — Educational & Portfolio demonstration.
