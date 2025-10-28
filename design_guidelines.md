# Swim Times Tracker - Design Guidelines

## Design Approach
**Reference-Based Approach** drawing from productivity/data tools (Linear, Notion, Airtable) that excel at dense information display while maintaining clarity. These applications masterfully balance data density with visual cleanliness - exactly what coaches need for efficient time tracking.

**Key Principle**: Prioritize data visibility and input efficiency over decorative elements. Every pixel serves the coach's workflow.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 220 15% 8% (deep navy-gray)
- Surface: 220 12% 12% (elevated cards/tables)
- Border: 220 10% 20% (subtle divisions)
- Text Primary: 220 10% 95%
- Text Secondary: 220 8% 65%
- Primary Accent: 210 100% 60% (bright blue for CTAs, active states)
- Success: 145 65% 50% (PB indicators, positive actions)
- Warning: 40 90% 60% (alerts, missing data)

**Light Mode**
- Background: 220 15% 98%
- Surface: 0 0% 100%
- Border: 220 10% 88%
- Text Primary: 220 15% 10%
- Text Secondary: 220 8% 40%
- Same accent colors as dark mode

### B. Typography
**Font Stack**: Inter (Google Fonts) for UI, JetBrains Mono for time displays
- **Headings**: Inter 600, sizes: text-2xl (athlete names), text-xl (section headers), text-lg (table headers)
- **Body**: Inter 400, text-sm for table cells, text-base for forms
- **Times/Numbers**: JetBrains Mono 500, tabular-nums for perfect alignment
- **Labels**: Inter 500, text-xs uppercase tracking-wide for field labels

### C. Layout System
**Spacing Units**: Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16 for consistent rhythm
- Table cell padding: px-3 py-2
- Form field spacing: gap-4
- Section margins: mb-8
- Page padding: p-6 lg:p-8

**Grid System**: max-w-7xl container with responsive breakpoints
- Full-width tables on desktop
- Stack cards on mobile (grid-cols-1)
- Two-column forms on desktop (md:grid-cols-2)

### D. Component Library

**Navigation**
- Top bar: Fixed header with app name, search, and settings
- Left sidebar (desktop): Collapsible navigation with Dashboard, Athletes, All Times, Add Time
- Clean, minimal design with icon+label format
- Active state: subtle background highlight with left border accent

**Data Entry Table**
- Spreadsheet-like grid with alternating row backgrounds
- Inline editing on click with immediate focus
- Sticky header row that remains visible on scroll
- Column headers: sortable with arrow indicators
- Row hover: subtle background change
- Keyboard navigation: Tab/Enter for cell traversal, Escape to cancel
- Auto-save indicator in bottom right

**Table Columns** (left to right):
Date | Athlete | Event (meet/practice name) | Stroke | Distance | Pool | Time | Splits | Actions

**Forms**
- Clean, single-column layout for mobile, two-column for desktop
- Text inputs with clear labels above
- Dropdowns for stroke, pool length (with common values)
- Date picker for event dates
- Splits field: dynamic addition of split times
- Primary button: filled with accent color
- Secondary button: ghost/outline style

**PB Overview Dashboard**
- Cards grid showing best times per stroke/distance combo
- Card structure: Stroke & Distance header, Time display (large, monospace), Event name (small), Date (small)
- Grid: 1 column mobile, 2 columns tablet, 3-4 columns desktop
- Visual indicator: small badge or icon for "new PB"

**Athlete Profile**
- Header: Athlete name (large), total times recorded, latest PB date
- Filterable table of all times with same structure as main entry view
- Stats summary cards above table: PBs by stroke

**Search & Filters**
- Global search bar in top nav
- Filter panel: collapsible on mobile, persistent on desktop
- Quick filters: stroke type, distance, pool length, date range
- Clear visual indicator when filters are active

### E. Interaction Patterns

**Spreadsheet Behavior**
- Click any cell to edit in place
- Tab key moves to next cell (right)
- Enter key moves down
- Shift+Tab/Enter for reverse direction
- Autocomplete for athlete names and event names based on previous entries
- Copy/paste support for bulk entry

**Responsive Behavior**
- Desktop (>1024px): Full table view with all columns
- Tablet (768-1023px): Hide splits column, show in expandable row
- Mobile (<768px): Card-based view instead of table, one entry per card

**Visual Feedback**
- Saving: subtle spinner in cell during auto-save
- Success: brief green flash on row after save
- Error: red border on invalid input
- Loading states: skeleton rows in tables

## Critical UX Considerations

**Performance Focus**: Coaches will enter dozens of times per session
- Minimize clicks: inline editing, autocomplete, keyboard shortcuts
- Smart defaults: pre-fill date to today, remember last event name
- Batch operations: add multiple swimmers to same event quickly

**Data Integrity**
- Time format validation (MM:SS.ss or SS.ss)
- Distance/pool length combinations that make sense
- Visual warnings for unusual times (too fast/slow)

**Mobile Optimization**
- Optimized for viewing PBs and reviewing data
- Full data entry best on desktop, but quick edits possible on mobile
- Touch-friendly tap targets (min 44px)

**No Images Required**: This is a pure data application - focus on typography, spacing, and data clarity over imagery. The only graphics needed are icons for navigation and stroke types (use Heroicons for interface, consider swim stroke icons from Font Awesome).