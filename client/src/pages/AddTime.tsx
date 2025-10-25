import { AddTimeForm } from "@/components/AddTimeForm";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { swimStorage } from "@/lib/storage";

export default function AddTime() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = (data: any) => {
    try {
      const newTime = swimStorage.createSwimTime({
        athleteName: data.athlete,
        eventName: data.event,
        date: data.date,
        measuredTime: data.time,
        stroke: data.stroke,
        distance: parseInt(data.distance),
        poolLength: data.poolLength,
        splits: data.splits || null,
      });

      window.dispatchEvent(new Event('storage-updated'));
      
      toast({
        title: "Time added successfully",
        description: `${newTime.athleteName} - ${newTime.stroke} ${newTime.distance}m: ${newTime.measuredTime}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add swim time. Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Add New Time</h1>
        <p className="text-muted-foreground">
          Record a new swim time for an athlete
        </p>
      </div>

      <AddTimeForm onSubmit={handleSubmit} />
    </div>
  );
}
