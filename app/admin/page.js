"use client";

import { useEffect, useMemo, useState } from "react";
import { scenarioDb } from "@/lib/scenarios";
import { hasSupabaseConfig, loadScenarioDb, saveScenarioDb } from "@/lib/supabaseStore";

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
  walk_m: 0,
  reliability: "กลาง",
  transfers: 0,
  detail: "",
  gpx: ""
};

export default function AdminPage() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [jsonText, setJsonText] = useState("");
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
        setJsonText(JSON.stringify(next, null, 2));
      })
      .catch((error) => {
        setSaveState(`Load failed: ${error.message}`);
        setScenarios(scenarioDb);
        setSelectedId(scenarioDb[0]?.id || "");
        setJsonText(JSON.stringify(scenarioDb, null, 2));
      });
  }, []);

  function persist(next) {
    setScenarios(next);
    setJsonText(JSON.stringify(next, null, 2));
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
          <p>Scenario data is saved to Supabase when configured. Without Supabase env vars, this page falls back to localStorage.</p>
          <p className="admin-status">{hasSupabaseConfig ? "Supabase connected" : "Supabase not configured"}{saveState ? ` - ${saveState}` : ""}</p>
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
          </div>

          <div className="admin-card">
            <h2>Route map preview</h2>
            <AdminRouteMap scenario={selected} />
          </div>

          <RouteCollection
            title="Main routes"
            items={selected.main_routes}
            fields={["id", "mode", "icon", "time_min", "cost_thb", "detail", "reliability", "first_miles", "last_miles", "gpx"]}
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
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "walk_m", "reliability", "transfers", "detail", "gpx"]}
            onAdd={() => updateSelected({ first_mile: [...selected.first_mile, { ...blankMile, id: `fm-${Date.now()}` }] })}
            onChange={(index, patch) => updateListField("first_mile", index, patch)}
            onDelete={(index) => updateSelected({ first_mile: selected.first_mile.filter((_, itemIndex) => itemIndex !== index) })}
          />

          <RouteCollection
            title="Last mile options"
            items={selected.last_mile}
            fields={["id", "mode", "mode_en", "icon", "time_min", "cost_thb", "walk_m", "reliability", "transfers", "detail", "gpx"]}
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
                <Field
                  key={field}
                  label={field}
                  value={Array.isArray(item[field]) ? item[field].join(",") : item[field]}
                  onChange={(value) => {
                    const numeric = ["time_min", "cost_thb", "walk_m", "transfers"].includes(field);
                    onChange(index, { [field]: numeric ? Number(value) : value });
                  }}
                />
              )
            ))}
          </div>
          <button className="danger-button" onClick={() => onDelete(index)}>Delete route</button>
        </details>
      ))}
    </div>
  );
}

function AdminRouteMap({ scenario }) {
  const mainRoutes = scenario.main_routes || [];
  const firstMiles = scenario.first_mile || [];
  const lastMiles = scenario.last_mile || [];

  return (
    <div className="shared-map admin-map">
      <svg viewBox="0 0 900 420" role="img" aria-label="Admin route overlay preview">
        <defs>
          <pattern id={`admin-grid-${scenario.id}`} width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#dce5e5" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="900" height="420" fill={`url(#admin-grid-${scenario.id})`} />
        <path className="map-road wide" d="M10 340 C160 300 210 90 360 150 S570 325 890 120" />
        <path className="map-road" d="M20 110 C230 175 250 355 455 290 S650 110 880 205" />
        <path className="map-road" d="M80 395 C205 245 310 185 450 210 S655 255 840 65" />

        {mainRoutes.map((route, index) => {
          const shape = adminRouteShape(index);
          return (
            <g key={route.id || index}>
              <path className="main-map-route active admin-main" d={adminMainPath(shape)} />
              {(route.first_miles || []).map((id, fmIndex) => (
                <path key={`${route.id}-fm-${id}`} className="fm-map-route active admin-mile" d={adminMilePath("fm", shape, fmIndex)} />
              ))}
              {(route.last_miles || []).map((id, lmIndex) => (
                <path key={`${route.id}-lm-${id}`} className="lm-map-route active admin-mile" d={adminMilePath("lm", shape, lmIndex)} />
              ))}
              <text className="route-map-label" x={shape.label[0]} y={shape.label[1]}>
                {route.mode || route.id || `Route ${index + 1}`}
              </text>
            </g>
          );
        })}

        <circle className="map-marker origin" cx="96" cy="344" r="16" />
        <text className="map-marker-text" x="96" y="350">A</text>
        <circle className="map-marker destination" cx="800" cy="76" r="16" />
        <text className="map-marker-text" x="800" y="82">B</text>
        <text className="map-place origin-label" x="126" y="350">{scenario.origin}</text>
        <text className="map-place destination-label" x="616" y="82">{scenario.destination}</text>
      </svg>
      <div className="map-legend">
        <span><i className="fm" />First mile links ({firstMiles.length})</span>
        <span><i className="main" />Main routes ({mainRoutes.length})</span>
        <span><i className="lm" />Last mile links ({lastMiles.length})</span>
      </div>
    </div>
  );
}

function adminRouteShape(index) {
  const offsets = [-46, 0, 48, 86, -88];
  const offset = offsets[index % offsets.length];
  return {
    origin: [96, 344],
    fmEnd: [245, 278 + offset * 0.35],
    mid1: [370, 180 + offset],
    mid2: [555, 210 - offset * 0.65],
    lmStart: [685, 122 + offset * 0.28],
    dest: [800, 76],
    label: [330 + index * 36, 244 + offset * 0.42]
  };
}

function adminMainPath(shape) {
  return `M${shape.fmEnd[0]} ${shape.fmEnd[1]} C${shape.mid1[0]} ${shape.mid1[1]}, ${shape.mid2[0]} ${shape.mid2[1]}, ${shape.lmStart[0]} ${shape.lmStart[1]}`;
}

function adminMilePath(type, shape, index) {
  const spread = (index - 1) * 18;
  if (type === "fm") {
    return `M${shape.origin[0]} ${shape.origin[1]} C${150 + spread} ${330 - spread}, ${205 + spread} ${300 + spread}, ${shape.fmEnd[0]} ${shape.fmEnd[1]}`;
  }
  return `M${shape.lmStart[0]} ${shape.lmStart[1]} C${720 + spread} ${112 + spread}, ${760 - spread} ${86 - spread}, ${shape.dest[0]} ${shape.dest[1]}`;
}
