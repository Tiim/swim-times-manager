import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";

export default function Athletes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    
    // Listen for storage changes
    const handleStorageChange = () => loadData();
    window.addEventListener('storage-updated', handleStorageChange);
    return () => window.removeEventListener('storage-updated', handleStorageChange);
  }, []);

  const loadData = () => {
    setAthletes(swimStorage.getAthletes());
  };

  const filteredAthletes = athletes.filter((athlete) =>
    athlete.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Athletes</h1>
        <p className="text-muted-foreground">
          Manage and view athlete performance profiles
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search athletes..."
          className="pl-9"
          data-testid="input-search-athletes"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredAthletes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No athletes match your search." : "No athletes found. Start by adding some swim times!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete) => {
            // Calculate metrics
            const recentPBs = athlete.personalBests.filter((pb: any) => {
              const pbDate = new Date(pb.date);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return pbDate >= thirtyDaysAgo;
            }).length;

            // Get last swim date
            const lastSwim = athlete.recentTimes[0];
            const lastSwimDate = lastSwim ? new Date(lastSwim.date) : null;
            const daysSinceLastSwim = lastSwimDate
              ? Math.floor((new Date().getTime() - lastSwimDate.getTime()) / (1000 * 60 * 60 * 24))
              : null;

            // Calculate recent activity (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentSwims = athlete.recentTimes.filter((time: any) => {
              return new Date(time.date) >= thirtyDaysAgo;
            }).length;

            // Calculate event variety
            const uniqueStrokes = new Set(athlete.personalBests.map((pb: any) => pb.stroke));
            const uniqueDistances = new Set(athlete.personalBests.map((pb: any) => pb.distance));

            // Activity status color
            const activityColor = daysSinceLastSwim === null ? "text-muted-foreground" :
              daysSinceLastSwim < 7 ? "text-green-600 dark:text-green-400" :
              daysSinceLastSwim < 30 ? "text-yellow-600 dark:text-yellow-400" :
              "text-red-600 dark:text-red-400";

            // Format last swim text
            const lastSwimText = daysSinceLastSwim === null ? "No swims yet" :
              daysSinceLastSwim === 0 ? "Today" :
              daysSinceLastSwim === 1 ? "Yesterday" :
              `${daysSinceLastSwim} days ago`;

            return (
              <Card
                key={athlete.name}
                className="hover-elevate"
                data-testid={`card-athlete-${athlete.name}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{athlete.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {recentSwims} {recentSwims === 1 ? 'swim' : 'swims'} in last 30 days
                    </p>
                  </div>
                  {recentPBs > 0 && (
                    <Badge variant="default" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {recentPBs} PB{recentPBs > 1 ? "s" : ""}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Last Swim
                    </p>
                    <p className={`font-medium ${activityColor}`}>
                      {lastSwimText}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Performance
                    </p>
                    <p className="font-medium">
                      {athlete.personalBests.length} PB{athlete.personalBests.length !== 1 ? "s" : ""} across {uniqueStrokes.size} {uniqueStrokes.size === 1 ? 'stroke' : 'strokes'}
                    </p>
                    {uniqueDistances.size > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {uniqueDistances.size} {uniqueDistances.size === 1 ? 'distance' : 'distances'}
                      </p>
                    )}
                  </div>

                  <Link href={`/athlete/${encodeURIComponent(athlete.name)}`}>
                    <Button variant="outline" className="w-full" data-testid={`button-view-${athlete.name}`}>
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
