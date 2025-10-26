import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, ChevronRight, ChevronDown, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { swimStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Lenex } from "js-lenex";
import { Result } from "js-lenex/build/src/lenex-type";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ParsedClub {
  name: string;
  clubId: string;
  athletes: ParsedAthlete[];
  expanded: boolean;
  selected: boolean;
}

interface ParsedAthlete {
  athleteId: number;
  fullName: string;
  firstname: string;
  lastname: string;
  birthdate: string;
  gender: string;
  results: Result[];
  selected: boolean;
  clubName?: string;
  // Matching fields - only populated in step 3
  matchStatus?: "exact" | "create-new" | "manual";
  matchedName?: string;
}

interface ImportStats {
  totalResults: number;
  imported: number;
  skipped: number;
  errors: string[];
}

type ImportStep = "select-file" | "select-swimmers" | "match-swimmers" | "confirm-import" | "importing" | "complete";

export function LenexImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>("select-file");
  const [clubs, setClubs] = useState<ParsedClub[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [lenexData, setLenexData] = useState<any>(null);
  const [currentMatchingIndex, setCurrentMatchingIndex] = useState(0);
  const [comboOpen, setComboOpen] = useState(false);

  // Get all existing athletes for matching
  const existingAthletes = useMemo(() => {
    return swimStorage.getAllAthletes();
  }, [currentStep]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setClubs([]);
    setImportStats(null);

    try {
      const lenex = await Lenex.LoadLenexFile(file);
      const rawData = lenex.rawLenexData;
      setLenexData(lenex);

      if (!rawData.meets || rawData.meets.length === 0) {
        throw new Error("No meets found in LENEX file");
      }

      const parsedClubs: ParsedClub[] = [];

      for (const meet of rawData.meets) {
        if (!meet.clubs) continue;

        for (const club of meet.clubs) {
          if (!club.athletes || club.athletes.length === 0) continue;

          const parsedAthletes: ParsedAthlete[] = club.athletes.map(athlete => ({
            athleteId: athlete.athleteid,
            fullName: `${athlete.firstname} ${athlete.lastname || ""}`.trim(),
            firstname: athlete.firstname,
            lastname: athlete.lastname || "",
            birthdate: athlete.birthdate,
            gender: athlete.gender,
            results: athlete.results || [],
            selected: false,
          }));

          parsedClubs.push({
            name: club.name,
            clubId: club.clubid?.toString() || club.name,
            athletes: parsedAthletes,
            expanded: false,
            selected: false,
          });
        }
      }

      setClubs(parsedClubs);
      setCurrentStep("select-swimmers");

      toast({
        title: "File parsed successfully",
        description: `Found ${parsedClubs.length} clubs with ${parsedClubs.reduce((sum, c) => sum + c.athletes.length, 0)} athletes`,
      });
    } catch (error) {
      console.error("Failed to parse LENEX file:", error);
      toast({
        title: "Parse failed",
        description: error instanceof Error ? error.message : "Failed to parse LENEX file",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleClubExpanded = (clubId: string) => {
    setClubs(prev => prev.map(club =>
      club.clubId === clubId ? { ...club, expanded: !club.expanded } : club
    ));
  };

  const toggleClubSelected = (clubId: string, selected: boolean) => {
    setClubs(prev => prev.map(club =>
      club.clubId === clubId
        ? {
            ...club,
            selected,
            athletes: club.athletes.map(a => ({ ...a, selected })),
          }
        : club
    ));
  };

  const toggleAthleteSelected = (clubId: string, athleteId: number, selected: boolean) => {
    setClubs(prev => prev.map(club =>
      club.clubId === clubId
        ? {
            ...club,
            athletes: club.athletes.map(a =>
              a.athleteId === athleteId ? { ...a, selected } : a
            ),
          }
        : club
    ));
  };

  const selectedAthletes = useMemo(() => {
    return clubs.flatMap(club =>
      club.athletes
        .filter(a => a.selected)
        .map(a => ({ ...a, clubName: club.name }))
    );
  }, [clubs]);

  const athletesNeedingMatch = useMemo(() => {
    return selectedAthletes.filter(a => {
      if (a.matchStatus === "exact" || a.matchStatus === "create-new" || a.matchStatus === "manual") {
        return false;
      }
      const exactMatch = existingAthletes.find(
        existing => existing.canonicalName === a.fullName || existing.aliases.includes(a.fullName)
      );
      return !exactMatch;
    });
  }, [selectedAthletes, existingAthletes]);

  const proceedToMatching = () => {
    setClubs(prev =>
      prev.map(club => ({
        ...club,
        athletes: club.athletes.map(athlete => {
          if (!athlete.selected) return athlete;

          const exactMatch = existingAthletes.find(
            existing =>
              existing.canonicalName === athlete.fullName ||
              existing.aliases.includes(athlete.fullName)
          );

          if (exactMatch) {
            return {
              ...athlete,
              matchStatus: "exact" as const,
              matchedName: exactMatch.canonicalName,
            };
          }

          return athlete;
        }),
      }))
    );

    setCurrentMatchingIndex(0);

    // Check how many athletes need matching after setting exact matches
    const needMatching = selectedAthletes.filter(a => {
      if (a.matchStatus === "exact" || a.matchStatus === "create-new" || a.matchStatus === "manual") {
        return false;
      }
      const exactMatch = existingAthletes.find(
        existing => existing.canonicalName === a.fullName || existing.aliases.includes(a.fullName)
      );
      return !exactMatch;
    });

    // If no athletes need matching, go straight to confirmation
    if (needMatching.length === 0) {
      setCurrentStep("confirm-import");
    } else {
      setCurrentStep("match-swimmers");
    }
  };

  const confirmAndImport = () => {
    setCurrentStep("importing");
    handleImport();
  };

  const setAthleteMatch = (athleteId: number, matchedName: string, isNewAthlete: boolean) => {
    setClubs(prev =>
      prev.map(club => ({
        ...club,
        athletes: club.athletes.map(a =>
          a.athleteId === athleteId
            ? {
                ...a,
                matchedName,
                matchStatus: isNewAthlete ? ("create-new" as const) : ("manual" as const),
              }
            : a
        ),
      }))
    );
  };

  const goToNextAthlete = () => {
    if (currentMatchingIndex < athletesNeedingMatch.length - 1) {
      setCurrentMatchingIndex(currentMatchingIndex + 1);
    } else {
      // All athletes matched, go to confirmation
      setCurrentStep("confirm-import");
    }
  };

  const goToPreviousAthlete = () => {
    if (currentMatchingIndex > 0) {
      setCurrentMatchingIndex(currentMatchingIndex - 1);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportStats(null);

    const stats: ImportStats = {
      totalResults: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      if (!lenexData) {
        throw new Error("No LENEX data loaded");
      }

      const existingTimes = swimStorage.getAllSwimTimes();
      const rawData = lenexData.rawLenexData;

      const eventMap = new Map();
      const sessionMap = new Map();

      if (rawData.meets) {
        for (const meet of rawData.meets) {
          if (meet.sessions) {
            for (const session of meet.sessions) {
              sessionMap.set(session.number, session);

              if (session.events) {
                for (const event of session.events) {
                  eventMap.set(event.eventid, {
                    event,
                    session,
                    meetCourse: meet.course || session.course,
                    meetName: meet.name || "Unknown Meet",
                  });
                }
              }
            }
          }
        }
      }

      for (const athlete of selectedAthletes) {
        const targetName = athlete.matchedName || athlete.fullName;
        const resolvedName = swimStorage.resolveAthleteName(targetName);

        for (const result of athlete.results) {
          stats.totalResults++;

          try {
            if (!result.swimtime) {
              stats.skipped++;
              continue;
            }

            const eventData = eventMap.get(result.eventid);

            if (!eventData) {
              stats.errors.push(`Event ${result.eventid} not found for ${athlete.fullName}`);
              continue;
            }

            const { event, session, meetCourse, meetName } = eventData;
            const swimstyle = event.swimstyle;

            if (!swimstyle) {
              stats.errors.push(`No swimstyle found for event ${result.eventid}`);
              continue;
            }

            const strokeMap: Record<string, "Freestyle" | "Backstroke" | "Breaststroke" | "Butterfly" | "IM"> = {
              FREE: "Freestyle",
              BACK: "Backstroke",
              BREAST: "Breaststroke",
              FLY: "Butterfly",
              MEDLEY: "IM",
              IMRELAY: "IM",
            };

            const stroke = strokeMap[swimstyle.stroke];

            if (!stroke) {
              stats.errors.push(`Unknown stroke ${swimstyle.stroke} for ${athlete.fullName}`);
              continue;
            }

            const poolLengthMap: Record<string, "SCM" | "SCY" | "LCM" | "LCY"> = {
              LCM: "LCM",
              SCM: "SCM",
              SCY: "SCY",
              SCM16: "SCM",
              SCM20: "SCM",
              SCM33: "SCM",
              SCY20: "SCY",
              SCY27: "SCY",
              SCY33: "SCY",
              SCY36: "SCY",
            };

            const course = meetCourse || event.swimstyle.code || "LCM";
            const poolLength = poolLengthMap[course as string] || "LCM";

            const measuredTime = formatSwimTime(result.swimtime);

            const resultKey = `${resolvedName}-${session.date}-${measuredTime}-${stroke}-${swimstyle.distance}-${poolLength}`;

            const isDuplicate = existingTimes.some(existingTime => {
              const existingKey = `${existingTime.athleteName}-${existingTime.date}-${existingTime.measuredTime}-${existingTime.stroke}-${existingTime.distance}-${existingTime.poolLength}`;
              return existingKey === resultKey;
            });

            if (isDuplicate) {
              stats.skipped++;
              continue;
            }

            let splitsStr: string | null = null;
            if (result.splits && result.splits.length > 0) {
              // Calculate pool length in meters
              const poolLengthMeters = poolLength.includes("Y")
                ? (poolLength === "LCY" ? 50 : poolLength === "SCY" ? 25 : 0)
                : (poolLength === "LCM" ? 50 : poolLength === "SCM" ? 25 : 0);

              if (poolLengthMeters > 0) {
                // Calculate number of split positions needed
                const numSplits = Math.floor(swimstyle.distance / poolLengthMeters);

                // Create array with correct number of positions, all empty
                const splitsArray: string[] = new Array(numSplits).fill("");

                // Place each split at the correct position based on its distance
                for (const split of result.splits) {
                  if (split.swimtime && split.distance) {
                    // Calculate the index: (distance / poolLength) - 1
                    // e.g., 50m split in 25m pool: (50 / 25) - 1 = 1 (index 1)
                    const splitIndex = Math.floor(split.distance / poolLengthMeters) - 1;
                    if (splitIndex >= 0 && splitIndex < numSplits) {
                      splitsArray[splitIndex] = formatSwimTime(split.swimtime);
                    }
                  }
                }

                splitsStr = splitsArray.join(", ");
              }
            }

            swimStorage.createSwimTime({
              athleteName: resolvedName,
              eventName: meetName,
              date: session.date,
              measuredTime,
              stroke,
              distance: swimstyle.distance,
              poolLength,
              splits: splitsStr,
            });

            stats.imported++;
          } catch (error) {
            stats.errors.push(
              `Failed to import result for ${athlete.fullName}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }

      window.dispatchEvent(new Event("storage-updated"));

      setImportStats(stats);
      setCurrentStep("complete");

      if (stats.errors.length === 0) {
        toast({
          title: "Import completed",
          description: `Imported ${stats.imported} results, skipped ${stats.skipped}`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${stats.imported} imported, ${stats.skipped} skipped, ${stats.errors.length} errors`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
      setCurrentStep("match-swimmers");
    } finally {
      setImporting(false);
    }
  };

  function formatSwimTime(lenexTime: string): string {
    const parts = lenexTime.split(":");

    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseFloat(parts[2]);
      const totalMinutes = hours * 60 + minutes;
      const secondsPart = seconds.toFixed(2).padStart(5, "0");
      return `${totalMinutes}:${secondsPart}`;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]).toFixed(2).padStart(5, "0");
      return `${minutes}:${seconds}`;
    } else {
      const seconds = parseFloat(lenexTime).toFixed(2);
      return seconds;
    }
  }

  const resetImport = () => {
    setClubs([]);
    setLenexData(null);
    setImportStats(null);
    setCurrentStep("select-file");
    setCurrentMatchingIndex(0);
  };

  const selectedCount = selectedAthletes.length;
  const exactMatchCount = selectedAthletes.filter(a => a.matchStatus === "exact").length;
  const currentAthlete = athletesNeedingMatch[currentMatchingIndex];

  // Combobox search
  const [searchValue, setSearchValue] = useState("");
  const filteredAthletes = useMemo(() => {
    if (!searchValue) return existingAthletes;
    const lower = searchValue.toLowerCase();
    return existingAthletes.filter(a =>
      a.canonicalName.toLowerCase().includes(lower) ||
      a.aliases.some(alias => alias.toLowerCase().includes(lower))
    );
  }, [searchValue, existingAthletes]);

  // Auto-advance when all athletes are matched
  useEffect(() => {
    if (currentStep === "match-swimmers" && athletesNeedingMatch.length === 0) {
      setCurrentStep("confirm-import");
    }
  }, [currentStep, athletesNeedingMatch.length]);

  // Helper function to get race info for a result
  const getResultDescription = (result: Result) => {
    if (!lenexData) return result.swimtime || "No time";

    const rawData = lenexData.rawLenexData;
    let eventInfo = null;

    if (rawData.meets) {
      for (const meet of rawData.meets) {
        if (meet.sessions) {
          for (const session of meet.sessions) {
            if (session.events) {
              for (const event of session.events) {
                if (event.eventid === result.eventid) {
                  eventInfo = {
                    event,
                    course: meet.course || session.course || "LCM",
                  };
                  break;
                }
              }
              if (eventInfo) break;
            }
          }
          if (eventInfo) break;
        }
      }
    }

    if (!eventInfo || !eventInfo.event.swimstyle) {
      return result.swimtime || "No time";
    }

    const swimstyle = eventInfo.event.swimstyle;
    const strokeMap: Record<string, string> = {
      FREE: "Free",
      BACK: "Back",
      BREAST: "Breast",
      FLY: "Fly",
      MEDLEY: "IM",
      IMRELAY: "IM",
    };

    const stroke = strokeMap[swimstyle.stroke] || swimstyle.stroke;
    const poolLengthMap: Record<string, string> = {
      LCM: "LCM",
      SCM: "SCM",
      SCY: "SCY",
      SCM16: "SCM",
      SCM20: "SCM",
      SCM33: "SCM",
      SCY20: "SCY",
      SCY27: "SCY",
      SCY33: "SCY",
      SCY36: "SCY",
    };

    const poolLength = poolLengthMap[eventInfo.course as string] || "LCM";
    const time = result.swimtime || "No time";

    return `${swimstyle.distance}m ${stroke} ${poolLength} - ${time}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Import LENEX File</h1>
        <p className="text-muted-foreground">
          Import swim results from a LENEX formatted file
        </p>
      </div>

      {/* Step indicator */}
      {(currentStep === "select-swimmers" || currentStep === "match-swimmers" || currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete") && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 ${currentStep === "select-swimmers" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(currentStep === "select-swimmers" || currentStep === "match-swimmers" || currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete") ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {(currentStep === "match-swimmers" || currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete") ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className="text-sm">Select Swimmers</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === "match-swimmers" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "match-swimmers" || currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "2"}
            </div>
            <span className="text-sm">Match Swimmers</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === "confirm-import" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "confirm-import" || currentStep === "importing" || currentStep === "complete" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {currentStep === "importing" || currentStep === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "3"}
            </div>
            <span className="text-sm">Confirm</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${currentStep === "importing" || currentStep === "complete" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "complete" ? "bg-primary text-primary-foreground" : currentStep === "importing" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {currentStep === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "4"}
            </div>
            <span className="text-sm">Import</span>
          </div>
        </div>
      )}

      {/* Step 1: Select File */}
      {currentStep === "select-file" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Select LENEX File
            </CardTitle>
            <CardDescription>
              Upload a .lef or .lxf file containing swim meet results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".lef,.lxf,.xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="w-full"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing file...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select LENEX File
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Swimmers */}
      {currentStep === "select-swimmers" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Clubs and Athletes</CardTitle>
              <CardDescription>
                Choose which athletes to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {clubs.map(club => (
                <div key={club.clubId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`club-${club.clubId}`}
                      checked={club.selected}
                      onCheckedChange={checked =>
                        toggleClubSelected(club.clubId, checked as boolean)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleClubExpanded(club.clubId)}
                      className="p-0 h-auto"
                    >
                      {club.expanded ? (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-1" />
                      )}
                    </Button>
                    <label
                      htmlFor={`club-${club.clubId}`}
                      className="font-semibold cursor-pointer flex-1"
                    >
                      {club.name}
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {club.athletes.length} athletes
                    </span>
                  </div>

                  {club.expanded && (
                    <div className="ml-6 space-y-2">
                      {club.athletes.map(athlete => (
                        <div
                          key={athlete.athleteId}
                          className="border rounded p-2 bg-muted/30"
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`athlete-${club.clubId}-${athlete.athleteId}`}
                              checked={athlete.selected}
                              onCheckedChange={checked =>
                                toggleAthleteSelected(
                                  club.clubId,
                                  athlete.athleteId,
                                  checked as boolean
                                )
                              }
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`athlete-${club.clubId}-${athlete.athleteId}`}
                                className="cursor-pointer font-medium"
                              >
                                {athlete.fullName}
                              </label>
                              <div className="text-xs text-muted-foreground">
                                {athlete.gender} • {athlete.birthdate} • {athlete.results.length}{" "}
                                results
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedCount} athlete(s) selected for import
            </div>
            <Button
              onClick={proceedToMatching}
              disabled={selectedCount === 0}
              size="lg"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Match Swimmers */}
      {currentStep === "match-swimmers" && (
        <>
          {currentAthlete ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Match Swimmer {currentMatchingIndex + 1} of {athletesNeedingMatch.length}
                  </CardTitle>
                  <CardDescription>
                    {currentAthlete.fullName} needs to be matched with an existing athlete or created as new
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="font-semibold">{currentAthlete.fullName}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {currentAthlete.gender} • {currentAthlete.birthdate} • {currentAthlete.clubName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentAthlete.results.length} results to import
                </div>
              </div>

              <div className="space-y-3">
                <Label>Select an existing athlete or create new:</Label>

                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between"
                    >
                      {currentAthlete.matchedName && currentAthlete.matchStatus === "manual"
                        ? currentAthlete.matchedName
                        : "Search for existing athlete..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search athletes..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No athlete found</CommandEmpty>
                        <CommandGroup>
                          {filteredAthletes.slice(0, 20).map(athlete => (
                            <CommandItem
                              key={athlete.id}
                              value={athlete.canonicalName}
                              onSelect={() => {
                                setAthleteMatch(currentAthlete.athleteId, athlete.canonicalName, false);
                                setComboOpen(false);
                                setSearchValue("");
                              }}
                            >
                              <div>
                                <div>{athlete.canonicalName}</div>
                                {athlete.aliases.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Aliases: {athlete.aliases.join(", ")}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="text-center text-sm text-muted-foreground">or</div>

                <Button
                  variant={currentAthlete.matchStatus === "create-new" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setAthleteMatch(currentAthlete.athleteId, currentAthlete.fullName, true)}
                >
                  Create new athlete: {currentAthlete.fullName}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPreviousAthlete}
              disabled={currentMatchingIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentMatchingIndex + 1} of {athletesNeedingMatch.length}
            </div>
            <Button
              onClick={goToNextAthlete}
              disabled={!currentAthlete.matchedName}
            >
              {currentMatchingIndex === athletesNeedingMatch.length - 1 ? "Continue" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
            </>
          ) : (
            // No current athlete but still in match-swimmers step
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Processing matches...</h3>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Step 4: Confirm Import */}
      {currentStep === "confirm-import" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Confirm Import</CardTitle>
              <CardDescription>
                Review the swimmers and results that will be imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Import Summary:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{selectedCount} swimmers selected</li>
                      <li>{exactMatchCount} exact matches with existing athletes</li>
                      <li>{selectedAthletes.filter(a => a.matchStatus === "create-new").length} new athletes will be created</li>
                      <li>{selectedAthletes.filter(a => a.matchStatus === "manual").length} manually matched athletes</li>
                      <li>{selectedAthletes.reduce((sum, a) => sum + a.results.length, 0)} total results to import</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <div className="font-semibold">Athletes to import:</div>
                {selectedAthletes.map((athlete, idx) => {
                  const targetName = athlete.matchedName || athlete.fullName;
                  const isNewAthlete = athlete.matchStatus === "create-new" || !athlete.matchStatus;

                  return (
                    <div key={`${athlete.athleteId}-${idx}`} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{athlete.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            {athlete.clubName} • {athlete.gender} • {athlete.birthdate}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {athlete.results.length} results
                          </div>
                        </div>
                        <div className="text-sm">
                          {athlete.matchStatus === "exact" && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Exact match: {targetName}</span>
                            </div>
                          )}
                          {athlete.matchStatus === "manual" && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Matched to: {targetName}</span>
                            </div>
                          )}
                          {athlete.matchStatus === "create-new" && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>New athlete</span>
                            </div>
                          )}
                          {!athlete.matchStatus && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>New athlete</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show first few results as preview */}
                      {athlete.results.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View {athlete.results.length} result(s)
                          </summary>
                          <div className="mt-2 space-y-1 pl-4">
                            {athlete.results.slice(0, 5).map((result, resultIdx) => (
                              <div key={resultIdx} className="text-muted-foreground">
                                • {getResultDescription(result)}
                              </div>
                            ))}
                            {athlete.results.length > 5 && (
                              <div className="text-muted-foreground">
                                ... and {athlete.results.length - 5} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("select-swimmers")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Selection
            </Button>
            <Button
              onClick={confirmAndImport}
              size="lg"
            >
              Confirm and Import {selectedAthletes.reduce((sum, a) => sum + a.results.length, 0)} Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Step 5: Importing */}
      {currentStep === "importing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold">Importing results...</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we import the swim times
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Complete */}
      {currentStep === "complete" && importStats && (
        <>
          <Alert
            variant={importStats.errors.length > 0 ? "destructive" : "default"}
          >
            {importStats.errors.length > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Import Complete!</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{importStats.imported} results imported</li>
                  <li>{importStats.skipped} results skipped (duplicates)</li>
                  {importStats.errors.length > 0 && (
                    <li className="text-destructive">
                      {importStats.errors.length} errors occurred
                    </li>
                  )}
                </ul>

                {importStats.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">View errors</summary>
                    <ul className="mt-2 text-xs space-y-1">
                      {importStats.errors.map((error, i) => (
                        <li key={i} className="text-muted-foreground">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button onClick={resetImport}>
              Import Another File
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
