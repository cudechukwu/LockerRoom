# Typography System Documentation

## Overview

The LockerRoom app now uses a comprehensive, centralized typography system that provides consistent, scalable, and maintainable text styling across all screens. This system replaces hardcoded font values with semantic, reusable typography tokens and includes advanced features for accessibility, validation, and developer experience.

## Key Benefits

- **Consistency**: All text follows the same visual hierarchy with proper line heights
- **Scalability**: Easy to update fonts globally from one location
- **Accessibility**: Built-in support for dynamic type scaling and accessibility settings
- **Maintainability**: Cleaner codebase with semantic naming and validation
- **Theme Support**: Ready for dark/light mode switching
- **Developer Experience**: Component wrappers and validation utilities
- **Type Safety**: Organized type families for better code organization

## File Structure

```
src/constants/
├── typography.js     # Main typography system with tokens, scaling, and validation
├── colors.js         # Color constants (used by typography)
└── fonts.js          # Legacy font system (still available)

src/components/
└── AppText.jsx       # Typography wrapper component and utilities
```

## New Features

### 1. Line Height Tokens
Consistent vertical rhythm across all text elements:

```javascript
export const LINE_HEIGHTS = {
  XS: 14,
  SM: 18,
  BASE: 22,
  LG: 26,
  XL: 32,
  XXL: 40,
};
```

### 2. Semantic Type Families
Organized typography variants for better code organization:

```javascript
export const TYPESETS = {
  headings: ['h1', 'h2', 'sectionTitle'],
  body: ['body', 'bodyLarge', 'bodyMedium'],
  meta: ['caption', 'overline', 'badge'],
  feed: ['feedName', 'feedAction', 'feedContent'],
  // ... and more
};
```

### 3. Enhanced Accessibility Scaling
Dynamic font scaling that responds to accessibility changes:

```javascript
// Static scaling (current implementation)
const scaleFont = (size) => {
  const scale = PixelRatio.getFontScale();
  return size * scale;
};

// Dynamic scaling (for components that need real-time updates)
export const useScaledFontSize = (size) => {
  const { fontScale } = useWindowDimensions();
  return size * fontScale;
};
```

### 4. AppText Component Wrapper
Clean, type-safe component for using typography:

```jsx
import { AppText, Heading1, Body, Caption } from '../components/AppText';

// Instead of
<Text style={TYPOGRAPHY.h1}>Title</Text>

// Use
<AppText variant="h1">Title</AppText>
// or
<Heading1>Title</Heading1>
```

### 5. Typography Validation
Built-in validation utilities for consistent usage:

```javascript
import { TypographyValidator } from '../constants/typography';

// Validate typography usage in a component
const validation = TypographyValidator.validateContext(
  ['title', 'body', 'caption'], 
  'card'
);
// Returns: { isValid: true, invalid: [], recommended: [...] }
```

## Usage Examples

### Method 1: Direct Typography Import (Traditional)

```jsx
import { TYPOGRAPHY } from '../constants/typography';

// Instead of hardcoded styles
<Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
  Hello World
</Text>

// Use semantic typography
<Text style={TYPOGRAPHY.title}>Hello World</Text>
```

### Method 2: AppText Component (Recommended)

```jsx
import { AppText, Heading1, Body, Caption } from '../components/AppText';

// Clean, semantic usage
<AppText variant="h1">Main Title</AppText>
<AppText variant="body">Regular content text</AppText>

// Or use pre-built components
<Heading1>Main Title</Heading1>
<Body>Regular content text</Body>
<Caption>Supporting text</Caption>
```

### Method 3: Dynamic Scaling (For Accessibility)

```jsx
import { useScaledFontSize } from '../constants/typography';

const MyComponent = () => {
  const scaledSize = useScaledFontSize(16);
  
  return (
    <Text style={{ fontSize: scaledSize }}>
      This text scales with accessibility settings
    </Text>
  );
};
```

### StyleSheet Integration

```jsx
const styles = StyleSheet.create({
  // Old way
  oldStyle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  
  // New way
  newStyle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 10,
  },
});
```

### Custom Overrides

```jsx
const customStyle = {
  ...TYPOGRAPHY.body,
  color: '#FF0000', // Override color
  marginTop: 20,    // Add additional properties
};
```

## Typography Tokens

### Core Typography Tokens

#### Headers
- `TYPOGRAPHY.h1` - Main page titles (24px, Bold, Line Height: 32)
- `TYPOGRAPHY.h2` - Section headers (20px, Semibold, Line Height: 26)

#### Titles & Subtitles
- `TYPOGRAPHY.title` - Card titles, important text (16px, Semibold, Line Height: 22)
- `TYPOGRAPHY.subtitle` - Secondary titles (16px, Medium, Line Height: 22)

#### Body Text
- `TYPOGRAPHY.body` - Regular content (16px, Regular, Line Height: 22)
- `TYPOGRAPHY.bodyLarge` - Emphasized content (18px, Semibold, Line Height: 26)
- `TYPOGRAPHY.bodyMedium` - Medium emphasis (14px, Medium, Line Height: 18)

#### Captions & Labels
- `TYPOGRAPHY.caption` - Supporting text (14px, Medium, Line Height: 18)
- `TYPOGRAPHY.captionSmall` - Small labels (12px, Medium, Line Height: 14)
- `TYPOGRAPHY.overline` - Micro labels (12px, Semibold, spaced, Line Height: 14)

#### Interactive Elements
- `TYPOGRAPHY.button` - Button text (14px, Bold)
- `TYPOGRAPHY.buttonSmall` - Small buttons (12px, Bold)
- `TYPOGRAPHY.badge` - Badge text (12px, Bold, spaced)

### Specialized Component Tokens

#### User Interface
- `TYPOGRAPHY.greeting` - Personal greetings
- `TYPOGRAPHY.teamName` - Team names
- `TYPOGRAPHY.teamSubtitle` - Team descriptions
- `TYPOGRAPHY.notificationBadge` - Notification counts
- `TYPOGRAPHY.sectionTitle` - Section headers

#### Events & Calendar
- `TYPOGRAPHY.eventTitle` - Event titles
- `TYPOGRAPHY.eventTime` - Event times
- `TYPOGRAPHY.gameMode` - Game mode indicators
- `TYPOGRAPHY.countdown` - Countdown text
- `TYPOGRAPHY.calendarDay` - Calendar day labels
- `TYPOGRAPHY.calendarCircle` - Calendar circle text
- `TYPOGRAPHY.calendarEvent` - Calendar event text

#### Feed & Social
- `TYPOGRAPHY.feedName` - Feed user names
- `TYPOGRAPHY.feedContent` - Feed post content
- `TYPOGRAPHY.feedAction` - Feed action text
- `TYPOGRAPHY.feedTime` - Feed timestamps
- `TYPOGRAPHY.feedHeader` - Feed headers
- `TYPOGRAPHY.feedPoll` - Poll text
- `TYPOGRAPHY.feedDrills` - Drill descriptions

#### Analytics & Stats
- `TYPOGRAPHY.insightLabel` - Insight labels
- `TYPOGRAPHY.insightValue` - Insight values
- `TYPOGRAPHY.insightSubtext` - Insight subtext
- `TYPOGRAPHY.statText` - Stat text
- `TYPOGRAPHY.statSubtext` - Stat subtext

#### Navigation & UI
- `TYPOGRAPHY.viewAllLink` - View all links
- `TYPOGRAPHY.loading` - Loading text

## Advanced Features

### Type Families & Validation

The typography system includes semantic type families for better organization:

```javascript
import { TYPESETS, TypographyValidator } from '../constants/typography';

// Get all heading variants
const headingVariants = TYPESETS.headings; // ['h1', 'h2', 'sectionTitle']

// Validate typography usage in a component
const validation = TypographyValidator.validateContext(
  ['title', 'body', 'caption'], 
  'card'
);

if (!validation.isValid) {
  console.warn('Invalid typography usage:', validation.invalid);
  console.log('Recommended variants:', validation.recommended);
}
```

### Line Height Consistency

All typography tokens now include proper line heights for consistent vertical rhythm:

```javascript
// Before: Inconsistent spacing
const oldStyle = {
  fontSize: 16,
  lineHeight: 21, // Random value
};

// After: Consistent spacing
const newStyle = {
  ...TYPOGRAPHY.body, // Includes lineHeight: 22
};
```

### Dynamic Accessibility Scaling

For components that need real-time accessibility updates:

```jsx
import { useScaledFontSize } from '../constants/typography';

const AccessibleText = ({ children }) => {
  const scaledSize = useScaledFontSize(16);
  
  return (
    <Text style={{ fontSize: scaledSize }}>
      {children}
    </Text>
  );
};
```

### Component-Based Usage

The AppText component provides a cleaner, more maintainable approach:

```jsx
import { AppText, Heading1, Body, Caption } from '../components/AppText';

const MyComponent = () => (
  <View>
    <Heading1>Main Title</Heading1>
    <Body>This is regular body text with proper line height.</Body>
    <Caption>This is supporting text.</Caption>
    
    {/* Or use the flexible AppText component */}
    <AppText variant="eventTitle">Team Meeting</AppText>
    <AppText variant="feedContent">Post content here</AppText>
  </View>
);
```

## Font Scaling

The system automatically scales fonts based on device settings:

```javascript
const scaleFont = (size) => {
  const scale = PixelRatio.getFontScale();
  return size * scale;
};
```

This ensures accessibility compliance and better user experience across different devices.

## Theme Support

### Dark Theme (Default)
```jsx
import { TYPOGRAPHY } from '../constants/typography';

<Text style={TYPOGRAPHY.body}>Dark theme text</Text>
```

### Light Theme
```jsx
import { getTypography } from '../constants/typography';

const lightTypography = getTypography('light');
<Text style={lightTypography.body}>Light theme text</Text>
```

## Migration Guide

### Step 1: Replace Hardcoded Fonts

**Before:**
```jsx
const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
```

**After:**
```jsx
const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.title,
    letterSpacing: -0.2, // Optional override
  },
});
```

### Step 2: Use Semantic Names

Instead of thinking about font sizes, think about text purpose:

- Screen titles → `TYPOGRAPHY.h1`
- Section headers → `TYPOGRAPHY.h2` or `TYPOGRAPHY.sectionTitle`
- Card titles → `TYPOGRAPHY.title`
- Regular text → `TYPOGRAPHY.body`
- Supporting text → `TYPOGRAPHY.caption`
- Labels/tags → `TYPOGRAPHY.overline`

### Step 3: Global Search & Replace

Use your IDE's search and replace functionality:

1. Search for: `fontSize: 16, fontWeight: '600'`
2. Replace with: `...TYPOGRAPHY.title`

## Best Practices

### 1. Use Semantic Names
```jsx
// Good
<Text style={TYPOGRAPHY.sectionTitle}>Next Up</Text>

// Avoid
<Text style={TYPOGRAPHY.h2}>Next Up</Text> // Unless it's actually a page header
```

### 2. Extend, Don't Override
```jsx
// Good
const customStyle = {
  ...TYPOGRAPHY.body,
  marginTop: 10,
};

// Avoid
const customStyle = {
  fontSize: 16,
  fontWeight: '400',
  color: '#FFFFFF',
  marginTop: 10,
};
```

### 3. Use Specialized Tokens
```jsx
// Good
<Text style={TYPOGRAPHY.feedName}>John Doe</Text>

// Avoid
<Text style={TYPOGRAPHY.title}>John Doe</Text>
```

### 4. Maintain Consistency
Always use the typography system instead of hardcoded values, even for small text elements.

## Testing

Use the `TypographyTest.jsx` component to preview all typography tokens:

```jsx
import TypographyTest from '../components/TypographyTest';

// Add to your navigation or render directly
<TypographyTest />
```

## Future Enhancements

1. **Custom Font Support**: Add support for custom fonts like Inter or SF Pro
2. **Responsive Typography**: Implement breakpoint-based font scaling
3. **Animation Support**: Add typography-based animations
4. **Accessibility**: Enhanced support for accessibility features

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure to import `TYPOGRAPHY` from the correct path
2. **Style Conflicts**: Use spread operator (`...`) to avoid style conflicts
3. **Missing Styles**: Check if the token exists in the typography system
4. **Color Issues**: Ensure colors are defined in `colors.js`

### Debug Mode

Add this to see all available typography tokens:

```jsx
console.log('Available typography tokens:', Object.keys(TYPOGRAPHY));
```

## Best Practices

### 1. Use Semantic Names
```jsx
// Good
<AppText variant="sectionTitle">Next Up</AppText>

// Avoid
<AppText variant="h2">Next Up</AppText> // Unless it's actually a page header
```

### 2. Prefer AppText Component
```jsx
// Good
<AppText variant="body">Content here</AppText>

// Less ideal (but still works)
<Text style={TYPOGRAPHY.body}>Content here</Text>
```

### 3. Use Type Families for Validation
```jsx
// Validate your component's typography usage
const validation = TypographyValidator.validateContext(
  ['title', 'body', 'caption'], 
  'card'
);
```

### 4. Extend, Don't Override
```jsx
// Good
const customStyle = {
  ...TYPOGRAPHY.body,
  marginTop: 10,
};

// Avoid
const customStyle = {
  fontSize: 16,
  fontWeight: '400',
  color: '#FFFFFF',
  marginTop: 10,
};
```

### 5. Use Specialized Tokens
```jsx
// Good
<AppText variant="feedName">John Doe</AppText>

// Avoid
<AppText variant="title">John Doe</AppText>
```

### 6. Maintain Line Height Consistency
```jsx
// Good - line height is automatically included
<AppText variant="body">Text with proper spacing</AppText>

// Avoid - don't override line heights unless necessary
<AppText variant="body" style={{ lineHeight: 20 }}>
  Text with custom spacing
</AppText>
```

## Migration Guide

### Step 1: Replace Hardcoded Fonts

**Before:**
```jsx
const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 21, // Random value
  },
});
```

**After:**
```jsx
const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.title, // Includes proper line height
    letterSpacing: -0.2, // Optional override
  },
});
```

### Step 2: Use AppText Component (Recommended)

**Before:**
```jsx
<Text style={TYPOGRAPHY.sectionTitle}>Next Up</Text>
```

**After:**
```jsx
<AppText variant="sectionTitle">Next Up</AppText>
```

### Step 3: Apply Semantic Names

Instead of thinking about font sizes, think about text purpose:

- Screen titles → `h1`
- Section headers → `h2` or `sectionTitle`
- Card titles → `title`
- Regular text → `body`
- Supporting text → `caption`
- Labels/tags → `overline`

### Step 4: Global Search & Replace

Use your IDE's search and replace functionality:

1. Search for: `fontSize: 16, fontWeight: '600'`
2. Replace with: `...TYPOGRAPHY.title`

### Step 5: Validate Usage

Add validation to your components:

```jsx
import { TypographyValidator } from '../constants/typography';

const MyComponent = () => {
  const usedVariants = ['title', 'body', 'caption'];
  const validation = TypographyValidator.validateContext(usedVariants, 'card');
  
  if (!validation.isValid) {
    console.warn('Typography validation failed:', validation.invalid);
  }
  
  // ... component code
};
```

## Testing

### 1. Use TypographyTest Component
```jsx
import TypographyTest from '../components/TypographyTest';

// Add to your navigation or render directly
<TypographyTest />
```

### 2. Test Accessibility Scaling
- Enable "Larger Text" in iOS/Android settings
- Verify text scales appropriately
- Test with different accessibility settings

### 3. Validate Type Families
```jsx
// Test that components use appropriate typography variants
const validation = TypographyValidator.validateContext(
  ['title', 'body', 'caption'], 
  'card'
);
console.assert(validation.isValid, 'Typography validation failed');
```

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure to import `AppText` from the correct path
2. **Style Conflicts**: Use spread operator (`...`) to avoid style conflicts
3. **Missing Styles**: Check if the token exists in the typography system
4. **Color Issues**: Ensure colors are defined in `colors.js`
5. **Line Height Issues**: Don't override line heights unless necessary

### Debug Mode

Add this to see all available typography tokens:

```jsx
console.log('Available typography tokens:', Object.keys(TYPOGRAPHY));
console.log('Available type families:', Object.keys(TYPESETS));
```

## Contributing

When adding new typography tokens:

1. Follow the naming convention (semantic over technical)
2. Include proper scaling and accessibility support
3. Add appropriate line height from `LINE_HEIGHTS`
4. Categorize in appropriate `TYPESETS` group
5. Update this documentation
6. Add examples to `TypographyTest.jsx`
7. Test across different screen sizes and accessibility settings
8. Validate with `TypographyValidator`
