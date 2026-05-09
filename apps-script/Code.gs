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
    "clarity",
    "decision_ease",
    "fmlm_understanding",
    "preference_fit"
  ]);

  (payload.scenarios || []).forEach(function(row) {
    sheet.appendRow([
      payload.timestamp,
      payload.participant_id,
      payload.condition_order,
      row.scenario_id,
      row.interface,
      row.interface_type,
      row.selected_fm,
      row.selected_main,
      row.selected_lm,
      row.total_time,
      row.total_cost,
      row.clarity,
      row.decision_ease,
      row.fmlm_understanding,
      row.preference_fit
    ]);
  });
}

function appendSatisfaction_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Satisfaction", [
    "timestamp",
    "participant_id",
    "condition_order",
    "overall_decision_support",
    "overall_preference_alignment",
    "overall_clarity",
    "overall_intention_to_use",
    "fmlm_usefulness",
    "final_comments"
  ]);

  sheet.appendRow([
    payload.timestamp,
    payload.participant_id,
    payload.condition_order,
    payload.satisfaction.overall_decision_support,
    payload.satisfaction.overall_preference_alignment,
    payload.satisfaction.overall_clarity,
    payload.satisfaction.overall_intention_to_use,
    payload.satisfaction.fmlm_usefulness,
    payload.satisfaction.final_comments
  ]);
}

function sheetWithHeaders_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}
