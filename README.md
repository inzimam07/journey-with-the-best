# Journey with the Best

An immersive, cinematic marketing site for **Journey with the Best** — a local travel company specializing in private, personalized journeys across **Pakistan and Afghanistan**.

**Live site:** https://www.journeyswiththebest.com

## What's in here

- `index.html` — cinematic home: six-scene video reel + brand story, destinations, team, reviews
- `about.html` — long-form About: story, mission/vision/values, approach, regions, services, team
- `plan.html` — enquiry page: lead-qualified form + how-it-works + contact options
- `styles.css` — full design system (Manrope, gold-on-midnight palette, responsive, reduced-motion aware)
- `main.js` — scene activation, lazy video loading, scroll progress, viewport-aware source swap
- `assets/` — six 16:9 landscape videos (`video-1.mp4` … `video-6.mp4`) and `vertical/` 9:16 mobile cuts
- `sitemap.xml`, `robots.txt`, favicon

## Tech

Vanilla HTML / CSS / JS — no build step, no dependencies. Just serve it:

```bash
python -m http.server 8765
```

Then open http://127.0.0.1:8765.

## Design notes

- **Six video scenes** render the brand narrative: horses → people → heritage → serenity → cities → food.
- Mobile loads dedicated **9:16 vertical cuts** from `assets/vertical/` via `<source media>`; desktop gets the 16:9 originals.
- All typography is live HTML text layered over the videos — never baked in.
- Full SEO: TravelAgency / AboutPage / ContactPage / BreadcrumbList / FAQPage / Review JSON-LD, Open Graph, Twitter cards, canonical, sitemap.
