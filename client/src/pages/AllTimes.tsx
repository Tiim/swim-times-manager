import { useState, useEffect } from "react";
import { TimeEntryTable, SwimTime } from "@/components/TimeEntryTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { swimStorage } from "@/lib/storage";

export default function AllTimes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStroke, setFilterStroke] = useState<string>("all");
  const [filterPool, setFilterPool] = useState<string>("all");
  const [times, setTimes] = useState<SwimTime[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allTimes = swimStorage.getAllSwimTimes();
    const mapped = allTimes.map(time => ({
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
    setTimes(mapped);
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
    } else {
      toast({
        title: "Error",
        description: "Failed to update swim time.",
        variant: "destructive",
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
    } else {
      toast({
        title: "Error",
        description: "Failed to delete swim time.",
        variant: "destructive",
      });
    }
  };

  const filteredTimes = times.filter((time) => {
    if (filterStroke !== "all" && time.stroke !== filterStroke) return false;
    if (filterPool !== "all" && time.poolLength !== filterPool) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        time.athlete.toLowerCase().includes(query) ||
        time.event.toLowerCase().includes(query) ||
        time.time.includes(query)
      );
    }
    return true;
  });

  const handleResetFilters = () => {
    setFilterStroke("all");
    setFilterPool("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Recorded Times</h1>
        <p className="text-muted-foreground">
          View, edit, and manage all swim times
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by athlete, event, or time..."
            className="pl-9"
            data-testid="input-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStroke} onValueChange={setFilterStroke}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-stroke">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Stroke" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strokes</SelectItem>
              <SelectItem value="Freestyle">Freestyle</SelectItem>
              <SelectItem value="Backstroke">Backstroke</SelectItem>
              <SelectItem value="Breaststroke">Breaststroke</SelectItem>
              <SelectItem value="Butterfly">Butterfly</SelectItem>
              <SelectItem value="IM">IM</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPool} onValueChange={setFilterPool}>
            <SelectTrigger className="w-[120px]" data-testid="select-filter-pool">
              <SelectValue placeholder="Pool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pools</SelectItem>
              <SelectItem value="SCM">SCM</SelectItem>
              <SelectItem value="SCY">SCY</SelectItem>
              <SelectItem value="LCM">LCM</SelectItem>
              <SelectItem value="LCY">LCY</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-reset-filters" onClick={handleResetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {filteredTimes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {times.length === 0
              ? "No swim times recorded yet. Start by adding a new time!"
              : "No times match your filters or search."}
          </p>
        </div>
      ) : (
        <>
          <TimeEntryTable
            times={filteredTimes}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="text-sm text-muted-foreground">
            Showing {filteredTimes.length} of {times.length} times
          </div>
        </>
      )}
    </div>
  );
}
