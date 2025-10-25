import Athletes from "../../pages/Athletes";
import { Router } from "wouter";

export default function AthletesExample() {
  return (
    <Router>
      <div className="p-6">
        <Athletes />
      </div>
    </Router>
  );
}
