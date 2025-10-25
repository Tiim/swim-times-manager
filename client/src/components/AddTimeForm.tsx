import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AddTimeFormProps {
  onSubmit?: (data: any) => void;
}

export function AddTimeForm({ onSubmit }: AddTimeFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    athlete: "",
    event: "",
    stroke: "",
    distance: "",
    poolLength: "",
    time: "",
    splits: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onSubmit?.(formData);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      athlete: "",
      event: "",
      stroke: "",
      distance: "",
      poolLength: "",
      time: "",
      splits: "",
    });
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Time</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                required
                data-testid="input-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="athlete">Athlete Name</Label>
              <Input
                id="athlete"
                value={formData.athlete}
                onChange={(e) => updateField("athlete", e.target.value)}
                placeholder="Enter athlete name"
                required
                data-testid="input-athlete"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Event Name</Label>
              <Input
                id="event"
                value={formData.event}
                onChange={(e) => updateField("event", e.target.value)}
                placeholder="e.g., Meet XYZ 2025 or practice"
                required
                data-testid="input-event"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stroke">Stroke</Label>
              <Select
                value={formData.stroke}
                onValueChange={(value) => updateField("stroke", value)}
                required
              >
                <SelectTrigger id="stroke" data-testid="select-stroke">
                  <SelectValue placeholder="Select stroke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freestyle">Freestyle</SelectItem>
                  <SelectItem value="Backstroke">Backstroke</SelectItem>
                  <SelectItem value="Breaststroke">Breaststroke</SelectItem>
                  <SelectItem value="Butterfly">Butterfly</SelectItem>
                  <SelectItem value="IM">Individual Medley (IM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distance (meters)</Label>
              <Input
                id="distance"
                type="number"
                value={formData.distance}
                onChange={(e) => updateField("distance", e.target.value)}
                placeholder="e.g., 50, 100, 200"
                required
                data-testid="input-distance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poolLength">Pool Length</Label>
              <Select
                value={formData.poolLength}
                onValueChange={(value) => updateField("poolLength", value)}
                required
              >
                <SelectTrigger id="poolLength" data-testid="select-pool">
                  <SelectValue placeholder="Select pool length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCM">SCM (25m)</SelectItem>
                  <SelectItem value="SCY">SCY (25yd)</SelectItem>
                  <SelectItem value="LCM">LCM (50m)</SelectItem>
                  <SelectItem value="LCY">LCY (50yd)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                value={formData.time}
                onChange={(e) => updateField("time", e.target.value)}
                placeholder="MM:SS.ss or SS.ss"
                className="font-mono"
                required
                data-testid="input-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="splits">Splits (Optional)</Label>
              <Input
                id="splits"
                value={formData.splits}
                onChange={(e) => updateField("splits", e.target.value)}
                placeholder="e.g., 28.5, 29.2, 30.1"
                className="font-mono"
                data-testid="input-splits"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" data-testid="button-submit">
            Add Time
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
