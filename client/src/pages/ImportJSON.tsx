import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { swimStorage } from "@/lib/storage";
import type { SwimTime } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, AlertCircle, Upload, Sparkles, ChevronLeft, ChevronRight, SkipForward, FileCheck, ExternalLink } from "lucide-react";
import { AddTimeForm } from "@/components/AddTimeForm";

const LLM_PROMPT = `Please convert the following swim times notes into JSON format. Each entry should have:

- athleteName: string or null (swimmer's name)
- eventName: string or null (meet/competition name, e.g., "Regional Championships" or "practice")
- date: string or null (in YYYY-MM-DD format, use today's date if not specified)
- measuredTime: string or null (time in the format: MM:SS.MS or SS.MS, e.g., "1:23.45" or "58.32")
- stroke: string or null (one of: "Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM")
- distance: number or null (distance in meters, e.g., 100, 200, 400)
- poolLength: string or null (one of: "SCM", "SCY", "LCM", "LCY")
- splits: string or null (optional, comma-separated intermediate split times in MM:SS.MS or SS.MS format)
  * Splits are times recorded at pool length intervals during the swim
  * For example: 100m race in a 25m pool would have splits at 25m, 50m, and 75m
  * Format: "28.15, 58.32, 1:28.45" (comma-separated, each in time format)
  * If splits are not provided or unclear, use null

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
    "splits": "28.15, 58.30"
  },
  {
    "athleteName": "Jane Doe",
    "eventName": "State Championships",
    "date": "2025-10-15",
    "measuredTime": "2:15.67",
    "stroke": "Breaststroke",
    "distance": 200,
    "poolLength": "LCM",
    "splits": "32.45, 1:08.23, 1:43.12"
  },
  {
    "athleteName": "Mike Johnson",
    "eventName": null,
    "date": null,
    "measuredTime": "1:05.23",
    "stroke": "Butterfly",
    "distance": 100,
    "poolLength": "SCM",
    "splits": null
  },
  {
    "athleteName": "Sarah Lee",
    "eventName": "practice",
    "date": "2025-10-28",
    "measuredTime": "1:02.45",
    "stroke": "Freestyle",
    "distance": 100,
    "poolLength": "SCM",
    "splits": ", 30.5, "
  }
]

Note: In the last example, Sarah Lee's 100m swim in a 25m pool would normally have 3 splits (25m, 50m, 75m), but only the 50m split (30.5) was recorded. Missing splits are represented as empty strings in the comma-separated list, maintaining the correct position.

Here are the notes:`;

interface ImportedEntry extends Omit<SwimTime, 'id' | 'last_modified'> {
  _originalIndex: number;
  _matchedAthlete?: string;
  _isNew?: boolean;
  _hasErrors?: boolean;
  _errors?: string[];
  _rawTime?: string;
}

// Time format normalization
function normalizeTimeFormat(timeString: string): string {
  if (!timeString) return "";

  let normalized = timeString.trim();

  // Handle mm:ss:ms format (convert middle : to .)
  const colonCount = (normalized.match(/:/g) || []).length;
  if (colonCount === 2) {
    const parts = normalized.split(':');
    normalized = `${parts[0]}:${parts[1]}.${parts[2]}`;
  }

  // Handle ss:ms format (should be ss.ms)
  if (colonCount === 1 && !normalized.includes('.')) {
    const parts = normalized.split(':');
    if (parts[0].length <= 2 && parts.length === 2) {
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

export default function ImportJSON() {
  const [, navigate] = useLocation();
  const [jsonInput, setJsonInput] = useState("");
  const [parsedEntries, setParsedEntries] = useState<ImportedEntry[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatGPTOpened, setChatGPTOpened] = useState(false);
  const [existingAthletes, setExistingAthletes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const [importedIndices, setImportedIndices] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(LLM_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChatGPT = async () => {
    // Copy prompt to clipboard first
    await navigator.clipboard.writeText(LLM_PROMPT);

    // Open blank ChatGPT with temporary chat
    const chatGPTUrl = `https://chatgpt.com/?temporary-chat=true`;
    window.open(chatGPTUrl, '_blank', 'noopener,noreferrer');

    // Show feedback that prompt was copied and ChatGPT opened
    setChatGPTOpened(true);
    setTimeout(() => setChatGPTOpened(false), 3000);
  };

  const validateEntry = (entry: any, index: number): { entry: ImportedEntry; errors: string[] } => {
    const errors: string[] = [];
    const timeRegex = /^\d{1,2}:\d{2}\.\d{2}$|^\d{1,2}\.\d{2}$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const validStrokes = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM"];
    const validPoolLengths = ["SCM", "SCY", "LCM", "LCY"];

    // Validate athleteName (required)
    if (!entry.athleteName || (typeof entry.athleteName === 'string' && entry.athleteName.trim() === "")) {
      errors.push("Athlete name is required");
    }

    // Validate eventName (required)
    if (!entry.eventName || (typeof entry.eventName === 'string' && entry.eventName.trim() === "")) {
      errors.push("Event name is required");
    }

    // Validate and normalize measuredTime (required)
    const rawTime = entry.measuredTime;
    let normalizedTime = "";
    if (!entry.measuredTime || (typeof entry.measuredTime === 'string' && entry.measuredTime.trim() === "")) {
      errors.push("Measured time is required");
    } else {
      normalizedTime = normalizeTimeFormat(entry.measuredTime);
      if (!timeRegex.test(normalizedTime)) {
        errors.push("Invalid time format (expected MM:SS.MS or SS.MS)");
      }
    }

    // Validate stroke (required)
    if (!entry.stroke) {
      errors.push("Stroke is required");
    } else if (!validStrokes.includes(entry.stroke)) {
      errors.push("Invalid stroke (must be one of: Freestyle, Backstroke, Breaststroke, Butterfly, IM)");
    }

    // Validate distance (required)
    if (!entry.distance || typeof entry.distance !== 'number' || entry.distance <= 0) {
      errors.push("Distance must be a positive number");
    }

    // Validate poolLength (required)
    if (!entry.poolLength) {
      errors.push("Pool length is required");
    } else if (!validPoolLengths.includes(entry.poolLength)) {
      errors.push("Invalid pool length (must be one of: SCM, SCY, LCM, LCY)");
    }

    // Validate date (optional but must be valid format if provided)
    if (entry.date && !dateRegex.test(entry.date)) {
      errors.push("Invalid date format (expected YYYY-MM-DD)");
    }

    return {
      entry: {
        athleteName: entry.athleteName || null,
        eventName: entry.eventName || null,
        date: entry.date || new Date().toISOString().split('T')[0],
        measuredTime: normalizedTime || entry.measuredTime || null,
        stroke: entry.stroke || null,
        distance: entry.distance || null,
        poolLength: entry.poolLength || null,
        splits: entry.splits || null,
        _originalIndex: index,
        _rawTime: rawTime,
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

  // Convert ImportedEntry to AddTimeForm initialData format
  const entryToFormData = (entry: ImportedEntry) => {
    return {
      date: entry.date || new Date().toISOString().split('T')[0],
      athlete: entry.athleteName || "",
      event: entry.eventName || "",
      stroke: entry.stroke || "",
      distance: entry.distance?.toString() || "",
      poolLength: entry.poolLength || "SCM",
      time: entry.measuredTime || "",
      splits: entry.splits || "",
    };
  };

  // Convert form data back to ImportedEntry
  const formDataToEntry = (formData: any, index: number): ImportedEntry => {
    const entry = {
      athleteName: formData.athlete,
      eventName: formData.event,
      date: formData.date,
      measuredTime: formData.time,
      stroke: formData.stroke,
      distance: parseInt(formData.distance) || null,
      poolLength: formData.poolLength,
      splits: formData.splits || null,
    };

    // Validate and return
    const { entry: validatedEntry } = validateEntry(entry, index);

    // Match athlete
    const normalizedValue = formData.athlete.toLowerCase().trim();
    const exactMatch = existingAthletes.find(
      athlete => athlete.toLowerCase().trim() === normalizedValue
    );

    if (exactMatch) {
      validatedEntry._matchedAthlete = exactMatch;
      validatedEntry._isNew = false;
    } else {
      validatedEntry._matchedAthlete = formData.athlete || undefined;
      validatedEntry._isNew = true;
    }

    return validatedEntry;
  };

  const handleFormSubmit = (formData: any) => {
    // Update entry from form data, then import
    const updatedEntry = formDataToEntry(formData, currentIndex);

    setParsedEntries(prev => {
      const updated = [...prev];
      updated[currentIndex] = updatedEntry;
      return updated;
    });

    // Then import using the updated entry
    if (updatedEntry._hasErrors) {
      alert("Please fix all errors before importing this entry");
      return;
    }

    try {
      const { _originalIndex, _matchedAthlete, _isNew, _hasErrors, _errors, _rawTime, ...swimTimeData } = updatedEntry;
      swimStorage.createSwimTime(swimTimeData);

      setImportedIndices(prev => new Set([...Array.from(prev), currentIndex]));
      window.dispatchEvent(new Event('storage-updated'));

      // Move to next entry or show summary
      if (currentIndex < parsedEntries.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowSummary(true);
      }
    } catch (error) {
      alert("Failed to import entry: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleSkipCurrent = () => {
    setSkippedIndices(prev => new Set([...Array.from(prev), currentIndex]));

    // Move to next entry or show summary
    if (currentIndex < parsedEntries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < parsedEntries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBackToEdit = () => {
    setShowReview(false);
    setShowSummary(false);
    setParsedEntries([]);
    setCurrentIndex(0);
    setSkippedIndices(new Set());
    setImportedIndices(new Set());
  };

  const handleFinishImport = () => {
    navigate("/all-times");
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {!showReview ? (
        <>
          {/* Section 1: AI Prompt Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Step 1: Copy AI Prompt</CardTitle>
              </div>
              <CardDescription>
                Copy the prompt and open ChatGPT in one click (prompt will be in your clipboard, ready to paste), or manually copy to use with Claude or another AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {LLM_PROMPT}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleOpenChatGPT} className="flex-1 sm:flex-initial">
                  {chatGPTOpened ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Copied & Opened!
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Copy & Open ChatGPT
                    </>
                  )}
                </Button>
                <Button onClick={handleCopyPrompt} variant="outline" className="flex-1 sm:flex-initial">
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Prompt
                    </>
                  )}
                </Button>
              </div>
              {chatGPTOpened && (
                <Alert>
                  <AlertDescription>
                    ChatGPT opened! Paste the prompt (Ctrl+V or Cmd+V), add your swim times notes, then send.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Section 2: JSON Input */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>Step 2: Paste AI Response</CardTitle>
              </div>
              <CardDescription>
                Paste the JSON array response from the AI here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='[{"athleteName": "John Smith", "eventName": "Regional Championships", ...}]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="font-mono text-sm min-h-64"
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
                className="w-full sm:w-auto"
              >
                Parse JSON
              </Button>
            </CardContent>
          </Card>
        </>
      ) : showSummary ? (
        <>
          {/* Summary View */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle>Import Complete</CardTitle>
              </div>
              <CardDescription>
                Summary of imported and skipped entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-2xl font-bold">{parsedEntries.length}</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
                <div className="bg-green-500/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importedIndices.size}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="bg-yellow-500/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{skippedIndices.size}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
              </div>

              {skippedIndices.size > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Skipped Entries:</h3>
                  <div className="space-y-2">
                    {Array.from(skippedIndices).map(index => {
                      const entry = parsedEntries[index];
                      return (
                        <div key={index} className="bg-muted p-3 rounded-md text-sm">
                          Entry {index + 1}: {entry.athleteName || "(No name)"} - {entry.stroke} {entry.distance}m
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBackToEdit} className="flex-1">
                  Import More
                </Button>
                <Button onClick={handleFinishImport} className="flex-1">
                  View All Times
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Section 3: Review Interface - Single Entry */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Step 3: Review Entry {currentIndex + 1} of {parsedEntries.length}</CardTitle>
                  <CardDescription>
                    Review and edit the entry, then import or skip
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  {importedIndices.size} imported, {skippedIndices.size} skipped
                </div>
              </div>
            </CardHeader>
          </Card>

          {parsedEntries[currentIndex] && (
            <>
              {/* Status badges */}
              {(parsedEntries[currentIndex]._isNew || importedIndices.has(currentIndex) || skippedIndices.has(currentIndex)) && (
                <div className="flex gap-2 flex-wrap">
                  {parsedEntries[currentIndex]._isNew && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-600 dark:text-green-400">
                      New swimmer
                    </span>
                  )}
                  {importedIndices.has(currentIndex) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Already imported
                    </span>
                  )}
                  {skippedIndices.has(currentIndex) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                      Skipped
                    </span>
                  )}
                </div>
              )}

              {/* Validation errors */}
              {parsedEntries[currentIndex]._hasErrors && parsedEntries[currentIndex]._errors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {parsedEntries[currentIndex]._errors!.map((error, errorIndex) => (
                        <div key={errorIndex}>• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Reuse AddTimeForm component */}
              <AddTimeForm
                key={currentIndex}
                initialData={entryToFormData(parsedEntries[currentIndex])}
                onSubmit={handleFormSubmit}
                isEditing={true}
                submitButtonText={importedIndices.has(currentIndex) ? "Already Imported" : "Import This Entry"}
              />
            </>
          )}

          {/* Navigation and Action Bar */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-4">
            <div className="flex flex-col gap-4">
              {/* Navigation */}
              <div className="flex gap-2 justify-center items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  {currentIndex + 1} / {parsedEntries.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex >= parsedEntries.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBackToEdit} className="flex-1">
                  Back to Edit JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipCurrent}
                  className="flex-1"
                  disabled={importedIndices.has(currentIndex)}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip This Entry
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
