"use client";

import { useEffect, useMemo, useState } from "react";
import { scenarioDb } from "@/lib/scenarios";
import { storageGet, storageSet } from "@/lib/experiment";

const blankScenario = {
  id: "",
  origin: "",
  destination: "",
  origin_coords: { lat: 13.7563, lng: 100.5018 },
  destination_coords: { lat: 13.7563, lng: 100.5018 },
  map_embed: "",
  main_routes: [],
  first_mile: [],
  last_mile: []
};

const blankMainRoute = {
  id: "",
  mode: "",
  icon: "🚈",
  time_min: 0,
  cost_thb: 0,
  detail: "",
  reliability: "กลาง",
  first_miles: [],
  last_miles: []
};

const blankMile = {
  id: "",
  mode: "",
  mode_en: "",
  icon: "🚶",
  time_min: 0,
  cost_thb: 0,
  walk_m: 0,
  reliability: "กลาง",
  transfers: 0,
  detail: ""
};

export default function AdminPage() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const selected = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedId) || scenarios[0],
    [scenarios, selectedId]
  );

  useEffect(() => {
    const saved = storageGet("fmlm_admin_scenarios", scenarioDb);
    setScenarios(saved);
    setSelectedId(saved[0]?.id || "");
    setJsonText(JSON.stringify(saved, null, 2));
  }, []);

  function persist(next) {
    setScenarios(next);
    storageSet("fmlm_admin_scenarios", next);
    setJsonText(JSON.stringify(next, null, 2));
  }

  function updateSelected(patch) {
    persist(scenarios.map((scenario) => scenario.id === selected.id ? { ...scenario, ...patch } : scenario));
  }

  function updateListField(field, index, patch) {
    const nextItems = selected[field].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    updateSelected({ [field]: nextItems });
  }

  function addScenario() {
    const id = `scenario-${Date.now()}`;
    const next = [...scenarios, { ...blankScenario, id, origin: "ต้นทางใหม่", destination: "ปลายทางใหม่" }];
    persist(next);
    setSelectedId(id);
  }

  function deleteScenario() {
    if (!selected) return;
    const next = scenarios.filter((scenario) => scenario.id !== selected.id);
    persist(next);
    setSelectedId(next[0]?.id || "");
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Scenario DB must be an array");
      persist(parsed);
      setSelectedId(parsed[0]?.id || "");
    } catch (error) {
      alert(error.message);
    }
  }

  if (!selected) {
    return (
      <main className="admin-page">
        <h1>Scenario admin</h1>
        <button className="primary" onClick={addScenario}>Add scenario</button>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Bangkok FMLM</p>
          <h1>Scenario admin</h1>
          <p>เพิ่มสถานการณ์ เส้นทางหลัก และตัวเลือก First/Last Mile ได้จากหน้านี้ ข้อมูลเก็บใน localStorage ของ browser นี้</p>
        </div>
        <a className="secondary-link" href="/">Back to study</a>
      </header>

      <section className="admin-layout">
        <aside className="admin-sidebar">
          <button className="primary" onClick={addScenario}>Add scenario</button>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              className={selected.id === scenario.id ? "admin-scenario active" : "admin-scenario"}
              onClick={() => setSelectedId(scenario.id)}
            >
              <strong>{scenario.origin || scenario.id}</strong>
              <span>{scenario.destination}</span>
            </button>
          ))}
          <button className="danger-button" onClick={deleteScenario}>Delete selected</button>
        </aside>

        <section className="admin-editor">
          <div className="admin-card">
            <h2>Scenario</h2>
            <Field label="ID" value={selected.id} onChange={(id) => updateSelected({ id })} />
            <Field label="Origin Thai" value={selected.origin} onChange={(origin) => updateSelected({ origin })} />
            <Field label="Destination Thai" value={selected.destination} onChange={(destination) => updateSelected({ destination })} />
            <Field label="Origin lat,lng" value={`${selected.origin_coords?.lat || ""},${selected.origin_coords?.lng || ""}`} onChange={(value) => updateCoords("origin_coords", value, updateSelected)} />
            <Field label="Destination lat,lng" value={`${selected.destination_coords?.lat || ""},${selected.destination_coords?.lng || ""}`} onChange={(value) => updateCoords("destination_coords", value, updateSelected)} />
            <Field label="Google Maps iframe embed URL" value={selected.map_embed} onChange={(map_embed) => updateSelected({ map_embed })} />
          </div>

          <RouteCollection
            title="Main routes"
            items={selected.main_routes}
            fields={["id", "mode", "icon", "time_min", "cost_thb", "detail", "reliability", "first_miles", "last_miles"]}
            onAdd={() => updateSelected({ main_routes: [...selected.main_routes, { ...blankMainRoute, id: `main-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("main_routes", index, patch)}
            onDelete={(index) => updateSelected({ main_routes: selected.main_routes.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <RouteCollection
            title="First mile options"
            items={selected.first_mile}
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "walk_m", "reliability", "transfers", "detail"]}
            onAdd={() => updateSelected({ first_mile: [...selected.first_mile, { ...blankMile, id: `fm-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("first_mile", index, patch)}
            onDelete={(index) => updateSelected({ first_mile: selected.first_mile.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <RouteCollection
            title="Last mile options"
            items={selected.last_mile}
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "walk_m", "reliability", "transfers", "detail"]}
            onAdd={() => updateSelected({ last_mile: [...selected.last_mile, { ...blankMile, id: `lm-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("last_mile", index, patch)}
            onDelete={(index) => updateSelected({ last_mile: selected.last_mile.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <div className="admin-card">
            <h2>Import / export JSON</h2>
            <p>ใช้ช่องนี้สำหรับใส่ GPX-converted data หรือ route geometry เพิ่มเองในอนาคตได้ เช่นเพิ่ม field `route_points` ต่อ route โดย study UI จะยังไม่พัง</p>
            <textarea className="json-box" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
            <button className="primary" onClick={applyJson}>Apply JSON to local DB</button>
          </div>
        </section>
      </section>
    </main>
  );
}

function updateCoords(field, value, updateSelected) {
  const [lat, lng] = value.split(",").map((part) => Number(part.trim()));
  updateSelected({ [field]: { lat, lng } });
}

function Field({ label, value, onChange }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RouteCollection({ title, items, fields, onAdd, onChange, onDelete }) {
  return (
    <div className="admin-card">
      <div className="collection-head">
        <h2>{title}</h2>
        <button onClick={onAdd}>Add</button>
      </div>
      {items.map((item, index) => (
        <details key={`${item.id}-${index}`} className="route-editor" open={index === 0}>
          <summary>{item.icon} {item.mode || item.id}</summary>
          <div className="route-fields">
            {fields.map((field) => (
              <Field
                key={field}
                label={field}
                value={Array.isArray(item[field]) ? item[field].join(",") : item[field]}
                onChange={(value) => {
                  const numeric = ["time_min", "cost_thb", "walk_m", "transfers"].includes(field);
                  const list = ["first_miles", "last_miles"].includes(field);
                  onChange(index, { [field]: list ? value.split(",").map((x) => x.trim()).filter(Boolean) : numeric ? Number(value) : value });
                }}
              />
            ))}
          </div>
          <button className="danger-button" onClick={() => onDelete(index)}>Delete route</button>
        </details>
      ))}
    </div>
  );
}
