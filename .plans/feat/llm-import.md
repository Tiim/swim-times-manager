# Feature Plan: LLM-Assisted JSON Import

## Overview
Create an import workflow where coaches can use AI (ChatGPT, etc.) to convert handwritten or digital notes into JSON format, then import swim times with manual review and correction.

## User Flow

```
Coach has notes → Copy AI prompt → Paste notes to ChatGPT →
Get JSON response → Paste JSON to app → Review/edit entries →
Match swimmers → Import to database
```

## JSON Schema

Based on existing `SwimTime` model:

```typescript
{
  athleteName: string | null
  eventName: string | null      // Meet/competition name or 'practice'
  date: string | null           // YYYY-MM-DD format
  measuredTime: string | null   // Flexible formats (see below)
  stroke: string | null         // Freestyle, Backstroke, Breaststroke, Butterfly, IM
  distance: number | null       // meters
  poolLength: string | null     // SCM, SCY, LCM, LCY
  splits: string | null         // optional comma-separated splits
}
```

### Time Format Support

Accept multiple formats and normalize them:
- `mm.ss.ms` → `mm:ss.ms`
- `mm:ss.ms` → `mm:ss.ms` (keep as-is)
- `ss.ms` → `ss.ms` (keep as-is)
- `ss:ms` → `ss.ms` (normalize to period)
- `mm:ss:ms` → `mm:ss.ms` (normalize middle separator)

Final validation: Must match `/^\d{1,2}:\d{2}\.\d{2}$|^\d{1,2}\.\d{2}$/`

## Implementation Components

### 1. New Page: `/import-json`

**File**: `client/src/pages/ImportJSON.tsx`

#### Section 1: AI Prompt Display
- Card showing the complete LLM prompt
- Copy button to copy prompt to clipboard
- Prompt explains JSON schema with examples
- Instructs AI to return ONLY JSON array

#### Section 2: JSON Input
- Large textarea for pasting JSON response
- Parse button to validate and process JSON
- Error display if JSON is malformed

#### Section 3: Review Interface (appears after parsing)
- Card for each entry with edit form
- Fields for all SwimTime properties
- Validation indicators (errors highlighted in red)
- Athlete matching dropdown

### 2. Validation Logic

**Function**: `validateEntry(entry, index)`

Returns:
```typescript
{
  entry: ImportedEntry,
  errors: string[]  // Human-readable error messages
}
```

Validation rules:
- All fields: Check if null/empty → flag as error
- `athleteName`: Must be non-empty string
- `eventName`: Must be non-empty string
- `measuredTime`: Must match final format after normalization
- `stroke`: Must be one of valid values
- `distance`: Must be positive number
- `poolLength`: Must be one of valid values
- `date`: Must be YYYY-MM-DD format OR null (defaults to today)
- `splits`: Optional, no validation needed

### 3. Time Normalization

**Function**: `normalizeTimeFormat(timeString)`

```typescript
function normalizeTimeFormat(timeString: string): string {
  if (!timeString) return "";

  // Replace all separators with standard ones
  let normalized = timeString.trim();

  // Handle mm:ss:ms format (convert middle : to .)
  const colonCount = (normalized.match(/:/g) || []).length;
  if (colonCount === 2) {
    // mm:ss:ms → mm:ss.ms
    const parts = normalized.split(':');
    normalized = `${parts[0]}:${parts[1]}.${parts[2]}`;
  }

  // Handle ss:ms format (should be ss.ms)
  if (colonCount === 1 && !normalized.includes('.')) {
    const parts = normalized.split(':');
    if (parts[0].length <= 2) {
      // This is ss:ms, not mm:ss
      normalized = `${parts[0]}.${parts[1]}`;
    }
  }

  // Handle mm.ss.ms format (should be mm:ss.ms)
  const periodCount = (normalized.match(/\./g) || []).length;
  if (periodCount === 2) {
    const parts = normalized.split('.');
    normalized = `${parts[0]}:${parts[1]}.${parts[2]}`;
  }

  return normalized;
}
```

### 4. Athlete Matching

**Function**: `matchAthlete(importedName, existingAthletes)`

Logic:
1. Load all existing athlete names from `swimStorage.getAthletes()`
2. For each imported entry:
   - Check for exact match (case-insensitive)
   - If match found: pre-select that athlete
   - If no match: mark as "New swimmer"
3. In UI, show dropdown with:
   - Existing athletes (alphabetical)
   - Current imported name with "(New)" badge
   - Option to type custom name

### 5. Entry Review Component

**Per-entry form fields:**
- Athlete Name: Combo box (searchable dropdown)
  - Shows existing athletes + new option
  - Visual indicator if new swimmer
- Event Name: Text input
- Date: Date input (defaults to today if null)
- Measured Time: Text input with normalization on blur
- Stroke: Dropdown (5 options)
- Distance: Number input
- Pool Length: Dropdown (4 options)
- Splits: Text input (optional)

**Error display:**
- Red border on cards with errors
- List of error messages below title
- Disable import button if ANY entry has errors

### 6. Final Import

**Function**: `handleFinalImport()`

1. Validate all entries one more time
2. If any errors: show alert and prevent import
3. For each valid entry:
   - Remove metadata fields (_originalIndex, _matchedAthlete, etc.)
   - Call `swimStorage.createSwimTime(entry)`
4. Dispatch 'storage-updated' event
5. Show success message with count
6. Navigate to `/all-times`

## Extended SwimTime Type

```typescript
interface ImportedEntry extends Omit<SwimTime, 'id'> {
  _originalIndex: number;      // Track position in JSON array
  _matchedAthlete?: string;    // Matched athlete name
  _isNew?: boolean;            // Is this a new swimmer?
  _hasErrors?: boolean;        // Does this entry have validation errors?
  _errors?: string[];          // List of error messages
  _rawTime?: string;           // Original time before normalization
}
```

## LLM Prompt Template

```
Please convert the following swim times notes into JSON format. Each entry should have:

- athleteName: string or null (swimmer's name)
- eventName: string or null (meet/competition name, e.g., "Regional Championships" or "practice")
- date: string or null (in YYYY-MM-DD format, use today's date if not specified)
- measuredTime: string or null (time in the format: MM:SS.MS)
- stroke: string or null (one of: "Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM")
- distance: number or null (distance in meters, e.g., 100, 200, 400)
- poolLength: string or null (one of: "SCM", "SCY", "LCM", "LCY")
- splits: string or null (optional, comma-separated split times)

IMPORTANT:
- Return ONLY a JSON array with no additional text or markdown except for the case below
- You may ask for more information. In this case do NOT answer with JSON
- If any field is unclear or missing, use null
- Do not make assumptions - prefer null over guessing

Example output:
[
  {
    "athleteName": "John Smith",
    "eventName": "Regional Championships",
    "date": "2025-10-28",
    "measuredTime": "58.32",
    "stroke": "Freestyle",
    "distance": 100,
    "poolLength": "SCM",
    "splits": "28.15, 30.17"
  },
  {
    "athleteName": "Jane Doe",
    "eventName": null,
    "date": null,
    "measuredTime": "1:05.23",
    "stroke": "Butterfly",
    "distance": 100,
    "poolLength": "SCM",
    "splits": null
  }
]

Here are the notes:
```

## Routing & Navigation

### Add Route
In `client/src/App.tsx`:
```tsx
<Route path="/import-json" component={ImportJSON} />
```

### Add Navigation Item
In `client/src/components/app-sidebar.tsx`:
```tsx
{
  title: "Import from AI",
  url: "/import-json",
  icon: FileJson, // or Sparkles
}
```

## UI/UX Details

### Layout
- Container with max width
- Vertical spacing between sections
- Sticky bottom bar with import button (when in review mode)

### Visual Feedback
- Copy button: Shows checkmark for 2 seconds after copy
- Parse button: Disabled when textarea empty
- Error cards: Red border + error icon
- New swimmer badge: Green text
- Loading states during parse

### Responsive Behavior
- Desktop: 2-column grid for entry fields
- Tablet/Mobile: Single column, full width

### Accessibility
- Proper labels for all inputs
- Error messages associated with fields
- Keyboard navigation support
- Focus management when switching between sections

## Testing Checklist

- [ ] Valid JSON with all fields → parses correctly
- [ ] Valid JSON with null fields → shows errors in review
- [ ] Invalid JSON format → shows parse error
- [ ] Empty JSON array → shows error
- [ ] Time normalization for all formats
- [ ] Athlete matching (exact match)
- [ ] New athlete creation
- [ ] Edit all fields in review mode
- [ ] Cannot import with errors
- [ ] Can import after fixing errors
- [ ] Storage update event fires
- [ ] Navigation after import
- [ ] Copy prompt to clipboard
- [ ] Back button from review to edit JSON

## Files to Create/Modify

### New Files
- `client/src/pages/ImportJSON.tsx` - Main page component

### Modified Files
- `client/src/App.tsx` - Add route
- `client/src/components/app-sidebar.tsx` - Add navigation item

## Dependencies
All required components already exist in shadcn/ui:
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Button
- Textarea
- Input
- Label
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- Alert, AlertDescription

Icons needed from lucide-react:
- Copy
- CheckCircle2
- AlertCircle
- Upload
- FileJson or Sparkles

## Future Enhancements (Out of Scope)

- Auto-save review progress to localStorage
- Bulk edit (change stroke for all entries at once)
- Import history/audit log
- Support for other AI services (Claude, Gemini)
- Direct API integration with AI services
- Fuzzy athlete name matching
- Import from CSV in addition to JSON
- Support for relay teams
