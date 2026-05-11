export function makeParticipant(counter) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = String(counter).padStart(4, "0");
  return `FMLM-${stamp}-${suffix}`;
}

export function hashSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seedText) {
  const rand = seededRandom(hashSeed(seedText));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function conditionForCounter(counter) {
  return counter % 2 === 0 ? "baseline_first" : "prototype_first";
}

export function interfacesForCondition(conditionOrder) {
  return conditionOrder === "baseline_first"
    ? ["baseline", "prototype"]
    : ["prototype", "baseline"];
}

export function interfaceLabel(interfaceType, conditionOrder) {
  const order = interfacesForCondition(conditionOrder);
  return order.indexOf(interfaceType) === 0 ? "A" : "B";
}

export function findOption(scenario, collection, id) {
  return scenario[collection].find((item) => item.id === id);
}

export function findMainRoute(scenario, id) {
  return scenario.main_routes.find((route) => route.id === id);
}

export function computeTotals(scenario, selection) {
  const fm = findOption(scenario, "first_mile", selection.selected_fm);
  const main = findMainRoute(scenario, selection.selected_main);
  const lm = findOption(scenario, "last_mile", selection.selected_lm);
  const fmDistance = fm?.distance_m ?? fm?.walk_m ?? 0;
  const lmDistance = lm?.distance_m ?? lm?.walk_m ?? 0;

  return {
    total_time: (fm?.time_min || 0) + (main?.time_min || 0) + (lm?.time_min || 0),
    total_cost: (fm?.cost_thb || 0) + (main?.cost_thb || 0) + (lm?.cost_thb || 0),
    transfers: main?.transfers || 0,
    distance_m: fmDistance + lmDistance
  };
}

export function computePreferenceFit(scenario, selection, ranking = [], interfaceType = "prototype") {
  const candidates = routeCandidates(scenario, interfaceType);
  if (!candidates.length) return emptyPreferenceScore();

  const selected = candidates.find((candidate) => (
    candidate.selected_main === selection.selected_main &&
    candidate.selected_fm === selection.selected_fm &&
    candidate.selected_lm === selection.selected_lm
  )) || candidates.find((candidate) => candidate.selected_main === selection.selected_main);

  const weights = preferenceWeights(ranking);
  const scored = scoreCandidates(candidates, weights);
  const selectedScore = scored.find((candidate) => candidate.key === selected?.key)?.score ?? 0;
  const bestScore = Math.max(...scored.map((candidate) => candidate.score), 0);

  return {
    scoring_version: "preference_fit_v1",
    preference_score: roundScore(selectedScore),
    best_possible_score: roundScore(bestScore),
    preference_fit_ratio: bestScore > 0 ? roundScore(selectedScore / bestScore) : 0
  };
}

export function summarizePreferenceScores(records = []) {
  const summary = {
    scoring_version: "preference_fit_v1"
  };

  ["baseline", "prototype"].forEach((interfaceType) => {
    const rows = records.filter((record) => record.interface_type === interfaceType);
    summary[`${interfaceType}_avg_preference_score`] = average(rows, "preference_score");
    summary[`${interfaceType}_avg_best_possible_score`] = average(rows, "best_possible_score");
    summary[`${interfaceType}_avg_preference_fit_ratio`] = average(rows, "preference_fit_ratio");
  });

  summary.prototype_minus_baseline_fit_ratio = roundScore(
    (summary.prototype_avg_preference_fit_ratio || 0) -
    (summary.baseline_avg_preference_fit_ratio || 0)
  );

  return summary;
}

function emptyPreferenceScore() {
  return {
    scoring_version: "preference_fit_v1",
    preference_score: 0,
    best_possible_score: 0,
    preference_fit_ratio: 0
  };
}

function preferenceWeights(ranking = []) {
  const ids = ranking.map((item) => typeof item === "string" ? item : item.id);
  const points = {};
  ids.forEach((id, index) => {
    points[id] = Math.max(5 - index, 1);
  });
  const total = Object.values(points).reduce((sum, value) => sum + value, 0) || 1;
  return {
    time: (points.time || 0) / total,
    cost: (points.cost || 0) / total,
    walk: (points.walk || 0) / total,
    reliability: (points.reliability || 0) / total,
    simplicity: (points.simplicity || 0) / total
  };
}

function routeCandidates(scenario, interfaceType) {
  if (interfaceType === "baseline") {
    return scenario.main_routes.map((main) => {
      const fm = preferredWalkOption(scenario.first_mile.filter((item) => main.first_miles?.includes(item.id)));
      const lm = preferredWalkOption(scenario.last_mile.filter((item) => main.last_miles?.includes(item.id)));
      return candidateFromParts(main, fm, lm);
    });
  }

  return scenario.main_routes.flatMap((main) => {
    const fms = scenario.first_mile.filter((item) => main.first_miles?.includes(item.id));
    const lms = scenario.last_mile.filter((item) => main.last_miles?.includes(item.id));
    return fms.flatMap((fm) => lms.map((lm) => candidateFromParts(main, fm, lm)));
  });
}

function candidateFromParts(main, fm, lm) {
  const selected_fm = fm?.id || "";
  const selected_main = main?.id || "";
  const selected_lm = lm?.id || "";
  const total_time = Number(fm?.time_min || 0) + Number(main?.time_min || 0) + Number(lm?.time_min || 0);
  const total_cost = Number(fm?.cost_thb || 0) + Number(main?.cost_thb || 0) + Number(lm?.cost_thb || 0);
  const distance_m = Number(fm?.distance_m || fm?.walk_m || 0) + Number(lm?.distance_m || lm?.walk_m || 0);
  return {
    key: `${selected_fm}:${selected_main}:${selected_lm}`,
    selected_fm,
    selected_main,
    selected_lm,
    total_time,
    total_cost,
    distance_m,
    reliability_value: reliabilityValue(main?.reliability),
    simplicity_cost: simplicityCost(main, fm, lm)
  };
}

function preferredWalkOption(items = []) {
  return items.find((item) => {
    const text = `${item.mode_en || ""} ${item.mode || ""}`.toLowerCase();
    return text.includes("walk") || text.includes("เดิน");
  }) || items[0];
}

function scoreCandidates(candidates, weights) {
  const ranges = {
    total_time: rangeFor(candidates, "total_time"),
    total_cost: rangeFor(candidates, "total_cost"),
    distance_m: rangeFor(candidates, "distance_m"),
    simplicity_cost: rangeFor(candidates, "simplicity_cost")
  };

  return candidates.map((candidate) => {
    const score =
      weights.time * lowerIsBetter(candidate.total_time, ranges.total_time) +
      weights.cost * lowerIsBetter(candidate.total_cost, ranges.total_cost) +
      weights.walk * lowerIsBetter(candidate.distance_m, ranges.distance_m) +
      weights.reliability * candidate.reliability_value +
      weights.simplicity * lowerIsBetter(candidate.simplicity_cost, ranges.simplicity_cost);

    return { ...candidate, score };
  });
}

function rangeFor(items, field) {
  const values = items.map((item) => Number(item[field] || 0));
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function lowerIsBetter(value, range) {
  if (range.max === range.min) return 1;
  return 1 - ((Number(value || 0) - range.min) / (range.max - range.min));
}

function reliabilityValue(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("high") || text.includes("สูง")) return 1;
  if (text.includes("low") || text.includes("ต่ำ")) return 0.2;
  return 0.6;
}

function simplicityCost(main, fm, lm) {
  const transferCount = Number(main?.transfers || 0);
  const mainModeCount = String(main?.mode || "").split(/\+|->|→|\//).filter(Boolean).length || 1;
  const connectorModePenalty = [fm, lm].filter(Boolean).length;
  return transferCount + mainModeCount + connectorModePenalty;
}

function average(rows, field) {
  if (!rows.length) return 0;
  return roundScore(rows.reduce((sum, row) => sum + Number(row[field] || 0), 0) / rows.length);
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

export function storageGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
