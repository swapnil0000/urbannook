# Design Tokens

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes. We use them in place of hard-coded values to ensure consistency and maintainability.

## Structure

```
tokens/
├── colors.js       # Color palette
├── spacing.js      # Spacing scale
├── typography.js   # Font properties
├── animations.js   # Animation properties
└── index.js        # Central export
```

## Usage

### Import Tokens

```javascript
// Import all tokens
import { colors, spacing, typography, animations } from '@/styles/tokens';

// Or import specific tokens
import { colors } from '@/styles/tokens/colors';
```

### Use in Components

```javascript
// Inline styles
<div style={{
  color: colors.brand.primary,
  padding: spacing.md,
  fontSize: typography.fontSize.lg
}}>
  Content
</div>

// Tailwind classes (configure in tailwind.config.js)
<div className="text-brand-primary p-md text-lg">
  Content
</div>
```

### Use in Tailwind Config

```javascript
// tailwind.config.js
import { colors, spacing, typography } from './src/styles/tokens';

export default {
  theme: {
    extend: {
      colors: colors.brand,
      spacing: spacing,
      fontSize: typography.fontSize,
    },
  },
};
```

## Token Categories

### Colors
- **Brand Colors:** Primary brand colors
- **Semantic Colors:** Success, warning, error, info
- **Neutral Colors:** Gray scale
- **Text Colors:** Text hierarchy
- **Background Colors:** Background variations
- **Border Colors:** Border variations

### Spacing
- **Base Scale:** 0-64 (in rem)
- **Semantic:** xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl
- **Container Padding:** Responsive padding values

### Typography
- **Font Families:** Sans, serif, mono
- **Font Sizes:** xs to 9xl
- **Font Weights:** Thin to black
- **Line Heights:** None to loose
- **Letter Spacing:** Tighter to megawide

### Animations
- **Duration:** Instant to slowest
- **Easing:** Linear, ease-in, ease-out, etc.
- **Transitions:** Preset transition combinations

## Best Practices

1. **Always use tokens instead of hard-coded values**
   ```javascript
   // ❌ Bad
   <div style={{ color: '#a89068' }}>

   // ✅ Good
   <div style={{ color: colors.brand.primary }}>
   ```

2. **Use semantic tokens when possible**
   ```javascript
   // ❌ Less semantic
   <div style={{ color: colors.neutral[500] }}>

   // ✅ More semantic
   <div style={{ color: colors.text.secondary }}>
   ```

3. **Don't modify token values in components**
   ```javascript
   // ❌ Bad
   const customColor = colors.brand.primary + '80'; // Adding opacity

   // ✅ Good
   // Add a new token in colors.js instead
   ```

4. **Use spacing scale consistently**
   ```javascript
   // ❌ Bad
   <div style={{ padding: '17px' }}>

   // ✅ Good
   <div style={{ padding: spacing[4] }}> // 16px
   ```

## Extending Tokens

To add new tokens:

1. Add to the appropriate file (colors.js, spacing.js, etc.)
2. Export from index.js if needed
3. Update this README with the new token
4. Update Tailwind config if using with Tailwind

Example:
```javascript
// colors.js
export const colors = {
  // ... existing colors
  custom: {
    purple: '#9333EA',
    pink: '#EC4899',
  },
};
```

## Migration Guide

If you have hard-coded values in your components:

1. Find the closest token value
2. Replace the hard-coded value with the token
3. If no token exists, consider adding one

```javascript
// Before
<div style={{ color: '#a89068', padding: '24px' }}>

// After
<div style={{ color: colors.brand.primary, padding: spacing[6] }}>
```

## Questions?

If you're unsure which token to use, check:
1. This README
2. The token files themselves
3. Ask the team
4. Look at similar components for examples
