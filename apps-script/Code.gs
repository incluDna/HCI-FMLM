function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (payload.log_type === "event") {
    appendEvent_(spreadsheet, payload);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, type: "event" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  appendBackground_(spreadsheet, payload);
  appendScenarios_(spreadsheet, payload);
  appendSatisfaction_(spreadsheet, payload);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendEvent_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Events", [
    "timestamp",
    "participant_id",
    "condition_order",
    "event_type",
    "screen",
    "scenario_id",
    "interface",
    "interface_type",
    "payload_json"
  ]);

  sheet.appendRow([
    payload.timestamp,
    payload.participant_id,
    payload.condition_order,
    payload.event_type,
    payload.screen,
    payload.scenario_id,
    payload.interface,
    payload.interface_type,
    JSON.stringify(payload.payload || {})
  ]);
}

function appendBackground_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Background", [
    "timestamp",
    "participant_id",
    "condition_order",
    "freq",
    "modes",
    "appUsage",
    "multiLegFamiliarity",
    "preference_ranking"
  ]);

  sheet.appendRow([
    payload.timestamp,
    payload.participant_id,
    payload.condition_order,
    payload.background.freq,
    (payload.background.modes || []).join(","),
    payload.background.appUsage,
    payload.background.multiLegFamiliarity,
    (payload.preference_ranking || []).join(",")
  ]);
}

function appendScenarios_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Scenarios", [
    "timestamp",
    "participant_id",
    "condition_order",
    "scenario_id",
    "interface",
    "interface_type",
    "selected_fm",
    "selected_main",
    "selected_lm",
    "total_time",
    "total_cost",
    "distance_m",
    "transfers",
    "clarity",
    "decision_ease",
    "fmlm_understanding",
    "preference_fit",
    "scoring_version",
    "preference_score",
    "best_possible_score",
    "preference_fit_ratio"
  ]);

  (payload.scenarios || []).forEach(function(row) {
    appendObjectRow_(sheet, {
      timestamp: payload.timestamp,
      participant_id: payload.participant_id,
      condition_order: payload.condition_order,
      scenario_id: row.scenario_id,
      interface: row.interface,
      interface_type: row.interface_type,
      selected_fm: row.selected_fm,
      selected_main: row.selected_main,
      selected_lm: row.selected_lm,
      total_time: row.total_time,
      total_cost: row.total_cost,
      distance_m: row.distance_m,
      transfers: row.transfers,
      clarity: row.clarity,
      decision_ease: row.decision_ease,
      fmlm_understanding: row.fmlm_understanding,
      preference_fit: row.preference_fit,
      scoring_version: row.scoring_version,
      preference_score: row.preference_score,
      best_possible_score: row.best_possible_score,
      preference_fit_ratio: row.preference_fit_ratio
    });
  });
}

function appendSatisfaction_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Satisfaction", [
    "timestamp",
    "participant_id",
    "condition_order",
    "overall_decision_support",
    "overall_decision_support_preferred_interface_type",
    "overall_decision_support_baseline_vs_prototype",
    "overall_preference_alignment",
    "overall_preference_alignment_preferred_interface_type",
    "overall_preference_alignment_baseline_vs_prototype",
    "overall_clarity",
    "overall_clarity_preferred_interface_type",
    "overall_clarity_baseline_vs_prototype",
    "overall_intention_to_use",
    "overall_intention_to_use_preferred_interface_type",
    "overall_intention_to_use_baseline_vs_prototype",
    "app_a_interface_type",
    "app_b_interface_type",
    "fmlm_usefulness",
    "final_comments",
    "scoring_version",
    "baseline_avg_preference_score",
    "prototype_avg_preference_score",
    "baseline_avg_best_possible_score",
    "prototype_avg_best_possible_score",
    "baseline_avg_preference_fit_ratio",
    "prototype_avg_preference_fit_ratio",
    "prototype_minus_baseline_fit_ratio"
  ]);
  const scores = payload.summary_scores || {};

  appendObjectRow_(sheet, {
    timestamp: payload.timestamp,
    participant_id: payload.participant_id,
    condition_order: payload.condition_order,
    overall_decision_support: payload.satisfaction.overall_decision_support,
    overall_decision_support_preferred_interface_type: payload.satisfaction.overall_decision_support_preferred_interface_type,
    overall_decision_support_baseline_vs_prototype: payload.satisfaction.overall_decision_support_baseline_vs_prototype,
    overall_preference_alignment: payload.satisfaction.overall_preference_alignment,
    overall_preference_alignment_preferred_interface_type: payload.satisfaction.overall_preference_alignment_preferred_interface_type,
    overall_preference_alignment_baseline_vs_prototype: payload.satisfaction.overall_preference_alignment_baseline_vs_prototype,
    overall_clarity: payload.satisfaction.overall_clarity,
    overall_clarity_preferred_interface_type: payload.satisfaction.overall_clarity_preferred_interface_type,
    overall_clarity_baseline_vs_prototype: payload.satisfaction.overall_clarity_baseline_vs_prototype,
    overall_intention_to_use: payload.satisfaction.overall_intention_to_use,
    overall_intention_to_use_preferred_interface_type: payload.satisfaction.overall_intention_to_use_preferred_interface_type,
    overall_intention_to_use_baseline_vs_prototype: payload.satisfaction.overall_intention_to_use_baseline_vs_prototype,
    app_a_interface_type: payload.satisfaction.app_a_interface_type,
    app_b_interface_type: payload.satisfaction.app_b_interface_type,
    fmlm_usefulness: payload.satisfaction.fmlm_usefulness,
    final_comments: payload.satisfaction.final_comments,
    scoring_version: scores.scoring_version,
    baseline_avg_preference_score: scores.baseline_avg_preference_score,
    prototype_avg_preference_score: scores.prototype_avg_preference_score,
    baseline_avg_best_possible_score: scores.baseline_avg_best_possible_score,
    prototype_avg_best_possible_score: scores.prototype_avg_best_possible_score,
    baseline_avg_preference_fit_ratio: scores.baseline_avg_preference_fit_ratio,
    prototype_avg_preference_fit_ratio: scores.prototype_avg_preference_fit_ratio,
    prototype_minus_baseline_fit_ratio: scores.prototype_minus_baseline_fit_ratio
  });
}

function sheetWithHeaders_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    var existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    headers.forEach(function(header) {
      if (existing.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      }
    });
  }
  return sheet;
}

function appendObjectRow_(sheet, valuesByHeader) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(header) {
    return valuesByHeader.hasOwnProperty(header) ? valuesByHeader[header] : "";
  });
  sheet.appendRow(row);
}
