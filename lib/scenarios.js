export const preferenceFactors = [
  { id: "time", icon: "⚡", label: "ใช้เวลาน้อยที่สุด" },
  { id: "cost", icon: "💰", label: "ค่าใช้จ่ายต่ำที่สุด" },
  { id: "walk", icon: "🚶", label: "เดินน้อยที่สุด" },
  { id: "reliability", icon: "🛡️", label: "เชื่อถือได้/เวลาค่อนข้างแน่นอน" },
  { id: "simplicity", icon: "✨", label: "เข้าใจง่าย/ไม่ซับซ้อน" }
];

export const scenarioDb = [
  {
    id: "siam-chatuchak",
    origin: "สยาม (Siam)",
    destination: "จตุจักร (Chatuchak)",
    origin_coords: { lat: 13.7466, lng: 100.5347 },
    destination_coords: { lat: 13.8026, lng: 100.5539 },
    map_embed: "https://www.google.com/maps?q=Siam%20Paragon%20to%20Chatuchak%20Market%20Bangkok&output=embed",
    main_routes: [
      {
        id: "bts-sukhumvit",
        mode: "BTS สายสุขุมวิท",
        icon: "🚈",
        time_min: 18,
        cost_thb: 44,
        detail: "5 สถานี ไม่ต้องเปลี่ยน",
        reliability: "สูง",
        first_miles: ["fm-moto", "fm-walk", "fm-bike", "fm-taxi"],
        last_miles: ["lm-walk", "lm-bike", "lm-moto", "lm-taxi"]
      },
      {
        id: "mrt-blue",
        mode: "MRT สายสีน้ำเงิน",
        icon: "🚇",
        time_min: 22,
        cost_thb: 38,
        detail: "เปลี่ยนที่อโศก 1 ครั้ง",
        reliability: "สูง",
        first_miles: ["fm-walk", "fm-moto"],
        last_miles: ["lm-walk", "lm-bike"]
      },
      {
        id: "boat",
        mode: "เรือคลองแสนแสบ",
        icon: "⛵",
        time_min: 25,
        cost_thb: 14,
        detail: "ราชประสงค์ → ประตูน้ำ",
        reliability: "กลาง",
        first_miles: ["fm-walk", "fm-bike"],
        last_miles: ["lm-walk", "lm-moto"]
      },
      {
        id: "bts-mrt",
        mode: "BTS + MRT (ต่อขบวน)",
        icon: "🚈",
        time_min: 28,
        cost_thb: 72,
        detail: "BTS 3 สถานี + เปลี่ยน MRT 2 สถานี",
        reliability: "สูง",
        first_miles: ["fm-moto", "fm-walk", "fm-taxi"],
        last_miles: ["lm-walk", "lm-bike", "lm-taxi"]
      }
    ],
    first_mile: [
      { id: "fm-moto", mode: "มอเตอร์ไซค์รับจ้าง", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 3, cost_thb: 15, walk_m: 30, reliability: "สูง", transfers: 0, detail: "วินมอไซค์ปากซอย ราคาตามกฎหมาย" },
      { id: "fm-walk", mode: "เดินไปสถานี", mode_en: "walk", icon: "🚶", time_min: 5, cost_thb: 0, walk_m: 350, reliability: "สูง", transfers: 0, detail: "ระยะทางประมาณ 350 ม." },
      { id: "fm-bike", mode: "จักรยาน (Pun Pun)", mode_en: "bike share", icon: "🚲", time_min: 6, cost_thb: 10, walk_m: 150, reliability: "กลาง", transfers: 0, detail: "สถานีใกล้ต้นทาง 150 ม." },
      { id: "fm-taxi", mode: "แท็กซี่", mode_en: "taxi", icon: "🚕", time_min: 7, cost_thb: 55, walk_m: 20, reliability: "กลาง", transfers: 0, detail: "เริ่มต้น 35B + 5.5B/กม." }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินจากสถานี", mode_en: "walk", icon: "🚶", time_min: 7, cost_thb: 0, walk_m: 450, reliability: "สูง", transfers: 0, detail: "ระยะทางประมาณ 450 ม." },
      { id: "lm-bike", mode: "จักรยาน (Pun Pun)", mode_en: "bike share", icon: "🚲", time_min: 8, cost_thb: 10, walk_m: 200, reliability: "กลาง", transfers: 0, detail: "สถานีใกล้ปลายทาง 200 ม." },
      { id: "lm-moto", mode: "มอเตอร์ไซค์รับจ้าง", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 20, walk_m: 40, reliability: "สูง", transfers: 0, detail: "วินมอไซค์หน้าสถานี" },
      { id: "lm-taxi", mode: "แท็กซี่", mode_en: "taxi", icon: "🚕", time_min: 10, cost_thb: 70, walk_m: 25, reliability: "ต่ำ", transfers: 0, detail: "เริ่มต้น 35B + 5.5B/กม." }
    ]
  },
  {
    id: "ari-iconsiam",
    origin: "อารีย์",
    destination: "ไอคอนสยาม",
    origin_coords: { lat: 13.7797, lng: 100.5447 },
    destination_coords: { lat: 13.7266, lng: 100.5106 },
    map_embed: "https://www.google.com/maps?q=Ari%20BTS%20to%20ICONSIAM%20Bangkok&output=embed",
    main_routes: [
      { id: "bts-gold", mode: "BTS + Gold Line", icon: "🚈", time_min: 31, cost_thb: 59, detail: "เปลี่ยนที่สยามและกรุงธนบุรี", reliability: "สูง", first_miles: ["fm-walk", "fm-moto"], last_miles: ["lm-walk", "lm-moto"] },
      { id: "bus-boat", mode: "รถเมล์ + เรือ", icon: "🚌", time_min: 44, cost_thb: 28, detail: "ต่อเรือข้ามฟากช่วงท้าย", reliability: "กลาง", first_miles: ["fm-bike", "fm-walk"], last_miles: ["lm-walk", "lm-bike"] },
      { id: "taxi-main", mode: "Taxi/Grab", icon: "🚕", time_min: 39, cost_thb: 190, detail: "ขึ้นทางด่วนบางช่วง", reliability: "ต่ำ", first_miles: ["fm-walk"], last_miles: ["lm-walk"] }
    ],
    first_mile: [
      { id: "fm-walk", mode: "เดินไป BTS", mode_en: "walk", icon: "🚶", time_min: 6, cost_thb: 0, walk_m: 420, reliability: "สูง", transfers: 0, detail: "ทางเท้าต่อเนื่อง" },
      { id: "fm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 3, cost_thb: 20, walk_m: 40, reliability: "สูง", transfers: 0, detail: "วินหน้าปากซอย" },
      { id: "fm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 5, cost_thb: 10, walk_m: 120, reliability: "กลาง", transfers: 0, detail: "มีจุดจอดใกล้ต้นทาง" }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินเข้าศูนย์การค้า", mode_en: "walk", icon: "🚶", time_min: 5, cost_thb: 0, walk_m: 260, reliability: "สูง", transfers: 0, detail: "ทางเชื่อมภายในอาคาร" },
      { id: "lm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 3, cost_thb: 20, walk_m: 25, reliability: "สูง", transfers: 0, detail: "เหมาะเมื่อฝนตก" },
      { id: "lm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 7, cost_thb: 10, walk_m: 180, reliability: "กลาง", transfers: 0, detail: "มีจุดจอดริมแม่น้ำ" }
    ]
  },
  {
    id: "on-nut-chula",
    origin: "อ่อนนุช",
    destination: "จุฬาลงกรณ์มหาวิทยาลัย",
    origin_coords: { lat: 13.7056, lng: 100.601 },
    destination_coords: { lat: 13.738, lng: 100.5339 },
    map_embed: "https://www.google.com/maps?q=On%20Nut%20BTS%20to%20Chulalongkorn%20University&output=embed",
    main_routes: [
      { id: "bts-walk", mode: "BTS + เดิน", icon: "🚈", time_min: 29, cost_thb: 47, detail: "ลงสยามแล้วเดินต่อ", reliability: "สูง", first_miles: ["fm-walk", "fm-moto", "fm-taxi"], last_miles: ["lm-walk", "lm-bike"] },
      { id: "bus-direct", mode: "รถเมล์สายตรง", icon: "🚌", time_min: 52, cost_thb: 20, detail: "รถติดช่วงสุขุมวิท", reliability: "ต่ำ", first_miles: ["fm-walk"], last_miles: ["lm-walk", "lm-moto"] },
      { id: "mrt-bts", mode: "BTS + MRT", icon: "🚇", time_min: 36, cost_thb: 67, detail: "เปลี่ยนอโศก → สามย่าน", reliability: "สูง", first_miles: ["fm-walk", "fm-moto"], last_miles: ["lm-walk"] }
    ],
    first_mile: [
      { id: "fm-walk", mode: "เดินไป BTS", mode_en: "walk", icon: "🚶", time_min: 8, cost_thb: 0, walk_m: 520, reliability: "สูง", transfers: 0, detail: "ผ่านตลาดและทางเท้าแคบ" },
      { id: "fm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 25, walk_m: 50, reliability: "สูง", transfers: 0, detail: "มีคิวช่วงเช้า" },
      { id: "fm-taxi", mode: "Taxi/Grab", mode_en: "taxi", icon: "🚕", time_min: 9, cost_thb: 75, walk_m: 20, reliability: "ต่ำ", transfers: 0, detail: "อาจติดในซอย" }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินเข้ามหาวิทยาลัย", mode_en: "walk", icon: "🚶", time_min: 10, cost_thb: 0, walk_m: 700, reliability: "สูง", transfers: 0, detail: "ข้ามถนนใหญ่ 1 จุด" },
      { id: "lm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 6, cost_thb: 10, walk_m: 180, reliability: "กลาง", transfers: 0, detail: "จุดจอดใกล้คณะ" },
      { id: "lm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 25, walk_m: 45, reliability: "สูง", transfers: 0, detail: "ลงหน้าประตู" }
    ]
  },
  {
    id: "lat-phrao-siriraj",
    origin: "ลาดพร้าว",
    destination: "โรงพยาบาลศิริราช",
    origin_coords: { lat: 13.8163, lng: 100.5616 },
    destination_coords: { lat: 13.7589, lng: 100.4853 },
    map_embed: "https://www.google.com/maps?q=Lat%20Phrao%20to%20Siriraj%20Hospital&output=embed",
    main_routes: [
      { id: "mrt-boat", mode: "MRT + เรือ", icon: "⛵", time_min: 46, cost_thb: 55, detail: "ต่อเรือที่ท่าเรือ", reliability: "กลาง", first_miles: ["fm-walk", "fm-moto"], last_miles: ["lm-walk", "lm-moto"] },
      { id: "mrt-bus", mode: "MRT + รถเมล์", icon: "🚌", time_min: 58, cost_thb: 46, detail: "ต่อรถเมล์ช่วงปลายทาง", reliability: "กลาง", first_miles: ["fm-bike", "fm-walk"], last_miles: ["lm-walk"] },
      { id: "taxi", mode: "Taxi/Grab", icon: "🚕", time_min: 51, cost_thb: 230, detail: "ข้ามแม่น้ำช่วงรถติด", reliability: "ต่ำ", first_miles: ["fm-walk"], last_miles: ["lm-walk"] }
    ],
    first_mile: [
      { id: "fm-walk", mode: "เดินไป MRT", mode_en: "walk", icon: "🚶", time_min: 9, cost_thb: 0, walk_m: 650, reliability: "สูง", transfers: 0, detail: "ทางเท้ากว้างบางช่วง" },
      { id: "fm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 25, walk_m: 35, reliability: "สูง", transfers: 0, detail: "วินใกล้คอนโด" },
      { id: "fm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 7, cost_thb: 10, walk_m: 210, reliability: "กลาง", transfers: 0, detail: "ทางจักรยานไม่ต่อเนื่อง" }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินเข้ารพ.", mode_en: "walk", icon: "🚶", time_min: 8, cost_thb: 0, walk_m: 500, reliability: "สูง", transfers: 0, detail: "คนหนาแน่นช่วงเย็น" },
      { id: "lm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 5, cost_thb: 25, walk_m: 60, reliability: "กลาง", transfers: 0, detail: "ขึ้นกับจุดจอดวิน" }
    ]
  },
  {
    id: "thonburi-ramkhamhaeng",
    origin: "วงเวียนใหญ่",
    destination: "รามคำแหง",
    origin_coords: { lat: 13.721, lng: 100.495 },
    destination_coords: { lat: 13.7567, lng: 100.6218 },
    map_embed: "https://www.google.com/maps?q=Wongwian%20Yai%20to%20Ramkhamhaeng%20Bangkok&output=embed",
    main_routes: [
      { id: "bts-arl", mode: "BTS + Airport Rail Link", icon: "🚈", time_min: 42, cost_thb: 71, detail: "เปลี่ยนหลายระบบ", reliability: "สูง", first_miles: ["fm-walk", "fm-moto"], last_miles: ["lm-walk", "lm-moto", "lm-taxi"] },
      { id: "boat-bus", mode: "เรือคลอง + รถเมล์", icon: "⛵", time_min: 49, cost_thb: 29, detail: "ถูกกว่าแต่ต้องต่อ", reliability: "กลาง", first_miles: ["fm-bike", "fm-walk"], last_miles: ["lm-walk", "lm-bike"] },
      { id: "taxi", mode: "Taxi/Grab", icon: "🚕", time_min: 47, cost_thb: 210, detail: "ขึ้นกับสภาพจราจร", reliability: "ต่ำ", first_miles: ["fm-walk"], last_miles: ["lm-walk"] }
    ],
    first_mile: [
      { id: "fm-walk", mode: "เดินไปสถานี", mode_en: "walk", icon: "🚶", time_min: 6, cost_thb: 0, walk_m: 430, reliability: "สูง", transfers: 0, detail: "ทางเดินใต้รถไฟฟ้า" },
      { id: "fm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 3, cost_thb: 20, walk_m: 40, reliability: "สูง", transfers: 0, detail: "คิวสั้นช่วงกลางวัน" },
      { id: "fm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 8, cost_thb: 10, walk_m: 190, reliability: "กลาง", transfers: 0, detail: "ถนนบางช่วงรถเยอะ" }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินเข้าซอย", mode_en: "walk", icon: "🚶", time_min: 12, cost_thb: 0, walk_m: 850, reliability: "สูง", transfers: 0, detail: "ไกลแต่คาดเวลาได้" },
      { id: "lm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 5, cost_thb: 25, walk_m: 50, reliability: "สูง", transfers: 0, detail: "วินหน้าป้ายรถเมล์" },
      { id: "lm-taxi", mode: "Taxi/Grab", mode_en: "taxi", icon: "🚕", time_min: 9, cost_thb: 75, walk_m: 20, reliability: "ต่ำ", transfers: 0, detail: "รอรถนานช่วงฝนตก" },
      { id: "lm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 9, cost_thb: 10, walk_m: 160, reliability: "กลาง", transfers: 0, detail: "จุดจอดใกล้มหาวิทยาลัย" }
    ]
  },
  {
    id: "mo-chit-khlong-toei",
    origin: "หมอชิต",
    destination: "คลองเตย",
    origin_coords: { lat: 13.8023, lng: 100.5538 },
    destination_coords: { lat: 13.7153, lng: 100.5602 },
    map_embed: "https://www.google.com/maps?q=Mo%20Chit%20to%20Khlong%20Toei%20Bangkok&output=embed",
    main_routes: [
      { id: "mrt-direct", mode: "MRT สายสีน้ำเงิน", icon: "🚇", time_min: 33, cost_thb: 42, detail: "ขึ้นสวนจตุจักร ลงคลองเตย", reliability: "สูง", first_miles: ["fm-walk", "fm-bike"], last_miles: ["lm-walk", "lm-moto"] },
      { id: "bus", mode: "รถเมล์", icon: "🚌", time_min: 55, cost_thb: 20, detail: "ผ่านถนนรัชดา", reliability: "ต่ำ", first_miles: ["fm-walk", "fm-moto"], last_miles: ["lm-walk"] },
      { id: "taxi", mode: "Taxi/Grab", icon: "🚕", time_min: 38, cost_thb: 160, detail: "ทางด่วนบางช่วง", reliability: "กลาง", first_miles: ["fm-walk"], last_miles: ["lm-walk"] }
    ],
    first_mile: [
      { id: "fm-walk", mode: "เดินไป MRT", mode_en: "walk", icon: "🚶", time_min: 7, cost_thb: 0, walk_m: 480, reliability: "สูง", transfers: 0, detail: "ทางเชื่อมสวนสาธารณะ" },
      { id: "fm-bike", mode: "จักรยาน", mode_en: "bike", icon: "🚲", time_min: 5, cost_thb: 10, walk_m: 150, reliability: "กลาง", transfers: 0, detail: "มีสถานี Pun Pun" },
      { id: "fm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 20, walk_m: 50, reliability: "สูง", transfers: 0, detail: "เหมาะเมื่อมีสัมภาระ" }
    ],
    last_mile: [
      { id: "lm-walk", mode: "เดินจากสถานี", mode_en: "walk", icon: "🚶", time_min: 9, cost_thb: 0, walk_m: 620, reliability: "สูง", transfers: 0, detail: "ข้ามถนนใหญ่ 1 จุด" },
      { id: "lm-moto", mode: "วินมอเตอร์ไซค์", mode_en: "motorcycle taxi", icon: "🏍️", time_min: 4, cost_thb: 20, walk_m: 35, reliability: "สูง", transfers: 0, detail: "วินหน้าสถานี" }
    ]
  }
];
