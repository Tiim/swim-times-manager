import { useState } from "react";
import { useLocation } from "wouter";
import { swimStorage } from "@/lib/storage";
import type { SwimTime } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, AlertCircle, Upload } from "lucide-react";

const LLM_PROMPT = `Please convert the following swim times notes into JSON format. Each entry should have:
- athleteName: string (swimmer's name)
- eventName: string (event description, e.g., "100m Freestyle")
- date: string (in YYYY-MM-DD format, use today's date if not specified)
- measuredTime: string (in MM:SS.ss or SS.ss format, e.g., "1:23.45" or "58.32")
- stroke: string (one of: "Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM")
- distance: number (distance in meters, e.g., 100, 200, 400)
- poolLength: string (one of: "SCM", "SCY", "LCM", "LCY")
- splits: string or null (optional, comma-separated split times)

Return ONLY a JSON array with no additional text. If any field is unclear or missing, make your best guess or use null. Example:

[
  {
    "athleteName": "John Smith",
    "eventName": "100m Freestyle",
    "date": "2025-10-28",
    "measuredTime": "58.32",
    "stroke": "Freestyle",
    "distance": 100,
    "poolLength": "SCM",
    "splits": "28.15, 30.17"
  }
]

Here are the notes:`;

interface ImportedEntry extends Omit<SwimTime, 'id'> {
  _originalIndex: number;
  _matchedAthlete?: string;
  _isNew?: boolean;
  _hasErrors?: boolean;
  _errors?: string[];
}

export default function ImportJSON() {
  const [, navigate] = useLocation();
  const [jsonInput, setJsonInput] = useState("");
  const [parsedEntries, setParsedEntries] = useState<ImportedEntry[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingAthletes, setExistingAthletes] = useState<string[]>([]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(LLM_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateEntry = (entry: any, index: number): { entry: ImportedEntry; errors: string[] } => {
    const errors: string[] = [];

    if (!entry.athleteName || typeof entry.athleteName !== 'string') {
      errors.push("Missing or invalid athlete name");
    }
    if (!entry.eventName || typeof entry.eventName !== 'string') {
      errors.push("Missing or invalid event name");
    }
    if (!entry.measuredTime || typeof entry.measuredTime !== 'string') {
      errors.push("Missing or invalid time");
    } else if (!/^\d{1,2}:\d{2}\.\d{2}$|^\d{1,2}\.\d{2}$/.test(entry.measuredTime)) {
      errors.push("Time format should be MM:SS.ss or SS.ss");
    }
    if (!entry.stroke || !["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM"].includes(entry.stroke)) {
      errors.push("Invalid or missing stroke");
    }
    if (!entry.distance || typeof entry.distance !== 'number' || entry.distance <= 0) {
      errors.push("Invalid or missing distance");
    }
    if (!entry.poolLength || !["SCM", "SCY", "LCM", "LCY"].includes(entry.poolLength)) {
      errors.push("Invalid or missing pool length");
    }
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      errors.push("Invalid or missing date (should be YYYY-MM-DD)");
    }

    return {
      entry: {
        ...entry,
        athleteName: entry.athleteName || "",
        eventName: entry.eventName || "",
        measuredTime: entry.measuredTime || "",
        stroke: entry.stroke || "Freestyle",
        distance: entry.distance || 100,
        poolLength: entry.poolLength || "SCM",
        date: entry.date || new Date().toISOString().split('T')[0],
        splits: entry.splits || null,
        _originalIndex: index,
        _hasErrors: errors.length > 0,
        _errors: errors,
      },
      errors
    };
  };

  const handleParseJSON = () => {
    setParseError(null);
    try {
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        setParseError("JSON must be an array of entries");
        return;
      }

      if (parsed.length === 0) {
        setParseError("JSON array is empty");
        return;
      }

      // Load existing athletes
      const athletes = swimStorage.getAthletes();
      setExistingAthletes(athletes.map(a => a.name));

      // Validate and process entries
      const validated = parsed.map((entry, index) => {
        const { entry: validatedEntry } = validateEntry(entry, index);

        // Check if athlete name matches existing
        const exactMatch = athletes.find(a =>
          a.name.toLowerCase() === validatedEntry.athleteName.toLowerCase()
        );

        if (exactMatch) {
          validatedEntry._matchedAthlete = exactMatch.name;
          validatedEntry._isNew = false;
        } else {
          validatedEntry._matchedAthlete = validatedEntry.athleteName;
          validatedEntry._isNew = true;
        }

        return validatedEntry;
      });

      setParsedEntries(validated);
      setShowReview(true);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON format");
    }
  };

  const updateEntry = (index: number, field: keyof ImportedEntry, value: any) => {
    setParsedEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Re-validate
      const { entry, errors } = validateEntry(updated[index], index);
      updated[index] = { ...entry, _originalIndex: index };

      return updated;
    });
  };

  const updateAthleteMatch = (index: number, athleteName: string) => {
    setParsedEntries(prev => {
      const updated = [...prev];
      const isNew = !existingAthletes.includes(athleteName);
      updated[index] = {
        ...updated[index],
        athleteName,
        _matchedAthlete: athleteName,
        _isNew: isNew
      };
      return updated;
    });
  };

  const handleFinalImport = () => {
    const hasErrors = parsedEntries.some(entry => entry._hasErrors);

    if (hasErrors) {
      alert("Please fix all errors before importing");
      return;
    }

    let importedCount = 0;
    parsedEntries.forEach(entry => {
      const { _originalIndex, _matchedAthlete, _isNew, _hasErrors, _errors, ...swimTimeData } = entry;
      swimStorage.createSwimTime(swimTimeData);
      importedCount++;
    });

    window.dispatchEvent(new Event('storage-updated'));
    alert(`Successfully imported ${importedCount} swim times!`);
    navigate("/all-times");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import from AI Notes</h1>
        <p className="text-muted-foreground mt-2">
          Convert handwritten or digital notes to JSON using AI, then import swim times
        </p>
      </div>

      {!showReview ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Step 1: Copy Prompt for AI
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Prompt
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Copy this prompt and paste it to ChatGPT or another AI assistant, followed by your notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                {LLM_PROMPT}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Paste JSON Response</CardTitle>
              <CardDescription>
                Paste the JSON output from the AI assistant below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='[{"athleteName": "John Smith", "eventName": "100m Freestyle", ...}]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleParseJSON}
                disabled={!jsonInput.trim()}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                Parse and Review
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Review and Edit Entries</h2>
              <p className="text-muted-foreground">
                Verify all details and match swimmers before importing
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowReview(false)}>
              Back to Edit JSON
            </Button>
          </div>

          <div className="space-y-4">
            {parsedEntries.map((entry, index) => (
              <Card key={index} className={entry._hasErrors ? "border-destructive" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Entry {index + 1}</span>
                    {entry._hasErrors && (
                      <span className="text-destructive text-sm font-normal flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Has errors
                      </span>
                    )}
                    {entry._isNew && !entry._hasErrors && (
                      <span className="text-green-500 text-sm font-normal">New swimmer</span>
                    )}
                  </CardTitle>
                  {entry._errors && entry._errors.length > 0 && (
                    <CardDescription className="text-destructive">
                      {entry._errors.join(", ")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Athlete Name</Label>
                    <Select
                      value={entry._matchedAthlete || entry.athleteName}
                      onValueChange={(value) => updateAthleteMatch(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {entry._isNew && (
                          <SelectItem value={entry.athleteName}>
                            {entry.athleteName} (New)
                          </SelectItem>
                        )}
                        {existingAthletes.map((athlete) => (
                          <SelectItem key={athlete} value={athlete}>
                            {athlete}
                          </SelectItem>
                        ))}
                        <SelectItem value="_custom_">Enter custom name...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input
                      value={entry.eventName}
                      onChange={(e) => updateEntry(index, "eventName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measured Time</Label>
                    <Input
                      value={entry.measuredTime}
                      onChange={(e) => updateEntry(index, "measuredTime", e.target.value)}
                      className="font-mono"
                      placeholder="MM:SS.ss or SS.ss"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(index, "date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stroke</Label>
                    <Select
                      value={entry.stroke}
                      onValueChange={(value) => updateEntry(index, "stroke", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freestyle">Freestyle</SelectItem>
                        <SelectItem value="Backstroke">Backstroke</SelectItem>
                        <SelectItem value="Breaststroke">Breaststroke</SelectItem>
                        <SelectItem value="Butterfly">Butterfly</SelectItem>
                        <SelectItem value="IM">IM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Distance (meters)</Label>
                    <Input
                      type="number"
                      value={entry.distance}
                      onChange={(e) => updateEntry(index, "distance", parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pool Length</Label>
                    <Select
                      value={entry.poolLength}
                      onValueChange={(value) => updateEntry(index, "poolLength", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCM">SCM (25m)</SelectItem>
                        <SelectItem value="SCY">SCY (25yd)</SelectItem>
                        <SelectItem value="LCM">LCM (50m)</SelectItem>
                        <SelectItem value="LCY">LCY (50yd)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Splits (optional)</Label>
                    <Input
                      value={entry.splits || ""}
                      onChange={(e) => updateEntry(index, "splits", e.target.value || null)}
                      placeholder="28.15, 30.17"
                      className="font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleFinalImport}
              disabled={parsedEntries.some(e => e._hasErrors)}
              className="flex-1 gap-2"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              Import {parsedEntries.length} {parsedEntries.length === 1 ? "Entry" : "Entries"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
