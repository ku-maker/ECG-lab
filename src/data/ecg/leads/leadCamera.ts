// 誘導選択に連動したカメラ位置の計算（純関数）。
//
// カメラ位置を leadAxis（T2）から導出することで、目分量ハードコードの
// LEAD_CAMERA_POSITIONS を廃し、投影軸とカメラを同一ソースに統一する。
// 純関数なので Node の型ストリップで自動検証できる（scripts/verify-lead-camera.mjs）。

// 注：Node の型ストリップ検証（verify-lead-camera.mjs）が実体を解決できるよう
// 明示的な .ts 拡張子で import する（tsconfig の allowImportingTsExtensions で許可）。
import { leadAxis, type LeadId } from "./leadAxes.ts";

/** 既存 camera 初期距離に合わせる。OrbitControls の [minDistance,maxDistance] 内。 */
export const CAMERA_DISTANCE = 4.85;
/**
 * +Z（前方）への引き出し量。誘導軸はすべて前額面（z=0）にあるため、そのまま
 * カメラ方向に使うと前額面内に入り "edge-on"（心臓を真横から薄く見る）退化ビューに
 * なる。前方へ引き出すことで常に前方寄りから見る。この値が edge-on 回避の要。
 */
export const CAMERA_FRONT_BIAS = 1.15;

/**
 * 誘導 id の「陽極側 かつ 前方から見る」カメラ位置を返す。
 *   dir = normalize(leadAxis(id) + (0,0,frontBias))
 *   pos = target + dir * distance
 * frontBias>0 により pos.z は必ず target.z より大きい（edge-on でない）。
 */
export function leadCameraPosition(
  id: LeadId,
  target: [number, number, number],
  distance: number = CAMERA_DISTANCE,
  frontBias: number = CAMERA_FRONT_BIAS
): [number, number, number] {
  const axis = leadAxis(id);
  const dx = axis[0];
  const dy = axis[1];
  const dz = axis[2] + frontBias;
  const norm = Math.hypot(dx, dy, dz) || 1;

  return [
    target[0] + (dx / norm) * distance,
    target[1] + (dy / norm) * distance,
    target[2] + (dz / norm) * distance,
  ];
}
