import { PBCard } from "../PBCard";

export default function PBCardExample() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <PBCard
        stroke="Freestyle"
        distance={50}
        poolLength="SCM"
        time="24.12"
        event="Winter Championships 2025"
        date="2025-01-15"
        isNew={true}
      />
      <PBCard
        stroke="Butterfly"
        distance={100}
        poolLength="LCM"
        time="56.78"
        event="State Meet 2024"
        date="2024-12-10"
      />
    </div>
  );
}
