import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AddFood from "../components/AddFood";
import FoodTable from "../components/FoodTable";

export default function ElderDetails() {
  const { elderId } = useParams();

  // ✅ CONVERT TO NUMBER (THIS IS THE FIX)
  const numericElderId = Number(elderId);

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ❌ Invalid elderId safety check
  if (Number.isNaN(numericElderId)) {
    return (
      <main className="container">
        <p className="error">Invalid elder selected</p>
      </main>
    );
  }

  async function loadFoods() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:4000/api/elders/${numericElderId}/food`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch foods");
      }

      const data = await res.json();
      setFoods(data);
    } catch (err) {
      console.error("Load foods error:", err);
      setError("Could not load food data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFoods();
  }, [numericElderId]);

  return (
    <main className="container">
      <h2>Elder Food Intake</h2>

      {/* ✅ FOOD SAFETY BUTTON */}
      <Link to={`/elders/${numericElderId}/food-safety`}>
        <button className="btn" style={{ marginBottom: "16px" }}>
          View Food Safety Analysis
        </button>
      </Link>

      {/* ✅ ADD FOOD */}
      <AddFood elderId={numericElderId} onAdded={loadFoods} />

      {/* STATUS */}
      {loading && <p className="muted">Loading foods...</p>}
      {error && <p className="error">{error}</p>}

      {/* FOOD TABLE */}
      {!loading && !error && <FoodTable foods={foods} />}
    </main>
  );
}
