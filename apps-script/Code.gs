function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  appendBackground_(spreadsheet, payload);
  appendScenarios_(spreadsheet, payload);
  appendSatisfaction_(spreadsheet, payload);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendBackground_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Background", [
    "timestamp",
    "participant_id",
    "condition_order",
    "freq",
    "modes",
    "appUsage",
    "preference_ranking"
  ]);

  sheet.appendRow([
    payload.timestamp,
    payload.participant_id,
    payload.condition_order,
    payload.background.freq,
    (payload.background.modes || []).join(","),
    payload.background.appUsage,
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
    "confidence",
    "clarity"
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
      row.confidence,
      row.clarity
    ]);
  });
}

function appendSatisfaction_(spreadsheet, payload) {
  const sheet = sheetWithHeaders_(spreadsheet, "Satisfaction", [
    "timestamp",
    "participant_id",
    "condition_order",
    "better_decide",
    "matches_pref",
    "would_use",
    "comment"
  ]);

  sheet.appendRow([
    payload.timestamp,
    payload.participant_id,
    payload.condition_order,
    payload.satisfaction.better_decide,
    payload.satisfaction.matches_pref,
    payload.satisfaction.would_use,
    payload.satisfaction.comment
  ]);
}

function sheetWithHeaders_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}
