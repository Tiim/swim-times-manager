import { useState, useEffect } from "react";
import { AddTimeForm } from "@/components/AddTimeForm";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { swimStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AddTime() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const timeId = params.id;
  const isEditing = !!timeId;

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing && timeId) {
      const existingTime = swimStorage.getSwimTimeById(timeId);
      if (existingTime) {
        setInitialData({
          date: existingTime.date,
          athlete: existingTime.athleteName,
          event: existingTime.eventName,
          stroke: existingTime.stroke,
          distance: existingTime.distance.toString(),
          poolLength: existingTime.poolLength,
          time: existingTime.measuredTime,
          splits: existingTime.splits || "",
        });
      } else {
        toast({
          title: "Error",
          description: "Time entry not found",
          variant: "destructive",
        });
        setLocation("/all-times");
      }
      setLoading(false);
    }
  }, [isEditing, timeId, setLocation, toast]);

  const handleSubmit = (data: any) => {
    try {
      if (isEditing && timeId) {
        // Update existing time
        const updated = swimStorage.updateSwimTime(timeId, {
          athleteName: data.athlete,
          eventName: data.event,
          date: data.date,
          measuredTime: data.time,
          stroke: data.stroke,
          distance: parseInt(data.distance),
          poolLength: data.poolLength,
          splits: data.splits || null,
        });

        if (updated) {
          window.dispatchEvent(new Event('storage-updated'));

          toast({
            title: "Time updated successfully",
            description: `${updated.athleteName} - ${updated.stroke} ${updated.distance}m: ${updated.measuredTime}`,
          });

          setLocation("/all-times");
        } else {
          throw new Error("Update failed");
        }
      } else {
        // Create new time
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
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing
          ? "Failed to update swim time. Please check your input and try again."
          : "Failed to add swim time. Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => setLocation("/all-times")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Times
          </Button>
        )}
        <h1 className="text-3xl font-bold mb-2">{isEditing ? "Edit Time" : "Add New Time"}</h1>
        <p className="text-muted-foreground">
          {isEditing ? "Update the swim time details" : "Record a new swim time for an athlete"}
        </p>
      </div>

      <AddTimeForm onSubmit={handleSubmit} initialData={initialData} isEditing={isEditing} />
    </div>
  );
}
