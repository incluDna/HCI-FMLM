"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { scenarioDb, preferenceFactors } from "@/lib/scenarios";
import {
  computeTotals,
  conditionForCounter,
  findMainRoute,
  findOption,
  interfaceLabel,
  interfacesForCondition,
  makeParticipant,
  seededShuffle,
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
    const savedRecord = {
      scenario_id: currentScenario.id,
      interface: interfaceLabel(currentInterface, participant.condition_order),
      interface_type: currentInterface,
      selected_fm: currentSelection.selected_fm,
      selected_main: currentSelection.selected_main,
      selected_lm: currentSelection.selected_lm,
      total_time: totals.total_time,
      total_cost: totals.total_cost,
      clarity: Number(currentSelection.clarity),
      decision_ease: Number(currentSelection.decision_ease),
      fmlm_understanding: Number(currentSelection.fmlm_understanding),
      preference_fit: Number(currentSelection.preference_fit)
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
    const payload = {
      timestamp: new Date().toISOString(),
      participant_id: participant.participant_id,
      condition_order: participant.condition_order,
      background,
      preference_ranking: ranking.map((item) => item.id),
      scenarios: records,
      satisfaction
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
          satisfaction
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
        <p className="eyebrow">แบบฟอร์มยินยอมเข้าร่วมการศึกษา</p>
        <h1>การเข้าถึงระบบขนส่งช่วงต้นทางและปลายทางในกรุงเทพฯ</h1>
        <div className="consent-grid">
          <section>
            <h2>วัตถุประสงค์</h2>
            <p>การศึกษานี้ต้องการเปรียบเทียบวิธีนำเสนอข้อมูลเส้นทาง เพื่อทำความเข้าใจว่าข้อมูล First Mile / Last Mile ช่วยให้ผู้ใช้ตัดสินใจเลือกเส้นทางได้ดีขึ้นหรือไม่</p>
          </section>
          <section>
            <h2>สิ่งที่ผู้เข้าร่วมจะทำ</h2>
            <p>คุณจะตอบคำถามพื้นฐาน จัดอันดับปัจจัยความชอบ ทดลองเลือกเส้นทางใน 5 สถานการณ์ผ่านแอป 2 รูปแบบ และให้คะแนนหลังการใช้งานแต่ละรูปแบบ</p>
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
            <p>ระบบจะบันทึกคำตอบ เช่น เส้นทางที่เลือก คะแนนประเมิน และข้อมูลการโต้ตอบกับหน้าเว็บ เพื่อใช้วิเคราะห์ในเชิงวิชาการเท่านั้น โดยไม่เก็บชื่อจริง</p>
          </section>
          <section>
            <h2>ความเสี่ยง</h2>
            <p>การศึกษานี้มีความเสี่ยงต่ำ เนื่องจากเป็นเพียงการใช้งานหน้าจอจำลองและตอบแบบสอบถาม</p>
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
          const fm = scenario.first_mile.find((item) => route?.first_miles.includes(item.id)) || scenario.first_mile[0];
          const lm = scenario.last_mile.find((item) => route?.last_miles.includes(item.id)) || scenario.last_mile[0];
          updateSelection({
            selected_main,
            selected_fm: fm?.id || selection.selected_fm,
            selected_lm: lm?.id || selection.selected_lm
          });
        }}
      />
      <div className="baseline-routes">
        {scenario.main_routes.slice(0, 3).map((route, index) => {
          const fm = scenario.first_mile.find((item) => route.first_miles.includes(item.id)) || scenario.first_mile[0];
          const lm = scenario.last_mile.find((item) => route.last_miles.includes(item.id)) || scenario.last_mile[0];
          const totalTime = (fm?.time_min || 0) + route.time_min + (lm?.time_min || 0);
          const totalCost = (fm?.cost_thb || 0) + route.cost_thb + (lm?.cost_thb || 0);
          const active = selection.selected_main === route.id;
          return (
            <button
              key={route.id}
              className={active ? "baseline-route selected" : "baseline-route"}
              onClick={() =>
                updateSelection({
                  selected_main: route.id,
                  selected_fm: fm?.id || selection.selected_fm,
                  selected_lm: lm?.id || selection.selected_lm
                })
              }
            >
              <span className="route-letter">Route {String.fromCharCode(65 + index)}</span>
              <span className="baseline-icons" aria-label="Route modes">
                <i>{fm?.icon}</i>
                <i>{route.icon}</i>
                <i>{lm?.icon}</i>
              </span>
              <span className="baseline-total">
                <strong>{totalTime} นาที</strong>
                <small>total time</small>
              </span>
              <span className="baseline-total">
                <strong>{totalCost} บาท</strong>
                <small>total cost</small>
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
            <strong>{item.mode}</strong>
            <small>{item.detail}</small>
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
      <div className="insight-chips">
        <span>🏍️ วินมอไซค์ใกล้เคียง: {scenario.first_mile.filter((x) => x.mode_en.includes("motorcycle")).length} จุด</span>
        <span>🚲 Pun Pun ใกล้ต้นทาง: {scenario.first_mile.filter((x) => x.mode_en.includes("bike")).length} จุด</span>
        <span>⛵ เรือ: {scenario.main_routes.some((route) => route.mode.includes("เรือ")) ? "มีเส้นทางนี้" : "ไม่มี"}</span>
        <span>🚕 แท็กซี่เริ่ม 35B</span>
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
        <div><span>เร็วที่สุด</span><strong>{totals.total_time} นาที</strong><small>{main?.mode}</small></div>
        <div><span>ถูกที่สุด</span><strong>{totals.total_cost}B</strong><small>{findOption(scenario, "first_mile", selection.selected_fm)?.mode}</small></div>
        <div><span>แนะนำ</span><strong>{totals.total_time} นาที / {totals.total_cost}B</strong><small>สมดุลเวลาและราคา</small></div>
        <div><span>ระยะทางเดิน</span><strong>~{totals.walk_m} ม.</strong><small>First + Last mile</small></div>
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

function FmlmTable({ title, tag, color, items, selected, onSelect }) {
  const bestTime = Math.min(...items.map((item) => item.time_min));
  return (
    <section className={`fmlm-table ${color}`}>
      <header>
        <h2>{title} <span>{tag}</span></h2>
        <div><button>เวลา</button><button>ราคา</button></div>
      </header>
      {items.map((item) => (
        <button key={item.id} className={selected === item.id ? "fmlm-row selected" : "fmlm-row"} onClick={() => onSelect(item.id)}>
          <span className="route-icon">{item.icon}</span>
          <span className="row-detail">
            <strong>{item.mode} {item.time_min === bestTime && <em>ดีที่สุด</em>}</strong>
            <small>{item.detail}</small>
          </span>
          <span className="row-frequency">{item.reliability === "สูง" ? "ทุก 3–5 นาที" : item.reliability === "กลาง" ? "ทุก 10 นาที" : "ไม่แน่นอน"}</span>
          <span className="row-price">{item.time_min} นาที<br />{item.cost_thb ? `${item.cost_thb}B` : "ฟรี"}</span>
        </button>
      ))}
      <footer>
        {items.map((item) => <span key={item.id}><i />{item.time_min}นาที/{item.cost_thb ? `${item.cost_thb}B` : "ฟรี"}</span>)}
      </footer>
    </section>
  );
}

function RatingPanel({ selection, updateSelection, totals, onContinue }) {
  const canContinue = postInterfaceQuestions.every((question) => selection[question.field]);
  return (
    <aside className="rating-panel">
      <div>
        <span>ตัวเลือกปัจจุบัน</span>
        <strong>{totals.total_time} นาที · {totals.total_cost} บาท · เดิน ~{totals.walk_m} ม.</strong>
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
