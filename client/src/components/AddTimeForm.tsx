import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { swimStorage } from "@/lib/storage";

interface AddTimeFormProps {
  onSubmit?: (data: any) => void;
}

export function AddTimeForm({ onSubmit }: AddTimeFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    athlete: "",
    event: "practice",
    stroke: "",
    distance: "",
    poolLength: "SCM",
    time: "",
    splits: "",
  });

  const [athleteOpen, setAthleteOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [athleteNames, setAthleteNames] = useState<string[]>([]);
  const [eventNames, setEventNames] = useState<string[]>([]);

  useEffect(() => {
    // Load unique athlete names and event names from storage
    const times = swimStorage.getAllSwimTimes();
    const uniqueAthletes = Array.from(new Set(times.map(t => t.athleteName))).sort();
    const uniqueEvents = Array.from(new Set(times.map(t => t.eventName))).sort();
    setAthleteNames(uniqueAthletes);
    setEventNames(uniqueEvents);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onSubmit?.(formData);
    // Only reset distance, stroke, and time - keep athlete, event, date, poolLength, and splits
    setFormData((prev) => ({
      ...prev,
      stroke: "",
      distance: "",
      time: "",
    }));
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Clear splits if distance or pool length changes and number of splits changes
      if (field === "distance" || field === "poolLength") {
        const oldPoolLength = getPoolLengthValue(prev.poolLength);
        const oldDistance = parseInt(prev.distance) || 0;
        const oldNumSplits = oldDistance > oldPoolLength && oldPoolLength > 0
          ? Math.floor(oldDistance / oldPoolLength) - 1
          : 0;

        const newPoolLength = field === "poolLength"
          ? getPoolLengthValue(value)
          : getPoolLengthValue(prev.poolLength);
        const newDistance = field === "distance" ? parseInt(value) || 0 : parseInt(prev.distance) || 0;
        const newNumSplits = newDistance > newPoolLength && newPoolLength > 0
          ? Math.floor(newDistance / newPoolLength) - 1
          : 0;

        if (oldNumSplits !== newNumSplits) {
          newData.splits = "";
        }
      }

      return newData;
    });
  };

  const updateSplit = (index: number, value: string) => {
    const splitsArray = formData.splits ? formData.splits.split(",").map(s => s.trim()) : [];
    splitsArray[index] = value;
    setFormData((prev) => ({ ...prev, splits: splitsArray.join(", ") }));
  };

  // Calculate pool length in meters/yards
  const getPoolLengthValue = (poolLength: string): number => {
    switch (poolLength) {
      case "SCM": return 25;
      case "LCM": return 50;
      case "SCY": return 25;
      case "LCY": return 50;
      default: return 0;
    }
  };

  // Calculate number of splits needed
  const getNumberOfSplits = (): number => {
    const distance = parseInt(formData.distance);
    const poolLength = getPoolLengthValue(formData.poolLength);

    if (!distance || !poolLength || distance <= poolLength) {
      return 0;
    }

    return Math.floor(distance / poolLength) - 1;
  };

  // Get split distances
  const getSplitDistances = (): number[] => {
    const poolLength = getPoolLengthValue(formData.poolLength);
    const numSplits = getNumberOfSplits();

    return Array.from({ length: numSplits }, (_, i) => poolLength * (i + 1));
  };

  // Get split values as array
  const getSplitValues = (): string[] => {
    const splitsArray = formData.splits ? formData.splits.split(",").map(s => s.trim()) : [];
    const numSplits = getNumberOfSplits();

    // Ensure array has correct length
    while (splitsArray.length < numSplits) {
      splitsArray.push("");
    }

    return splitsArray.slice(0, numSplits);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Time</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                required
                data-testid="input-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="athlete">Athlete Name</Label>
              <Popover
                open={athleteOpen}
                onOpenChange={(open) => {
                  setAthleteOpen(open);
                  if (open) {
                    setAthleteSearch(formData.athlete);
                  } else if (athleteSearch && athleteSearch !== formData.athlete) {
                    // If user typed something but didn't select, use the typed value
                    updateField("athlete", athleteSearch);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="athlete"
                    variant="outline"
                    role="combobox"
                    aria-expanded={athleteOpen}
                    className="w-full justify-between font-normal"
                    data-testid="input-athlete"
                  >
                    {formData.athlete || "Select or enter athlete name..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search or type new name..."
                      value={athleteSearch}
                      onValueChange={setAthleteSearch}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && athleteSearch) {
                          updateField("athlete", athleteSearch);
                          setAthleteOpen(false);
                        }
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {athleteSearch ? `Press Enter to use "${athleteSearch}"` : "No athletes found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {athleteNames
                          .filter((name) =>
                            name.toLowerCase().includes(athleteSearch.toLowerCase())
                          )
                          .map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => {
                                updateField("athlete", name);
                                setAthleteSearch(name);
                                setAthleteOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.athlete === name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Event Name</Label>
              <Popover
                open={eventOpen}
                onOpenChange={(open) => {
                  setEventOpen(open);
                  if (open) {
                    setEventSearch(formData.event);
                  } else if (eventSearch && eventSearch !== formData.event) {
                    // If user typed something but didn't select, use the typed value
                    updateField("event", eventSearch);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="event"
                    variant="outline"
                    role="combobox"
                    aria-expanded={eventOpen}
                    className="w-full justify-between font-normal"
                    data-testid="input-event"
                  >
                    {formData.event || "Select or enter event name..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search or type new event..."
                      value={eventSearch}
                      onValueChange={setEventSearch}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && eventSearch) {
                          updateField("event", eventSearch);
                          setEventOpen(false);
                        }
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {eventSearch ? `Press Enter to use "${eventSearch}"` : "No events found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {eventNames
                          .filter((name) =>
                            name.toLowerCase().includes(eventSearch.toLowerCase())
                          )
                          .map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => {
                                updateField("event", name);
                                setEventSearch(name);
                                setEventOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.event === name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stroke">Stroke</Label>
              <Select
                value={formData.stroke}
                onValueChange={(value) => updateField("stroke", value)}
                required
              >
                <SelectTrigger id="stroke" data-testid="select-stroke">
                  <SelectValue placeholder="Select stroke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freestyle">Freestyle</SelectItem>
                  <SelectItem value="Backstroke">Backstroke</SelectItem>
                  <SelectItem value="Breaststroke">Breaststroke</SelectItem>
                  <SelectItem value="Butterfly">Butterfly</SelectItem>
                  <SelectItem value="IM">Individual Medley (IM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distance (meters)</Label>
              <Input
                id="distance"
                type="number"
                value={formData.distance}
                onChange={(e) => updateField("distance", e.target.value)}
                placeholder="e.g., 50, 100, 200"
                required
                data-testid="input-distance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poolLength">Pool Length</Label>
              <Select
                value={formData.poolLength}
                onValueChange={(value) => updateField("poolLength", value)}
                required
              >
                <SelectTrigger id="poolLength" data-testid="select-pool">
                  <SelectValue placeholder="Select pool length" />
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
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                value={formData.time}
                onChange={(e) => updateField("time", e.target.value)}
                placeholder="MM:SS.ss or SS.ss"
                className="font-mono"
                required
                data-testid="input-time"
              />
            </div>

            {getNumberOfSplits() > 0 && (
              <div className="space-y-2">
                <Label>Splits (Optional)</Label>
                <div className="space-y-3">
                  {getSplitDistances().map((distance, index) => {
                    const splitValues = getSplitValues();
                    const unit = formData.poolLength.includes("M") ? "m" : "yd";
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Label htmlFor={`split-${index}`} className="w-16 text-sm text-muted-foreground">
                          {distance}{unit}
                        </Label>
                        <Input
                          id={`split-${index}`}
                          value={splitValues[index] || ""}
                          onChange={(e) => updateSplit(index, e.target.value)}
                          placeholder="MM:SS.ss or SS.ss"
                          className="font-mono"
                          data-testid={`input-split-${index}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" data-testid="button-submit">
            Add Time
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
