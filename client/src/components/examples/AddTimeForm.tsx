import { AddTimeForm } from "../AddTimeForm";

export default function AddTimeFormExample() {
  return (
    <div className="p-4 max-w-4xl">
      <AddTimeForm onSubmit={(data) => console.log("Form submitted:", data)} />
    </div>
  );
}
