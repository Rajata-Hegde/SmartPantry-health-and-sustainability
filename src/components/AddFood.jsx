import { useState } from "react";

export default function AddFood({ elderId, onAdded }) {
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);

  async function addFood() {
    if (!food.trim()) {
      alert("Please enter a food name");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:4000/api/elders/${elderId}/food`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ foodName: food })
        }
      );

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to add food");
        return;
      }

      setFood("");
      onAdded(); // reload table

    } catch (err) {
      console.error("Add food error:", err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <input
        className="input"
        placeholder="Enter food (Apple)"
        value={food}
        onChange={(e) => setFood(e.target.value)}
      />

      <button
        className="btn primary"
        onClick={addFood}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add food"}
      </button>
    </div>
  );
}
