# Urban Nook — Diwali Design Notes

Date: 26 October 2026

This document records the experimental design you reviewed. The experiment has
been removed and its implementation changes reverted. These are reference
specifications, not changes applied to the current storefront.

## 1. The idea

**“Diwali, in a different light.”**

The design used Urban Nook's product photography as the main source of colour
and festive glow. Large headings, quiet backgrounds and consistent spacing
made the products feel important. Fine diya, rangoli and string-light details
provided a Diwali setting without surrounding every product with decoration.

The hero copy was **“A little light. A lot of you.”** The word “you” used Nook
Red. The supporting sentence explained the collection, followed by one main
button: **“Explore the edit.”**

## 2. Existing brand colours

All storefront experiment colours came from the existing `index.css` tokens.
No global token was changed.

| Token | Existing colour | How it was used |
| --- | --- | --- |
| `--gl-brand` | `#E63329` | Hero emphasis, small separators, offer accent rule |
| `--gl-brand-hi` | `#C9281F` | Main button background, providing stronger contrast for small text |
| `--gl-ink` | `#141414` | Hero, offer band, footer, light-mode text |
| `--gl-paper` | `#EFEAE0` | Light-mode page, text on ink, small image labels |
| `--gl-surface` | `#E5DFD3` | Light-mode coupon panels and secondary surfaces |
| `--gl-muted` | `#615C50` | Supporting text on light surfaces |
| `--gl-hair` | `#D8D2C5` | Light-mode borders and separators |

The product photographs retained their natural colours. No separate festive
purple, orange, gold or burgundy palette was introduced into the redesigned UI.

In dark mode, local surface aliases used ink for the page and paper for text.
Secondary panels mixed 94% ink with 6% paper; muted text mixed 70% paper with
30% ink. Borders used paper at 20% opacity. These were local aliases, not
overrides of the site's global colour variables.

## 3. Fonts and exact sizes

Three existing font families established the hierarchy:

- **Archivo:** headlines, section headings, product names and major coupon values.
- **Inter:** paragraphs, navigation, buttons and normal price text.
- **JetBrains Mono:** small uppercase section labels, indexes and countdown numerals.

Fonts were self-hosted through the project's existing font packages. Most main
headings used weight **600**, product names **600**, offer-card titles **700**,
and body text **400**. The following values record the actual preview CSS.

`clamp(minimum, fluid, maximum)` lets a size grow with the viewport while staying
within limits. `vw` is 1% of viewport width. `ch` approximates a character width.

| Element | Desktop | Mobile, up to 639px | Line height / weight |
| --- | --- | --- | --- |
| Hero main heading | `clamp(48px, 6.7vw, 104px)` | `clamp(44px, 12.7vw, 74px)` | 1.03 / 600 |
| Hero supporting paragraph | 14px | 12px | 1.85 desktop; 1.8 mobile / 400 |
| Hero uppercase label | 10px | 9px | 1.7 / 400, mono |
| Main button text | 12px | 12px | Inherited / 600 |
| Gift/coupon section heading | `clamp(28px, 3vw, 44px)` | 30px | 1.12 / 600 |
| Section supporting paragraph | 13px | 12px | 1.6 / 400 |
| Offer section heading | `clamp(32px, 3.7vw, 54px)` | 39px | 1.05 / 600 |
| Offer section supporting text | 13px | 13px | 1.8 / 400 |
| Product-card name | 15px | 13px | 1.45 / 600 |
| Product-card price | 14px | 13px | Inherited / 400 |
| Offer-card title | 27px | 30px | 1.08 / 700 |
| Offer benefit | 14px | 14px | Inherited / 400 |
| Offer conditions paragraph | 11px | 12px | 1.8 / 400 |
| Coupon headline, e.g. “10% OFF” | 25px | 23px | Normal / 600, Archivo |
| Coupon conditions | 11px | 10px | 1.5 / 400 |
| Coupon terms note | 9px | 9px | Inherited / 400 |
| Countdown numerals | 20px | 20px | Normal / 700, mono |
| Countdown description | 10px | 10px | Inherited / 400 |
| Product-page editorial heading | `clamp(34px, 4vw, 58px)` | 43px | 1.07 / 600 |
| Product-page product name | 17px | 17px | 1.4 / 500 |
| Product-page description | 12px | 12px | 1.8 / 400 |
| Product-page price | 23px | 23px | Inherited / 400 |
| Product-page previous price | 14px | 14px | Inherited / 400, struck through |
| Closing sentence | 27px | 25px | Normal / 500 |

At a 1440px desktop viewport the hero heading was **96.48px**; at a 390px
phone viewport it was **49.53px**. Between 640px and 1000px, the hero used a
separate `6.8vw` rule, approximately 52.22px at 768px.

Heading letter spacing was deliberately tighter than body text: hero `-0.075em`
on desktop and `-0.065em` on mobile; normal section headings `-0.055em`; offer
section headings `-0.06em`. Uppercase labels used positive spacing of `0.13em`.
Paragraphs kept normal spacing.

Auxiliary labels were smaller: product category 8px, image badge 7px desktop /
6px mobile, and image credits/indexes 7–8px. These sizes describe the prototype;
for a production iteration, increasing tiny secondary labels to 10–12px would
improve readability. Essential eligibility information should never depend on
a tiny decorative label.

## 4. Page structure and placement

The homepage sequence was:

1. A quiet announcement strip.
2. A simple header with the wordmark at left and navigation beside it.
3. A dark hero: headline and action at left, product photograph at right.
4. A thin editorial divider with three short audience phrases.
5. A calm gifting section on paper, containing four products.
6. A dark offer section featuring the actual offer without empty teaser tiles.
7. Two simple coupon tickets on paper.
8. A closing sentence, small diya and restrained footer.

The current and redesigned comparisons shared a preview header; the experiment
did not replace the production navigation or brand assets.

### Hero

- Desktop grid: `1.05fr 1fr`, with a 4% gap. The text side was slightly wider.
- Outer padding: **74px top, 6% sides, 48px bottom**; minimum height **640px**.
- Text order: eyebrow → heading → short paragraph → primary button → small footer line.
- Heading margin: **27px above / 24px below**.
- Paragraph width: **34ch**, keeping the copy readable instead of spanning the column.
- Main button: **17px vertical / 22px horizontal padding**, minimum height **52px**;
  **32px** space above it. The arrow and label were separated by **35px**.
- Product image: square frame, 1px translucent border, `object-fit: cover`.
- Image caption: anchored at the bottom, with a dark gradient behind it for contrast.
- Mobile: one column, copy first and image second; **48px 24px 28px** outer padding,
  **30px** between blocks, **36ch** paragraph width, **24px** above the button.
- Mobile image: a slightly wider `1.15` aspect ratio and a **36px left inset**,
  creating a small editorial offset without moving the text alignment.

### Gift section

- Desktop section padding: **76px vertically / 6% horizontally**.
- Heading group at left; a quiet collection count at right, bottom-aligned.
- **32px** between heading group and product grid.
- Grid: **4 equal columns**, **22px** gaps. At widths up to 1000px, gaps became **14px**.
- Mobile: **46px vertical / 20px horizontal padding**; **24px** below the heading;
  **2 equal columns**, **14px column gaps / 28px row gaps**.
- Product photographs: consistent **4:5** frames, so rows felt deliberately aligned.
- Captions: **16px** below the image on desktop, **12px** on mobile.
- Product-name area: minimum **44px** desktop / **54px** mobile to align prices.
- Price row: fine top border and **12px** top padding.
- Image label: top-left; small open arrow: bottom-right. Neither occupied the
  central product area.

### Offer section

- Desktop padding: **70px vertically / 6% horizontally**.
- Grid: `.8fr 1.2fr`, with a **7% gap**. Introduction at left, larger offer card at right.
- Card: photograph and explanation in equal columns; **25px** content padding.
- Thin border and very subtle surface tint rather than layered gold outlines or shadows.
- Benefit: a **2px red vertical rule** and **10px** left padding.
- Countdown: below the introduction, separated by a fine rule; **26px** margin
  and **24px** top padding.
- Up to 1000px: section stacks into one column with a **35px gap**; card content
  padding becomes **35px**.
- Mobile: **46px 20px** section padding, **30px** section gap; offer image above
  text; **25px** content padding and image ratio **1.4**.

The captured offer was presented once. The redesign did not create “Coming
Soon” cards to fill a six-slot layout. The offer's name and benefit remained
snapshot data, rather than new marketing promises.

### Coupons

- Desktop: two equal columns, **24px** gap, tickets at least **132px** high.
- Ticket reading order: percentage mark → benefit → eligibility → details action.
- One dashed vertical separator distinguished the action area.
- Action area: **95px** wide on desktop, **70px** at intermediate widths.
- Mobile: one column, **14px** gap, minimum **120px** ticket height and a **66px** action area.
- Surface: existing stone/paper tones with one border; no burgundy gradient or glow.

### Product page

- Desktop: image at left, details at right; `1.05fr 1fr` grid with a **7% gap**.
- Page padding: **30px top / 6% sides**.
- A short editorial heading led into the actual product name and price.
- Description, variant selector and primary action followed in shopping order.
- Variant buttons: **12px** padding, **44px** minimum height, **8px** gaps.
- Offer note: separate ink panel beneath the action; **30px** top margin and **25px** padding.
- Mobile: stacked image/details, **28px** gap, **15px top / 20px side padding**.

## 5. Backgrounds, gradients and decorations

The main lighting effect was a static red radial gradient:

```css
radial-gradient(
  ellipse at 78% 45%,
  rgb(var(--gl-brand) / 0.13),
  transparent 63%
)
```

It added warmth behind the hero/offer composition while preserving the ink
background. The image caption used a transparent-to-ink gradient ending at
94% opacity, making its text readable over photography.

Decorations were thin SVG/CSS elements placed along boundaries:

- A fine light string across the hero's upper edge, with nine tiny lights.
- A small toran near the top, away from the headline.
- A partly cropped rangoli at the lower-right edge, rather than behind text.
- A small diya near the lower edge and another beside the closing line.
- Up to five tiny sparks and one short line-art firework, subject to campaign controls.

Decorative layers ignored pointer events, were hidden from assistive technology,
and were clipped to their section. They did not add layout height or cover buttons.

## 6. Motion

| Effect | Actual treatment |
| --- | --- |
| String lights | Opacity gently varied over 5 seconds, staggered per light |
| Tiny sparks | Opacity varied over 6 seconds, staggered per spark |
| Diya flame | 4-second cycle; scaleY from 1 to 1.06 and opacity from .8 to 1 |
| Line firework | One 2.5-second animation; grew from .65 scale to 1, ending faint |
| Product hover | Image scaled to 1.035 over .5 seconds |
| Main button hover | Moved up 2px over .2 seconds and darkened slightly |

The redesign had no click-triggered fireworks, cursor effects or rotating
rangoli. OS reduced-motion preference disabled its animations and transitions;
the preview also provided a CSS-motion pause control.

## 7. How the design stayed clean

1. **One focal point per section.** The hero sold the mood; the grid showed
   products; the offer band explained one offer; tickets explained coupons.
2. **A consistent alignment system.** Desktop content shared 6% side gutters;
   mobile shopping sections shared 20px gutters. Text was predominantly left-aligned.
3. **Space separated ideas.** Large section padding did more work than extra
   borders, badges or decorative boxes.
4. **Colour had a purpose.** Red identified emphasis and action. Ink and paper
   established section rhythm. Product photos supplied the remaining colour.
5. **Restrained framing.** Square geometry and thin borders echoed the existing
   brand. Product cards avoided stacked shadows and gold outlines.
6. **Predictable reading order.** Category, product name and price occupied the
   same relative positions across the grid.
7. **Short lines of copy.** Narrow hero text and concise section descriptions
   left breathing room around the photographs.
8. **Decoration lived at the edges.** Festive details framed the composition
   while the central space remained available for products and information.
9. **No artificial filler.** Unused offer slots were not filled with invented
   upcoming promotions.
10. **Desktop and mobile were composed separately.** Columns stacked and text
    sizes changed, rather than shrinking the desktop design into a phone.

## 8. Implementation and review context

The experiment used a separate Vite entry, local product photographs, labelled
sample campaign/coupon data and scoped CSS. It reused the existing campaign
provider to exercise expiry and per-element/page/device controls. Production
shopping, coupon verification, Admin APIs, cache settings and secrets were not changed.

Before removal, verification covered 27 Chromium scenarios, including
desktop/mobile, light/dark, expiry, campaign switches, checkout suppression,
variant selection and dialogs. An automated axe scan found no WCAG 2 A/AA or
2.1 AA violations on the redesigned mobile homepage in either theme. That was
not a full accessibility certification or a real-device performance review.

This document is the retained reference. The preview, sample assets, screenshots,
comparison page, development command and associated architecture notes were removed
at your request.
