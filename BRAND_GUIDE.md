# LeadFlow Brand Style Guide

## Logo

### Primary Logo
![LeadFlow Logo](src/assets/logo.png)

The LeadFlow logo consists of two elements:
1. **Symbol**: A geometric icon representing data nodes connected in a layered structure
2. **Wordmark**: "LeadFlow" in a bold, modern sans-serif typeface

### Logo Symbolism
The icon represents:
- **Interconnected nodes**: Data points coming together
- **Layered structure**: Depth of information and enrichment
- **Upward flow**: Growth and expansion of lead data
- **Geometric precision**: Accuracy and reliability

### Logo Usage
- Minimum size: 120px wide
- Clear space: Minimum 20px on all sides
- Always use on contrasting backgrounds
- Never stretch, rotate, or distort

## Color Palette

### Primary Colors

**Black** - `#000000` / `rgb(0, 0, 0)` / `hsl(0, 0%, 0%)`
- Use for: Primary text, headings, main UI elements, logo wordmark
- Represents: Professionalism, clarity, precision

**Lavender** - `#DCA7F7` / `rgb(220, 167, 247)` / `hsl(267, 74%, 82%)`
- Use for: Accent elements, hover states, interactive elements, icon highlights
- Represents: Innovation, creativity, technology

### Supporting Colors

**Off-White Background** - `#FAFAFA` / `rgb(250, 250, 250)` / `hsl(0, 0%, 98%)`
- Use for: Main background, card backgrounds
- Provides clean, minimal canvas

**Gray Scale**
- `#F5F5F5` - Light borders
- `#E5E5E5` - Dividers
- `#737373` - Secondary text
- `#262626` - Dark text alternatives

### Color Usage Guidelines

**Do:**
- Use black as the dominant color
- Apply lavender sparingly for emphasis
- Maintain high contrast ratios for accessibility
- Use grayscale for hierarchy

**Don't:**
- Use more than 3 colors in a single component
- Apply lavender to large areas
- Reduce contrast for decorative purposes

## Typography

### Font Family
**Primary**: Inter, system-ui, -apple-system, sans-serif
- Modern, geometric sans-serif
- Excellent readability across sizes
- Professional and approachable

### Font Weights
- **Regular (400)**: Body text, descriptions, form inputs
- **Medium (500)**: Buttons, labels, navigation
- **Semibold (600)**: Subheadings, card titles
- **Bold (700)**: Main headings, emphasis

### Type Scale
```css
/* Headings */
h1: 36px / 44px (2.25rem / 2.75rem)
h2: 30px / 36px (1.875rem / 2.25rem)
h3: 24px / 32px (1.5rem / 2rem)
h4: 20px / 28px (1.25rem / 1.75rem)

/* Body */
Large: 18px / 28px (1.125rem / 1.75rem)
Base: 16px / 24px (1rem / 1.5rem)
Small: 14px / 20px (0.875rem / 1.25rem)
XSmall: 12px / 16px (0.75rem / 1rem)
```

### Typography Best Practices
- Line height: 1.5-1.75 for body text
- Letter spacing: Tight (-0.01em) for headings
- Paragraph spacing: 1em between paragraphs
- Max line width: 65-75 characters for readability

## Spacing System

Based on 4px grid:

```
xs: 4px (0.25rem)
sm: 8px (0.5rem)
md: 16px (1rem)
lg: 24px (1.5rem)
xl: 32px (2rem)
2xl: 48px (3rem)
3xl: 64px (4rem)
```

### Spacing Usage
- Component padding: 16px-24px
- Section margins: 32px-64px
- Grid gaps: 16px-24px
- Button padding: 12px 24px

## Components

### Buttons

**Primary Button**
- Background: Black (`#000000`)
- Text: White
- Padding: 12px 24px
- Border radius: 12px
- Hover: Lavender background

**Secondary Button**
- Background: Lavender (`#DCA7F7`)
- Text: Black
- Padding: 12px 24px
- Border radius: 12px
- Hover: Darker lavender

**Outline Button**
- Border: 2px solid black
- Text: Black
- Background: Transparent
- Hover: Black background, white text

### Cards
- Background: White
- Border: 1px solid `#E5E5E5`
- Border radius: 16px
- Shadow: Subtle (0 1px 3px rgba(0,0,0,0.1))
- Padding: 24px

### Form Elements
- Input height: 40px
- Border: 1px solid `#E5E5E5`
- Border radius: 8px
- Focus state: Lavender border
- Placeholder: `#737373`

### Tables
- Header background: `#FAFAFA`
- Row border: 1px solid `#E5E5E5`
- Hover background: `#F5F5F5`
- Padding: 12px 16px

## Icons

### Style
- Line style: 2px stroke width
- Style: Outlined, geometric
- Size: 16px, 20px, 24px standard sizes
- Color: Match text color or lavender for accents

### Icon Library
Using Lucide React for consistency:
- Sparkles: Enrichment action
- Upload: File upload
- UserPlus: Add lead
- LogOut: Sign out
- Trash: Delete

## Animations & Transitions

### Timing
```css
Fast: 150ms
Standard: 300ms
Slow: 500ms
```

### Easing
- `cubic-bezier(0.4, 0, 0.2, 1)` - Standard easing
- `ease-in-out` - Symmetric animations
- `ease-out` - Entrances

### Animation Guidelines
- Fade in: 300ms opacity transition
- Slide in: 300ms transform transition
- Button hover: 150ms background transition
- Loading spinners: 1000ms rotation

## Layout

### Grid System
- Container max-width: 1280px
- Padding: 16px mobile, 32px desktop
- Columns: 12-column grid
- Gap: 24px

### Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Layout Principles
- Mobile-first design
- Generous whitespace
- Clear visual hierarchy
- Consistent alignment
- Balanced asymmetry

## Imagery

### Photography Style
- Clean, minimal backgrounds
- High contrast
- Professional business settings
- Diverse representation

### Illustration Style
- Geometric shapes
- Simple line art
- Lavender accents on black/white
- Data visualization themes

### Icons & Graphics
- Minimal, functional
- Consistent line weight
- Clear at small sizes
- Scalable vector format

## Voice & Tone

### Brand Voice
- **Professional**: Expert without being stuffy
- **Clear**: Simple language, no jargon
- **Confident**: Assured but not arrogant
- **Helpful**: Solution-focused

### Writing Style
- Short sentences
- Active voice
- Bullet points for lists
- Clear CTAs

### Example Copy

**Good:**
"Enrich your leads in seconds. Find company domains automatically."

**Avoid:**
"Leverage our cutting-edge AI-powered lead enrichment solution to optimize your B2B outreach campaigns."

## Accessibility

### Color Contrast
- Text on background: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- Interactive elements: 3:1 minimum

### Interactive Elements
- Minimum touch target: 44x44px
- Keyboard navigation support
- Focus indicators visible
- Error states clearly marked

### Screen Readers
- Semantic HTML
- Alt text for images
- ARIA labels where needed
- Logical heading hierarchy

## Brand Applications

### Email Signatures
```
[Name]
LeadFlow
[Title]
name@leadflow.com
```

### Social Media
- Profile image: Logo icon only (square crop)
- Cover images: Full logo with lavender accent
- Post graphics: Black & lavender color scheme

### Presentations
- Title slides: Full logo, black background
- Content slides: Minimal design, ample whitespace
- Data slides: Black text, lavender highlights

## Don'ts

**Logo:**
❌ Don't rotate or skew the logo
❌ Don't change logo colors
❌ Don't add effects (shadows, gradients)
❌ Don't recreate the logo

**Colors:**
❌ Don't use unapproved colors
❌ Don't reduce contrast
❌ Don't use gradients
❌ Don't use textures

**Typography:**
❌ Don't use more than 2 font families
❌ Don't stretch or condense text
❌ Don't use all caps for body text
❌ Don't use decorative fonts

**Layout:**
❌ Don't clutter spaces
❌ Don't ignore grid system
❌ Don't break visual hierarchy
❌ Don't use inconsistent spacing

---

## Quick Reference

**Primary Color**: #000000 (Black)
**Accent Color**: #DCA7F7 (Lavender)
**Font**: Inter
**Border Radius**: 12px (buttons), 16px (cards)
**Spacing Unit**: 4px grid
**Max Container**: 1280px

**Key Principle**: Modern minimalism with purposeful lavender accents.
