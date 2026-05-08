import { scenarioDb } from "./scenarios";

/**
 * สุ่ม 3 เส้นทางจาก 10 ทั้งหมด
 * ทั้ง App A และ App B ใช้เส้นทางชุดเดียวกัน แค่ UI ต่างกัน
 *
 * return: scenario[] (3 อัน)
 */
export function getSessionScenarios() {
  const shuffled = [...scenarioDb].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * ใช้เมื่อต้องการสุ่มใหม่ (เช่น กด reset ใน dev mode)
 */
export function reshuffleScenarios() {
  return getSessionScenarios();
}