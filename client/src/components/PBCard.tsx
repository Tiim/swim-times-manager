import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface PBCardProps {
  stroke: string;
  distance: number;
  poolLength: string;
  time: string;
  event: string;
  date: string;
  isNew?: boolean;
}

export function PBCard({
  stroke,
  distance,
  poolLength,
  time,
  event,
  date,
  isNew,
}: PBCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-pb-${stroke}-${distance}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div>
          <h3 className="font-semibold text-base">{stroke}</h3>
          <p className="text-sm text-muted-foreground">
            {distance}m {poolLength}
          </p>
        </div>
        {isNew && (
          <Badge variant="default" className="gap-1">
            <Trophy className="h-3 w-3" />
            New PB
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold font-mono tabular-nums" data-testid="text-pb-time">
          {time}
        </div>
        <div className="text-sm text-muted-foreground">
          <div data-testid="text-event">{event}</div>
          <div className="text-xs" data-testid="text-date">{date}</div>
        </div>
      </CardContent>
    </Card>
  );
}
