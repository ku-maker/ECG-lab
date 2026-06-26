/** 心電図シミュレーターの全パラメータ */
export interface ECGParameters {
  global: {
    /** 心拍数 (bpm) */
    heartRate: number;
    /** リズム規則性 (0=不整, 1=整) */
    rhythmRegularity: number;
  };
  pWave: {
    /** P波振幅 (0〜1) */
    amplitude: number;
    /** P波幅 (0=狭, 1=広) */
    width: number;
    /** P波形態 (0=正常, 1=異常/notched) */
    morphology: number;
  };
  qrsComplex: {
    /** QRS幅 (0=狭, 1=広) */
    width: number;
    /** QRS形態 (0=正常, 1=変形) */
    morphology: number;
  };
  stT_Segment: {
    /** ST上昇量 (-1〜1, 0=等電位) */
    stElevation: number;
    /** T波振幅 (0〜1) */
    tWaveAmplitude: number;
  };
}
