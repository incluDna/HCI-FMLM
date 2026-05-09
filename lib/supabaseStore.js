import { scenarioDb } from "@/lib/scenarios";
import { storageGet, storageSet } from "@/lib/experiment";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

const scenarioKey = "fmlm_admin_scenarios";

export { hasSupabaseConfig };

export async function loadScenarioDb() {
  const local = storageGet(scenarioKey, scenarioDb);
  if (!hasSupabaseConfig) return local;

  const { data, error } = await supabase
    .from("scenarios")
    .select("data")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Supabase scenario load failed; using local fallback.", error);
    return local;
  }

  const remote = (data || []).map((row) => row.data).filter(Boolean);
  if (!remote.length) {
    await saveScenarioDb(local);
    return local;
  }

  storageSet(scenarioKey, remote);
  return remote;
}

export async function saveScenarioDb(scenarios) {
  storageSet(scenarioKey, scenarios);
  if (!hasSupabaseConfig) return { source: "localStorage" };

  const rows = scenarios.map((scenario, index) => ({
    id: scenario.id,
    data: scenario,
    sort_order: index,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from("scenarios").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { source: "supabase" };
}

export async function insertStudyEvent(eventPayload) {
  if (!hasSupabaseConfig) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("study_events").insert({
    timestamp: eventPayload.timestamp,
    participant_id: eventPayload.participant_id,
    condition_order: eventPayload.condition_order,
    event_type: eventPayload.event_type,
    screen: eventPayload.screen,
    scenario_id: eventPayload.scenario_id,
    interface_label: eventPayload.interface,
    interface_type: eventPayload.interface_type,
    payload: eventPayload.payload || {}
  });

  if (error) throw error;
}

export async function insertStudySubmission(payload) {
  if (!hasSupabaseConfig) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("study_submissions").insert({
    timestamp: payload.timestamp,
    participant_id: payload.participant_id,
    condition_order: payload.condition_order,
    background: payload.background || {},
    preference_ranking: payload.preference_ranking || [],
    scenarios: payload.scenarios || [],
    satisfaction: payload.satisfaction || {},
    payload
  });

  if (error) throw error;
}
