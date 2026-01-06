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
  "Cardiac",
  "Kidney",
];

const defaultMeds = ["Metformin", "Insulin"];

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
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Other",
    diet: "Non-veg",
    conditions: [],
    allergies: "",
    meds: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const list = await loadElders();

    // NORMALIZE API response (server returns fields at top-level)
    const normalized = (list || []).map((e) => ({
      id: e.id,
      name: e.name,
      gender: e.gender,
      age: e.age ?? null,
      conditions: e.conditions || [],
      allergies: e.allergies || "",
      meds: e.meds || [],
      diet: e.diet || "Non-veg",
    }));

    setElders(normalized);
  }

  async function handleSave(payload) {
    // server expects flat fields (name, age, gender, conditions, meds, diet)
    const finalPayload = {
      name: payload.name,
      age: payload.age,
      gender: payload.gender,
      conditions: payload.conditions,
      allergies: payload.allergies,
      meds: payload.meds,
      diet: payload.diet,
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
              setForm({
                name: "",
                age: "",
                gender: "Other",
                diet: "Non-veg",
                conditions: [],
                allergies: "",
                meds: [],
              });
              setShowForm(true);
            }}
          >
            Add elder
          </button>
          {showForm && (
            <div className="card" style={{ marginTop: 12 }}>
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  // convert meds string to array
                  const payload = {
                    name: form.name,
                    age: form.age ? Number(form.age) : null,
                    gender: form.gender,
                    diet: form.diet,
                    conditions: form.conditions,
                    allergies: form.allergies,
                    meds: Array.isArray(form.meds) ? form.meds : [],
                  };

                  await handleSave(payload);
                }}
              >
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Age
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </label>

                <label>
                  Gender
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option>Other</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </label>

                <label>
                  Diet
                  <select
                    value={form.diet}
                    onChange={(e) => setForm({ ...form, diet: e.target.value })}
                  >
                    <option>Non-veg</option>
                    <option>Veg</option>
                  </select>
                </label>

                <div>
                  <div className="muted">Conditions</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {defaultConditions.map((c) => (
                      <label key={c} style={{ fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={form.conditions.includes(c)}
                          onChange={() => {
                            const has = form.conditions.includes(c);
                            const next = has
                              ? form.conditions.filter((x) => x !== c)
                              : [...form.conditions, c];
                            setForm({ ...form, conditions: next });
                          }}
                        />
                        <span style={{ marginLeft: 6 }}>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label>
                  Allergies
                  <input
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  />
                </label>

                <div>
                  <div className="muted">Medicines</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {defaultMeds.map((m) => (
                      <label key={m} style={{ fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={form.meds.includes(m)}
                          onChange={() => {
                            const has = form.meds.includes(m);
                            const next = has ? form.meds.filter(x => x !== m) : [...form.meds, m];
                            setForm({ ...form, meds: next });
                          }}
                        />
                        <span style={{ marginLeft: 6 }}>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn primary" type="submit">
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
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