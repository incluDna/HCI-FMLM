export const preferenceFactors = [
  { id: "time", icon: "⚡", label: "ใช้เวลาน้อยที่สุด" },
  { id: "cost", icon: "💰", label: "ค่าใช้จ่ายต่ำที่สุด" },
  { id: "walk", icon: "🚶", label: "เดินน้อยที่สุด" },
  { id: "reliability", icon: "🛡️", label: "เชื่อถือได้/เวลาค่อนข้างแน่นอน" },
  { id: "simplicity", icon: "✨", label: "เข้าใจง่าย/ไม่ซับซ้อน" }
];

const csvScenarioRows = [
  ["1", "Lak Si -> Silom", "Rajpruek Club (North Park)", 13.868, 100.563, "Neilson Hays Library", 13.727, 100.523],
  ["2", "Bang Na -> Sathon", "Bangkok Patana School", 13.661, 100.627, "Saint Louis College", 13.719, 100.526],
  ["3", "Min Buri -> Asok", "Ruamrudee International School", 13.791, 100.73, "Ocean Tower 2", 13.741, 100.563],
  ["4", "Bang Wa -> Chula / Siam", "Khlong Bang Luang Floating Market", 13.731, 100.463, "CU Centenary Park", 13.738, 100.524],
  ["5", "Don Mueang -> Chatuchak", "Happy Avenue Don Mueang", 13.926, 100.584, "Queen Sirikit Park", 13.805, 100.552],
  ["6", "Phra Khanong -> Grand Palace", "Kasem Phitthaya School", 13.723, 100.597, "The Grand Palace", 13.75, 100.491],
  ["7", "Khlong San -> Giant Swing", "Lhong 1919", 13.736, 100.505, "Bangkok City Hall", 13.752, 100.501],
  ["8", "Bang Phlat -> Ari", "Wat Awut Wikasitaram", 13.793, 100.504, "Ministry of Finance", 13.778, 100.533],
  ["9", "Suan Luang -> Ekkamai", "Triam Udom Suksa Pattanakarn School", 13.736, 100.635, "Donki Mall Thonglor-Ekkamai", 13.732, 100.586],
  ["10", "Phasi Charoen -> Siriraj", "Wat Paknam Bhasicharoen", 13.722, 100.469, "Wang Lang Market", 13.755, 100.485]
];

const mainRouteTemplates = [
  {
    suffix: "rail",
    mode: "BTS/MRT + ต่อรถ",
    icon: "🚈",
    costBase: 47,
    timeFactor: 3.2,
    reliability: "สูง",
    detail: "ใช้ระบบรางเป็นช่วงหลัก แล้วต่อรถช่วงต้นทาง/ปลายทาง",
    first_miles: ["fm-walk", "fm-moto", "fm-taxi"],
    last_miles: ["lm-walk", "lm-moto", "lm-taxi"]
  },
  {
    suffix: "bus",
    mode: "รถเมล์ + เดิน",
    icon: "🚌",
    costBase: 18,
    timeFactor: 4.8,
    reliability: "กลาง",
    detail: "ค่าโดยสารถูกกว่า แต่เวลาเดินทางขึ้นกับสภาพจราจร",
    first_miles: ["fm-walk", "fm-bike"],
    last_miles: ["lm-walk", "lm-bike", "lm-moto"]
  },
  {
    suffix: "taxi",
    mode: "Taxi/Grab",
    icon: "🚕",
    costBase: 95,
    timeFactor: 3.8,
    reliability: "ต่ำ",
    detail: "เดินน้อยและต่อรถน้อย แต่ค่าใช้จ่ายสูงกว่า",
    first_miles: ["fm-walk"],
    last_miles: ["lm-walk"]
  }
];

export const scenarioDb = csvScenarioRows.map(buildScenario);

function buildScenario(row, index) {
  const [number, areaRoute, origin, originLat, originLng, destination, destinationLat, destinationLng] = row;
  const originCoords = { lat: Number(originLat), lng: Number(originLng) };
  const destinationCoords = { lat: Number(destinationLat), lng: Number(destinationLng) };
  const km = distanceKm(originCoords, destinationCoords);
  const id = `transit-desert-${number}-${slugify(areaRoute)}`;

  return {
    id,
    origin,
    destination,
    area_route: areaRoute,
    origin_coords: originCoords,
    destination_coords: destinationCoords,
    main_routes: mainRouteTemplates.map((template, routeIndex) => ({
      id: `${id}-${template.suffix}`,
      mode: template.mode,
      icon: template.icon,
      time_min: Math.round(18 + km * template.timeFactor + routeIndex * 4 + (index % 3) * 2),
      cost_thb: Math.round(template.costBase + km * (routeIndex === 2 ? 18 : routeIndex === 0 ? 3 : 1.4)),
      distance_km: Number((km * (1.05 + routeIndex * 0.12)).toFixed(2)),
      transfers: routeIndex,
      detail: template.detail,
      reliability: template.reliability,
      first_miles: template.first_miles,
      last_miles: template.last_miles,
      gpx: `${id}-${template.suffix}.gpx`,
      gpx_filename: `${id}-${template.suffix}.gpx`,
      gpx_text: mockGpx(`${areaRoute} ${template.mode}`, routePoints(originCoords, destinationCoords, routeIndex, "main"))
    })),
    first_mile: [
      {
        id: "fm-walk",
        mode: "เดินไปจุดขึ้นรถ",
        mode_en: "walk",
        icon: "🚶",
        time_min: 16 + (index % 4),
        cost_thb: 0,
        distance_m: 1100 + (index % 5) * 120,
        reliability: "สูง",
        detail: "จำลองระยะเดินจากต้นทางไปยังจุดเริ่มเส้นทางหลัก",
        gpx: `${id}-fm-walk.gpx`,
        gpx_filename: `${id}-fm-walk.gpx`,
        gpx_text: mockGpx(`${origin} first mile walk`, routePoints(originCoords, destinationCoords, 0, "fm"))
      },
      {
        id: "fm-moto",
        mode: "วินมอเตอร์ไซค์",
        mode_en: "motorcycle taxi",
        icon: "🏍️",
        time_min: 6 + (index % 3),
        cost_thb: 25 + (index % 4) * 5,
        distance_m: 80,
        reliability: "กลาง",
        detail: "ลดระยะเดินช่วงต้นทาง เหมาะเมื่อจุดขึ้นรถหลักอยู่ไกล",
        gpx: `${id}-fm-moto.gpx`,
        gpx_filename: `${id}-fm-moto.gpx`,
        gpx_text: mockGpx(`${origin} first mile moto`, routePoints(originCoords, destinationCoords, 1, "fm"))
      },
      {
        id: "fm-bike",
        mode: "จักรยาน/ไมโครโมบิลิตี้",
        mode_en: "bike",
        icon: "🚲",
        time_min: 9 + (index % 4),
        cost_thb: 10,
        distance_m: 180,
        reliability: "กลาง",
        detail: "ทางเลือกจำลองสำหรับลดเวลาเดินก่อนถึงสายหลัก",
        gpx: `${id}-fm-bike.gpx`,
        gpx_filename: `${id}-fm-bike.gpx`,
        gpx_text: mockGpx(`${origin} first mile bike`, routePoints(originCoords, destinationCoords, 2, "fm"))
      },
      {
        id: "fm-taxi",
        mode: "Taxi/Grab ช่วงต้นทาง",
        mode_en: "taxi",
        icon: "🚕",
        time_min: 8 + (index % 3),
        cost_thb: 65 + (index % 5) * 10,
        distance_m: 40,
        reliability: "ต่ำ",
        detail: "เดินน้อยแต่ค่าใช้จ่ายสูงกว่าและขึ้นกับจราจร",
        gpx: `${id}-fm-taxi.gpx`,
        gpx_filename: `${id}-fm-taxi.gpx`,
        gpx_text: mockGpx(`${origin} first mile taxi`, routePoints(originCoords, destinationCoords, 3, "fm"))
      }
    ],
    last_mile: [
      {
        id: "lm-walk",
        mode: "เดินจากจุดลงรถ",
        mode_en: "walk",
        icon: "🚶",
        time_min: 15 + (index % 5),
        cost_thb: 0,
        distance_m: 1050 + (index % 6) * 130,
        reliability: "สูง",
        detail: "จำลองระยะเดินจากจุดลงรถหลักถึงปลายทาง",
        gpx: `${id}-lm-walk.gpx`,
        gpx_filename: `${id}-lm-walk.gpx`,
        gpx_text: mockGpx(`${destination} last mile walk`, routePoints(originCoords, destinationCoords, 0, "lm"))
      },
      {
        id: "lm-moto",
        mode: "วินมอเตอร์ไซค์ปลายทาง",
        mode_en: "motorcycle taxi",
        icon: "🏍️",
        time_min: 6 + (index % 4),
        cost_thb: 25 + (index % 4) * 5,
        distance_m: 90,
        reliability: "กลาง",
        detail: "ลดระยะเดินช่วงปลายทางเมื่อจุดลงรถหลักอยู่ไกล",
        gpx: `${id}-lm-moto.gpx`,
        gpx_filename: `${id}-lm-moto.gpx`,
        gpx_text: mockGpx(`${destination} last mile moto`, routePoints(originCoords, destinationCoords, 1, "lm"))
      },
      {
        id: "lm-bike",
        mode: "จักรยาน/ไมโครโมบิลิตี้",
        mode_en: "bike",
        icon: "🚲",
        time_min: 10 + (index % 4),
        cost_thb: 10,
        distance_m: 200,
        reliability: "กลาง",
        detail: "ทางเลือกจำลองสำหรับช่วงปลายทางที่เดินไกล",
        gpx: `${id}-lm-bike.gpx`,
        gpx_filename: `${id}-lm-bike.gpx`,
        gpx_text: mockGpx(`${destination} last mile bike`, routePoints(originCoords, destinationCoords, 2, "lm"))
      },
      {
        id: "lm-taxi",
        mode: "Taxi/Grab ช่วงปลายทาง",
        mode_en: "taxi",
        icon: "🚕",
        time_min: 8 + (index % 3),
        cost_thb: 70 + (index % 5) * 10,
        distance_m: 40,
        reliability: "ต่ำ",
        detail: "เดินน้อยที่สุด แต่ค่าใช้จ่ายสูงกว่า",
        gpx: `${id}-lm-taxi.gpx`,
        gpx_filename: `${id}-lm-taxi.gpx`,
        gpx_text: mockGpx(`${destination} last mile taxi`, routePoints(originCoords, destinationCoords, 3, "lm"))
      }
    ]
  };
}

function distanceKm(a, b) {
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function toRad(value) {
  return Number(value) * Math.PI / 180;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/->/g, "to")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function routePoints(origin, destination, index, section) {
  const offset = (index - 1.5) * 0.01;
  const first = interpolate(origin, destination, section === "main" ? 0.28 : section === "fm" ? 0.2 : 0.72, offset);
  const second = interpolate(origin, destination, section === "main" ? 0.62 : section === "fm" ? 0.34 : 0.86, -offset);

  if (section === "fm") return [origin, first, second];
  if (section === "lm") return [first, second, destination];
  return [origin, first, second, destination];
}

function interpolate(origin, destination, ratio, offset) {
  return {
    lat: roundCoord(origin.lat + (destination.lat - origin.lat) * ratio + offset * 0.35),
    lng: roundCoord(origin.lng + (destination.lng - origin.lng) * ratio + offset)
  };
}

function roundCoord(value) {
  return Math.round(value * 1000000) / 1000000;
}

function mockGpx(name, points) {
  const trkpts = points
    .map((point) => `      <trkpt lat="${point.lat}" lon="${point.lng}"></trkpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HCI-FMLM mock route seed">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
