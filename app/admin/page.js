"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { scenarioDb } from "@/lib/scenarios";
import { hasSupabaseConfig, loadScenarioDb, saveScenarioDb } from "@/lib/supabaseStore";

const RouteMap = dynamic(() => import("@/app/components/RouteMap"), { ssr: false });

const blankScenario = {
  id: "",
  origin: "",
  destination: "",
  origin_coords: { lat: 13.7563, lng: 100.5018 },
  destination_coords: { lat: 13.7563, lng: 100.5018 },
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
  distance_km: 0,
  transfers: 0,
  detail: "",
  reliability: "กลาง",
  first_miles: [],
  last_miles: [],
  gpx: ""
};

const blankMile = {
  id: "",
  mode: "",
  mode_en: "",
  icon: "🚶",
  time_min: 0,
  cost_thb: 0,
  distance_m: 0,
  reliability: "กลาง",
  detail: "",
  gpx: ""
};

export default function AdminPage() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [saveState, setSaveState] = useState("");
  const selected = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedId) || scenarios[0],
    [scenarios, selectedId]
  );

  useEffect(() => {
    loadScenarioDb()
      .then((saved) => {
        const next = saved.length ? saved : scenarioDb;
        setScenarios(next);
        setSelectedId(next[0]?.id || "");
      })
      .catch((error) => {
        setSaveState(`Load failed: ${error.message}`);
        setScenarios(scenarioDb);
        setSelectedId(scenarioDb[0]?.id || "");
      });
  }, []);

  function persist(next) {
    setScenarios(next);
    setSaveState("Saving...");
    saveScenarioDb(next)
      .then((result) => setSaveState(`Saved to ${result.source}`))
      .catch((error) => setSaveState(`Save failed: ${error.message}`));
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
          <p>Scenario data is saved to Supabase when configured. Without Supabase env vars, this page falls back to localStorage.</p>
          <p className="admin-status">{hasSupabaseConfig ? "Supabase connected" : "Supabase not configured"}{saveState ? ` - ${saveState}` : ""}</p>
        </div>
        <div className="admin-actions">
          <a className="secondary-link" href="/">Back to study</a>
          <form action="/api/admin-logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
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
          </div>

          <div className="admin-card">
            <h2>Route map preview</h2>
            <RouteMap scenario={selected} mode="admin" selection={{}} height={320} />
          </div>

          <RouteCollection
            title="Main routes"
            items={selected.main_routes}
            fields={["id", "mode", "icon", "time_min", "cost_thb", "distance_km", "transfers", "detail", "reliability", "first_miles", "last_miles", "gpx"]}
            relationOptions={{
              first_miles: selected.first_mile,
              last_miles: selected.last_mile
            }}
            onAdd={() => updateSelected({ main_routes: [...selected.main_routes, { ...blankMainRoute, id: `main-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("main_routes", index, patch)}
            onDelete={(index) => updateSelected({ main_routes: selected.main_routes.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <RouteCollection
            title="First mile options"
            items={selected.first_mile}
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "distance_m", "reliability", "detail", "gpx"]}
            onAdd={() => updateSelected({ first_mile: [...selected.first_mile, { ...blankMile, id: `fm-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("first_mile", index, patch)}
            onDelete={(index) => updateSelected({ first_mile: selected.first_mile.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <RouteCollection
            title="Last mile options"
            items={selected.last_mile}
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "distance_m", "reliability", "detail", "gpx"]}
            onAdd={() => updateSelected({ last_mile: [...selected.last_mile, { ...blankMile, id: `lm-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("last_mile", index, patch)}
            onDelete={(index) => updateSelected({ last_mile: selected.last_mile.filter((_, itemIndex) => itemIndex !== index) })}
          />
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
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  function commit() {
    if (draft !== (value ?? "")) onChange(draft);
  }

  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function RelationPicker({ label, value, options, onChange }) {
  const selected = new Set(value);

  function toggle(id) {
    if (selected.has(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <fieldset className="admin-field relation-picker">
      <legend>{label}</legend>
      {options.length ? (
        <div>
          {options.map((option) => (
            <label key={option.id} className={selected.has(option.id) ? "selected" : ""}>
              <input
                type="checkbox"
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span>{option.icon} {option.mode || option.id}</span>
              <small>{option.id}</small>
            </label>
          ))}
        </div>
      ) : (
        <p>Add options first, then select them here.</p>
      )}
    </fieldset>
  );
}

function RouteCollection({ title, items, fields, relationOptions = {}, onAdd, onChange, onDelete }) {
  return (
    <div className="admin-card">
      <div className="collection-head">
        <h2>{title}</h2>
        <button onClick={onAdd}>Add</button>
      </div>
      {items.map((item, index) => (
        <details key={`${title}-${index}`} className="route-editor" open={index === 0}>
          <summary>{item.icon} {item.mode || item.id}</summary>
          <div className="route-fields">
            {fields.map((field) => (
              relationOptions[field] ? (
                <RelationPicker
                  key={field}
                  label={field}
                  value={Array.isArray(item[field]) ? item[field] : []}
                  options={relationOptions[field]}
                  onChange={(value) => onChange(index, { [field]: value })}
                />
              ) : (
                field === "gpx" ? (
                  <GpxUpload
                    key={field}
                    route={item}
                    onChange={(patch) => onChange(index, patch)}
                  />
                ) : (
                  <Field
                    key={field}
                    label={field}
                    value={Array.isArray(item[field]) ? item[field].join(",") : item[field]}
                    onChange={(value) => {
                      const numeric = ["time_min", "cost_thb", "distance_m", "distance_km", "transfers"].includes(field);
                      onChange(index, { [field]: numeric ? Number(value) : value });
                    }}
                  />
                )
              )
            ))}
          </div>
          <button className="danger-button" onClick={() => onDelete(index)}>Delete route</button>
        </details>
      ))}
    </div>
  );
}

function GpxUpload({ route, onChange }) {
  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    onChange({
      gpx: file.name,
      gpx_filename: file.name,
      gpx_text: text
    });
  }

  return (
    <label className="admin-field gpx-upload">
      <span>GPX file</span>
      <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={handleFile} />
      {route.gpx_filename || route.gpx ? <small>{route.gpx_filename || route.gpx}</small> : <small>No GPX uploaded</small>}
    </label>
  );
}
