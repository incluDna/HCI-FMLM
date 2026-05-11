"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { scenarioDb, preferenceFactors } from "@/lib/scenarios";
import {
  computeTotals,
  computePreferenceFit,
  conditionForCounter,
  findMainRoute,
  interfaceLabel,
  interfacesForCondition,
  makeParticipant,
  seededShuffle,
  summarizePreferenceScores,
  storageGet,
  storageSet
} from "@/lib/experiment";
import {
  hasSupabaseConfig,
  insertStudyEvent,
  insertStudySubmission,
  loadScenarioDb
} from "@/lib/supabaseStore";

const RouteMap = dynamic(() => import("@/app/components/RouteMap"), { ssr: false });

const travelFreqOptions = ["ทุกวัน", "3–5 วันต่อสัปดาห์", "1–2 วันต่อสัปดาห์", "นาน ๆ ครั้ง"];
const travelModes = [
  ["walk", "🚶", "เดิน"],
  ["bts", "🚇", "BTS"],
  ["mrt", "🚊", "MRT"],
  ["bus", "🚌", "รถเมล์"],
  ["moto", "🏍️", "วินมอเตอร์ไซค์"],
  ["taxi", "🚕", "Taxi/Grab"],
  ["boat", "⛵", "เรือ"],
  ["car", "🚗", "รถยนต์ส่วนตัว"],
  ["bike", "🚲", "จักรยาน"],
  ["other", "➕", "อื่น ๆ"]
];
const appUsageOptions = ["บ่อยมาก", "บางครั้ง", "นาน ๆ ครั้ง", "ไม่เคยใช้"];
const multiLegFamiliarityOptions = [
  { value: 1, label: "ไม่คุ้นเคยเลย" },
  { value: 2, label: "ไม่ค่อยคุ้นเคย" },
  { value: 3, label: "ปานกลาง" },
  { value: 4, label: "ค่อนข้างคุ้นเคย" },
  { value: 5, label: "คุ้นเคยมาก" }
];
const postInterfaceQuestions = [
  {
    field: "clarity",
    text: "ฉันเข้าใจข้อมูลการเดินทางบนหน้าจอนี้ได้ง่าย",
    construct: "Clarity / understandability"
  },
  {
    field: "decision_ease",
    text: "หน้าจอนี้ช่วยให้ฉันเปรียบเทียบตัวเลือกและตัดสินใจเลือกเส้นทางได้ง่าย",
    construct: "Ease of decision-making"
  },
  {
    field: "fmlm_understanding",
    text: "ฉันบอกได้ชัดเจนว่าอะไรคือช่วงต้นทาง ช่วงหลัก และช่วงปลายทางของเส้นทางที่เลือก",
    construct: "First-mile / main-transit / last-mile understanding"
  },
  {
    field: "preference_fit",
    text: "เส้นทางที่ฉันเลือกตรงกับสิ่งที่ฉันต้องการสำหรับสถานการณ์นี้",
    construct: "Subjective preference fit"
  }
];
const agreementScaleOptions = [
  { value: 1, label: "ไม่เห็นด้วยอย่างยิ่ง" },
  { value: 2, label: "ไม่เห็นด้วย" },
  { value: 3, label: "ปานกลาง" },
  { value: 4, label: "เห็นด้วย" },
  { value: 5, label: "เห็นด้วยอย่างยิ่ง" }
];
const satisfactionOptions = [
  { value: 1, label: "แอป A ดีกว่ามาก" },
  { value: 2, label: "แอป A ดีกว่าเล็กน้อย" },
  { value: 3, label: "พอ ๆ กัน" },
  { value: 4, label: "แอป B ดีกว่าเล็กน้อย" },
  { value: 5, label: "แอป B ดีกว่ามาก" }
];
const fmlmUsefulnessOptions = [
  { value: 1, label: "ไม่มีประโยชน์เลย" },
  { value: 2, label: "ไม่ค่อยมีประโยชน์" },
  { value: 3, label: "ปานกลาง" },
  { value: 4, label: "ค่อนข้างมีประโยชน์" },
  { value: 5, label: "มีประโยชน์มาก" }
];
const finalComparativeQuestions = [
  {
    field: "overall_decision_support",
    text: "แอปใดช่วยให้คุณตัดสินใจเลือกเส้นทางได้ดีกว่า",
    construct: "Overall decision support"
  },
  {
    field: "overall_preference_alignment",
    text: "แอปใดช่วยให้คุณเลือกเส้นทางที่ตรงกับความต้องการของคุณมากกว่า",
    construct: "Preference alignment"
  },
  {
    field: "overall_clarity",
    text: "แอปใดทำให้คุณเข้าใจตัวเลือกการเดินทางได้ชัดเจนกว่า",
    construct: "Overall clarity"
  },
  {
    field: "overall_intention_to_use",
    text: "หากต้องใช้งานจริงในชีวิตประจำวัน คุณอยากใช้แอปใดมากกว่า",
    construct: "Behavioral intention to use"
  }
];
const sheetUrl = process.env.NEXT_PUBLIC_SHEET_URL || process.env.VITE_SHEET_URL || "";

const initialBackground = { freq: "", modes: [], appUsage: "", multiLegFamiliarity: "" };
const initialSatisfaction = {
  overall_decision_support: "",
  overall_preference_alignment: "",
  overall_clarity: "",
  overall_intention_to_use: "",
  fmlm_usefulness: "",
  final_comments: ""
};
const eventQueueKey = "fmlm_event_queue";

function decodeFinalSatisfaction(satisfaction, conditionOrder) {
  const [appAInterface, appBInterface] = interfacesForCondition(conditionOrder);
  const decoded = {
    app_a_interface_type: appAInterface,
    app_b_interface_type: appBInterface,
    by_interface: {}
  };

  finalComparativeQuestions.forEach((question) => {
    const value = Number(satisfaction[question.field]);
    decoded.by_interface[question.field] = decodeComparativeValue(value, appAInterface, appBInterface);
    decoded[`${question.field}_preferred_interface_type`] = decoded.by_interface[question.field].preferred_interface_type;
    decoded[`${question.field}_baseline_vs_prototype`] = decoded.by_interface[question.field].baseline_vs_prototype;
  });

  return decoded;
}

function decodeComparativeValue(value, appAInterface, appBInterface) {
  const strengthByValue = {
    1: "much",
    2: "slight",
    3: "equal",
    4: "slight",
    5: "much"
  };
  const preferredInterface =
    value < 3 ? appAInterface :
    value > 3 ? appBInterface :
    "equal";

  return {
    raw_app_scale: value,
    preferred_interface_type: preferredInterface,
    strength: strengthByValue[value] || "",
    baseline_vs_prototype: appAInterface === "baseline" ? value : 6 - value
  };
}

function defaultSelection(scenario) {
  return {
    selected_fm: scenario.first_mile[0]?.id || "",
    selected_main: scenario.main_routes[0]?.id || "",
    selected_lm: scenario.last_mile[0]?.id || "",
    clarity: "",
    decision_ease: "",
    fmlm_understanding: "",
    preference_fit: ""
  };
}

async function queueLogEvent(participant, event) {
  const eventPayload = {
    timestamp: new Date().toISOString(),
    participant_id: participant.participant_id,
    condition_order: participant.condition_order,
    event_type: event.event_type,
    screen: event.screen || "",
    scenario_id: event.scenario_id || "",
    interface: event.interface || "",
    interface_type: event.interface_type || "",
    payload: event.payload || {}
  };

  const queued = storageGet(eventQueueKey, []);
  const nextQueue = [...queued, eventPayload];
  storageSet(eventQueueKey, nextQueue);

  if (!hasSupabaseConfig && !sheetUrl) return;
  await flushEventQueue();
}

async function flushEventQueue() {
  const queued = storageGet(eventQueueKey, []);
  if (!queued.length || (!hasSupabaseConfig && !sheetUrl)) return;

  const remaining = [];
  for (const eventPayload of queued) {
    try {
      if (hasSupabaseConfig) {
        await insertStudyEvent(eventPayload);
      } else {
        await fetch(sheetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ log_type: "event", ...eventPayload })
        });
      }
    } catch {
      remaining.push(eventPayload);
    }
  }
  storageSet(eventQueueKey, remaining);
}

export default function StudyApp() {
  const [ready, setReady] = useState(false);
  const [participant, setParticipant] = useState(null);
  const [screen, setScreen] = useState("consent");
  const [background, setBackground] = useState(initialBackground);
  const [ranking, setRanking] = useState(preferenceFactors);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [interfaceIndex, setInterfaceIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [records, setRecords] = useState([]);
  const [satisfaction, setSatisfaction] = useState(initialSatisfaction);
  const [submitState, setSubmitState] = useState("idle");
  const [scenarioPool, setScenarioPool] = useState(scenarioDb);

  useEffect(() => {
    flushEventQueue();
    const saved = storageGet("fmlm_current_participant", null);
    if (saved?.participant_id) {
      setParticipant(saved);
    } else {
      const nextCounter = storageGet("fmlm_participant_counter", 0);
      const created = {
        participant_id: makeParticipant(nextCounter),
        participant_counter: nextCounter,
        condition_order: conditionForCounter(nextCounter),
        created_at: new Date().toISOString()
      };
      storageSet("fmlm_participant_counter", nextCounter + 1);
      storageSet("fmlm_current_participant", created);
      setParticipant(created);
      queueLogEvent(created, {
        event_type: "session_started",
        screen: "consent",
        payload: { participant_counter: nextCounter }
      });
    }

    loadScenarioDb()
      .then((db) => setScenarioPool(db.length ? db : scenarioDb))
      .catch(() => setScenarioPool(storageGet("fmlm_admin_scenarios", scenarioDb)))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, screen, scenarioIndex, interfaceIndex]);

  const scenarios = useMemo(() => {
    if (!participant) return [];
    return seededShuffle(scenarioPool, participant.participant_id).slice(0, 5);
  }, [participant, scenarioPool]);

  const currentScenario = scenarios[scenarioIndex];
  const currentInterface = participant
    ? interfacesForCondition(participant.condition_order)[interfaceIndex]
    : "baseline";
  const currentKey = currentScenario ? `${currentScenario.id}:${currentInterface}` : "";
  const currentSelection = currentScenario
    ? selections[currentKey] || defaultSelection(currentScenario)
    : null;

  async function logEvent(event) {
    if (!participant) return;
    await queueLogEvent(participant, event);
  }

  function updateSelection(patch) {
    setSelections((prev) => ({
      ...prev,
      [currentKey]: { ...currentSelection, ...patch }
    }));
  }

  function saveScenarioRecord() {
    const totals = computeTotals(currentScenario, currentSelection);
    const preferenceScore = computePreferenceFit(currentScenario, currentSelection, ranking, currentInterface);
    const savedRecord = {
      scenario_id: currentScenario.id,
      interface: interfaceLabel(currentInterface, participant.condition_order),
      interface_type: currentInterface,
      selected_fm: currentSelection.selected_fm,
      selected_main: currentSelection.selected_main,
      selected_lm: currentSelection.selected_lm,
      total_time: totals.total_time,
      total_cost: totals.total_cost,
      distance_m: totals.distance_m,
      transfers: totals.transfers,
      clarity: Number(currentSelection.clarity),
      decision_ease: Number(currentSelection.decision_ease),
      fmlm_understanding: Number(currentSelection.fmlm_understanding),
      preference_fit: Number(currentSelection.preference_fit),
      ...preferenceScore
    };
    logEvent({
      event_type: "rating_submitted",
      screen: `scenario_${scenarioIndex + 1}`,
      scenario_id: currentScenario.id,
      interface: savedRecord.interface,
      interface_type: currentInterface,
      payload: savedRecord
    });
    setRecords((prev) => {
      const withoutDuplicate = prev.filter(
        (item) => !(item.scenario_id === savedRecord.scenario_id && item.interface_type === savedRecord.interface_type)
      );
      return [...withoutDuplicate, savedRecord];
    });

    if (interfaceIndex === 0) {
      setInterfaceIndex(1);
      logEvent({
        event_type: "scenario_interface_started",
        screen: `scenario_${scenarioIndex + 1}`,
        scenario_id: currentScenario.id,
        interface: interfaceLabel(interfacesForCondition(participant.condition_order)[1], participant.condition_order),
        interface_type: interfacesForCondition(participant.condition_order)[1],
        payload: {}
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (scenarioIndex < scenarios.length - 1) {
      const nextScenario = scenarios[scenarioIndex + 1];
      const nextInterface = interfacesForCondition(participant.condition_order)[0];
      setScenarioIndex((idx) => idx + 1);
      setInterfaceIndex(0);
      logEvent({
        event_type: "scenario_interface_started",
        screen: `scenario_${scenarioIndex + 2}`,
        scenario_id: nextScenario.id,
        interface: interfaceLabel(nextInterface, participant.condition_order),
        interface_type: nextInterface,
        payload: {}
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setScreen("satisfaction");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitFinal() {
    const decodedSatisfaction = decodeFinalSatisfaction(satisfaction, participant.condition_order);
    const satisfactionWithInterfaceTypes = {
      ...satisfaction,
      ...decodedSatisfaction
    };
    const summaryScores = summarizePreferenceScores(records);
    const payload = {
      timestamp: new Date().toISOString(),
      participant_id: participant.participant_id,
      condition_order: participant.condition_order,
      background,
      preference_ranking: ranking.map((item) => item.id),
      scenarios: records,
      summary_scores: summaryScores,
      satisfaction: satisfactionWithInterfaceTypes
    };
    storageSet(`fmlm_submission_${participant.participant_id}`, payload);
    setSubmitState("submitting");
    try {
      if (hasSupabaseConfig) {
        await insertStudySubmission(payload);
      } else if (sheetUrl) {
        await fetch(sheetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ log_type: "summary", ...payload })
        });
      }
      await logEvent({
        event_type: "study_completed",
        screen: "thanks",
        payload: {
          scenario_records: records.length,
          summary_scores: summaryScores,
          satisfaction: satisfactionWithInterfaceTypes
        }
      });
      storageSet("fmlm_current_participant", null);
      setSubmitState("done");
      setScreen("thanks");
    } catch (error) {
      setSubmitState("error");
    }
  }

  if (!ready || !participant) return <main className="loading">Loading study...</main>;

  return (
    <main>
      <TopBar participant={participant} screen={screen} scenarioIndex={scenarioIndex} />
      {screen === "consent" && (
        <ConsentTutorial
          onStart={() => {
            logEvent({ event_type: "consent_completed", screen: "consent", payload: {} });
            setScreen("background");
          }}
          participant={participant}
        />
      )}
      {screen === "background" && (
        <BackgroundPreference
          background={background}
          setBackground={setBackground}
          ranking={ranking}
          setRanking={setRanking}
          onContinue={() => {
            logEvent({
              event_type: "background_completed",
              screen: "background",
              payload: {
                background,
                preference_ranking: ranking.map((item) => item.id)
              }
            });
            if (scenarios[0]) {
              const firstInterface = interfacesForCondition(participant.condition_order)[0];
              logEvent({
                event_type: "scenario_interface_started",
                screen: "scenario_1",
                scenario_id: scenarios[0].id,
                interface: interfaceLabel(firstInterface, participant.condition_order),
                interface_type: firstInterface,
                payload: {}
              });
            }
            setScreen("scenario");
          }}
        />
      )}
      {screen === "scenario" && currentScenario && (
        <ScenarioScreen
          scenario={currentScenario}
          scenarioIndex={scenarioIndex}
          totalScenarios={scenarios.length}
          interfaceType={currentInterface}
          interfaceLabelText={interfaceLabel(currentInterface, participant.condition_order)}
          selection={currentSelection}
          updateSelection={updateSelection}
          onContinue={saveScenarioRecord}
        />
      )}
      {screen === "satisfaction" && (
        <Satisfaction
          satisfaction={satisfaction}
          setSatisfaction={setSatisfaction}
          onSubmit={submitFinal}
          submitState={submitState}
        />
      )}
      {screen === "thanks" && <Thanks participant={participant} />}
    </main>
  );
}

function TopBar({ participant, screen, scenarioIndex }) {
  const step =
    screen === "consent" ? 1 : screen === "background" ? 2 : screen === "scenario" ? 3 + scenarioIndex : screen === "satisfaction" ? 8 : 9;
  return (
    <header className="topbar">
      <div>
        <strong>Bangkok FMLM Study</strong>
        <span>Participant {participant.participant_id}</span>
      </div>
      <div className="pill">Screen {step}/9</div>
    </header>
  );
}

function ConsentTutorial({ onStart }) {
  const [consented, setConsented] = useState(false);

  return (
    <section className="page consent-page">
      <div className="consent-card">
        <h1>แบบสำรวจประกอบการวิจัย การเข้าถึงระบบขนส่งช่วงต้นทางและปลายทางในกรุงเทพฯ</h1>
        <div className="consent-grid">
          <section>
            <h2>วัตถุประสงค์</h2>
            <p>การศึกษานี้ต้องการเปรียบเทียบวิธีนำเสนอข้อมูลเส้นทาง เพื่อทำความเข้าใจว่าข้อมูลการเดินทางช่วงต้นทางและปลายทาง (FMLM) ช่วยให้ผู้ใช้ตัดสินใจเลือกเส้นทางได้ดีขึ้นหรือไม่</p>
          </section>
          <section>
            <h2>สิ่งที่ผู้เข้าร่วมจะทำ</h2>
            <p>คุณจะ:</p>
            <ul>
              <li>ตอบคำถามพื้นฐานเกี่ยวกับรูปแบบการเดินทางของคุณ</li>
              <li>ทดลองเลือกเส้นทางจากสถานการณ์การเดินทางหลายสถานการณ์</li>
              <li>เปรียบเทียบหน้าจอแอป 2 รูปแบบ ได้แก่ แอป A และแอป B</li>
              <li>ให้คะแนนความเข้าใจ ความง่ายในการตัดสินใจ และความพึงพอใจ</li>
            </ul>
          </section>
          <section>
            <h2>ระยะเวลา</h2>
            <p>ใช้เวลาประมาณ 10-15 นาที</p>
          </section>
          <section>
            <h2>ความสมัครใจ</h2>
            <p>การเข้าร่วมเป็นไปโดยสมัครใจ คุณสามารถหยุดทำแบบทดลองได้ทุกเมื่อ โดยไม่มีผลเสียใด ๆ</p>
          </section>
          <section>
            <h2>ข้อมูลและความเป็นส่วนตัว</h2>
            <p>ระบบจะไม่ขอข้อมูลส่วนตัวของคุณ ข้อมูลที่เก็บอาจรวมถึงคำตอบของคุณ เส้นทางที่เลือก คะแนนประเมิน และข้อมูลการใช้งาน เช่น ลำดับหน้าจอหรือเวลาที่ใช้ตอบ ข้อมูลจะใช้เพื่อการวิจัยเท่านั้น</p>
          </section>
        </div>
        <label className="checkline consent-check">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
          />
          <span>ฉันได้อ่านข้อมูลข้างต้น เข้าใจ และยินยอมเข้าร่วมการศึกษา</span>
        </label>
        <button className="primary" disabled={!consented} onClick={onStart}>ยินยอมและเริ่มทำแบบทดลอง</button>
      </div>
    </section>
  );
}

function BackgroundPreference({ background, setBackground, ranking, setRanking, onContinue }) {
  const canContinue = background.freq && background.modes.length > 0 && background.appUsage && background.multiLegFamiliarity;
  return (
    <section className="page background-page">
      <div className="page-intro">
        <p className="eyebrow">ข้อมูลก่อนเริ่มสถานการณ์</p>
        <h1>ข้อมูลพื้นฐาน + ความชอบ</h1>
      </div>
      <div className="question-block">
        <h2>Q1: คุณเดินทางบ่อยแค่ไหน</h2>
        <RadioList
          name="freq"
          options={travelFreqOptions}
          value={background.freq}
          onChange={(freq) => setBackground((prev) => ({ ...prev, freq }))}
        />
      </div>
      <div className="question-block">
        <h2>Q2: รูปแบบการเดินทางที่ใช้</h2>
        <div className="mode-grid">
          {travelModes.map(([id, icon, label]) => {
            const active = background.modes.includes(id);
            return (
              <button
                key={id}
                className={active ? "mode-tile active" : "mode-tile"}
                onClick={() =>
                  setBackground((prev) => ({
                    ...prev,
                    modes: active ? prev.modes.filter((mode) => mode !== id) : [...prev.modes, id]
                  }))
                }
              >
                <span>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="question-block">
        <h2>Q3: คุณใช้แอปนำทางบ่อยแค่ไหน</h2>
        <RadioList
          name="appUsage"
          options={appUsageOptions}
          value={background.appUsage}
          onChange={(appUsage) => setBackground((prev) => ({ ...prev, appUsage }))}
        />
      </div>
      <div className="question-block">
        <h2>Q4: ลากเพื่อจัดอันดับปัจจัยที่สำคัญที่สุด</h2>
        <RankList items={ranking} setItems={setRanking} />
      </div>
      <div className="question-block">
        <h2>Q5: คุณคุ้นเคยกับการเดินทางที่ต้องต่อหลายช่วงก่อนถึงสายหลัก เช่น เดิน → วิน → สองแถว → รถไฟฟ้า → เดินหรือต่อรถ อีกครั้ง มากแค่ไหน</h2>
        <ScaleChoice
          name="multiLegFamiliarity"
          options={multiLegFamiliarityOptions}
          value={background.multiLegFamiliarity}
          onChange={(multiLegFamiliarity) => setBackground((prev) => ({ ...prev, multiLegFamiliarity }))}
        />
      </div>
      <button className="primary" disabled={!canContinue} onClick={onContinue}>ไปยังสถานการณ์</button>
    </section>
  );
}

function ScaleChoice({ name, options, value, onChange }) {
  return (
    <div className="scale-choice">
      {options.map((option) => (
        <label key={option.value} className={Number(value) === option.value ? "selected" : ""}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={Number(value) === option.value}
            onChange={() => onChange(option.value)}
          />
          <strong>{option.value}</strong>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function RadioList({ name, options, value, onChange }) {
  return (
    <div className="radio-list">
      {options.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function RankList({ items, setItems }) {
  const [dragging, setDragging] = useState(null);
  const listRef = useRef(null);

  function moveItem(from, to) {
    if (from === to || to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragging(to);
  }

  function indexFromPointer(clientY) {
    const rows = Array.from(listRef.current?.querySelectorAll("[data-rank-row]") || []);
    const found = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    return found === -1 ? rows.length - 1 : found;
  }

  return (
    <div className="rank-list" ref={listRef}>
      {items.map((item, index) => (
        <div
          key={item.id}
          data-rank-row
          className={dragging === index ? "rank-row dragging" : "rank-row"}
          draggable
          onDragStart={() => setDragging(index)}
          onDragOver={(event) => {
            event.preventDefault();
            moveItem(dragging, index);
          }}
          onDragEnd={() => setDragging(null)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            setDragging(index);
          }}
          onPointerMove={(event) => {
            if (dragging === null || event.buttons === 0) return;
            moveItem(dragging, indexFromPointer(event.clientY));
          }}
          onPointerUp={() => setDragging(null)}
        >
          <span className="rank-no">{index + 1}</span>
          <span className="rank-icon">{item.icon}</span>
          <strong>{item.label}</strong>
          <span className="drag-handle">↕</span>
        </div>
      ))}
    </div>
  );
}

function ScenarioScreen({
  scenario,
  scenarioIndex,
  totalScenarios,
  interfaceType,
  interfaceLabelText,
  selection,
  updateSelection,
  onContinue
}) {
  const totals = computeTotals(scenario, selection);
  const appName = `แอป ${interfaceLabelText}`;
  return (
    <section className="scenario-page">
      <div className="scenario-head">
        <div>
          <p className="eyebrow">สถานการณ์ {scenarioIndex + 1}/{totalScenarios}</p>
          <h1>{scenario.origin} → {scenario.destination}</h1>
          <p className="app-badge">{appName}</p>
        </div>
      </div>
      {interfaceType === "baseline" ? (
        <BaselineInterface scenario={scenario} selection={selection} updateSelection={updateSelection} totals={totals} />
      ) : (
        <PrototypeInterface scenario={scenario} selection={selection} updateSelection={updateSelection} totals={totals} />
      )}
      <RatingPanel selection={selection} updateSelection={updateSelection} totals={totals} onContinue={onContinue} />
    </section>
  );
}

function BaselineInterface({ scenario, selection, updateSelection }) {
  function selectRoute(route) {
    const bundle = routeBundleForMain(scenario, route, "walk");
    updateSelection({
      selected_main: route.id,
      selected_fm: bundle.fm?.id || selection.selected_fm,
      selected_lm: bundle.lm?.id || selection.selected_lm
    });
  }

  return (
    <div className="baseline-shell">
      <div className="baseline-title">
        <span>ต้นทาง</span>
        <strong>{scenario.origin}</strong>
        <span>ปลายทาง</span>
        <strong>{scenario.destination}</strong>
      </div>
      <RouteMap
        mode="baseline"
        scenario={scenario}
        selection={selection}
        onSelectMain={(selected_main) => {
          const route = findMainRoute(scenario, selected_main);
          const bundle = route ? routeBundleForMain(scenario, route, "walk") : {};
          updateSelection({
            selected_main,
            selected_fm: bundle.fm?.id || selection.selected_fm,
            selected_lm: bundle.lm?.id || selection.selected_lm
          });
        }}
      />
      <div className="baseline-routes">
        {scenario.main_routes.map((route, index) => {
          const { fm, lm, totalTime, totalCost, connectorDistance } = routeBundleForMain(scenario, route, "walk");
          const active = selection.selected_main === route.id;
          return (
            <button
              key={route.id}
              className={active ? "baseline-route selected" : "baseline-route"}
              onClick={() => selectRoute(route)}
            >
              <span className="route-letter">
                Route {String.fromCharCode(65 + index)}
                <small>{displayMode(fm) || "เดิน"} → {displayMode(route)} → {displayMode(lm) || "เดิน"}</small>
              </span>
              <span className="baseline-total">
                <strong>{totalTime} นาที</strong>
                <small>{fm?.time_min || 0} + {route.time_min || 0} + {lm?.time_min || 0} นาที</small>
              </span>
              <span className="baseline-total">
                <strong>{totalCost} บาท</strong>
                <small>{transferText(route.transfers)}</small>
              </span>
              <span className="baseline-total">
                <strong>~{connectorDistance} ม.</strong>
                <small>เดิน/เชื่อมต่อรวม</small>
              </span>
              <span className="baseline-route-detail">
                <span>{fm?.icon} {displayDetail(fm)}</span>
                <span>{route.icon} {displayDetail(route)}</span>
                <span>{lm?.icon} {displayDetail(lm)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OptionCards({ title, items, selected, onSelect }) {
  return (
    <div className="option-group">
      <h2>{title}</h2>
      {items.map((item) => (
        <button
          key={item.id}
          className={selected === item.id ? "route-card selected" : "route-card"}
          onClick={() => onSelect(item.id)}
        >
          <span className="route-icon">{item.icon}</span>
          <span>
            <strong>{displayMode(item)}</strong>
            <small>{displayDetail(item)}</small>
          </span>
          <span className="route-metrics">{item.time_min} นาที<br />{item.cost_thb ? `${item.cost_thb}B` : "ฟรี"}</span>
        </button>
      ))}
    </div>
  );
}

function PrototypeInterface({ scenario, selection, updateSelection, totals }) {
  const [filter, setFilter] = useState("all");
  const main = findMainRoute(scenario, selection.selected_main);
  const firstMileItems = scenario.first_mile.filter((item) => !main || main.first_miles.includes(item.id));
  const lastMileItems = scenario.last_mile.filter((item) => !main || main.last_miles.includes(item.id));
  const visibleSections = filter === "all" ? ["main", "fm", "lm"] : [filter];
  const recommendations = recommendationBundles(scenario);

  function selectMainRoute(selected_main) {
    const nextMain = findMainRoute(scenario, selected_main);
    const nextFm =
      scenario.first_mile.find((item) => nextMain?.first_miles.includes(item.id) && item.id === selection.selected_fm) ||
      scenario.first_mile.find((item) => nextMain?.first_miles.includes(item.id)) ||
      scenario.first_mile[0];
    const nextLm =
      scenario.last_mile.find((item) => nextMain?.last_miles.includes(item.id) && item.id === selection.selected_lm) ||
      scenario.last_mile.find((item) => nextMain?.last_miles.includes(item.id)) ||
      scenario.last_mile[0];

    updateSelection({
      selected_main,
      selected_fm: nextFm?.id || selection.selected_fm,
      selected_lm: nextLm?.id || selection.selected_lm
    });
  }

  return (
    <div className="prototype-shell">
      <div className="baseline-title">
        <span>ต้นทาง</span>
        <strong>{scenario.origin}</strong>
        <span>ปลายทาง</span>
        <strong>{scenario.destination}</strong>
      </div>
      <RouteMap
        mode="prototype"
        scenario={scenario}
        selection={selection}
        onSelectMain={selectMainRoute}
        onSelectFirstMile={(selected_fm) => updateSelection({ selected_fm })}
        onSelectLastMile={(selected_lm) => updateSelection({ selected_lm })}
      />
      <div className="proto-summary">
        {recommendations.map((item) => (
          <button
            key={item.kind}
            className="summary-choice"
            onClick={() => updateSelection({
              selected_main: item.main.id,
              selected_fm: item.fm.id,
              selected_lm: item.lm.id
            })}
          >
            <span>{item.label}</span>
            <strong>{item.totalTime} นาที / {item.totalCost}B</strong>
            <small>{displayMode(item.fm)} → {displayMode(item.main)} → {displayMode(item.lm)}</small>
            <small>~{item.connectorDistance} ม. · {transferText(item.main.transfers)}</small>
          </button>
        ))}
      </div>
      <div className="segmented">
        {["all", "fm", "main", "lm"].map((id) => (
          <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>
            {id === "all" ? "All" : id === "fm" ? "First Mile" : id === "main" ? "Main" : "Last Mile"}
          </button>
        ))}
      </div>
      {visibleSections.includes("main") && (
        <FmlmTable
          title="Main Route — เส้นทางหลัก"
          tag="MAIN"
          color="blue"
          items={scenario.main_routes}
          selected={selection.selected_main}
          onSelect={selectMainRoute}
        />
      )}
      {visibleSections.includes("fm") && (
        <FmlmTable
          title="First Mile — ต้นทางถึงสถานี"
          tag="FM"
          color="purple"
          items={firstMileItems}
          selected={selection.selected_fm}
          onSelect={(selected_fm) => updateSelection({ selected_fm })}
        />
      )}
      {visibleSections.includes("lm") && (
        <FmlmTable
          title="Last Mile — สถานีถึงปลายทาง"
          tag="LM"
          color="green"
          items={lastMileItems}
          selected={selection.selected_lm}
          onSelect={(selected_lm) => updateSelection({ selected_lm })}
        />
      )}
    </div>
  );
}

function routeBundleForMain(scenario, route, connectorPreference = "first") {
  const linkedFm = scenario.first_mile.filter((item) => route.first_miles?.includes(item.id));
  const linkedLm = scenario.last_mile.filter((item) => route.last_miles?.includes(item.id));
  const fm = connectorPreference === "walk" ? preferredWalk(linkedFm) : linkedFm[0];
  const lm = connectorPreference === "walk" ? preferredWalk(linkedLm) : linkedLm[0];
  const connectorDistance = Number(fm?.distance_m || 0) + Number(lm?.distance_m || 0);
  return {
    fm,
    main: route,
    lm,
    connectorDistance,
    totalTime: Number(fm?.time_min || 0) + Number(route.time_min || 0) + Number(lm?.time_min || 0),
    totalCost: Number(fm?.cost_thb || 0) + Number(route.cost_thb || 0) + Number(lm?.cost_thb || 0)
  };
}

function preferredWalk(items) {
  return items.find((item) => {
    const text = `${item.mode_en || ""} ${item.mode || ""}`.toLowerCase();
    return text.includes("walk") || text.includes("เดิน");
  }) || items[0];
}

function recommendationBundles(scenario) {
  const bundles = scenario.main_routes.flatMap((main) => {
    const fms = scenario.first_mile.filter((item) => main.first_miles?.includes(item.id));
    const lms = scenario.last_mile.filter((item) => main.last_miles?.includes(item.id));
    return fms.flatMap((fm) => lms.map((lm) => {
      const connectorDistance = Number(fm.distance_m || 0) + Number(lm.distance_m || 0);
      return {
        fm,
        main,
        lm,
        connectorDistance,
        totalTime: Number(fm.time_min || 0) + Number(main.time_min || 0) + Number(lm.time_min || 0),
        totalCost: Number(fm.cost_thb || 0) + Number(main.cost_thb || 0) + Number(lm.cost_thb || 0)
      };
    }));
  });

  const fastest = minBy(bundles, (item) => item.totalTime);
  const cheapest = minBy(bundles, (item) => item.totalCost);
  const shortestConnector = minBy(bundles, (item) => item.connectorDistance);
  return [
    fastest && { ...fastest, kind: "fastest", label: "เร็วที่สุด" },
    cheapest && { ...cheapest, kind: "cheapest", label: "ถูกที่สุด" },
    shortestConnector && { ...shortestConnector, kind: "shortest", label: "เชื่อมต่อสั้นที่สุด" }
  ].filter(Boolean);
}

function minBy(items, score) {
  return items.reduce((best, item) => !best || score(item) < score(best) ? item : best, null);
}

function FmlmTable({ title, tag, color, items, selected, onSelect }) {
  const [sortKey, setSortKey] = useState("time_min");
  const [sortDirection, setSortDirection] = useState("asc");
  const bestTime = items.length ? Math.min(...items.map((item) => item.time_min)) : null;
  const sortedItems = [...items].sort((a, b) => {
    const left = Number(a[sortKey] || 0);
    const right = Number(b[sortKey] || 0);
    const primary = sortDirection === "asc" ? left - right : right - left;
    if (primary !== 0) return primary;
    return Number(a.time_min || 0) - Number(b.time_min || 0) || Number(a.cost_thb || 0) - Number(b.cost_thb || 0);
  });

  function toggleSort(nextKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextKey);
      setSortDirection("asc");
    }
  }

  return (
    <section className={`fmlm-table ${color}`}>
      <header>
        <h2>{title} <span>{tag}</span></h2>
        <div className="sort-control" aria-label="เรียงตาม">
          <span>เรียงตาม</span>
          <button className={sortKey === "time_min" ? "active" : ""} onClick={() => toggleSort("time_min")}>
            เวลา {sortKey === "time_min" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
          </button>
          <button className={sortKey === "cost_thb" ? "active" : ""} onClick={() => toggleSort("cost_thb")}>
            ราคา {sortKey === "cost_thb" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
          </button>
        </div>
      </header>
      {sortedItems.map((item) => (
        <button key={item.id} className={selected === item.id ? "fmlm-row selected" : "fmlm-row"} onClick={() => onSelect(item.id)}>
          <span className="route-icon">{item.icon}</span>
          <span className="row-detail">
            <strong>{displayMode(item)} {item.time_min === bestTime && <em>ดีที่สุด</em>}</strong>
            <small>{displayDetail(item)}</small>
          </span>
          <span className="row-frequency">{routeInfoLine(item)}</span>
          <span className="row-price">{item.time_min} นาที<br />{item.cost_thb ? `${item.cost_thb}B` : "ฟรี"}</span>
        </button>
      ))}
    </section>
  );
}

function routeInfoLine(item) {
  const parts = [];
  if (item.distance_m) parts.push(`~${item.distance_m} ม.`);
  if (item.distance_km) parts.push(`~${item.distance_km} กม.`);
  if (Number.isFinite(Number(item.transfers))) parts.push(transferText(item.transfers));
  if (item.reliability) parts.push(`ความแน่นอน: ${item.reliability}`);
  return parts.join(" · ");
}

function displayMode(item) {
  if (!item) return "";
  const raw = cleanRouteText(item.mode || item.mode_en || "");
  const modeEn = String(item.mode_en || "").toLowerCase();
  const icon = item.icon || "";

  if (modeEn.includes("walk") || raw.toLowerCase() === "walking") return "เดิน";
  if (modeEn.includes("motorcycle")) return raw.includes("GrabBike") ? "วินมอเตอร์ไซค์/GrabBike" : "วินมอเตอร์ไซค์";
  if (modeEn.includes("taxi")) return raw.includes("tuk-tuk") ? "รถต่อสั้น ๆ / Taxi" : "Taxi/Grab";
  if (modeEn.includes("bike")) return raw.includes("Pun Pun") ? "จักรยาน Pun Pun" : "จักรยาน";
  if (modeEn.includes("shuttle")) return "รถรับส่ง";
  if (modeEn.includes("songthaew")) return "สองแถว/รถเมล์ท้องถิ่น";
  if (modeEn.includes("tuk-tuk")) return raw.includes("MuvMi") ? "MuvMi/tuk-tuk" : "tuk-tuk";

  if (/^Road:/i.test(item.mode || "") || icon.includes("🚕")) return "Taxi/Grab โดยตรง";
  if (icon.includes("🚌")) return raw.replace(/^Bus\s*/i, "รถเมล์ ");
  if (icon.includes("🚐")) return raw.replace(/^Van\s*/i, "รถตู้ ");
  if (icon.includes("🚈") || icon.includes("🚇") || icon.includes("🚆")) return cleanTransitMode(raw);
  if (icon.includes("⛵")) return raw.replace(/^Boat\s*/i, "เรือ ");

  return raw || "ตัวเลือกเส้นทาง";
}

function transferText(value) {
  const transfers = Number(value || 0);
  return transfers > 0 ? `ต่อ ${transfers} ครั้ง` : "ไม่ต้องต่อ";
}

function displayDetail(item) {
  if (!item) return "";
  const mode = displayMode(item);
  const raw = cleanRouteText(item.detail || item.mode || "");
  const withoutPrefix = raw.replace(new RegExp(`^${escapeRegExp(cleanRouteText(item.mode || ""))}\\s*:?\\s*`, "i"), "");
  const distanceMatch = raw.match(/(?:\?|·)?\s*(\d+(?:\.\d+)?)\s*km/i);
  const distance = distanceMatch ? `ประมาณ ${Number(distanceMatch[1]).toFixed(1)} กม.` : "";
  const cleaned = withoutPrefix
    .replace(/\s*\?\s*\d+(?:\.\d+)?\s*km/i, "")
    .replace(/\s*·\s*\d+(?:\.\d+)?\s*กม\./i, "")
    .trim();

  if (cleaned && cleaned !== mode) {
    return distance ? `${cleaned} · ${distance}` : cleaned;
  }
  if (distance) return distance;
  if (item.distance_m) return `${mode}ประมาณ ${item.distance_m} ม.`;
  if (item.distance_km) return `${mode}ประมาณ ${item.distance_km} กม.`;
  return mode;
}

function cleanTransitMode(text) {
  return text
    .replace(/\bBang Khen\b/gi, "บางเขน")
    .replace(/\bKrung Thep Aphiwat\b/gi, "กรุงเทพอภิวัฒน์")
    .replace(/\bBang Sue\b/gi, "บางซื่อ")
    .replace(/\bSam Yan\b/gi, "สามย่าน")
    .replace(/\bBearing\b/gi, "แบริ่ง")
    .replace(/\bSaint Louis\b/gi, "เซนต์หลุยส์")
    .replace(/\bMin Buri\b/gi, "มีนบุรี")
    .replace(/\bAsok\b/gi, "อโศก")
    .replace(/\bMakkasan\b/gi, "มักกะสัน")
    .replaceAll("->", "→");
}

function cleanRouteText(text = "") {
  return String(text)
    .replace(/^Road:\s*/i, "")
    .replaceAll("->", "→")
    .replace(/\s+to\s+/gi, " → ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function RatingPanel({ selection, updateSelection, totals, onContinue }) {
  const canContinue = postInterfaceQuestions.every((question) => selection[question.field]);
  return (
    <aside className="rating-panel">
      <div>
        <span>ตัวเลือกปัจจุบัน</span>
        <strong>{totals.total_time} นาที · {totals.total_cost} บาท · FMLM ~{totals.distance_m} ม.</strong>
      </div>
      {postInterfaceQuestions.map((question, index) => (
        <RatingChoice
          key={question.field}
          label={`Q${index + 1}: ${question.text}`}
          construct={question.construct}
          value={selection[question.field]}
          onChange={(value) => updateSelection({ [question.field]: value })}
        />
      ))}
      <button className="primary" disabled={!canContinue} onClick={onContinue}>บันทึกและไปต่อ</button>
    </aside>
  );
}

function RatingChoice({ label, construct, value, onChange }) {
  return (
    <fieldset className="rating-choice">
      <legend>{label}</legend>
      <p>{construct}</p>
      <div>
        {agreementScaleOptions.map((option) => (
          <label key={option.value} className={String(value) === String(option.value) ? "selected" : ""}>
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={String(value) === String(option.value)}
              onChange={() => onChange(option.value)}
            />
            <span>
              <strong>{option.value}</strong>
              <small>{option.label}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Satisfaction({ satisfaction, setSatisfaction, onSubmit, submitState }) {
  const ready =
    finalComparativeQuestions.every((question) => satisfaction[question.field]) &&
    satisfaction.fmlm_usefulness;
  return (
    <section className="page final-page">
      <div className="page-intro">
        <p className="eyebrow">Final questionnaire</p>
        <h1>ความคิดเห็นโดยรวมหลังการทดลอง</h1>
        <p>หลังจากได้ทดลองใช้งานทั้งสองรูปแบบ กรุณาเปรียบเทียบประสบการณ์โดยรวมของคุณ</p>
      </div>

      <section className="question-block final-section">
        <h2>ส่วนที่ 1: การเปรียบเทียบระหว่างแอป</h2>
        <p className="scale-note">1 = แอป A ดีกว่ามาก · 2 = แอป A ดีกว่าเล็กน้อย · 3 = พอ ๆ กัน · 4 = แอป B ดีกว่าเล็กน้อย · 5 = แอป B ดีกว่ามาก</p>
        {finalComparativeQuestions.map((question, index) => (
          <FinalQuestion
            key={question.field}
            number={index + 1}
            question={question}
            options={satisfactionOptions}
            value={satisfaction[question.field]}
            onChange={(value) => setSatisfaction((prev) => ({ ...prev, [question.field]: value }))}
          />
        ))}
      </section>

      <section className="question-block final-section">
        <h2>ส่วนที่ 2: ประโยชน์ของข้อมูล First Mile / Last Mile</h2>
        <FinalQuestion
          number={5}
          question={{
            field: "fmlm_usefulness",
            text: "การแสดงข้อมูลช่วงต้นทาง–ช่วงหลัก–ช่วงปลายทาง (First Mile / Main Transit / Last Mile) มีประโยชน์ต่อคุณเพียงใด",
            construct: "Perceived usefulness of FMLM visualization"
          }}
          options={fmlmUsefulnessOptions}
          value={satisfaction.fmlm_usefulness}
          onChange={(value) => setSatisfaction((prev) => ({ ...prev, fmlm_usefulness: value }))}
        />
      </section>

      <section className="question-block final-section">
        <h2>ส่วนที่ 3: ความคิดเห็นเพิ่มเติม</h2>
        <label className="comment-box">
          Q6: ความคิดเห็นเพิ่มเติมเกี่ยวกับระบบนี้ (ไม่บังคับ)
          <textarea
            placeholder="เช่น สิ่งที่ชอบ สิ่งที่ควรปรับปรุง หรือข้อเสนอแนะอื่น ๆ"
            value={satisfaction.final_comments}
            onChange={(event) => setSatisfaction((prev) => ({ ...prev, final_comments: event.target.value }))}
          />
        </label>
      </section>
      {submitState === "error" && <p className="error">ส่งข้อมูลไม่สำเร็จ กรุณาตรวจสอบ Sheet URL แล้วลองอีกครั้ง</p>}
      <button className="primary" disabled={!ready || submitState === "submitting"} onClick={onSubmit}>
        {submitState === "submitting" ? "กำลังส่ง..." : "ส่งคำตอบสุดท้าย"}
      </button>
    </section>
  );
}

function FinalQuestion({ number, question, options, value, onChange }) {
  return (
    <fieldset className="final-question">
      <legend>Q{number}: {question.text}</legend>
      <p>{question.construct}</p>
      <div className="final-scale">
        {options.map((option) => (
          <label key={option.value} className={Number(value) === option.value ? "selected" : ""}>
            <input
              type="radio"
              name={question.field}
              value={option.value}
              checked={Number(value) === option.value}
              onChange={() => onChange(option.value)}
            />
            <strong>{option.value}</strong>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Thanks() {
  return (
    <section className="page thanks">
      <h1>แบบทดสอบเสร็จสิ้นแล้ว</h1>
      <p>ผู้วิจัยขอขอบพระคุณในความร่วมมือของท่านที่กรุณาให้ข้อมูล เพื่อนำไปใช้ประโยชน์ในเชิงวิชาการต่อไป</p>
    </section>
  );
}
