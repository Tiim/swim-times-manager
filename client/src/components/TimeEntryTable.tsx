import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";

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
  onEdit?: (id: string, time: SwimTime) => void;
  onDelete?: (id: string) => void;
}

export function TimeEntryTable({ times, onEdit, onDelete }: TimeEntryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<SwimTime | null>(null);

  const startEdit = (time: SwimTime) => {
    setEditingId(time.id);
    setEditData({ ...time });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = () => {
    if (editData && onEdit) {
      onEdit(editingId!, editData);
    }
    setEditingId(null);
    setEditData(null);
  };

  const updateEditData = (field: keyof SwimTime, value: string | number) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

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
              {editingId === time.id && editData ? (
                <>
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => updateEditData("date", e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-date"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editData.athlete}
                      onChange={(e) => updateEditData("athlete", e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-athlete"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editData.event}
                      onChange={(e) => updateEditData("event", e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-event"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editData.stroke}
                      onValueChange={(value) => updateEditData("stroke", value)}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid="select-stroke">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freestyle">Freestyle</SelectItem>
                        <SelectItem value="Backstroke">Backstroke</SelectItem>
                        <SelectItem value="Breaststroke">Breaststroke</SelectItem>
                        <SelectItem value="Butterfly">Butterfly</SelectItem>
                        <SelectItem value="IM">IM</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editData.distance}
                      onChange={(e) => updateEditData("distance", parseInt(e.target.value))}
                      className="h-8 text-sm"
                      data-testid="input-distance"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editData.poolLength}
                      onValueChange={(value) => updateEditData("poolLength", value)}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid="select-pool">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCM">SCM</SelectItem>
                        <SelectItem value="SCY">SCY</SelectItem>
                        <SelectItem value="LCM">LCM</SelectItem>
                        <SelectItem value="LCY">LCY</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editData.time}
                      onChange={(e) => updateEditData("time", e.target.value)}
                      className="h-8 text-sm font-mono"
                      placeholder="MM:SS.ss"
                      data-testid="input-time"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editData.splits || ""}
                      onChange={(e) => updateEditData("splits", e.target.value)}
                      className="h-8 text-sm font-mono"
                      placeholder="Optional"
                      data-testid="input-splits"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={saveEdit}
                        data-testid="button-save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEdit}
                        data-testid="button-cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
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
                        onClick={() => startEdit(time)}
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
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
