import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadElders, addElder, updateElder, deleteElder } from "../elders";
import { UserIcon } from "../components/Icons";

/* ===============================
   DEFAULT CONDITIONS & MEDS
================================ */
const defaultConditions = ["Diabetes", "Hypertension", "Cardiac", "Kidney"];
const defaultMeds = ["Metformin", "Insulin", "Warfarin", "Statins"];

/* ===============================
   PROFILE CARD (FIXED)
================================ */
function ProfileCard({ elder, onView, onEdit, onDelete }) {
  return (
    <article className="card feature-card">
      <div className="feature-top">
        <div className="icon-wrap">
          <UserIcon />
        </div>

        <div>
          <h3 style={{ margin: 0 }}>{elder.name}</h3>
          <div className="muted small">
            Age {elder.age ?? "—"} • {elder.gender} • {elder.diet}
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn" onClick={onView}>
          View
        </button>

        <button className="btn" onClick={() => onEdit(elder)}>
          Edit
        </button>

        <button
          className="btn danger"
          onClick={() => {
            if (!window.confirm("Delete this elder profile?")) return;
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
  const navigate = useNavigate();

  const [elders, setElders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    age: "",
    height: "",
    weight: "",
    gender: "Other",
    diet: "Non-veg",
    conditions: [],
    allergies: "",
    meds: [],
  });

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const list = await loadElders();

    const normalized = (list || []).map((e) => ({
      id: e.id,
      name: e.name,
      age: e.age ?? "",
      height: e.height ?? "",
      weight: e.weight ?? "",
      gender: e.gender || "Other",
      diet: e.diet || "Non-veg",
      conditions: e.conditions || [],
      allergies: e.allergies || "",
      meds: e.meds || [],
    }));

    setElders(normalized);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      age: form.age ? Number(form.age) : null,
      height: form.height ? Number(form.height) : null,
      weight: form.weight ? Number(form.weight) : null,
      gender: form.gender,
      diet: form.diet,
      conditions: form.conditions,
      allergies: form.allergies,
      meds: form.meds,
    };

    if (editing) {
      await updateElder(editing.id, payload);
    } else {
      await addElder(payload);
    }

    setShowForm(false);
    setEditing(null);
    refresh();
  }

  function handleEdit(elder) {
    setEditing(elder);
    setForm({ ...elder });
    setShowForm(true);
  }

  return (
    <main className="container">
      <div className="stack">
        <div className="card wide">
          <h2>Elder Profiles</h2>
          <p className="muted">
            Manage elder health details for safe food and nutrition
            recommendations.
          </p>

          <button
            className="btn primary"
            onClick={() => {
              setEditing(null);
              setForm({
                name: "",
                age: "",
                height: "",
                weight: "",
                gender: "Other",
                diet: "Non-veg",
                conditions: [],
                allergies: "",
                meds: [],
              });
              setShowForm(true);
            }}
          >
            Add Elder
          </button>

          {showForm && (
            <div className="card" style={{ marginTop: 12 }}>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <label>
                  Name
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </label>

                <label>
                  Age
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) =>
                      setForm({ ...form, age: e.target.value })
                    }
                  />
                </label>

                <label>
                  Height (cm)
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) =>
                      setForm({ ...form, height: e.target.value })
                    }
                  />
                </label>

                <label>
                  Weight (kg)
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                  />
                </label>

                <label>
                  Gender
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, diet: e.target.value })
                    }
                  >
                    <option>Non-veg</option>
                    <option>Veg</option>
                  </select>
                </label>

                <div>
                  <div className="muted">Conditions</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {defaultConditions.map((c) => (
                      <label key={c}>
                        <input
                          type="checkbox"
                          checked={form.conditions.includes(c)}
                          onChange={() => {
                            const next = form.conditions.includes(c)
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
                    onChange={(e) =>
                      setForm({ ...form, allergies: e.target.value })
                    }
                  />
                </label>

                <div>
                  <div className="muted">Medicines</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {defaultMeds.map((m) => (
                      <label key={m}>
                        <input
                          type="checkbox"
                          checked={form.meds.includes(m)}
                          onChange={() => {
                            const next = form.meds.includes(m)
                              ? form.meds.filter((x) => x !== m)
                              : [...form.meds, m];
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
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
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
                onView={() => navigate(`/elders/${e.id}`)}
                onEdit={handleEdit}
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
