"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ECG_CASES } from "@/data/ecgCases";
import { emptyProgress, parseProgress, recordAttempt, recordReasonAttempt, summarizeProgress, summarizeReasons, type QuizAttempt, type ReasonAttempt } from "@/lib/quiz/progress";

const KEY = "ecg-lab.quiz.v1";
const EVENT = "ecg-lab-quiz-change";
const CASE_IDS = ECG_CASES.map((item) => item.id);
let memory = "";
let storageFailed = false;

function getSnapshot() {
  if (storageFailed) return memory;
  try { memory = window.localStorage.getItem(KEY) ?? ""; }
  catch { storageFailed = true; }
  return memory;
}
function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, notify);
  };
}
const getServerSnapshot = () => "";

export function useQuizProgress() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = useMemo(() => parseProgress(raw, CASE_IDS), [raw]);
  const summary = useMemo(() => summarizeProgress(progress), [progress]);
  const reasonSummary = useMemo(() => summarizeReasons(progress), [progress]);
  function save(raw: string) {
    memory = raw;
    try { window.localStorage.setItem(KEY, memory); }
    catch { storageFailed = true; }
    window.dispatchEvent(new Event(EVENT));
  }
  function record(attempt: QuizAttempt) {
    save(JSON.stringify(recordAttempt(parseProgress(getSnapshot(), CASE_IDS), attempt)));
  }
  function reset() { save(JSON.stringify(emptyProgress())); }
  function recordReason(attempt: ReasonAttempt) {
    save(JSON.stringify(recordReasonAttempt(parseProgress(getSnapshot(), CASE_IDS), attempt)));
  }
  return { progress, summary, reasonSummary, record, recordReason, reset, storageAvailable: !storageFailed };
}
