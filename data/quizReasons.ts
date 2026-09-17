// Findings refer to these educational presets, not all possible patient ECGs.
// Kept consistent with the observation steps in ecgCases.ts.
export type ReasonExercise = { prompt: string; correct: string; alternatives: [string, string] };
export const REASON_TOPICS = [
  { id: "rhythm", label: "拍の速さ・間隔", caseIds: ["sinus-brady", "sinus-tachy", "sinus-arrhythmia", "atrial-tachy", "mat", "aivr", "ventricular-escape", "af"] },
  { id: "conduction", label: "P波とQRS波の関係", caseIds: ["nsr", "avblock1", "mobitz2", "wenckebach", "avblock3"] },
  { id: "qrs", label: "QRS波の幅・形", caseIds: ["pvc", "pvc-bigeminy", "pac", "pac-bigeminy", "ventricular-paced", "vt", "tdp", "vf"] },
  { id: "atrial", label: "P波・F波の見つけ方", caseIds: ["svt", "afl", "junctional"] },
  { id: "st", label: "ST部分の高さ", caseIds: ["stemi"] },
] as const;
export type ReasonTopicId = typeof REASON_TOPICS[number]["id"];
export const QUIZ_REASONS: Record<string, ReasonExercise> = {
  nsr: { prompt: "この正常洞調律の例で、P波とQRS波はどう並びますか？", correct: "各QRS波の前にP波が1つあり、毎回QRS波が続く", alternatives: ["P波とQRS波が別々の周期で出る", "P波は続くが、ときどきQRS波が抜ける"] },
  "sinus-brady": { prompt: "正常洞調律の初期設定と比べた、速さの特徴は？", correct: "R波の間隔が広く、拍が遅い", alternatives: ["R波の間隔が狭く、拍が速い", "R波の間隔と拍の速さは同じ"] },
  "sinus-tachy": { prompt: "正常洞調律の初期設定と比べた、速さの特徴は？", correct: "R波の間隔が狭く、拍が速い", alternatives: ["R波の間隔が広く、拍が遅い", "R波の間隔と拍の速さは同じ"] },
  "sinus-arrhythmia": { prompt: "この洞性不整脈のRR間隔はどう変化しますか？", correct: "徐々に短くなり、その後長くなる変化を繰り返す", alternatives: ["一定の繰り返しなく、ばらばらに変わる", "すべて同じ間隔で並ぶ"] },
  "atrial-tachy": { prompt: "この心房頻拍でQRS波の前に見える波は？", correct: "洞性P波と形の異なるP波", alternatives: ["一定したP波は見えない", "幅広い心室波だけが見える"] },
  aivr: { prompt: "このAIVRの速さとQRS波の特徴は？", correct: "比較的遅い速度で幅広いQRS波が続く", alternatives: ["非常に速い狭いQRS波が続く", "QRS波を識別できない不規則な波が続く"] },
  af: { prompt: "この波形のRR間隔の特徴は？", correct: "一定の繰り返しがなく、不規則に変わる", alternatives: ["すべて同じ間隔で並ぶ", "長い間隔と短い間隔が交互に繰り返す"] },
  pvc: { prompt: "早く入った拍のQRS波は、周囲の通常拍と比べて？", correct: "幅が広く、形も大きく異なる", alternatives: ["幅と形は通常拍とほぼ同じ", "早い拍の位置にはQRS波が出ない"] },
  "pvc-bigeminy": { prompt: "通常拍とPVCはどのように並びますか？", correct: "通常拍と幅広いPVCが1拍ずつ交互に並ぶ", alternatives: ["通常拍が3拍続くたびにPVCが1拍出る", "幅広い拍だけが連続する"] },
  "pac-bigeminy": { prompt: "通常拍とPACはどのように並びますか？", correct: "狭い通常拍と早い狭QRS拍が1拍ずつ交互に並ぶ", alternatives: ["通常拍と幅広いPVCが交互に並ぶ", "幅広い拍だけが連続する"] },
  mat: { prompt: "このMATでP波を数拍比べると？", correct: "向きや高さの異なるP波が3種類以上見える", alternatives: ["同じ形のP波が毎回見える", "一定して識別できるP波がない"] },
  "ventricular-escape": { prompt: "この心室補充調律の特徴は？", correct: "遅い速度で幅広いQRS波が規則的に続く", alternatives: ["速い速度で狭いQRS波が続く", "QRS波を識別できない不規則な波が続く"] },
  "ventricular-paced": { prompt: "幅広いQRS波の直前にあるものは？", correct: "細く鋭いペーシングスパイク", alternatives: ["鋸歯状のF波", "形の異なる3種類以上のP波"] },
  pac: { prompt: "この心房性期外収縮の例で、早い拍のQRS波は？", correct: "幅が狭く、通常拍に近い形", alternatives: ["幅広いQRS波に大きく変形する", "早い拍にはQRS波が続かない"] },
  avblock1: { prompt: "この例のPR間隔とQRS波のつながりは？", correct: "PR間隔は長いがほぼ一定で、毎回QRS波が続く", alternatives: ["PR間隔が徐々に延び、QRS波が抜ける", "P波とQRS波が無関係に出る"] },
  mobitz2: { prompt: "QRS波が抜ける前のPR間隔は？", correct: "伝導している拍ではほぼ一定", alternatives: ["1拍ごとに徐々に長くなる", "P波とQRS波が無関係で、毎回ばらばら"] },
  wenckebach: { prompt: "QRS波が抜けるまでのPR間隔の変化は？", correct: "順に長くなり、脱落後に短く戻る", alternatives: ["伝導している拍ではずっと一定", "順に短くなり、脱落後に長く戻る"] },
  avblock3: { prompt: "P波とQRS波の関係は？", correct: "それぞれ別の周期で出て、関係が一定しない", alternatives: ["各P波のあとに一定のPRでQRS波が続く", "PR間隔が順に延びてからQRS波が抜ける"] },
  svt: { prompt: "このSVTの例で、P波はどう見えますか？", correct: "QRS波やT波から分けて見つけにくい", alternatives: ["各QRS波の前に独立したP波がはっきり見える", "規則的な鋸歯状の波が連続して見える"] },
  stemi: { prompt: "この例のST部分は、基線に対して？", correct: "上がっている", alternatives: ["下がっている", "基線とほぼ同じ高さ"] },
  tdp: { prompt: "幅広い波形を数拍追うと、どう変わりますか？", correct: "振幅や向きが周期的に変わる", alternatives: ["同じ高さ・向きが続く", "狭い正常形のQRS波だけが続く"] },
  afl: { prompt: "QRS波の間にある小さな波の特徴は？", correct: "規則的な鋸歯状のF波が続く", alternatives: ["不規則な細かい揺れだけが見える", "QRS波の間はずっと平ら"] },
  junctional: { prompt: "この接合部調律の例で、QRS波の直前は？", correct: "いつもの上向きP波の代わりに、ごく小さな下向きの波がある", alternatives: ["明瞭な上向きP波が毎回ある", "鋸歯状のF波が連続する"] },
  vt: { prompt: "この単形性VTの例で、QRS波を数拍比べると？", correct: "似た形の幅広い波が続く", alternatives: ["幅広い波の向きや高さが周期的に変わる", "狭い正常形のQRS波が続く"] },
  vf: { prompt: "この波形では、QRS波をどう追えますか？", correct: "そろったQRS波を識別して数えられない", alternatives: ["同じ形のQRS波が規則的に並ぶ", "P波だけが規則的に並び、QRS波が全く出ない"] },
};
export function getReasonChoices(caseId: string, seed: number) {
  const exercise = QUIZ_REASONS[caseId];
  if (!exercise) return null;
  const options = [exercise.correct, ...exercise.alternatives];
  const offset = Math.abs(Math.trunc(seed)) % options.length;
  return { ...exercise, options: [...options.slice(offset), ...options.slice(0, offset)] };
}
