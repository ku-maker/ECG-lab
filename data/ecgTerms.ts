import type { TeachingKind } from '../lib/ecg/teachingHighlights';
export type ECGTerm = { id: string; label: string; aliases: string[]; meaning: string; kinds: TeachingKind[] };
export const ECG_TERMS: ECGTerm[] = [
  { id:'p', label:'P波', aliases:['P波'], meaning:'心房に電気が広がるときの波。正常洞調律ではQRS波の前に見えます。', kinds:['p','pq','sequence'] },
  { id:'qrs', label:'QRS波', aliases:['QRS波','QRS幅'], meaning:'心室に電気が広がるときの波です。幅は始まりから終わりまでの時間で、高さとは別です。', kinds:['qrs','pq','sequence'] },
  { id:'r', label:'R波', aliases:['R波'], meaning:'QRS波の中の上向きの山です。隣り合うR波の間隔から拍の速さや規則性を見ます。', kinds:['qrs','rr','pq','sequence'] },
  { id:'t', label:'T波', aliases:['T波'], meaning:'心室の電気的な状態が、次の拍に備えて戻るときの波です。', kinds:['sequence'] },
  { id:'rr', label:'RR間隔', aliases:['RR間隔'], meaning:'R波から次のR波までの時間です。帯の横幅から、拍の速さと規則性を見ます。', kinds:['rr'] },
  { id:'pr', label:'PR間隔', aliases:['PR間隔'], meaning:'P波の始まりからQRS波の始まりまでの時間です。心房から心室へ電気が届くまでを見ます。', kinds:['pr'] },
  { id:'drop', label:'脱落', aliases:['脱落'], meaning:'P波があるのに、続くはずのQRS波が出ないことです。P波もなくなったという意味ではありません。', kinds:['dropped'] },
  { id:'st', label:'ST部分・基線', aliases:['ST部分','基線'], meaning:'ST部分はQRS波の終わりからT波の始まりまで。基線は、波の高さを比べる基準の線です。', kinds:[] },
  { id:'qt', label:'QT時間', aliases:['QT時間'], meaning:'QRS波の始まりからT波の終わりまで。心室に電気が広がり、元の状態に戻るまでの時間です。', kinds:[] },
  { id:'units', label:'BPM・ms', aliases:['BPM','bpm','ms'], meaning:'BPMは1分間の拍の数。msはミリ秒で、1,000 ms＝1秒です。', kinds:[] },
];
export function getTermsInText(text: string) {
  return ECG_TERMS.filter(term => term.aliases.some(alias => text.includes(alias)));
}
