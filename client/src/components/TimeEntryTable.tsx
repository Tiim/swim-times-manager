import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export interface SwimTime {
  id: string;
  date: string;
  athlete: string;
  event: string;
  stroke: string;
  distance: number;
  poolLength: string;
  time: string;
  splits?: string;
}

interface TimeEntryTableProps {
  times: SwimTime[];
  onDelete?: (id: string) => void;
}

export function TimeEntryTable({ times, onDelete }: TimeEntryTableProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead>Athlete</TableHead>
            <TableHead>Event</TableHead>
            <TableHead className="w-[120px]">Stroke</TableHead>
            <TableHead className="w-[90px]">Distance</TableHead>
            <TableHead className="w-[80px]">Pool</TableHead>
            <TableHead className="w-[100px] font-mono">Time</TableHead>
            <TableHead className="w-[150px]">Splits</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {times.map((time) => (
            <TableRow
              key={time.id}
              className="hover-elevate"
              data-testid={`row-time-${time.id}`}
            >
              <TableCell className="text-sm">{time.date}</TableCell>
              <TableCell className="font-medium">{time.athlete}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{time.event}</TableCell>
              <TableCell className="text-sm">{time.stroke}</TableCell>
              <TableCell className="text-sm">{time.distance}m</TableCell>
              <TableCell className="text-sm">{time.poolLength}</TableCell>
              <TableCell className="font-mono font-semibold">{time.time}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {time.splits || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setLocation(`/edit-time/${time.id}`)}
                    data-testid={`button-edit-${time.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => onDelete?.(time.id)}
                    data-testid={`button-delete-${time.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
