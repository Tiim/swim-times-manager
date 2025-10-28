import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Listen for storage changes
    const handleStorageChange = () => loadData();
    window.addEventListener('storage-updated', handleStorageChange);
    return () => window.removeEventListener('storage-updated', handleStorageChange);
  }, []);

  const loadData = () => {
    setEvents(swimStorage.getEvents());
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Events</h1>
        <p className="text-muted-foreground">
          View all meets, competitions, and practice sessions
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No events match your search." : "No events found. Start by adding some swim times!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            return (
              <Card
                key={event.name}
                className="hover-elevate"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Entries
                      </p>
                      <p className="font-medium">
                        {event.timesCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Swimmers
                      </p>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <p className="font-medium">
                          {event.athletesCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link href={`/event/${encodeURIComponent(event.name)}`}>
                    <Button variant="outline" className="w-full">
                      View Details
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
