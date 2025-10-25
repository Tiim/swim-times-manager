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
            const bestPB = athlete.personalBests[0];
            const recentPBs = athlete.personalBests.filter((pb: any) => {
              const pbDate = new Date(pb.date);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return pbDate >= thirtyDaysAgo;
            }).length;

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
                      {athlete.totalTimes} recorded times
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
                  {bestPB ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Best Stroke
                        </p>
                        <p className="font-medium">{bestPB.stroke}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Top Time
                        </p>
                        <p className="font-mono font-semibold text-lg">
                          {bestPB.measuredTime}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No personal bests yet
                    </div>
                  )}
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
