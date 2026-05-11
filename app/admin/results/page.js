"use client";

import { useEffect, useMemo, useState } from "react";
import { scenarioDb, preferenceFactors } from "@/lib/scenarios";
import { hasSupabaseConfig, loadStudySubmissions } from "@/lib/supabaseStore";

const ratingMetrics = [
  ["preference_fit_ratio", "Preference-fit ratio"],
  ["clarity", "Clarity"],
  ["decision_ease", "Decision ease"],
  ["fmlm_understanding", "FMLM understanding"],
  ["preference_fit", "Subjective preference fit"]
];

const comparativeQuestions = [
  ["overall_decision_support", "Decision support"],
  ["overall_preference_alignment", "Preference alignment"],
  ["overall_clarity", "Travel-option clarity"],
  ["overall_intention_to_use", "Intention to use"]
];

const comparativeLabels = [
  "Baseline much better",
  "Baseline slightly better",
  "Equal",
  "Prototype slightly better",
  "Prototype much better"
];

const usefulnessLabels = [
  "Not useful",
  "Slightly useful",
  "Moderate",
  "Useful",
  "Very useful"
];

const barColors = ["#9aa4b2", "#c9d1dc", "#f2c66d", "#8fc5ff", "#1769aa"];

export default function ResultsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudySubmissions()
      .then((rows) => {
        setSubmissions(rows);
        setState("ready");
      })
      .catch((err) => {
        setError(err.message);
        setState("error");
      });
  }, []);

  const analysis = useMemo(() => analyzeSubmissions(submissions), [submissions]);

  return (
    <main className="admin-page results-page">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Bangkok FMLM</p>
          <h1>Results dashboard</h1>
          <p>Baseline vs prototype evaluation from completed Supabase submissions.</p>
          <p className="admin-status">{hasSupabaseConfig ? "Supabase connected" : "Supabase not configured"}</p>
        </div>
        <div className="admin-actions">
          <a className="secondary-link" href="/admin">Scenario admin</a>
          <a className="secondary-link" href="/">Back to study</a>
          <form action="/api/admin-logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </header>

      {state === "loading" && <section className="admin-card">Loading submissions...</section>}
      {state === "error" && <section className="admin-card error">Could not load results: {error}</section>}
      {state === "ready" && (
        <div className="results-stack">
          <section className="result-kpis">
            <Kpi label="Completed submissions" value={analysis.completedCount} />
            <Kpi label="Scenario records" value={analysis.recordCount} />
            <Kpi label="Baseline avg fit" value={formatNumber(analysis.overall.baseline.preference_fit_ratio)} />
            <Kpi label="Prototype avg fit" value={formatNumber(analysis.overall.prototype.preference_fit_ratio)} />
            <Kpi label="Prototype - baseline" value={signed(analysis.overall.delta.preference_fit_ratio)} />
          </section>

          <section className="results-grid">
            <ChartCard title="Figure 1. Paired preference-fit ratio" targetId="figure-paired">
              <PairedPlot id="figure-paired" pairs={analysis.participantPairs} />
            </ChartCard>
            <ChartCard title="Figure 2. Post-interface ratings" targetId="figure-ratings">
              <MetricBars id="figure-ratings" rows={analysis.outcomeRows} />
            </ChartCard>
          </section>

          <section className="results-grid">
            <ChartCard title="Figure 3. Final comparative questions" targetId="figure-comparative">
              <StackedLikert id="figure-comparative" rows={analysis.comparativeRows} labels={comparativeLabels} />
            </ChartCard>
            <ChartCard title="Figure 4. FMLM usefulness" targetId="figure-usefulness">
              <DistributionBars id="figure-usefulness" counts={analysis.fmlmUsefulnessCounts} labels={usefulnessLabels} title="Usefulness of FMLM information" />
            </ChartCard>
          </section>

          <ChartCard title="Figure 5. Preference-fit improvement by top-ranked preference" targetId="figure-subgroups">
            <SubgroupBars id="figure-subgroups" rows={analysis.subgroupRows} />
          </ChartCard>

          <section className="results-grid">
            <ResultTable title="Table 1. Participant background" filename="participant-background.csv" headers={["Measure", "Group", "n"]} rows={analysis.backgroundRows} />
            <ResultTable title="Table 2. Scenario coverage" filename="scenario-coverage.csv" headers={["Scenario", "Participants", "Baseline records", "Prototype records"]} rows={analysis.coverageRows} />
          </section>

          <ResultTable
            title="Table 3. Main outcome summary"
            filename="baseline-vs-prototype-outcomes.csv"
            headers={["Outcome", "Baseline mean", "Prototype mean", "Difference", "Baseline median", "Prototype median"]}
            rows={analysis.outcomeRows.map((row) => [
              row.label,
              formatNumber(row.baselineMean),
              formatNumber(row.prototypeMean),
              signed(row.delta),
              formatNumber(row.baselineMedian),
              formatNumber(row.prototypeMedian)
            ])}
          />
        </div>
      )}
    </main>
  );
}

function analyzeSubmissions(rawSubmissions) {
  const completed = rawSubmissions.filter((submission) => (submission.scenarios || []).length >= 10);
  const records = completed.flatMap((submission) =>
    (submission.scenarios || []).map((record) => ({
      ...record,
      participant_id: submission.participant_id,
      preference_ranking: submission.preference_ranking || []
    }))
  );

  const participantPairs = completed.map((submission) => {
    const baseline = mean(recordsFor(submission, "baseline").map((record) => Number(record.preference_fit_ratio || 0)));
    const prototype = mean(recordsFor(submission, "prototype").map((record) => Number(record.preference_fit_ratio || 0)));
    return { participant_id: submission.participant_id, baseline, prototype, delta: prototype - baseline };
  });

  const outcomeRows = ratingMetrics.map(([field, label]) => {
    const baseline = records.filter((record) => record.interface_type === "baseline").map((record) => Number(record[field] || 0));
    const prototype = records.filter((record) => record.interface_type === "prototype").map((record) => Number(record[field] || 0));
    return {
      field,
      label,
      baselineMean: mean(baseline),
      prototypeMean: mean(prototype),
      delta: mean(prototype) - mean(baseline),
      baselineMedian: median(baseline),
      prototypeMedian: median(prototype)
    };
  });

  const backgroundRows = [
    ...countRows(completed.map((row) => row.background?.freq), "Travel frequency"),
    ...countRows(completed.map((row) => row.background?.appUsage), "Navigation app usage"),
    ...countRows(completed.map((row) => String(row.background?.multiLegFamiliarity || "")), "Multimodal familiarity"),
    ...countRows(completed.map((row) => topPreferenceLabel(row.preference_ranking?.[0])), "Top preference")
  ];

  const coverageRows = scenarioDb.map((scenario) => {
    const scenarioRecords = records.filter((record) => record.scenario_id === scenario.id);
    const participants = new Set(scenarioRecords.map((record) => record.participant_id));
    return [
      `${scenario.origin} -> ${scenario.destination}`,
      participants.size,
      scenarioRecords.filter((record) => record.interface_type === "baseline").length,
      scenarioRecords.filter((record) => record.interface_type === "prototype").length
    ];
  });

  const comparativeRows = comparativeQuestions.map(([field, label]) => ({
    label,
    counts: countScale(completed.map((submission) => comparativeValue(submission.satisfaction, field)))
  }));

  const fmlmUsefulnessCounts = countScale(completed.map((submission) => Number(submission.satisfaction?.fmlm_usefulness || 0)));

  const subgroupRows = preferenceFactors.map((factor) => {
    const pairs = participantPairs.filter((pair) => {
      const submission = completed.find((item) => item.participant_id === pair.participant_id);
      return submission?.preference_ranking?.[0] === factor.id;
    });
    return {
      label: topPreferenceLabel(factor.id),
      n: pairs.length,
      delta: mean(pairs.map((pair) => pair.delta))
    };
  });

  return {
    completedCount: completed.length,
    recordCount: records.length,
    participantPairs,
    outcomeRows,
    backgroundRows,
    coverageRows,
    comparativeRows,
    fmlmUsefulnessCounts,
    subgroupRows,
    overall: {
      baseline: Object.fromEntries(outcomeRows.map((row) => [row.field, row.baselineMean])),
      prototype: Object.fromEntries(outcomeRows.map((row) => [row.field, row.prototypeMean])),
      delta: Object.fromEntries(outcomeRows.map((row) => [row.field, row.delta]))
    }
  };
}

function recordsFor(submission, interfaceType) {
  return (submission.scenarios || []).filter((record) => record.interface_type === interfaceType);
}

function comparativeValue(satisfaction, field) {
  const decoded = Number(satisfaction?.[`${field}_baseline_vs_prototype`] || 0);
  if (decoded) return decoded;
  return Number(satisfaction?.[field] || 0);
}

function countScale(values) {
  const counts = [0, 0, 0, 0, 0];
  values.forEach((value) => {
    const index = Number(value) - 1;
    if (index >= 0 && index < 5) counts[index] += 1;
  });
  return counts;
}

function countRows(values, measure) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([group, count]) => [measure, group, count]);
}

function topPreferenceLabel(id) {
  return preferenceFactors.find((factor) => factor.id === id)?.id || id || "Unknown";
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(3);
}

function signed(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(3)}`;
}

function Kpi({ label, value }) {
  return (
    <div className="admin-card result-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChartCard({ title, targetId, children }) {
  return (
    <section className="admin-card chart-card">
      <div className="result-card-head">
        <h2>{title}</h2>
        <button onClick={() => downloadSvg(targetId, `${targetId}.svg`)}>Export SVG</button>
      </div>
      {children}
    </section>
  );
}

function PairedPlot({ id, pairs }) {
  const width = 620;
  const height = 300;
  const y = (value) => 260 - Number(value || 0) * 220;
  return (
    <svg id={id} className="result-chart" viewBox={`0 0 ${width} ${height}`} role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="#ffffff" />
      <text x="70" y="24">Baseline</text>
      <text x="500" y="24">Prototype</text>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1="80" x2="540" y1={y(tick)} y2={y(tick)} className="chart-grid" />
          <text x="22" y={y(tick) + 4}>{tick.toFixed(2)}</text>
        </g>
      ))}
      {pairs.map((pair, index) => (
        <g key={pair.participant_id || index}>
          <line x1="120" x2="500" y1={y(pair.baseline)} y2={y(pair.prototype)} className={pair.delta >= 0 ? "paired-line positive" : "paired-line negative"} />
          <circle cx="120" cy={y(pair.baseline)} r="3" />
          <circle cx="500" cy={y(pair.prototype)} r="3" />
        </g>
      ))}
    </svg>
  );
}

function MetricBars({ id, rows }) {
  const width = 720;
  const rowHeight = 64;
  const height = 60 + rows.length * rowHeight;
  const max = Math.max(5, ...rows.flatMap((row) => [row.baselineMean, row.prototypeMean]));
  return (
    <svg id={id} className="result-chart" viewBox={`0 0 ${width} ${height}`} role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="#ffffff" />
      <text x="220" y="24" className="chart-label">Baseline</text>
      <text x="330" y="24" className="chart-label">Prototype</text>
      {rows.map((row, index) => {
        const y = 50 + index * rowHeight;
        const baselineWidth = (row.baselineMean / max) * 360;
        const prototypeWidth = (row.prototypeMean / max) * 360;
        return (
          <g key={row.field}>
            <text x="18" y={y + 20}>{row.label}</text>
            <rect x="220" y={y} width={baselineWidth} height="18" rx="4" fill="#9aa4b2" />
            <rect x="220" y={y + 24} width={prototypeWidth} height="18" rx="4" fill="#1769aa" />
            <text x={230 + baselineWidth} y={y + 14}>{formatNumber(row.baselineMean)}</text>
            <text x={230 + prototypeWidth} y={y + 38}>{formatNumber(row.prototypeMean)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedLikert({ id, rows, labels }) {
  const width = 760;
  const rowHeight = 62;
  const height = 90 + rows.length * rowHeight;
  return (
    <svg id={id} className="result-chart" viewBox={`0 0 ${width} ${height}`} role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="#ffffff" />
      {labels.map((label, index) => (
        <g key={label}>
          <rect x={24 + index * 135} y="18" width="12" height="12" fill={barColors[index]} />
          <text x={42 + index * 135} y="29" className="chart-label">{label}</text>
        </g>
      ))}
      {rows.map((row, rowIndex) => (
        <StackedRow key={row.label} y={68 + rowIndex * rowHeight} label={row.label} counts={row.counts} />
      ))}
    </svg>
  );
}

function StackedRow({ y, label, counts }) {
  const total = counts.reduce((sum, value) => sum + value, 0) || 1;
  let x = 220;
  return (
    <g>
      <text x="18" y={y + 22}>{label}</text>
      {counts.map((count, index) => {
        const width = (count / total) * 500;
        const start = x;
        x += width;
        return <rect key={index} x={start} y={y} width={width} height="26" fill={barColors[index]} />;
      })}
      <text x="730" y={y + 18} textAnchor="end">n={total}</text>
    </g>
  );
}

function DistributionBars({ id, title, counts, labels }) {
  const width = 720;
  const height = 240;
  const max = Math.max(1, ...counts);
  return (
    <svg id={id} className="result-chart" viewBox={`0 0 ${width} ${height}`} role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="#ffffff" />
      <text x="24" y="28">{title}</text>
      {counts.map((count, index) => {
        const barHeight = (count / max) * 120;
        const x = 70 + index * 125;
        return (
          <g key={labels[index]}>
            <rect x={x} y={170 - barHeight} width="70" height={barHeight} rx="5" fill={barColors[index]} />
            <text x={x + 35} y={188} textAnchor="middle">{count}</text>
            <text x={x + 35} y={214} textAnchor="middle" className="chart-label">{labels[index]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SubgroupBars({ id, rows }) {
  const width = 760;
  const rowHeight = 54;
  const height = 56 + rows.length * rowHeight;
  const max = Math.max(0.01, ...rows.map((row) => Math.abs(row.delta)));
  return (
    <svg id={id} className="result-chart" viewBox={`0 0 ${width} ${height}`} role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="#ffffff" />
      <line x1="380" x2="380" y1="30" y2={height - 20} stroke="#222" />
      {rows.map((row) => (
        <g key={row.label} transform={`translate(0 ${44 + rows.indexOf(row) * rowHeight})`}>
          <text x="18" y="18">{row.label} (n={row.n})</text>
          <rect
            x={row.delta >= 0 ? 380 : 380 - Math.abs(row.delta / max) * 300}
            y="2"
            width={Math.abs(row.delta / max) * 300}
            height="22"
            rx="5"
            fill={row.delta >= 0 ? "#1769aa" : "#b93131"}
          />
          <text x="708" y="18" textAnchor="end">{signed(row.delta)}</text>
        </g>
      ))}
    </svg>
  );
}

function ResultTable({ title, filename, headers, rows }) {
  return (
    <section className="admin-card result-table-card">
      <div className="result-card-head">
        <h2>{title}</h2>
        <button onClick={() => downloadCsv(filename, headers, rows)}>Export CSV</button>
      </div>
      <div className="table-scroll">
        <table className="result-table">
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            )) : (
              <tr><td colSpan={headers.length}>No completed submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function downloadSvg(elementId, filename) {
  const svg = document.getElementById(elementId);
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  downloadBlob(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), filename);
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
  );
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
