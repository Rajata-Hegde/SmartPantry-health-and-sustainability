import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loadElders, addElder, updateElder, deleteElder } from "../elders";
import { UserIcon } from "../components/Icons";

/* ===============================
   DEFAULT CONDITIONS
================================ */
const defaultConditions = [
  "Diabetes",
  "Hypertension",
  "Cardiovascular",
  "COPD",
  "Arthritis",
];

/* ===============================
   PROFILE CARD
================================ */
function ProfileCard({ elder, onOpen, onDelete }) {
  return (
    <article
      className="card feature-card"
      onClick={onOpen}
      style={{ cursor: "pointer" }}
    >
      <div className="feature-top">
        <div className="icon-wrap">
          <UserIcon />
        </div>

        <div>
          <h3 style={{ margin: 0 }}>{elder.name}</h3>
          <div className="muted small">
            Age {elder.age ?? "—"} • {elder.gender} • {elder.diet || "Non-veg"}
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          View
        </button>

        <button
          className="btn"
          style={{ marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(elder.id);
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

/* ===============================
   MAIN PAGE
================================ */
export default function Profiles() {
  const [elders, setElders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const list = await loadElders();

    // ✅ NORMALIZE DB RESPONSE
    const normalized = (list || []).map((e) => {
      const notes = e.notes || {};
      return {
        id: e.id,
        name: e.name,
        gender: e.gender,
        age: notes.age,
        conditions: notes.conditions || [],
        allergies: notes.allergies || "",
        meds: notes.medicines || [],
        diet: notes.diet || "Non-veg",
      };
    });

    setElders(normalized);
  }

  async function handleSave(payload) {
    const finalPayload = {
      name: payload.name,
      gender: payload.gender,
      notes: {
        age: payload.age,
        conditions: payload.conditions,
        allergies: payload.allergies,
        medicines: payload.meds,
        diet: payload.diet,
      },
    };

    if (editing) await updateElder(editing.id, finalPayload);
    else await addElder(finalPayload);

    setShowForm(false);
    refresh();
  }

  return (
    <main className="container">
      <div className="stack">
        <div className="card wide">
          <h2>Elder Profiles</h2>
          <p className="muted">
            Store elder medical conditions, allergies, and medicines for safe
            nutrition and health recommendations.
          </p>
          <button
            className="btn primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add elder
          </button>
        </div>

        {elders.length === 0 ? (
          <p className="muted">No elder profiles yet</p>
        ) : (
          <section className="feature-grid">
            {elders.map((e) => (
              <ProfileCard
                key={e.id}
                elder={e}
                onOpen={() => navigate(`/elders/${e.id}`)} // ✅ ID-based routing
                onDelete={async (id) => {
                  await deleteElder(id);
                  refresh();
                }}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
