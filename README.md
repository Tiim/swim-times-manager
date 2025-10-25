# SwimTimes Manager

A client-side React application for swim coaches to track athlete performance and automatically calculate personal bests. Features a spreadsheet-like interface for managing swim times across multiple athletes, events, strokes, and pool types.

## Features

- 📊 **Personal Bests Dashboard** - Automatic calculation and display of personal bests
- 👥 **Athlete Management** - Track multiple athletes with individual performance profiles
- ⏱️ **Time Entry** - Spreadsheet-like interface for quick data entry
- 🔍 **Advanced Filtering** - Search and filter by athlete, stroke, pool type, and more
- 📥 **Import/Export** - Backup and restore data via JSON export/import
- 💾 **Local Storage** - All data stored locally in browser (no server required)
- 🌓 **Dark/Light Mode** - Built-in theme switching
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Fast build tooling and development server with HMR
- **Wouter** - Lightweight client-side routing
- **Shadcn/ui** - Beautiful UI components built on Radix UI
- **Tailwind CSS** - Utility-first styling
- **localStorage** - Client-side data persistence

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd SwimTimesManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running with Hot Reloading

Start the development server with Hot Module Replacement (HMR) enabled:

```bash
npm run dev
```

This will:
- Start the Vite development server on `http://localhost:5173` (or next available port)
- Enable Hot Module Replacement - changes to your code will instantly update in the browser without full page reloads
- Watch for file changes automatically

The terminal will display the local URL where the app is running. Open it in your browser and start developing!

**Hot reloading features:**
- React components update instantly when you save changes
- CSS/Tailwind changes apply immediately
- TypeScript errors appear in both the terminal and browser overlay

### Other Available Commands

```bash
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build locally
npm run check    # Run TypeScript type checking
```

## Project Structure

```
SwimTimesManager/
├── client/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Shadcn/ui primitives
│   │   │   ├── AddTimeForm.tsx
│   │   │   ├── TimeEntryTable.tsx
│   │   │   ├── PBCard.tsx
│   │   │   └── ...
│   │   ├── pages/           # Route components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Athletes.tsx
│   │   │   ├── AllTimes.tsx
│   │   │   ├── AddTime.tsx
│   │   │   ├── AthleteProfile.tsx
│   │   │   └── ImportExport.tsx
│   │   ├── lib/
│   │   │   └── storage.ts   # localStorage wrapper and data logic
│   │   ├── hooks/           # Custom React hooks
│   │   ├── App.tsx          # Main app component with routing
│   │   └── main.tsx         # App entry point
│   ├── index.html
│   └── public/              # Static assets
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json
```

## Data Storage

All swim time data is stored locally in your browser using **localStorage**:

- Data persists across browser sessions
- Data is specific to each browser/device
- No data is sent to any server
- Storage key: `swim-times-data`

### Backing Up Your Data

To backup your data:
1. Navigate to **Import/Export** page in the app
2. Click **Export Data**
3. Save the downloaded JSON file

To restore data:
1. Navigate to **Import/Export** page
2. Click **Import Data**
3. Select your JSON backup file

## Building for Production

Create an optimized production build:

```bash
npm run build
```

This creates a `dist/` folder with static files ready for deployment.

Preview the production build locally:

```bash
npm run preview
```

## Deployment

The application is a static website and can be deployed to any static hosting service:

### Netlify / Vercel / Cloudflare Pages

1. Build the project: `npm run build`
2. Deploy the `dist/` folder
3. Configure redirects for client-side routing:

**Netlify** - Create `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Vercel** - Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### GitHub Pages

1. Build: `npm run build`
2. Push `dist/` folder to `gh-pages` branch
3. Enable GitHub Pages in repository settings

### Traditional Web Server (nginx, Apache)

1. Build: `npm run build`
2. Upload contents of `dist/` to your web server
3. Configure your server to serve `index.html` for all routes

**nginx example:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Development

### Adding a New Page

1. Create component in `client/src/pages/`
2. Add route in `App.tsx`:
   ```typescript
   <Route path="/my-page" component={MyPage} />
   ```
3. Add navigation link in `client/src/components/app-sidebar.tsx`

### Using the Storage API

```typescript
import { swimStorage } from "@/lib/storage";

// Get all swim times
const times = swimStorage.getAllSwimTimes();

// Create new time
const newTime = swimStorage.createSwimTime({
  athleteName: "John Doe",
  eventName: "100m Freestyle",
  date: "2025-10-25",
  measuredTime: "52.34",
  stroke: "Freestyle",
  distance: 100,
  poolLength: "SCM",
  splits: null
});

// Update after changes
window.dispatchEvent(new Event('storage-updated'));
```

### Storage Methods Available

- `getAllSwimTimes()` - Get all times sorted by date
- `getSwimTimeById(id)` - Get single time
- `getSwimTimesByAthlete(name)` - Get athlete's times
- `createSwimTime(data)` - Create new time
- `updateSwimTime(id, updates)` - Update existing time
- `deleteSwimTime(id)` - Delete time
- `getPersonalBests()` - Calculate all PBs
- `getPersonalBestsForAthlete(name)` - Get athlete PBs
- `getAthletes()` - Get all athletes with stats
- `exportData()` - Export as JSON string
- `importData(json)` - Import from JSON
- `clearAll()` - Delete all data

## Data Model

### SwimTime Interface

```typescript
{
  id: string;                   // UUID
  athleteName: string;
  eventName: string;
  date: string;                 // ISO date format (YYYY-MM-DD)
  measuredTime: string;         // MM:SS.ss or SS.ss
  stroke: "Freestyle" | "Backstroke" | "Breaststroke" | "Butterfly" | "IM";
  distance: number;             // meters
  poolLength: "SCM" | "SCY" | "LCM" | "LCY";
  splits?: string | null;
}
```

### Pool Length Abbreviations

- **SCM** - Short Course Meters (25m)
- **SCY** - Short Course Yards (25yd)
- **LCM** - Long Course Meters (50m)
- **LCY** - Long Course Yards (50yd)

## Design Philosophy

- **Data density over decoration** - Inspired by Linear, Notion, and Airtable
- **Dark mode first** - With light mode support
- **Monospace fonts** - For all time displays (tabular-nums)
- **Spreadsheet-like interactions** - Inline editing, keyboard navigation
- **No decorative imagery** - Icon-based navigation only

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
