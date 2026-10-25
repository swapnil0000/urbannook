# Offer image prompts (ChatGPT image generation)

One **1:1 square** image per offer. Used on the home offer cards, the cart/checkout offer banner and the
add-to-cart sheet, so every image must read in 2 seconds on a phone.

Facts below (prices, product names, rules) come from `docs/OFFERS_CATALOG.md` / the staging DB.
Prices written inside an image go stale if a price changes — regenerate that one image when it does.

---

## 0. How to work with ChatGPT (read once — this is what keeps all 15 images looking like one family)

1. **Attach the real product photos** to every prompt (the white/clean packshots from the product pages).
   Tell it: *"Use exactly these attached products. Do not redraw, restyle, recolour or invent products."*
2. **Do the stage first, once.** Run prompt **S1 (stage plate)** below until you love it. Then attach that
   plate image as a reference in every offer prompt and say *"use this exact stage and background"*.
   Result: 15 images, one consistent set, and you only have to be picky once.
3. **Keep the same chat** for the whole batch so the style stays locked.
4. Ask for **1:1, 1200 × 1200 px**. The site crops to a square from the centre — keep everything important in the
   **middle 70%** (a ~170 px safe margin on every side). Never put text or a price on the outer edge.
5. Text is the weak spot of image models. If a price/word comes out wrong, say *"fix only the text, keep
   everything else identical"* — or leave a clean empty plate and add the numbers in Canva (the plate prompts
   below already say "no text" variants where useful). Best result: use GPT for the scene, Canva for final text.
6. Export **WebP**, under ~250 KB, and upload through Admin → Promotions (offer image / home card image).

---

## 1. Background — what I recommend (matches the site's Diwali theme)

Our theme is **Ink Black `#141414`**, **Paper `#EFEAE0`**, **Nook Red `#E63329`** and **festive gold `#F3C33B`**.
Stay inside it so the card never fights the page (we do not introduce new colours).

| Option | Look | When to use |
|---|---|---|
| **A — "Midnight Diya Glow" (RECOMMENDED)** | Deep ink `#141414` at the edges, a warm radial glow of `#E63329` (red) mixing into `#F3C33B` (gold) behind the products, tiny out-of-focus gold bokeh lights. | Default for every offer. Dark makes products and gold text pop, and it matches the dark offers section on the home page. |
| B — "Saffron Ember" | Ink → deep red `#C9281F` vertical gradient with a gold horizon glow at the stage. | Free-shipping / lamp offers (a "warm lamp" mood). |
| C — "Paper & Gold" | Warm paper `#EFEAE0` → `#E5DFD3` with a soft gold spotlight and subtle rangoli line-art in the corners. | Only if you want a lighter card for the cart/checkout banner. |

**Use A for all 15** unless you want to mark a family: I suggest **A for katana + kunai + figures**, **B for the
lamp / pen-stand / shipping offers** so shoppers learn "red-warm = desk offers, dark-gold = anime offers".

### The raised stage
A low, round **hexagonal / circular podium** in matte black with a thin **gold rim light** (`#F3C33B`) and a soft
reflection on its top. Products stand on it, the reward product stands **in front / lower-centre on the same
stage**. Soft shadow under each product so nothing floats.

### Diwali dressing (subtle — products are the hero)
Small, restrained: 2 lit **diyas** on the stage corners, a thin **marigold / string-light garland** across the top
edge (stay in the top 10%), a few gold sparkles. No fireworks, no people, no busy patterns behind products.

### Typography & badges (keep identical across the set)
- Headline: heavy condensed sans (like *Archivo Extra Bold*), **paper white `#EFEAE0`**, ALL CAPS, top-centre.
- **FREE** word: Nook Red `#E63329` on a gold `#F3C33B` ribbon, slightly rotated.
- Price line: struck-through old price in muted grey, new price in bold white; "FREE" in red/gold.
- Savings tag: **teal `#108474`** pill, white text (this is the site's "you save" colour).
- A **curved hand-drawn arrow** in gold pointing from the paid products to the free reward.
- Corner badge top-right: gold circle "FESTIVE OFFER".

---

## 2. Master style block (paste at the start of the chat, then send offer prompts)

```
You are an e-commerce key-visual designer for "Urban Nook", an Indian anime & desk-decor store, making Diwali
offer images. Rules for EVERY image in this chat:
- Square 1:1, 1200x1200 px. Keep all important content inside the centre 70% (safe margin ~170px).
- Style: premium, clean, high-contrast product advertising. Photoreal products on a raised circular black
  podium with a thin gold rim light and soft reflection. Warm Diwali mood: deep ink-black #141414 edges, a warm
  radial glow of red #E63329 blending into gold #F3C33B behind the products, soft golden bokeh, a thin
  marigold/string-light garland across the very top edge, two small lit diyas on the podium corners. Subtle -
  products are the hero.
- Use ONLY the product photos I attach. Do not redraw, restyle, recolour, rename or invent any product.
  Keep each product's real colours, proportions and details.
- Typography: heavy condensed sans-serif, ALL CAPS headlines in paper-white #EFEAE0. "FREE" in red #E63329 on a
  gold #F3C33B ribbon. Savings pills in teal #108474 with white text. Old prices struck through in grey.
- A curved, hand-drawn gold arrow shows paid products -> free reward.
- Top-right circular gold badge: "FESTIVE OFFER".
- No people, no watermarks, no extra logos, no fireworks, no clutter. Spell every word exactly as I write it.
Confirm you understand, then wait for the first offer.
```

---

## 3. S1 — Stage plate (do this first, once; no products, no text)

```
Create the empty background plate for the whole offer series, 1:1, 1200x1200 px. A raised circular matte-black
podium (wide, low) with a thin gold #F3C33B rim light and a soft glossy reflection on top, in the lower-middle of
the frame (podium top around y=62%). Behind it a warm radial glow: red #E63329 blending into gold #F3C33B on a
deep ink #141414 background, vignette to near-black at the corners, soft golden bokeh. A thin marigold + string-
light garland across the very top edge (top 8% only). Two small lit brass diyas on the left and right front
corners of the podium. Leave the whole centre empty for products. Absolutely no text, no products, no people.
Photoreal, cinematic, premium.
```

Alternative "S2 — Saffron Ember" plate (for lamp/desk offers): same prompt but background is a vertical
gradient from ink #141414 (top) to deep red #C9281F (bottom) with a gold horizon glow behind the podium.

---

## 4. Offer prompts

Attach the product photos named under **Attach**. Every prompt below assumes the master block (section 2) and
the S1 plate (S2 for the desk offers) are already in the chat. Layout words: **Top** = headline, **Stage** =
podium, **Bottom** = price strip.

### 4.1 Dual Stand Free — 2 Wooden Katanas  (home card + stand offers)
**Attach:** Anime Wooden Katana photo, Double Layer Katana Display Stand photo.

```
Use the stage plate. Headline top-centre, two lines: "BUY ANY 2 KATANA" / "GET A DUAL STAND FREE".
On the podium: the DOUBLE-LAYER stand centred, and the TWO wooden katanas resting on its two layers, one above the
other, tilted slightly (hero of the image, big). Below/in front of the stage at lower-centre, a SECOND copy of the
same double-layer stand placed as the reward on the podium front, with a curved gold arrow looping from the
katanas to it and a red-on-gold ribbon "FREE" across it. Price strip at the bottom: "2 KATANAS ₹2,998" in white,
then "DUAL STAND" with ₹449 struck through in grey and "FREE" in red/gold. Small teal pill: "YOU SAVE ₹449".
Gold badge top-right "FESTIVE OFFER". Everything inside the centre 70%.
```

### 4.2 Dual Stand Free — 2 LED Katanas
**Attach:** Anime LED Katana photo (glowing, one variant), Double Layer Katana Display Stand photo.

```
Use the stage plate. Headline: "BUY ANY 2 KATANA" / "GET A DUAL STAND FREE". Two LED katanas glowing (soft red/
blue light halo on the podium) resting on the double-layer stand, centred. A curved gold arrow from the katanas
down to a second double-layer stand at the front of the podium with a "FREE" ribbon. Bottom strip: "2 LED KATANAS
₹4,698" in white; "DUAL STAND ₹449" struck through, "FREE" in red/gold; teal pill "YOU SAVE ₹449". Gold badge
top-right "FESTIVE OFFER".
```

### 4.3 Dual Stand Free — Wooden + LED Katana
**Attach:** Wooden Katana, LED Katana, Double Layer Stand.

```
Use the stage plate. Headline: "MIX ANY 2 KATANA" / "GET A DUAL STAND FREE". One wooden katana on the upper layer
and one glowing LED katana on the lower layer of the double-layer stand, centred. Curved gold arrow to a second
double-layer stand at the front with a "FREE" ribbon. Bottom strip: "WOODEN + LED ₹3,848" in white; "DUAL STAND
₹449" struck through, "FREE" in red/gold; teal pill "YOU SAVE ₹449". Gold badge "FESTIVE OFFER".
```

### 4.4 Triple Stand Free — 3 Wooden Katanas  (home card)
**Attach:** Wooden Katana, Triple Layer Katana Display Stand.

```
Use the stage plate. Headline: "BUY ANY 3 KATANA" / "GET A TRIPLE STAND FREE". The TRIPLE-LAYER stand centred with
THREE wooden katanas, one on each layer, tidy and symmetrical. Curved gold arrow from the katanas to a second
triple-layer stand at the front of the podium with a red-on-gold "FREE" ribbon. Bottom strip: "3 KATANAS ₹4,497" in
white; "TRIPLE STAND" ₹649 struck through grey, "FREE" in red/gold; teal pill "YOU SAVE ₹649". Gold badge top-right
"FESTIVE OFFER".
```

### 4.5 Triple Stand Free — 3 LED Katanas
**Attach:** LED Katana, Triple Layer Stand.

```
Use the stage plate. Headline: "BUY ANY 3 KATANA" / "GET A TRIPLE STAND FREE". Three glowing LED katanas on the
three layers of the triple stand (soft coloured glows), centred. Curved gold arrow to a second triple-layer stand
at the front with a "FREE" ribbon. Bottom strip: "3 LED KATANAS ₹7,047" white; "TRIPLE STAND" ₹649 struck through,
"FREE" red/gold; teal pill "YOU SAVE ₹649". Gold badge "FESTIVE OFFER".
```

### 4.6 Triple Stand Free — 3 Mixed Katanas
**Attach:** Wooden Katana, LED Katana, Triple Layer Stand.

```
Use the stage plate. Headline: "MIX ANY 3 KATANA" / "GET A TRIPLE STAND FREE". Triple-layer stand with a mix of
wooden and glowing LED katanas on its three layers (2 wooden + 1 LED). Curved gold arrow to a second triple-layer
stand at the front with a "FREE" ribbon. Bottom strip: "ANY 3 MIXED KATANAS" white; "TRIPLE STAND" ₹649 struck
through, "FREE" red/gold; teal pill "YOU SAVE ₹649". Gold badge "FESTIVE OFFER".
```

### 4.7 Mystery Gift Worth ₹300 — Single Katana  (home card)
**Attach:** Wooden Katana and LED Katana photos. **Do NOT attach the key holder** — the gift stays a mystery.

```
Use the stage plate. Headline: "BUY 1 KATANA" / "GET A MYSTERY GIFT FREE". One katana standing/leaning on the
podium (one wooden, one glowing LED, side by side but compact), and beside it a luxurious gold-and-black gift
box with a red ribbon and a big gold "?" on the lid, a rolled paper poster just peeking out of the top. Sparkles
around the box. Curved gold arrow from the katana to the box. Red-on-gold ribbon "FREE" across the box.
Bottom strip: teal pill "WORTH ₹300" next to "MYSTERY GIFT" in white. Do not show what is inside beyond the poster tip.
Gold badge top-right "FESTIVE OFFER".
```

### 4.8 Buy 3 Kunai, Get 1 Free
**Attach:** Anime Kunai Collection photos (4 different kunai variants).

```
Use the stage plate. Headline: "BUY 3 KUNAI" / "GET 1 FREE". Four different kunai from the attached photos fanned
out on the podium like a hand of cards (three on the left, one slightly forward and glowing gold-edged on the right).
Curved gold arrow pointing to the forward kunai with a red-on-gold "FREE" ribbon. Bottom strip: "4 KUNAI" in white,
"₹996" struck through grey, "₹747" bold white, teal pill "LOWEST ONE FREE". Small caption under the strip:
"Pick any 4 — the lowest-priced is free". Gold badge "FESTIVE OFFER".
```

### 4.9 Anime Figures — 5% Off
**Attach:** Premium Anime Action Figures photos (2–3 figures).

```
Use the stage plate. Headline: "ANIME ACTION FIGURES" / "FLAT 5% OFF". Two or three attached figures on the podium at
different heights (tallest centre), dramatic gold rim lighting. Big circular red-on-gold "5% OFF" stamp at the
lower-left of the podium. Bottom strip: "FROM ₹1,234" in bold white with "₹1,299" struck through grey, teal pill
"EXTRA 5% OFF". Gold badge "FESTIVE OFFER".
```

### 4.10 Desk Glow Duo  (home card)
**Attach:** Brake Caliper Lamp (e.g. BMW), Stationery Suit Pen Stand. Use **S2 (Saffron Ember)** plate.

```
Use the Saffron Ember stage plate. Headline: "PAIR THEM UP" / "YOUR DESK, LIT & TIDY". The lamp glowing warmly on the
podium (soft light spilling onto the surface), the pen stand beside it with a few pens. Teal pill "SAVE ₹79".
Bottom strip: "LAMP + PEN STAND" white, "₹1,948" struck through grey, "₹1,869" bold white. Gold badge
"FESTIVE OFFER".
```

### 4.11 2+ Lamps — 50% Off Pen Stand
**Attach:** Brake Caliper Lamp (two different variants), Pen Stand. S2 plate.

```
Use the Saffron Ember plate. Headline: "BUY 2 LAMPS" / "PEN STAND 50% OFF". Two lamps (different variants) glowing on
the podium, the pen stand at the front with a red-on-gold "50% OFF" ribbon and a curved gold arrow from the lamps
to it. Bottom strip: "PEN STAND" ₹299 struck through grey, "₹150" bold white, teal pill "SAVE ₹149".
Gold badge "FESTIVE OFFER".
```

### 4.12 2+ Brake Caliper Lamps — Free Shipping
**Attach:** Brake Caliper Lamp (two variants). S2 plate.

```
Use the Saffron Ember plate. Headline: "BUY 2 LAMPS" / "FREE SHIPPING". Two glowing lamps on the podium, a bold gold
delivery-truck icon with a red "FREE" ribbon in the lower-left of the podium (flat vector style, matching the
poster). Bottom strip: "2 LAMPS ₹3,298" white, teal pill "SHIPPING ON US". Gold badge "FESTIVE OFFER".
```

### 4.13 Lamp + Pen Stand Combo — Free Shipping  (existing home card — replace if you like)
**Attach:** Brake Caliper Lamp, Pen Stand. S2 plate.

```
Use the Saffron Ember plate. Headline: "LAMP + PEN STAND" / "FREE SHIPPING". Lamp glowing, pen stand beside it, gold
delivery-truck icon with red "FREE" ribbon at the podium front. Bottom strip: "COMBO ₹1,948" white, teal pill
"SHIPPING ON US". Gold badge "FESTIVE OFFER".
```

### 4.14 Buy 2 Get Free Shipping  (1 Wooden + 1 LED Katana)
**Attach:** Wooden Katana, LED Katana.

```
Use the stage plate. Headline: "WOODEN + LED KATANA" / "FREE SHIPPING". One wooden and one glowing LED katana crossed
in an X on the podium, a gold delivery-truck icon with red "FREE" ribbon at the front. Bottom strip: "COMBO
₹3,848" white, teal pill "SHIPPING ON US". Gold badge "FESTIVE OFFER".
```

### 4.15 LED Katana → Free Shipping  (with Dual Layer stand)
**Attach:** LED Katana, Double Layer Katana Stand.

```
Use the stage plate. Headline: "LED KATANA + DUAL STAND" / "FREE SHIPPING". A glowing LED katana displayed on the double-
layer stand, centred; gold delivery-truck icon with red "FREE" ribbon at the front. Bottom strip: "KATANA + STAND
₹2,798" white, teal pill "SHIPPING ON US". Gold badge "FESTIVE OFFER".
```

---

## 5. Quality checklist before uploading each image
- Only the attached products appear; colours match the real products (shoppers will compare).
- All words spelled exactly; ₹ amounts correct; "FREE" is the loudest word after the headline.
- Nothing important outside the centre 70% (crop test: view it at 60% zoom in a square).
- Readable at phone width (hold it at thumbnail size — headline and "FREE" must still read).
- WebP, ≤ 250 KB, 1200 × 1200.
- File name = the promotion name, e.g. `dual-stand-free-2-wooden.webp`.

## 6. Where each image goes (Admin → Promotions)
- **Home cards (3 reward cards + the 2 combo cards):** "Offer card" → image. Dual stand → 4.1, Triple stand → 4.4,
  Mystery gift → 4.7, Desk Glow Duo → 4.10, Lamp + Pen Stand → 4.13.
- **Every other offer:** the reward's image field (shown in the cart / add-to-cart sheet).
