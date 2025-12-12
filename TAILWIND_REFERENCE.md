# UrbanNook - Tailwind CSS Reference Guide

## 📋 **Project Overview**

This document contains all Tailwind CSS classes used in the UrbanNook project components, organized by category with explanations of what each class does.

### **Components Covered:**
- NewHeader.jsx
- NewBanner.jsx (with video modal)
- ProductListing.jsx
- WhyChooseUs.jsx
- Testimonials.jsx
- InstagramFeed.jsx
- Footer.jsx

---

## 🎨 **Layout & Spacing**

### **Container & Grid**
| Class | Description | Value |
|-------|-------------|-------|
| `max-w-6xl` | Maximum width container | 72rem (1152px) |
| `max-w-7xl` | Maximum width container | 80rem (1280px) |
| `mx-auto` | Horizontal margin auto | Centers element |
| `grid` | CSS Grid display | display: grid |
| `grid-cols-1` | 1 column grid | grid-template-columns: repeat(1, minmax(0, 1fr)) |
| `grid-cols-2` | 2 column grid | grid-template-columns: repeat(2, minmax(0, 1fr)) |
| `grid-cols-3` | 3 column grid | grid-template-columns: repeat(3, minmax(0, 1fr)) |
| `grid-cols-4` | 4 column grid | grid-template-columns: repeat(4, minmax(0, 1fr)) |
| `sm:grid-cols-2` | 2 columns on small screens | @media (min-width: 640px) |
| `md:grid-cols-2` | 2 columns on medium screens | @media (min-width: 768px) |
| `lg:grid-cols-3` | 3 columns on large screens | @media (min-width: 1024px) |
| `lg:grid-cols-4` | 4 columns on large screens | @media (min-width: 1024px) |

### **Flexbox**
| Class | Description | Value |
|-------|-------------|-------|
| `flex` | Flexbox display | display: flex |
| `inline-flex` | Inline flexbox | display: inline-flex |
| `items-center` | Align items center | align-items: center |
| `justify-center` | Justify content center | justify-content: center |
| `justify-between` | Space between items | justify-content: space-between |
| `flex-col` | Flex direction column | flex-direction: column |
| `flex-wrap` | Flex wrap | flex-wrap: wrap |

### **Padding & Margin**
| Class | Description | Value |
|-------|-------------|-------|
| `p-2` | Padding all sides | 0.5rem (8px) |
| `p-4` | Padding all sides | 1rem (16px) |
| `p-6` | Padding all sides | 1.5rem (24px) |
| `p-8` | Padding all sides | 2rem (32px) |
| `p-10` | Padding all sides | 2.5rem (40px) |
| `px-3` | Horizontal padding | 0.75rem (12px) |
| `px-4` | Horizontal padding | 1rem (16px) |
| `px-6` | Horizontal padding | 1.5rem (24px) |
| `px-8` | Horizontal padding | 2rem (32px) |
| `py-2` | Vertical padding | 0.5rem (8px) |
| `py-3` | Vertical padding | 0.75rem (12px) |
| `py-16` | Vertical padding | 4rem (64px) |
| `py-20` | Vertical padding | 5rem (80px) |
| `gap-1` | Grid/flex gap | 0.25rem (4px) |
| `gap-2` | Grid/flex gap | 0.5rem (8px) |
| `gap-3` | Grid/flex gap | 0.75rem (12px) |
| `gap-4` | Grid/flex gap | 1rem (16px) |
| `gap-6` | Grid/flex gap | 1.5rem (24px) |
| `gap-8` | Grid/flex gap | 2rem (32px) |

---

## 🎨 **Colors (CSS Variables)**

### **Background Colors**
| Class | Description | CSS Variable |
|-------|-------------|--------------|
| `bg-bgPrimary` | Main background | var(--color-bg-primary) - White |
| `bg-bgSecondary` | Secondary background | var(--color-bg-secondary) - Light gray |
| `bg-bgTertiary` | Tertiary background | var(--color-bg-tertiary) - Lighter gray |
| `bg-primary` | Primary color background | var(--color-primary) - Coral red |
| `bg-accent` | Accent color background | var(--color-accent) - Mint green |
| `bg-primary/10` | Primary with 10% opacity | rgba(primary, 0.1) |
| `bg-accent/10` | Accent with 10% opacity | rgba(accent, 0.1) |
| `bg-black/20` | Black with 20% opacity | rgba(0, 0, 0, 0.2) |
| `bg-black/80` | Black with 80% opacity | rgba(0, 0, 0, 0.8) |

### **Text Colors**
| Class | Description | CSS Variable |
|-------|-------------|--------------|
| `text-textPrimary` | Primary text | var(--color-text-primary) - Dark gray |
| `text-textSecondary` | Secondary text | var(--color-text-secondary) - Medium gray |
| `text-textMuted` | Muted text | var(--color-text-muted) - Light gray |
| `text-primary` | Primary color text | var(--color-primary) - Coral red |
| `text-accent` | Accent color text | var(--color-accent) - Mint green |
| `text-white` | White text | #ffffff |
| `text-warning` | Warning color | var(--color-warning) - Yellow |
| `text-gray-300` | Light gray text | #d1d5db |
| `text-gray-400` | Medium gray text | #9ca3af |

### **Border Colors**
| Class | Description | CSS Variable |
|-------|-------------|--------------|
| `border-borderPrimary` | Primary border | var(--color-border-primary) |
| `border-borderSecondary` | Secondary border | var(--color-border-secondary) |
| `border-primary` | Primary color border | var(--color-primary) |
| `border-gray-700` | Dark gray border | #374151 |

---

## 📐 **Sizing**

### **Width & Height**
| Class | Description | Value |
|-------|-------------|-------|
| `w-full` | Full width | 100% |
| `w-8` | Fixed width | 2rem (32px) |
| `w-10` | Fixed width | 2.5rem (40px) |
| `w-12` | Fixed width | 3rem (48px) |
| `w-20` | Fixed width (Custom) | 5rem (80px) |
| `w-64` | Fixed width | 16rem (256px) |
| `w-80` | Fixed width | 20rem (320px) |
| `h-1` | Fixed height | 0.25rem (4px) |
| `h-5` | Fixed height | 1.25rem (20px) |
| `h-10` | Fixed height | 2.5rem (40px) |
| `h-12` | Fixed height | 3rem (48px) |
| `h-16` | Fixed height | 4rem (64px) |
| `h-20` | Fixed height | 5rem (80px) |
| `h-64` | Fixed height | 16rem (256px) |
| `min-h-[600px]` | Minimum height | 600px |

---

## 🎭 **Visual Effects**

### **Border Radius**
| Class | Description | Value |
|-------|-------------|-------|
| `rounded` | Default border radius | 0.25rem (4px) |
| `rounded-lg` | Large border radius | 0.5rem (8px) |
| `rounded-xl` | Extra large border radius | 0.75rem (12px) |
| `rounded-2xl` | 2x large border radius | 1rem (16px) |
| `rounded-full` | Full border radius | 9999px (circle) |

### **Shadows**
| Class | Description | Value |
|-------|-------------|-------|
| `shadow-sm` | Small shadow | 0 1px 2px rgba(0, 0, 0, 0.05) |
| `shadow-lg` | Large shadow | 0 10px 15px rgba(0, 0, 0, 0.1) |
| `shadow-xl` | Extra large shadow | 0 20px 25px rgba(0, 0, 0, 0.1) |
| `shadow-2xl` | 2x large shadow | 0 25px 50px rgba(0, 0, 0, 0.25) |

### **Borders**
| Class | Description | Value |
|-------|-------------|-------|
| `border` | Default border | 1px solid |
| `border-2` | Thick border | 2px solid |
| `border-b` | Bottom border only | border-bottom |
| `border-t` | Top border only | border-top |

---

## 🎬 **Animations & Transitions**

### **Transforms**
| Class | Description | Value |
|-------|-------------|-------|
| `transform` | Enable transforms | transform: translateX(0) translateY(0) |
| `translate-y-1/2` | Translate Y 50% | transform: translateY(50%) |
| `-translate-y-1/2` | Translate Y -50% | transform: translateY(-50%) |
| `-translate-y-2` | Translate Y up | transform: translateY(-0.5rem) |
| `-translate-y-3` | Translate Y up more | transform: translateY(-0.75rem) |
| `scale-100` | Normal scale | transform: scale(1) |
| `scale-105` | Scale up 5% | transform: scale(1.05) |
| `scale-110` | Scale up 10% | transform: scale(1.1) |
| `rotate-0` | No rotation | transform: rotate(0deg) |

### **Transitions**
| Class | Description | Value |
|-------|-------------|-------|
| `transition-all` | Transition all properties | transition: all |
| `transition-colors` | Transition color properties | transition: color, background-color |
| `transition-opacity` | Transition opacity | transition: opacity |
| `transition-transform` | Transition transform | transition: transform |
| `duration-300` | 300ms duration | transition-duration: 300ms |
| `duration-500` | 500ms duration | transition-duration: 500ms |

### **Hover States**
| Class | Description | Behavior |
|-------|-------------|----------|
| `hover:bg-primary` | Background on hover | Changes background to primary color |
| `hover:text-white` | Text color on hover | Changes text to white |
| `hover:shadow-xl` | Shadow on hover | Adds extra large shadow |
| `hover:scale-105` | Scale on hover | Scales element to 105% |
| `hover:-translate-y-2` | Move up on hover | Moves element up by 0.5rem |
| `group-hover:opacity-100` | Opacity on group hover | Shows element when parent is hovered |
| `group-hover:scale-110` | Scale on group hover | Scales when parent is hovered |

---

## 📱 **Responsive Design**

### **Breakpoint Prefixes**
| Prefix | Screen Size | Min Width |
|--------|-------------|-----------|
| `sm:` | Small screens | 640px |
| `md:` | Medium screens | 768px |
| `lg:` | Large screens | 1024px |
| `xl:` | Extra large screens | 1280px |

### **Responsive Examples**
| Class | Description | Behavior |
|-------|-------------|----------|
| `hidden md:flex` | Hidden on mobile, flex on medium+ | display: none → display: flex |
| `lg:hidden` | Hidden on large screens+ | display: none on 1024px+ |
| `sm:grid-cols-2` | 2 columns on small screens+ | 1 col mobile → 2 cols tablet+ |

---

## 📝 **Typography**

### **Font Sizes**
| Class | Description | Value |
|-------|-------------|-------|
| `text-xs` | Extra small text | 0.75rem (12px) |
| `text-sm` | Small text | 0.875rem (14px) |
| `text-lg` | Large text | 1.125rem (18px) |
| `text-xl` | Extra large text | 1.25rem (20px) |
| `text-2xl` | 2x large text | 1.5rem (24px) |
| `text-4xl` | 4x large text | 2.25rem (36px) |
| `text-5xl` | 5x large text | 3rem (48px) |

### **Font Weights**
| Class | Description | Value |
|-------|-------------|-------|
| `font-medium` | Medium weight | font-weight: 500 |
| `font-semibold` | Semi-bold weight | font-weight: 600 |
| `font-bold` | Bold weight | font-weight: 700 |

### **Text Alignment & Decoration**
| Class | Description | Value |
|-------|-------------|-------|
| `text-center` | Center align | text-align: center |
| `line-through` | Strikethrough text | text-decoration: line-through |
| `leading-tight` | Tight line height | line-height: 1.25 |
| `leading-relaxed` | Relaxed line height | line-height: 1.625 |

---

## 🎯 **Position & Z-Index**

### **Position**
| Class | Description | Value |
|-------|-------------|-------|
| `relative` | Position relative | position: relative |
| `absolute` | Position absolute | position: absolute |
| `fixed` | Position fixed | position: fixed |
| `sticky` | Position sticky | position: sticky |
| `inset-0` | All sides 0 | top: 0, right: 0, bottom: 0, left: 0 |
| `top-0` | Top 0 | top: 0 |
| `top-3` | Top spacing | top: 0.75rem |
| `top-4` | Top spacing | top: 1rem |
| `right-3` | Right spacing | right: 0.75rem |
| `right-4` | Right spacing | right: 1rem |

### **Z-Index**
| Class | Description | Value |
|-------|-------------|-------|
| `z-10` | Z-index 10 | z-index: 10 |
| `z-50` | Z-index 50 | z-index: 50 |

---

## 🔧 **Utility Classes**

### **Display**
| Class | Description | Value |
|-------|-------------|-------|
| `block` | Block display | display: block |
| `inline-block` | Inline-block display | display: inline-block |
| `hidden` | Hide element | display: none |

### **Overflow & Opacity**
| Class | Description | Value |
|-------|-------------|-------|
| `overflow-hidden` | Hide overflow | overflow: hidden |
| `opacity-0` | Fully transparent | opacity: 0 |
| `opacity-100` | Fully opaque | opacity: 1 |

### **Object Fit**
| Class | Description | Value |
|-------|-------------|-------|
| `object-cover` | Cover object fit | object-fit: cover |

### **Aspect Ratio**
| Class | Description | Value |
|-------|-------------|-------|
| `aspect-video` | 16:9 aspect ratio | aspect-ratio: 16 / 9 |

---

## 🎨 **Custom Classes (Project Specific)**

### **Custom Animations**
| Class | Description | Animation |
|-------|-------------|-----------|
| `animate-float` | Floating animation | 6s ease-in-out infinite |
| `animate-float-reverse` | Reverse floating | 8s ease-in-out infinite reverse |
| `animate-fadeInUp` | Fade in from bottom | 0.6s ease backwards |

### **Text Utilities**
| Class | Description | Behavior |
|-------|-------------|----------|
| `line-clamp-2` | Limit text to 2 lines | Truncates with ellipsis |
| `line-clamp-3` | Limit text to 3 lines | Truncates with ellipsis |

---

## 🎨 **CSS Variables Used**

```css
:root {
  /* Primary Colors */
  --color-primary: #FF6B6B;    /* Coral red */
  --color-secondary: #F8F9FA;  /* Light gray */
  --color-accent: #4ECDC4;     /* Mint green */
  
  /* Background Colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #F8F9FA;
  --color-bg-tertiary: #E9ECEF;
  
  /* Text Colors */
  --color-text-primary: #2D3436;   /* Dark gray */
  --color-text-secondary: #636E72; /* Medium gray */
  --color-text-muted: #B2BEC3;     /* Light gray */
  
  /* Border Colors */
  --color-border-primary: #E9ECEF;
  --color-border-secondary: #DDD6FE;
  
  /* Status Colors */
  --color-success: #00B894;
  --color-warning: #FDCB6E;
  --color-error: #E17055;
  --color-info: #74B9FF;
}
```

---

## 📋 **Component Features**

### **NewBanner Component**
- Video modal functionality
- Responsive hero section
- Call-to-action buttons
- Product showcase

### **ProductListing Component**
- Category tabs
- Product cards with ratings
- Quick action buttons
- Sale badges and pricing

### **Footer Component**
- Company information
- Product links
- Newsletter signup
- Social media links
- Contact information

### **Header Component**
- Responsive navigation
- Search functionality
- Shopping cart with badge
- Mobile menu

---

## 🚀 **Best Practices**

1. **Responsive Design**: Mobile-first approach with breakpoint prefixes
2. **Color Consistency**: CSS variables for theming
3. **Hover Effects**: Rich interactions with multiple hover states
4. **Animations**: Smooth transitions with appropriate durations
5. **Spacing**: Consistent spacing scale (multiples of 4px)
6. **Typography**: Clear hierarchy with proper font sizes

---

*Last Updated: December 2024*
*Project: UrbanNook - Aesthetic E-commerce Platform*