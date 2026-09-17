export const LOCALIZATION_CHOICES = ["前壁中隔領域", "下壁領域", "側壁領域", "後壁領域", "判断を保留"] as const;
export const CLINICAL_CHOICES = ["正常心電図", "心房細動", "心房粗動", "心室性期外収縮", "第1度房室ブロック", "第2度房室ブロック", "不完全右脚ブロック", "完全右脚ブロック", "完全左脚ブロック", "判断を保留"] as const;
export const CLINICAL_LESSONS = [
  {id:"a", answer:"正常心電図", code:"NORM", record:"00010", guide:"まずII誘導で拍の間隔とP波・QRS波の関係を追い、I・aVFや胸部誘導まで見渡します。正常という結論も、全誘導を確認した根拠を書いてから選びましょう。"},
  {id:"b", answer:"完全右脚ブロック", code:"CRBBB", record:"03155", guide:"QRS幅を確認し、V1・V2のQRS終末部と、I・V6のS波を見比べてください。一つの誘導の形だけで結論を決めず、幅と複数誘導の所見を組み合わせます。"},
  {id:"c", answer:"正常心電図", code:"NORM", record:"00057", guide:"もう一つの正常ラベルの実記録です。前の正常例と見た目が同じとは限りません。波の高さだけでなく、リズム・間隔・誘導間の変化を順に確認しましょう。"},
  {id:"d", answer:"完全左脚ブロック", code:"CLBBB", record:"00618", guide:"QRS幅と、I・aVL・V5・V6のR波の形を確認し、V1とも見比べてください。ST・Tの向きもQRSとの関係で記述します。この練習は急性虚血の判定を扱いません。"},
  {id:"e", answer:"心房細動", code:"AFIB", record:"04117", guide:"10秒全体でRR間隔を追い、一定のP波が各QRSの前にあるかを複数誘導で確認します。"},
  {id:"f", answer:"第1度房室ブロック", code:"1AVB", record:"02146", guide:"P波の始まりからQRSの始まりまでを同じ拍で測り、各P波がQRSへ伝わっているか確認します。"},
  {id:"g", answer:"心房粗動", code:"AFLT", record:"00023", guide:"II・III・aVFで連続する心房波を探し、QRSへ何対1で伝わるか確認します。"},
  {id:"h", answer:"心室性期外収縮", code:"PVC", record:"00219", guide:"予定より早い拍を探し、直前のP波、QRS幅、その後の休止を確認します。"},
  {id:"i", answer:"不完全右脚ブロック", code:"IRBBB", record:"00052", guide:"QRS幅を測り、V1・V2の終末部とI・V6のS波を確認します。"},
  {id:"j", answer:"第2度房室ブロック", code:"2AVB", record:"14009", guide:"P波を順に追い、QRSへ伝わらないP波とPR間隔の変化を確認します。"},
  {id:"k", kind:"localization", answer:"前壁中隔領域", code:"ASMI", record:"00526", guide:"V1〜V4を連続して見て、Q波・R波の増え方・ST-T変化がどこに分布するか確認します。"},
  {id:"l", kind:"localization", answer:"下壁領域", code:"IMI", record:"01577", guide:"II・III・aVFをまとめて確認し、I・aVLの変化とも見比べます。"},
  {id:"m", kind:"localization", answer:"側壁領域", code:"LMI", record:"10873", guide:"I・aVL・V5・V6をまとめて確認し、隣接する前壁・下壁誘導へ広がるかも見ます。"},
  {id:"n", kind:"localization", answer:"後壁領域", code:"PMI", record:"07244", guide:"V1〜V3で後壁の鏡像として現れるR波・ST-T変化を探し、V7〜V9で直接確認が必要と判断します。"},
] as const;
export const READING_STEPS = [
  {label:"記録の確認", hint:"校正、ノイズ、基線の揺れを確認。判定しにくい部分はありますか？"},
  {label:"心拍数・リズム", hint:"II誘導の10秒表示などで拍の間隔とP波・QRS波の関係を確認。"},
  {label:"電気軸", hint:"I・aVFなどのQRSの向きを見比べ、必要な誘導を追加して確認。"},
  {label:"間隔・QRS", hint:"PR・QRS・QTと胸部誘導の波形の移り変わりを確認。測定できなければその理由を記録。"},
  {label:"ST・T", hint:"基線との位置関係と、どの誘導に変化があるかを確認。"},
] as const;
