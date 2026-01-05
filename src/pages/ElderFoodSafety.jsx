import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ElderFoodSafety() {
  const { elderId } = useParams();

  const [allowedFoods, setAllowedFoods] = useState([]);
  const [blockedFoods, setBlockedFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (elderId) fetchSafety();
  }, [elderId]);

  async function fetchSafety() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("hc_user_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const res = await fetch(
        `http://localhost:4000/api/food-safety/${elderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to fetch food safety data");
      }

      const data = await res.json();

      setAllowedFoods(Array.isArray(data.allowedFoods) ? data.allowedFoods : []);
      setBlockedFoods(Array.isArray(data.blockedFoods) ? data.blockedFoods : []);
    } catch (err) {
      console.error("❌ Food safety fetch error:", err);
      setError(err.message || "Unable to load food safety analysis");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading food safety analysis...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <main className="container stack">
      <h2>Food Safety Analysis</h2>

      {/* 🔴 BLOCKED FOODS */}
      <Section title="Blocked Foods" color="red">
        {blockedFoods.length === 0 ? (
          <p className="muted">No blocked foods 🎉</p>
        ) : (
          blockedFoods.map((f, i) => (
            <Card key={i} color="red">
              <strong>{f.food || f.food_name}</strong>
              <p className="small">{f.reason}</p>
            </Card>
          ))
        )}
      </Section>

      {/* 🟢 SAFE FOODS */}
      <Section title="Safe Foods" color="green">
        {allowedFoods.length === 0 ? (
          <p className="muted">No safe foods found</p>
        ) : (
          allowedFoods.map((f, i) => {
            const warnings = Array.isArray(f.warnings) ? f.warnings : [];

            return (
              <Card
                key={i}
                color={warnings.length > 0 ? "yellow" : "green"}
              >
                <strong>{f.food_name || f.food}</strong>

                {warnings.length > 0 && (
                  <ul className="warning-list">
                    {warnings.map((w, idx) => (
                      <li key={idx}>⚠️ {w}</li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })
        )}
      </Section>
    </main>
  );
}

/* ======================
   UI HELPERS
====================== */

function Section({ title, color, children }) {
  return (
    <section>
      <h3 style={{ color }}>{title}</h3>
      <div className="grid">{children}</div>
    </section>
  );
}

function Card({ children, color }) {
  const bg = {
    red: "#ffe6e6",
    yellow: "#fff8d6",
    green: "#e6ffe6",
  }[color];

  const border = {
    red: "#ff4d4d",
    yellow: "#ffcc00",
    green: "#2ecc71",
  }[color];

  return (
    <div
      style={{
        background: bg,
        borderLeft: `6px solid ${border}`,
        padding: "12px",
        borderRadius: "8px",
      }}
    >
      {children}
    </div>
  );
}
