import { PBCard } from "@/components/PBCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";
import type { SwimTime } from "@/lib/storage";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [personalBests, setPersonalBests] = useState<SwimTime[]>([]);

  useEffect(() => {
    loadData();
    
    // Listen for storage changes from other components
    const handleStorageChange = () => loadData();
    window.addEventListener('storage-updated', handleStorageChange);
    return () => window.removeEventListener('storage-updated', handleStorageChange);
  }, []);

  const loadData = () => {
    setPersonalBests(swimStorage.getPersonalBests());
  };

  const filteredPBs = personalBests.filter((pb) => {
    const query = searchQuery.toLowerCase();
    return (
      pb.athleteName.toLowerCase().includes(query) ||
      pb.stroke.toLowerCase().includes(query) ||
      pb.eventName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Personal Bests Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of top performances across all athletes
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by athlete, stroke, or event..."
          className="pl-9"
          data-testid="input-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredPBs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No personal bests match your search." : "No personal bests recorded yet. Start by adding some swim times!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPBs.map((pb) => (
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
  );
}
