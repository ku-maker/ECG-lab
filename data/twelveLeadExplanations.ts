import type { TwelveLead } from '../lib/ecg/twelveLead';
export type ClinicalExplanation = {
  takeaway: string;
  steps: {title: string; leads: [TwelveLead, TwelveLead]; where: string; lookFor: string; criterion: string}[];
  reasoning: string;
  distinction: string;
  checklist: string[];
};
/** Observation prompts, not individually adjudicated measurements of these records. */
export const TWELVE_EXPLANATIONS: Record<string, ClinicalExplanation> = {
  a: {
    takeaway: '正常でも、リズム・QRS・誘導間の変化を順に確認します。',
    steps: [
      {title:'リズム',leads:['II','V1'],where:'IIの10秒全体。P波が見にくければV1',lookFor:'RR間隔と、P波からQRSへのつながり',criterion:'RRがほぼ一定で、各P波のあとにQRSが1つ続く'},
      {title:'電気軸',leads:['I','aVF'],where:'IとaVFのQRS全体',lookFor:'上向きと下向きのどちらが大きいか',criterion:'I・aVFがともに主に上向きなら正常軸の範囲を考える'},
      {title:'胸部誘導',leads:['V1','V6'],where:'V1からV6の同じ拍',lookFor:'R波が増え、S波が小さくなる変化',criterion:'途中の誘導も含め、急な変化や幅120 ms以上のQRSがないか確認'},
    ],
    reasoning:'正常と判断した根拠を、確認した誘導と所見で説明します。',
    distinction:'脚ブロックとは、QRS幅と複数誘導の形で区別します。',
    checklist:['II以外の誘導も確認したか','QRSの幅と波の高さを混同していないか','判定できなかった項目を言葉にできるか'],
  },
  b: {
    takeaway:'右脚ブロックは、QRS幅とV1・V6の形を組み合わせて見ます。',
    steps: [
      {title:'QRS幅',leads:['V1','V2'],where:'QRSが最も広く見える誘導',lookFor:'最初の振れから最後の振れまで',criterion:'120 ms以上＝小マス3個以上'},
      {title:'右胸部の形',leads:['V1','V2'],where:'V1・V2のQRS終末部',lookFor:'2つ目の上向きの波 R′',criterion:'rsr′・rsR′・rSR′型で、R′が最初のRより広い形を確認'},
      {title:'左側のS波',leads:['I','V6'],where:'I・V6のQRS終末部',lookFor:'幅広い、または遅れて終わるS波',criterion:'V1だけで決めず、左側誘導でも終末部の遅れを確認'},
    ],
    reasoning:'QRS幅に加え、V1・V2とI・V6の形を根拠にします。',
    distinction:'左脚ブロックとは、V1とI・V6の終末部の形で区別します。',
    checklist:['QRSの頂点からではなく始まりから測ったか','V1だけで結論を決めていないか','IまたはV6で終末部を確認したか'],
  },
  c: {
    takeaway:'見た目が違っても、同じ順序で正常所見を確認します。',
    steps: [
      {title:'リズム',leads:['II','V1'],where:'IIの10秒全体。P波はV1でも確認',lookFor:'RR間隔とP波・QRSのつながり',criterion:'RRがほぼ一定で、P波とQRSが1対1'},
      {title:'電気軸',leads:['I','aVF'],where:'IとaVFのQRS全体',lookFor:'QRSの主な向き',criterion:'両方が主に上向きなら正常軸の範囲を考える'},
      {title:'胸部誘導',leads:['V2','V5'],where:'V1からV6の同じ拍',lookFor:'R波とS波の移り変わり',criterion:'高さの個人差だけで異常とせず、幅と連続した変化を見る'},
    ],
    reasoning:'前の症例との見た目ではなく、今回確認した所見で判断します。',
    distinction:'正常例にも個人差があります。同じ確認順序を使います。',
    checklist:['前の正常例と比較する前に自分で読んだか','胸部誘導を途中で飛ばしていないか','高さの違いだけを異常の根拠にしていないか'],
  },
  d: {
    takeaway:'左脚ブロックは、QRS幅と左側誘導のR波を確認します。',
    steps: [
      {title:'QRS幅',leads:['V1','V6'],where:'QRSが最も広く見える誘導',lookFor:'最初の振れから最後の振れまで',criterion:'120 ms以上＝小マス3個以上'},
      {title:'左側のR波',leads:['I','aVL'],where:'I・aVL・V5・V6のR波',lookFor:'幅広く、切れ込み・平坦部を伴うR波',criterion:'「幅広い」はR波単独で決めない。V5・V6のR波頂点時間60 ms超も目安'},
      {title:'QRSとST・T',leads:['V1','V6'],where:'V1とV6のQRS直後',lookFor:'QRSの主方向とST・Tの向き',criterion:'QRSとST・Tを分けて記載し、この教材だけで虚血を判定しない'},
    ],
    reasoning:'QRS幅と、I・aVL・V5・V6の幅広いR波を根拠にします。',
    distinction:'右脚ブロックとは、V1とI・V6の形で区別します。',
    checklist:['左側の肢誘導と胸部誘導の両方を見たか','QRSとST・Tの所見を分けて書いたか','この教材で判断できる範囲を越えていないか'],
  },
  e: {
    takeaway:'心房細動は、不規則なRR間隔と一定したP波がないことを確認します。',
    steps: [
      {title:'RR間隔',leads:['II','V1'],where:'IIの10秒全体',lookFor:'隣り合うR波の間隔',criterion:'長短に繰り返しの規則がない「絶対的不整」'},
      {title:'P波',leads:['II','V1'],where:'各QRSの直前。IIとV1を照合',lookFor:'同じ形で一定間隔に出るP波',criterion:'明瞭で一定したP波を確認できない'},
      {title:'ほかの所見',leads:['V1','V6'],where:'V1からV6のQRSとその直後',lookFor:'QRS幅とST・T',criterion:'不規則なRRだけで決めず、P波の所見と組み合わせる'},
    ],
    reasoning:'RR間隔とP波の両方を根拠にします。',
    distinction:'洞性不整脈や期外収縮とは、P波とQRSの関係で区別します。',
    checklist:['10秒全体を確認したか','一定したP波を複数誘導で探したか','不整脈以外のQRS・ST・Tも記述したか'],
  },
  f: {
    takeaway:'第1度房室ブロックは、PR延長とP波・QRSの1対1対応を確認します。',
    steps: [
      {title:'P波とQRS',leads:['II','V1'],where:'IIの10秒全体。P波はV1でも確認',lookFor:'各P波のあとにQRSがあるか',criterion:'すべてのP波がQRSへ1対1で伝わる'},
      {title:'PR間隔',leads:['II','V1'],where:'P波が明瞭な同じ拍',lookFor:'P波の始まりからQRSの始まりまで',criterion:'200 ms超＝小マス5個超。この記録の元レポートは240 ms'},
      {title:'伝導脱落',leads:['II','V1'],where:'10秒全体のすべてのP波',lookFor:'QRSが続かないP波がないか',criterion:'脱落があれば第1度だけでは説明できない'},
    ],
    reasoning:'PR間隔の延長と、P波・QRSの1対1対応を根拠にします。',
    distinction:'第2度房室ブロックでは、一部のP波のあとにQRSが続きません。',
    checklist:['P波の頂点ではなく始まりから測ったか','同じ拍のQRS開始点まで測ったか','全てのP波がQRSへ伝わるか確認したか'],
  },
  g: {
    takeaway:'心房粗動は、連続する規則的な心房波と房室伝導比を確認します。',
    steps: [
      {title:'心房波',leads:['II','aVF'],where:'II・III・aVFのQRS間の基線',lookFor:'同じ形で連続する鋸歯状の心房波',criterion:'平坦な基線を挟まず、規則的な心房波が続く'},
      {title:'房室伝導比',leads:['II','V1'],where:'10秒全体の心房波とQRS',lookFor:'1つのQRSに対する心房波の数',criterion:'2対1、3対1など、心房波とQRSの対応を数える'},
      {title:'心房細動との区別',leads:['II','V1'],where:'複数のQRS間',lookFor:'心房波とRR間隔の規則性',criterion:'規則的な心房波があれば、一定したP波のない心房細動と異なる'},
    ],
    reasoning:'規則的な心房波と、心房波からQRSへの伝導比を根拠にします。',
    distinction:'心房細動では明瞭な規則的心房波がなく、RR間隔は通常不規則です。',
    checklist:['QRSだけでなく基線を追ったか','II・III・aVFを確認したか','心房波とQRSの数を対応させたか'],
  },
  h: {
    takeaway:'心室性期外収縮は、早く出る幅広いQRSと前後の関係を見ます。',
    steps: [
      {title:'早い拍',leads:['II','V1'],where:'IIの10秒全体でRR間隔が短い場所',lookFor:'予定より早く現れるQRS',criterion:'周囲の基本調律より早いタイミングで出現する'},
      {title:'QRSの形',leads:['V1','V6'],where:'早い拍のQRS全体',lookFor:'幅と、通常拍との形の違い',criterion:'QRS幅120 ms以上が典型。直前に一定したP波がないか確認'},
      {title:'拍のあと',leads:['II','V1'],where:'期外収縮の直後',lookFor:'次のQRSまでの休止',criterion:'早い拍のあとに長い休止を伴うことが多い'},
    ],
    reasoning:'出現時刻、QRS幅、直前のP波、直後の休止を組み合わせます。',
    distinction:'上室性期外収縮は通常QRSが狭く、早いP波が先行します。',
    checklist:['早い拍を10秒全体から探したか','通常拍とQRS幅を比べたか','直前のP波と直後の休止を確認したか'],
  },
  i: {
    takeaway:'不完全右脚ブロックは、右脚ブロック型の形とQRS幅を分けて確認します。',
    steps: [
      {title:'QRS幅',leads:['V1','V2'],where:'QRSが最も広く見える誘導',lookFor:'最初の振れから最後の振れまで',criterion:'成人では110〜119 msが目安。120 ms以上なら完全右脚ブロックを考える'},
      {title:'右胸部の形',leads:['V1','V2'],where:'V1・V2のQRS終末部',lookFor:'2つ目の上向きの波 R′',criterion:'rsr′・rsR′・rSR′型があるか確認'},
      {title:'左側のS波',leads:['I','V6'],where:'I・V6のQRS終末部',lookFor:'幅広い、または遅れて終わるS波',criterion:'右胸部の形だけで決めず、左側誘導も確認'},
    ],
    reasoning:'QRS幅が120 ms未満で、右脚ブロック型の形があることを根拠にします。',
    distinction:'完全右脚ブロックとの主な違いはQRS幅です。',
    checklist:['QRS全体を測ったか','V1・V2のR′を確認したか','IまたはV6のS波を確認したか'],
  },
  j: {
    takeaway:'第2度房室ブロックは、P波の一部がQRSへ伝わらないことを確認します。',
    steps: [
      {title:'P波を数える',leads:['II','V1'],where:'IIの10秒全体。P波はV1でも確認',lookFor:'P波とQRSの数',criterion:'QRSよりP波が多く、QRSが続かないP波がある'},
      {title:'PR間隔',leads:['II','V1'],where:'QRSへ伝わった拍のP波からQRSまで',lookFor:'脱落前後のPR間隔の変化',criterion:'徐々に延長するか、伝導した拍で一定かを確認'},
      {title:'型の判定',leads:['II','V1'],where:'脱落を含む連続した数拍',lookFor:'PR間隔と脱落の繰り返し方',criterion:'Wenckebach型かMobitz II型か判断できなければ、第2度までに留める'},
    ],
    reasoning:'QRSへ伝わらないP波と、伝導した拍のPR間隔を根拠にします。',
    distinction:'第1度ではPRが延長しても、すべてのP波がQRSへ伝わります。',
    checklist:['P波をQRSとは別に数えたか','脱落したP波を確認したか','PR間隔の変化を連続した拍で見たか'],
  },
  k: {
    takeaway:'変化がV1〜V4にまとまるため、前壁中隔領域を考えます。',
    steps: [
      {title:'前胸部誘導',leads:['V1','V4'],where:'V1からV4の同じ拍',lookFor:'Q波・R波の増え方とST・Tの変化',criterion:'V1〜V4に連続する変化がまとまるか確認'},
      {title:'側壁への広がり',leads:['I','V6'],where:'I・aVL・V5・V6',lookFor:'同じ種類の変化が側壁誘導まで続くか',criterion:'側壁まで明瞭なら前側壁への広がりも考える。II・III・aVFの反対向きの変化は対側性変化として照合する'},
      {title:'下壁との比較',leads:['II','aVF'],where:'II・III・aVF',lookFor:'下壁誘導のQRSとST・T',criterion:'前胸部の分布と分け、変化の中心を判断する'},
    ],
    reasoning:'単独誘導ではなく、隣り合う前胸部誘導に変化が連続することを根拠にします。',
    distinction:'下壁はII・III・aVF、側壁はI・aVL・V5・V6を中心に見ます。',
    checklist:['V1からV6を順番に見たか','STだけでなくQ波とR波も見たか','急性変化と断定せず分布として答えたか'],
  },
  l: {
    takeaway:'変化がII・III・aVFにまとまるため、下壁領域を考えます。',
    steps: [
      {title:'下壁誘導',leads:['II','aVF'],where:'II・III・aVFの同じ拍',lookFor:'Q波・QRSとST・Tの共通した変化',criterion:'3誘導のうち隣接する2誘導以上で分布を確認'},
      {title:'対側誘導',leads:['I','aVL'],where:'I・aVLの同じ時刻',lookFor:'下壁誘導と反対向きの変化や側壁の変化',criterion:'II・III・aVFの変化に対するI・aVLの反対向きの変化を対側性変化として照合する。単独では決めない'},
      {title:'右室・後壁の可能性',leads:['V1','V3'],where:'V1〜V3',lookFor:'前胸部誘導のST・TとR波',criterion:'標準12誘導だけで足りなければ右側・後壁誘導が必要'},
    ],
    reasoning:'II・III・aVFを一群として見て、変化の分布を根拠にします。',
    distinction:'前壁中隔はV1〜V4、側壁はI・aVL・V5・V6を中心に見ます。',
    checklist:['IIだけで決めていないか','IIIとaVFも確認したか','右室や後壁の評価限界を理解したか'],
  },
  m: {
    takeaway:'変化がI・aVL・V5・V6にまとまるため、側壁領域を考えます。',
    steps: [
      {title:'側壁誘導',leads:['I','aVL'],where:'I・aVLとV5・V6の同じ拍',lookFor:'Q波・QRSとST・Tの共通した変化',criterion:'高位側壁と低位側壁を合わせて分布を見る'},
      {title:'胸部誘導',leads:['V4','V6'],where:'V4からV6',lookFor:'変化が外側へ続く範囲',criterion:'V5・V6を中心に、V4まで及ぶか確認'},
      {title:'隣接領域',leads:['II','aVF'],where:'II・III・aVF',lookFor:'下壁誘導にも同じ変化があるか',criterion:'下壁にも広がれば下側壁領域を考える。反対向きの変化は対側性変化として照合する'},
    ],
    reasoning:'I・aVLとV5・V6を離して見ず、側壁を示す一群として確認します。',
    distinction:'前壁中隔はV1〜V4、下壁はII・III・aVFを中心に見ます。',
    checklist:['IとaVLの両方を見たか','V5・V6を確認したか','隣接領域への広がりも確認したか'],
  },

  n: {
    takeaway:'V1〜V3の変化を後壁の鏡像として捉え、後壁領域を考えます。',
    steps: [
      {title:'鏡像変化',leads:['V1','V3'],where:'V1〜V3のQRSとST・T',lookFor:'後壁側のQ波・ST上昇を反対側から見たような、高いR波やST低下',criterion:'V1〜V3にまとまる鏡像パターンを確認し、単独所見で確定しない'},
      {title:'下壁との関連',leads:['II','aVF'],where:'II・III・aVF',lookFor:'下壁領域にも梗塞性変化があるか',criterion:'後壁変化は下壁と併存することがあるため一緒に確認'},
      {title:'直接確認',leads:['V2','V3'],where:'標準12誘導で疑った後',lookFor:'追加するV7・V8・V9のST変化',criterion:'V7〜V9を記録し、鏡像ではなく後壁を直接確認する'},
    ],
    reasoning:'標準12誘導は後壁を直接見ないため、V1〜V3の反対向きの所見を鏡像として読みます。',
    distinction:'前壁虚血でもV1〜V3にST低下が出ることがあり、症状・経時変化・追加誘導を合わせます。',
    checklist:['V1〜V3を連続して見たか','R波とST・Tを合わせて見たか','V7〜V9が必要と判断できたか'],
  },

};
