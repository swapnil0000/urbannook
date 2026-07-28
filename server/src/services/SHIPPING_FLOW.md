# Shipping Calculation — Pura Flow (Current Logic)

Yeh doc `shipping.service.js` ke current (as-is) code ko explain karta hai — jab bhi koi
pincode aata hai aur shipping rate calculate hota hai, step-by-step kya hota hai. Koi naya
logic propose nahi kiya gaya hai, yeh sirf jo abhi production mein chal raha hai uska
walkthrough hai.

Entry point: `calculateShippingRate({ pincode, cartItems, paymentType })` in
[shipping.service.js](./shipping.service.js).

---

## Step 1 — Input validation

- `pincode` aur `cartItems` (array) required hain, warna `ValidationError` throw hota hai.
- `paymentType` sirf `"PREPAID"` ya `"COD"` accept karta hai; kuch aur mile to silently
  `"PREPAID"` fallback ho jata hai.

## Step 2 — Cart items ke liye DB se product details fetch

- `cartItems` mein sirf `productId` + `quantity` + `price` hota hai. Poora product record
  (`weight`, `dimensions`, `packagingDimensions`) MongoDB se `Product.find(...)` se laya jata
  hai.
- Agar koi bhi product DB mein nahi mila to `NotFoundError`.
- Jis cart item ka product DB mein match nahi hua, wo silently drop ho jata hai (`filter(item
  !== null)`) — uske liye koi error nahi aata.

## Step 3 — Har item ka actual weight aur volumetric weight nikalna

Har cart item (quantity ke saath) ke liye loop chalta hai:

**Actual weight** (grams mein), priority order:
1. `packagingDimensions.weight` agar available hai — seedha use hota hai.
2. Warna `weight` field agar string hai (jaise `"1.2kg"` ya `"500"`):
   - Agar string mein `"kg"` hai → number nikal ke `× 1000` (kg → grams).
   - Warna sirf digits nikal ke wahi number le lete hain (grams maan ke).
3. Warna `weight` ko directly number treat kar lete hain.

**Volumetric weight** (grams mein):
- Dimensions `packagingDimensions` se lete hain agar `length`, `breadth`, `height` teeno
  available hain; warna `dimensions` field se (fallback).
- Agar dimension bhi nahi mila to default `10` (cm) har dimension ke liye use hota hai.
- Formula:
  ```
  volumetricWeightPerUnit = (length × breadth × height) / 5
  ```
  (Yeh standard courier formula `(L×B×H)/5000` hi hai kg mein — bas grams mein directly
  divide-by-5 se nikala gaya hai, cm dimensions maan ke.)

- Dono weights (`actualWeightPerUnit`, `volumetricWeightPerUnit`) ko `quantity` se multiply
  karke sabhi items ke across `totalActualWeight` aur `totalVolumetricWeight` mein add kiya
  jata hai. `totalAmount` (order value) aur `dimensions[]` array (per-box L/B/H, Shipmozo ko
  bhejne ke liye) bhi yahin ban rahe hote hain.

## Step 4 — Chargeable weight decide karna

```
totalChargeableWeight   = max(totalActualWeight, totalVolumetricWeight)   // grams
totalChargeableWeightInKg = totalChargeableWeight / 1000
```

Jo bhi zyada hai (actual ya volumetric), wahi charge hone wala weight hai — yeh standard
courier industry practice hai.

## Step 5 — Shipmozo API call (options explore karna)

- Request Shipmozo ke `rate-calculator` endpoint (`https://shipping-api.com/app/api/v1/rate-calculator`)
  ko jata hai, payload mein: pickup pincode (fixed `122018`), delivery pincode (user ka),
  payment type, order amount, computed `weight` (chargeable weight, grams), aur `dimensions[]`.
- Yeh API un sabhi courier services ka response deta hai jo us pincode ko serve kar sakte
  hain — Delhivery, DTDC, Bluedart, Xpressbees ke alawa Ekart, Amazon ATS, Shadowfax, TCI
  Express waghera bhi isi list mein aate hain.
- **Retry logic**: max 5 attempts. Agar error 4xx hai ya "Pincode not serviceable" wala error
  hai to turant throw ho jata hai (retry nahi hota — genuinely unserviceable pincode par order
  accept nahi karna chahiye). Baaki (network/timeout) errors par 1.5s × attempt number wait
  karke retry hota hai.
- Agar API empty array de (`allServices.length === 0`) to "Pincode not serviceable" error throw
  hota hai.

## Step 6 — Options mein se courier + slab select karna (`selectCourierService`)

Yeh sabse important logic hai — do steps mein hota hai:

### 6a. Har service ko candidate ke roop mein parse karna
Har row (`svc`) ke liye:
- **`courier`**: `svc.name` ko lowercase karke check hota hai ki usmein `"delhivery"`,
  `"dtdc"`, `"bluedart"`, ya `"xpressbees"` string kahin bhi contain hoti hai ya nahi
  (`nameLower.includes(c)`). Match nahi mila to `courier = null` (matlab yeh Ekart/Amazon
  ATS/Shadowfax jaise couriers filter ho jaate hain).
- **`slabKg`**: `svc.minimum_chargeable_weight` (jaise `"0.5 KG"`, `"5 KG"`) se number nikala
  jata hai — yeh authoritative slab weight hai.
- **`nameKg`**: `svc.name` se bhi weight nikalne ki koshish hoti hai (jaise "Delhivery 2Kg" →
  `2`) — sirf cross-check ke liye, weight names jaise "Delhivery Heavy MPS" mein `null` aata
  hai.
- **`charges`**: `svc.total_charges` (final price with GST) parse hota hai.

Fir filter lagta hai — candidate reject hota hai agar:
- Courier allowlist mein nahi hai, YA
- `slabKg` parse nahi ho paya / 0 ya negative hai, YA
- `charges` valid positive number nahi hai, YA
- `nameKg` mila (null nahi) AUR wo `slabKg` se 0.001 se zyada differ karta hai (matlab
  service ke naam mein likha weight aur API ka official slab weight aapas mein contradict
  kar rahe hain — is case mein row reject ho jaati hai as a red-flag safety check).

### 6b. Slab decide karna (weight ke basis par)
- Sabhi valid candidates ke unique `slabKg` values nikal ke sort kiye jaate hain.
- Jo sabse chhota slab hai jo `chargeableWeightInKg` se **bada ya barabar** ho, wahi
  `targetSlab` ban jaata hai. Jaise 1.68kg parcel ke liye 2kg slab, 3.3kg ke liye agar 5kg
  next available slab hai to 5kg slab.
- Agar parcel har available slab se bhaari hai (koi slab usse bada nahi hai), to sabse bada
  available slab hi le liya jaata hai (`overweight = true` flag ke saath) — taaki under-charge
  na ho.

### 6c. Us slab ke andar courier priority se pick karna
- `COURIER_PRIORITY = ["delhivery", "dtdc", "bluedart", "xpressbees"]` — is fixed order mein
  check hota hai.
- Sirf `targetSlab` wale candidates (`atSlab`) mein se, pehle jo courier priority list mein
  pehle number par hai aur uska koi bhi offer is slab par available hai, wahi select ho jaata
  hai.
- Agar ek hi courier ke multiple offers hain isi slab par (jaise Delhivery Surface aur
  Delhivery Air dono 2kg slab par), unme se sabse **sasta** (`charges` ascending sort) pick
  hota hai.
- Priority sirf **slab ke andar** tie-break karta hai — weight-based slab selection
  (Step 6b) ko kabhi override nahi karta.

## Step 7 — Final result banana

**Case A — Koi allowlisted courier target slab par available nahi:**
```js
{
  total_charges: 179,           // FALLBACK_SHIPPING_CHARGE
  type: "fallback",
  totalWeight, expectedNoOfBoxes,
  serviceName: null,
  courierName: null,
  estimatedDays: "3-4 Days",
  paymentType
}
```

**Case B — Courier mil gaya:**
```js
{
  total_charges: Math.ceil(selected.charges),   // final price, customer/order ko yahi dikhta hai
  type: "dynamic",
  totalWeight, expectedNoOfBoxes,
  serviceName: selected.name,        // e.g. "Delhivery Surface 5KG"
  courierName: selected.courier,     // e.g. "delhivery"
  slabKg: targetSlab,
  chargeableWeightKg,
  estimatedDays: selected.raw.estimated_delivery || "3-4 Days",
  paymentType
}
```

Dono cases mein ek single summary log line print hoti hai (`[SHIPPING] pin ... | ... | picked
DELHIVERY "..." ₹... → charge ₹...` ya `... → FALLBACK ₹179`) — pura decision trace ek line mein.

## Kahaan use hota hai (high-level)

- **`dynamic.shipping.controller.js`** — checkout ke waqt "kitni shipping lagegi" quote dene ke
  liye is poore result object ko as-is client ko bhej deta hai.
- **`rp.payment.controller.js`** — order create karte waqt (dono authenticated aur guest
  checkout flow) yehi function call hota hai; `total_charges` se `realShippingAmount` nikal ke
  `Order.shippingInfo.amount` mein save hota hai (saath mein `type`, `expectedNoOfBoxes`,
  `totalWeight`, `serviceName` bhi — lekin `courierName`/`slabKg` currently DB mein save nahi
  ho rahe, sirf function ke return object mein hote hain).

## Quick reference — key constants

| Constant | Value | Kya karta hai |
|---|---|---|
| `COURIER_PRIORITY` | `["delhivery", "dtdc", "bluedart", "xpressbees"]` | Slab ke andar tie-break order |
| `FALLBACK_SHIPPING_CHARGE` | `179` | Jab koi allowlisted courier target slab par na mile |
| `MAX_RETRIES` | `5` | Shipmozo API transient failures par retry count |
| Volumetric formula | `(L × B × H) / 5` grams | Dimensions cm mein maan ke |
