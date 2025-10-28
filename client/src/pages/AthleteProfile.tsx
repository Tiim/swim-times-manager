import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntryTable, SwimTime } from "@/components/TimeEntryTable";
import { PBCard } from "@/components/PBCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";
import type { SwimTime as SwimTimeType } from "@/lib/storage";

export default function AthleteProfile() {
  const [match, params] = useRoute("/athlete/:name");
  const [, setLocation] = useLocation();
  const athleteName = params?.name ? decodeURIComponent(params.name) : "";
  const { toast } = useToast();
  const [athleteTimes, setAthleteTimes] = useState<SwimTimeType[]>([]);
  const [personalBests, setPersonalBests] = useState<SwimTimeType[]>([]);
  const [aliases, setAliases] = useState<string[]>([]);
  const [events, setEvents] = useState<{ name: string; timesCount: number; date: string }[]>([]);

  useEffect(() => {
    if (athleteName) {
      loadData();
    }
  }, [athleteName]);

  const loadData = () => {
    const resolvedName = swimStorage.resolveAthleteName(athleteName);
    setAthleteTimes(swimStorage.getSwimTimesByAthlete(resolvedName));
    setPersonalBests(swimStorage.getPersonalBestsForAthlete(resolvedName));
    setEvents(swimStorage.getEventsByAthlete(resolvedName));

    const athlete = swimStorage.getAthlete(resolvedName);
    setAliases(athlete?.aliases || []);
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
    return <div>Athlete not found</div>;
  }

  const latestPB = personalBests.length > 0
    ? personalBests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const mappedTimes: SwimTime[] = athleteTimes.map((time) => ({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-athlete-name">
          {athleteName}
        </h1>
        {aliases.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Also known as:</span>
            <div className="flex flex-wrap gap-1">
              {aliases.map((alias) => (
                <Badge key={alias} variant="secondary" className="text-xs">
                  {alias}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <p className="text-muted-foreground">Athlete Performance Profile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Times</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-times">
              {athleteTimes.length}
            </div>
            <p className="text-xs text-muted-foreground">Recorded performances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Bests</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pbs">
              {personalBests.length}
            </div>
            <p className="text-xs text-muted-foreground">All-time records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest PB</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-latest-pb">
              {latestPB ? latestPB.date : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Most recent record</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Personal Bests</h2>
          <Badge variant="secondary">{personalBests.length}</Badge>
        </div>
        {personalBests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No personal bests yet for this athlete.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalBests.map((pb) => (
              <PBCard
                key={pb.id}
                stroke={pb.stroke}
                distance={pb.distance}
                poolLength={pb.poolLength}
                time={pb.measuredTime}
                event={pb.eventName}
                date={pb.date}
                onClick={() =>
                  setLocation(
                    `/athlete/${encodeURIComponent(athleteName)}/progression/${encodeURIComponent(pb.stroke)}/${pb.distance}`
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Events</h2>
          <Badge variant="secondary">{events.length}</Badge>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No events found for this athlete.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => {
              const formatDate = (dateStr: string) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              };

              return (
                <Card key={event.name} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Entries
                      </p>
                      <p className="font-medium">
                        {event.timesCount} {event.timesCount === 1 ? 'time' : 'times'}
                      </p>
                    </div>
                    <Link href={`/event/${encodeURIComponent(event.name)}`}>
                      <Button variant="outline" className="w-full" size="sm">
                        View Event
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Recent Times</h2>
          <Badge variant="secondary">{athleteTimes.length}</Badge>
        </div>
        {athleteTimes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No times recorded yet for this athlete.
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
