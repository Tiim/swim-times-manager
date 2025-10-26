import { TimeEntryTable } from "../TimeEntryTable";

export default function TimeEntryTableExample() {
  const sampleTimes = [
    {
      id: "1",
      date: "2025-01-15",
      athlete: "Sarah Johnson",
      event: "Winter Championships 2025",
      stroke: "Freestyle",
      distance: 50,
      poolLength: "SCM",
      time: "24.12",
      splits: "11.89, 12.23",
    },
    {
      id: "2",
      date: "2025-01-20",
      athlete: "Michael Chen",
      event: "Practice",
      stroke: "Butterfly",
      distance: 50,
      poolLength: "SCM",
      time: "26.78",
    },
  ];

  return (
    <div className="p-4">
      <TimeEntryTable
        times={sampleTimes}
        onDelete={(id) => console.log("Delete:", id)}
      />
    </div>
  );
}
