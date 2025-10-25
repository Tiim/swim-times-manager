import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntryTable, SwimTime } from "@/components/TimeEntryTable";
import { PBCard } from "@/components/PBCard";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";
import type { SwimTime as SwimTimeType } from "@/lib/storage";

export default function AthleteProfile() {
  const [match, params] = useRoute("/athlete/:name");
  const athleteName = params?.name ? decodeURIComponent(params.name) : "";
  const { toast } = useToast();
  const [athleteTimes, setAthleteTimes] = useState<SwimTimeType[]>([]);
  const [personalBests, setPersonalBests] = useState<SwimTimeType[]>([]);

  useEffect(() => {
    if (athleteName) {
      loadData();
    }
  }, [athleteName]);

  const loadData = () => {
    setAthleteTimes(swimStorage.getSwimTimesByAthlete(athleteName));
    setPersonalBests(swimStorage.getPersonalBestsForAthlete(athleteName));
  };

  const handleEdit = (id: string, updatedTime: SwimTime) => {
    const result = swimStorage.updateSwimTime(id, {
      athleteName: updatedTime.athlete,
      eventName: updatedTime.event,
      date: updatedTime.date,
      measuredTime: updatedTime.time,
      stroke: updatedTime.stroke as any,
      distance: updatedTime.distance,
      poolLength: updatedTime.poolLength as any,
      splits: updatedTime.splits || null,
    });

    if (result) {
      loadData();
      window.dispatchEvent(new Event('storage-updated'));
      toast({
        title: "Time updated",
        description: "The swim time has been updated successfully.",
      });
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
              />
            ))}
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
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
