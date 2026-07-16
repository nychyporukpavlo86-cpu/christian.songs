# WestPro Construction — Website

A professional, responsive marketing website for **WestPro Construction**, a
family-owned exterior contractor in Snohomish, WA. Rebuilt from the content of
[westproco.com](https://www.westproco.com/) with a modern, conversion-focused
design.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — hero, stats, services overview, why-us, warranty, process, testimonials, CTA |
| `services.html` | Full service list with detail (siding, masonry, roofing, decks, fencing, windows & doors) + materials & warranty |
| `about.html` | Company story, core values, team stats |
| `contact.html` | Contact details + free-estimate request form |

## Tech

- **Static HTML/CSS/JS** — no build step, no framework, fully self-contained.
- `css/styles.css` — design system (brand tokens, components, responsive grid).
- `js/main.js` — sticky header, mobile nav, scroll reveal, animated stat counters, form handling.
- Google Fonts: *Barlow Condensed* (headings) + *Inter* (body).
- Inline SVG icons — no icon-library dependency.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd westpro-site
python3 -m http.server 8080
# visit http://localhost:8080
```

## Content sourced from westproco.com

- Services: siding (incl. James Hardie fiber cement, cedar, metal), masonry,
  roofing, decks, fencing, windows & doors.
- Story: family-owned; grew from a single employee to 10+ employees and 25+
  skilled professionals; continues the legacy of City Construction.
- Values: integrity, excellence, transparency, collaboration, craftsmanship.
- Lifetime Workmanship Warranty on residential roofing, siding, window, door
  and gutter installations.
- Location: Snohomish, WA.

## ⚠️ Placeholders to replace before going live

The public site does not expose a phone/email, so these are **placeholders**:

- Phone `(360) 555-0142`
- Email `info@westproco.com`
- Social links (`#`)
- Testimonials are representative samples, not verbatim client quotes.

Swap in the real contact details, connect the contact form to a backend or
form service (e.g. Formspree, Netlify Forms), and add real project photography
in place of the styled image frames.
