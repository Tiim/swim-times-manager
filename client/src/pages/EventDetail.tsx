import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntryTable, SwimTime } from "@/components/TimeEntryTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar, Users, Trophy, User, Edit2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";
import type { SwimTime as SwimTimeType } from "@/lib/storage";

export default function EventDetail() {
  const [match, params] = useRoute("/event/:name");
  const eventName = params?.name ? decodeURIComponent(params.name) : "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [eventTimes, setEventTimes] = useState<SwimTimeType[]>([]);
  const [athletes, setAthletes] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<string[]>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedEventName, setSelectedEventName] = useState("");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (eventName) {
      loadData();
    }

    // Listen for storage changes
    const handleStorageChange = () => {
      if (eventName) {
        loadData();
      }
    };
    window.addEventListener('storage-updated', handleStorageChange);
    return () => window.removeEventListener('storage-updated', handleStorageChange);
  }, [eventName]);

  const loadData = () => {
    setEventTimes(swimStorage.getSwimTimesByEvent(eventName));
    setAthletes(swimStorage.getAthletesByEvent(eventName));

    // Load all events for the rename dropdown
    const events = swimStorage.getEvents();
    setAllEvents(events.map(e => e.name).filter(name => name !== eventName));
  };

  const handleRenameEvent = () => {
    const newName = selectedEventName || searchValue;

    if (!newName || newName.trim() === "") {
      toast({
        title: "Invalid name",
        description: "Please enter a valid event name.",
        variant: "destructive",
      });
      return;
    }

    if (newName === eventName) {
      toast({
        title: "No change",
        description: "The new name is the same as the current name.",
        variant: "destructive",
      });
      return;
    }

    const success = swimStorage.renameEvent(eventName, newName);

    if (success) {
      setRenameDialogOpen(false);
      setSelectedEventName("");
      setSearchValue("");

      // Check if we're merging into an existing event
      const existingEvent = allEvents.includes(newName);

      toast({
        title: existingEvent ? "Events merged" : "Event renamed",
        description: existingEvent
          ? `"${eventName}" has been merged into "${newName}".`
          : `Event renamed from "${eventName}" to "${newName}".`,
      });

      // Navigate to the renamed/merged event
      setLocation(`/event/${encodeURIComponent(newName)}`);
    }
  };

  const handleDelete = (id: string) => {
    const deleted = swimStorage.deleteSwimTime(id);
    if (deleted) {
      loadData();
      window.dispatchEvent(new Event('storage-updated'));
      toast({
        title: "Time deleted",
        description: "The swim time has been deleted successfully.",
      });
    }
  };

  if (!match) {
    return <div>Event not found</div>;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const mostRecentDate = eventTimes.length > 0
    ? formatDate(eventTimes[0].date)
    : "N/A";

  const mappedTimes: SwimTime[] = eventTimes.map((time) => ({
    id: time.id,
    date: time.date,
    athlete: time.athleteName,
    event: time.eventName,
    stroke: time.stroke,
    distance: time.distance,
    poolLength: time.poolLength,
    time: time.measuredTime,
    splits: time.splits || undefined,
  }));

  // Count personal bests in this event
  const personalBestsCount = eventTimes.filter(time => {
    const athletePBs = swimStorage.getPersonalBestsForAthlete(time.athleteName);
    return athletePBs.some(pb => pb.id === time.id);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {eventName}
          </h1>
          <p className="text-muted-foreground">Event Details and Results</p>
        </div>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Rename Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Rename Event</DialogTitle>
              <DialogDescription>
                Rename this event or merge it with another event by selecting an existing event name.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Command className="border rounded-md">
                <CommandInput
                  placeholder="Search events or type new name..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue ? `Create new event: "${searchValue}"` : "No events found"}
                  </CommandEmpty>
                  {allEvents.length > 0 && (
                    <CommandGroup heading="Existing Events (select to merge)">
                      {allEvents
                        .filter(name =>
                          searchValue === "" ||
                          name.toLowerCase().includes(searchValue.toLowerCase())
                        )
                        .map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => {
                              setSelectedEventName(name);
                              setSearchValue(name);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedEventName === name ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              {searchValue && !allEvents.includes(searchValue) && (
                <p className="text-sm text-muted-foreground mt-2">
                  This will create a new event name: "{searchValue}"
                </p>
              )}
              {selectedEventName && allEvents.includes(selectedEventName) && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  Warning: This will merge all entries from "{eventName}" into "{selectedEventName}".
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRenameDialogOpen(false);
                setSelectedEventName("");
                setSearchValue("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleRenameEvent}>
                {selectedEventName && allEvents.includes(selectedEventName) ? "Merge Events" : "Rename Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostRecentDate}
            </div>
            <p className="text-xs text-muted-foreground">Most recent entry</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventTimes.length}
            </div>
            <p className="text-xs text-muted-foreground">Recorded times</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Swimmers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {athletes.length}
            </div>
            <p className="text-xs text-muted-foreground">Participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Bests</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personalBestsCount}
            </div>
            <p className="text-xs text-muted-foreground">New records</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Swimmers</h2>
          <Badge variant="secondary">{athletes.length}</Badge>
        </div>
        {athletes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No swimmers found for this event.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {athletes.map((athlete) => {
              const athleteTimesInEvent = eventTimes.filter(t => t.athleteName === athlete);
              return (
                <Link key={athlete} href={`/athlete/${encodeURIComponent(athlete)}`}>
                  <Card className="hover-elevate cursor-pointer transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{athlete}</p>
                          <p className="text-xs text-muted-foreground">
                            {athleteTimesInEvent.length} {athleteTimesInEvent.length === 1 ? 'entry' : 'entries'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">All Entries</h2>
          <Badge variant="secondary">{eventTimes.length}</Badge>
        </div>
        {eventTimes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No times recorded yet for this event.
          </div>
        ) : (
          <TimeEntryTable
            times={mappedTimes}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
