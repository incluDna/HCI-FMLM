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
    distance_m: fmDistance + lmDistance
  };
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
