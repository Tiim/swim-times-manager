import AthleteProfile from "../../pages/AthleteProfile";
import { Router, Route } from "wouter";

export default function AthleteProfileExample() {
  return (
    <Router>
      <Route path="/athlete/:id">
        <div className="p-6">
          <AthleteProfile />
        </div>
      </Route>
    </Router>
  );
}
