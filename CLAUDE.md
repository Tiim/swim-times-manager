# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwimTimes is a client-side React application for swim coaches to track athlete performance and automatically calculate personal bests. The app provides a spreadsheet-like interface for managing swim times across multiple athletes, events, strokes, and pool types. All data is stored locally in the browser using localStorage.

**User Preference**: Use simple, everyday language when communicating.

## Development Commands

### Running the Application
```bash
npm run dev          # Start Vite development server with HMR
npm run build        # Build static site for production
npm run preview      # Preview production build locally
npm run check        # TypeScript type checking only (no build)
```

### Development Notes
- The dev server uses Vite with HMR (Hot Module Replacement)
- All data is stored in browser localStorage
- No backend server required - pure static site
- Can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## Architecture Overview

### Tech Stack
- **React 18** with **TypeScript** for type safety
- **Wouter** for lightweight client-side routing (not React Router)
- **localStorage** for all data persistence (no backend required)
- **Shadcn/ui** components built on **Radix UI** primitives
- **Tailwind CSS** for styling with custom theme variables
- **Vite** for build tooling and development server

### Storage Layer
- **Client-side storage**: All data stored in browser localStorage
- **Storage class**: `LocalSwimStorage` in `client/src/lib/storage.ts`
- **Data format**: JSON serialized to localStorage
- **Export/Import**: Built-in JSON export and import functionality

### Key Architectural Patterns

**Data Flow**:
1. Components call methods on `swimStorage` instance directly
2. Storage class handles all CRUD operations with localStorage
3. Personal best calculation happens client-side in `storage.ts` (`getPersonalBests` method)
4. Components use `useEffect` and `useState` to manage local state
5. Custom events (`storage-updated`) coordinate updates across components

**Type Safety**:
- Schema defined in `client/src/lib/storage.ts` with TypeScript interfaces
- Zod validation used for data integrity
- All storage operations are type-safe

**Time Comparison Logic**:
- Times stored as strings in `MM:SS.ss` or `SS.ss` format
- `timeToSeconds()` helper in `storage.ts` converts for comparison
- PBs calculated per unique `athleteName-stroke-distance-poolLength` combination

### Path Aliases
- `@/*` → `client/src/*`
- `@assets/*` → `client/src/assets/*` (configured in Vite)

### Component Organization
- **Pages**: `client/src/pages/` - Route components (Dashboard, Athletes, AllTimes, AddTime, AthleteProfile, ImportExport)
- **UI Components**: `client/src/components/ui/` - Shadcn/ui primitives (never modify directly, regenerate via CLI)
- **Feature Components**: `client/src/components/` - TimeEntryTable, AddTimeForm, PBCard, etc.
- **Examples**: `client/src/components/examples/` - Reference implementations

### Storage API Methods
The `swimStorage` instance provides these methods:
- `getAllSwimTimes()` - Get all swim times sorted by date
- `getSwimTimeById(id)` - Get single swim time by ID
- `getSwimTimesByAthlete(name)` - Get all times for specific athlete
- `createSwimTime(data)` - Create new swim time
- `updateSwimTime(id, updates)` - Update existing swim time
- `deleteSwimTime(id)` - Delete swim time
- `getPersonalBests()` - Calculate and return all PBs
- `getPersonalBestsForAthlete(name)` - PBs for specific athlete
- `getAthletes()` - Get all athletes with statistics
- `exportData()` - Export all data as JSON string
- `importData(jsonString)` - Import data from JSON
- `clearAll()` - Delete all data

## Design System

**Philosophy**: Prioritize data density and input efficiency over decoration. Reference designs: Linear, Notion, Airtable.

**Key Requirements** (from `design_guidelines.md`):
- **Dark mode first** with light mode support via CSS variables
- **Monospace fonts** (JetBrains Mono) for all time/number displays with `tabular-nums`
- **Spreadsheet-like interactions**: inline editing, keyboard navigation (Tab/Enter), autocomplete
- **Dense layouts**: tight spacing, alternating row backgrounds, sticky headers
- **No decorative imagery**: icon-based navigation only

**Color System**: Uses HSL values in CSS variables for theme switching
- Primary accent: Blue (210 100% 60%)
- Success: Green for PB indicators
- Warning: Yellow for alerts/missing data

**Typography**:
- UI: Inter (Google Fonts)
- Times/Numbers: JetBrains Mono with tabular-nums class
- Also available: DM Sans, Geist Mono, Fira Code

**Responsive Strategy**:
- Desktop (>1024px): Full table view
- Tablet (768-1023px): Hide splits column, show in expandable row
- Mobile (<768px): Card-based view instead of tables

## Data Schema

### SwimTime Model
```typescript
{
  id: string (UUID)
  athleteName: string
  eventName: string
  date: string (ISO date format)
  measuredTime: string (MM:SS.ss or SS.ss)
  stroke: "Freestyle" | "Backstroke" | "Breaststroke" | "Butterfly" | "IM"
  distance: number (in meters)
  poolLength: "SCM" | "SCY" | "LCM" | "LCY"
  splits?: string | null
}
```

### Validation Rules
- `measuredTime` must match regex: `/^\d{1,2}:\d{2}\.\d{2}$|^\d{1,2}\.\d{2}$/`
- `distance` must be positive integer
- All enums strictly typed

## Common Development Patterns

### Adding a New Page
1. Create component in `client/src/pages/`
2. Add route in `App.tsx` Router component (uses Wouter `<Route>`)
3. Add navigation item in `client/src/components/app-sidebar.tsx`
4. Use `swimStorage` methods for data access

### Using the Storage Layer
```typescript
import { swimStorage } from "@/lib/storage";
import { useState, useEffect } from "react";

function MyComponent() {
  const [times, setTimes] = useState([]);

  useEffect(() => {
    // Load data on mount
    const data = swimStorage.getAllSwimTimes();
    setTimes(data);

    // Listen for updates from other components
    const handleUpdate = () => {
      setTimes(swimStorage.getAllSwimTimes());
    };
    window.addEventListener('storage-updated', handleUpdate);
    return () => window.removeEventListener('storage-updated', handleUpdate);
  }, []);

  const handleCreate = (newTime) => {
    swimStorage.createSwimTime(newTime);
    // Notify other components of the change
    window.dispatchEvent(new Event('storage-updated'));
    setTimes(swimStorage.getAllSwimTimes());
  };

  return (
    // Component JSX
  );
}
```

### Data Persistence
- All data is stored in browser localStorage under the key `"swim-times-data"`
- Data persists across page refreshes and browser sessions
- Users can export data via the Import/Export page as a backup
- Data is browser-specific (not synced across devices)

## Build System

- **Vite**: Bundles React app and outputs static files to `dist/`
- **Output**: Standard HTML, CSS, and JavaScript files
- **Deployment**: Can be deployed to any static hosting service
  - GitHub Pages
  - Netlify
  - Vercel
  - Cloudflare Pages
  - AWS S3 + CloudFront
  - Or any web server (nginx, Apache, etc.)

## Deployment

The built application is a standard static website:
1. Run `npm run build` to create production build in `dist/` directory
2. Upload contents of `dist/` to your static hosting service
3. Ensure the hosting service is configured to serve `index.html` for all routes (for client-side routing)

Example Netlify configuration (`netlify.toml`):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Important Files

- `client/src/lib/storage.ts` - Client-side storage layer and data types
- `client/src/App.tsx` - Main app shell with routing
- `client/src/pages/` - All page components
- `vite.config.ts` - Build configuration
- `design_guidelines.md` - Detailed UI/UX specifications
