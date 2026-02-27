import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
const HASH = (str) => {
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = ((h2 << 5) + h2 + c) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
};
const CREDENTIALS = {
  applicant: { idHash: HASH("applicant"), passHash: HASH("apply2026"), role: "applicant" },
  support: { idHash: HASH("support"), passHash: HASH("support2026"), role: "support" },
};
const SESSION_TIMEOUT = 30 * 60 * 1000;

// ═══════════════════════════════════════
// COLOR THEME
// ═══════════════════════════════════════
const C = {
  bg: "#f5f4f1", bgCard: "#ffffff", bgInput: "#f8f7f5",
  border: "#e2ddd5", borderLight: "#ece8e1",
  text: "#2c2c2c", textMuted: "#7a756d", textLight: "#a09a91", textFaint: "#b8b2a8",
  accent: "#2c4a6e", accentLight: "#5b7ea1", accentPale: "#e8eef5",
  gold: "#8b7335", goldPale: "#f5f0e3",
  success: "#3d6b4f", successLight: "#eaf2ec",
  danger: "#8b3a3a", dangerLight: "#f5eded",
  warn: "#8b6b2a", warnLight: "#f7f2e6",
  headerBg: "#1c2536", headerText: "#e8e5df",
};
const font = "'Noto Sans JP', 'Hiragino Sans', sans-serif";

// ═══════════════════════════════════════
// DASHBOARD DATA
// ═══════════════════════════════════════
const SCHEDULE_DATA = [
  { date: "2/27", label: "本日", desc: "経営判断・チーム編成・GビズID確認", status: "today", deadline: false },
  { date: "3/1-6", label: "戦略策定", desc: "売上100億円ロードマップ策定・投資計画確定", status: "upcoming", deadline: false },
  { date: "3/9-12", label: "システム入力", desc: "jGrants上での宣言申請準備", status: "upcoming", deadline: false },
  { date: "3/13", label: "宣言申請期限", desc: "100億宣言のオンライン申請完了（厳守）", status: "upcoming", deadline: true },
  { date: "3/16-25", label: "本申請準備", desc: "事業計画書（最大15枚）完成・公表待ち", status: "upcoming", deadline: false },
  { date: "3/25", label: "実質締切", desc: "システム負荷を考慮した推奨提出日", status: "upcoming", deadline: true },
  { date: "3/26", label: "補助金締切", desc: "15:00厳守（17時ではない！）", status: "upcoming", deadline: true },
  { date: "5月下旬", label: "1次審査結果", desc: "書面審査の結果公表", status: "future", deadline: false },
  { date: "6/22-7/10", label: "2次審査", desc: "プレゼン審査（経営者本人のみ）", status: "future", deadline: false },
  { date: "7月下旬", label: "最終採択", desc: "採択発表", status: "future", deadline: false },
];
const CHECKLIST_SECTIONS = [
  { title: "前提条件（最優先）", icon: "◆", items: [
    { id: "gbiz", label: "GビズIDプライム取得済み", note: "未取得の場合は即日申請（発行まで1〜2週間）", critical: true },
    { id: "sales", label: "売上高10億円以上100億円未満を確認", note: "中小企業基本法上の定義に該当すること", critical: true },
    { id: "invest", label: "税抜1億円超の投資計画あり", note: "建物費＋機械装置費＋ソフトウェア費の合計", critical: true },
  ]},
  { title: "100億宣言の準備", icon: "◇", items: [
    { id: "dec_overview", label: "企業概要（売上・従業員数・事業ポートフォリオ）" },
    { id: "dec_goal", label: "売上100億円の目標・課題・ロードマップ", note: "いつまでに・どの成長率で" },
    { id: "dec_measure", label: "具体的措置（設備投資・海外展開・M&A・DX等）", note: "補助金の対象事業と整合させること" },
    { id: "dec_org", label: "実施体制（組織図・次世代リーダー・外部専門家）" },
    { id: "dec_commit", label: "経営者のコミットメント（情熱・社会的責任）", note: "経営者自身の言葉で" },
  ]},
  { title: "補助金申請書類", icon: "◇", items: [
    { id: "plan", label: "事業計画書（最大15枚）", note: "市場分析・独自性・リスク対応を含む" },
    { id: "quote", label: "見積書（相見積もり含む）", note: "建設会社・機械メーカーから取得" },
    { id: "wage", label: "賃上げ計画書（年率4.5%以上）", note: "役員除外・従業員1人当たり給与で計算" },
    { id: "financial", label: "直近3期分の決算書・確定申告書" },
    { id: "registry", label: "登記簿謄本（履歴事項全部証明書）", note: "3ヶ月以内のもの" },
    { id: "tax", label: "納税証明書" },
  ]},
  { title: "加点項目（任意だが推奨）", icon: "☆", items: [
    { id: "ip", label: "知的財産・経済安全保障への取組み", note: "特許・技術流出防止策" },
    { id: "health", label: "健康経営優良法人の認定" },
    { id: "region", label: "地域波及効果の具体的記述", note: "雇用拡大・地元仕入れ増加等" },
    { id: "export_plan", label: "輸出・海外展開計画" },
  ]}
];
const HEARING_FIELDS = [
  { section: "基本情報", fields: [
    { id: "company_name", label: "会社名", type: "text", placeholder: "株式会社〇〇" },
    { id: "representative", label: "代表者名", type: "text", placeholder: "山田 太郎" },
    { id: "industry", label: "業種", type: "select", options: ["製造業","卸売・小売業","建設業","情報通信業","サービス業","運輸業","飲食業","その他"] },
    { id: "employees", label: "従業員数", type: "number", placeholder: "150" },
    { id: "current_sales", label: "直近売上高（億円）", type: "number", placeholder: "25" },
    { id: "location", label: "本社所在地", type: "text", placeholder: "千葉県..." },
    { id: "established", label: "設立年", type: "number", placeholder: "1985" },
  ]},
  { section: "成長戦略", fields: [
    { id: "target_year", label: "100億円達成目標年", type: "select", options: ["2028年","2029年","2030年","2031年","2032年","2033年"] },
    { id: "growth_strategy", label: "主な成長戦略", type: "multiselect", options: ["新工場建設","海外展開","M&A","DX推進","新規事業","既存事業の拡大"] },
    { id: "market", label: "対象市場・業界トレンド", type: "textarea", placeholder: "半導体市場の拡大、EV関連部品の需要増..." },
    { id: "competitive_advantage", label: "自社の強み・独自性", type: "textarea", placeholder: "特許技術、長年の顧客基盤..." },
    { id: "bottleneck", label: "現在のボトルネック・課題", type: "textarea", placeholder: "生産能力の限界、人材不足..." },
  ]},
  { section: "100億宣言の準備（詳細）", fields: [
    { id: "declaration_summary", label: "100億宣言メッセージ（要約）", type: "textarea", placeholder: "3〜5行で、目指す姿や背景を要約..." },
    { id: "declaration_keywords", label: "宣言に盛り込みたいキーワード", type: "textarea", placeholder: "例）地域No.1雇用、世界市場、高付加価値、サステナビリティ..." },
    { id: "declaration_story_customers", label: "顧客にどんな価値を約束するか", type: "textarea", placeholder: "5年後に顧客からどう評価されていたいか..." },
    { id: "declaration_story_employees", label: "従業員にどんな未来を見せたいか", type: "textarea", placeholder: "賃金水準、働き方、キャリア、教育など..." },
    { id: "declaration_story_region", label: "地域・社会へのインパクト", type: "textarea", placeholder: "雇用創出、地元仕入れ、税収、技術継承など..." },
    { id: "roadmap_3year", label: "3年後までの具体的マイルストーン", type: "textarea", placeholder: "売上・利益・投資・組織体制などの年次目標..." },
    { id: "roadmap_5year", label: "5年後（100億達成時）の姿", type: "textarea", placeholder: "事業ポートフォリオ、拠点数、主力商品・サービス..." },
    { id: "monthly_milestones", label: "今後12ヶ月の月次マイルストーン", type: "textarea", placeholder: "例）4月:宣言案作成／5月:社内合意／6月:宣言申請／..." },
    { id: "weekly_routine", label: "経営陣の週間ルーティン", type: "textarea", placeholder: "毎週の会議・KPI確認・現場ラウンドなど、習慣化したいこと..." },
    { id: "daily_routine", label: "日課・行動原則", type: "textarea", placeholder: "経営者として毎日実行したい確認事項・コミュニケーション..." },
    { id: "declaration_risks", label: "100億宣言に伴う主なリスク", type: "textarea", placeholder: "需要変動、採用難、金利・為替、設備稼働率など..." },
    { id: "declaration_risks_plan", label: "リスクへの対応方針（Bプラン）", type: "textarea", placeholder: "「こうなった場合はこうする」という代替案..." },
  ]},
  { section: "投資計画", fields: [
    { id: "building_cost", label: "建物費（万円）", type: "number", placeholder: "30000" },
    { id: "equipment_cost", label: "機械装置費（万円）", type: "number", placeholder: "20000" },
    { id: "software_cost", label: "ソフトウェア費（万円）", type: "number", placeholder: "5000" },
    { id: "investment_detail", label: "投資内容の詳細", type: "textarea", placeholder: "新工場建設、最新ロボットライン導入..." },
    { id: "investment_location", label: "投資場所", type: "text", placeholder: "千葉県〇〇市" },
  ]},
  { section: "賃上げ・人材計画", fields: [
    { id: "avg_salary", label: "現在の1人当たり平均給与（万円/年）", type: "number", placeholder: "420" },
    { id: "wage_increase_plan", label: "賃上げ計画の概要", type: "textarea", placeholder: "毎年4.5%以上の昇給を3年間継続..." },
    { id: "hiring_plan", label: "採用計画（今後3年間）", type: "textarea", placeholder: "毎年20名採用予定..." },
    { id: "leader_dev", label: "次世代リーダー育成施策", type: "textarea", placeholder: "幹部候補研修プログラム..." },
  ]},
  { section: "経営者の想い", fields: [
    { id: "vision", label: "なぜ100億円を目指すのか", type: "textarea", placeholder: "地域の雇用を守り、世界に通用するものづくり企業へ..." },
    { id: "social_responsibility", label: "社会的責任・地域貢献", type: "textarea", placeholder: "地元雇用の拡大、協力会社との共存共栄..." },
    { id: "risk_plan", label: "リスクへの対応（Bプラン）", type: "textarea", placeholder: "建築費高騰→段階的投資、人材不足→自動化推進..." },
  ]},
];
const APPLICATION_SECTIONS = [
  { section: "申請者情報", fields: [
    { id: "app_company", label: "法人名（正式名称）", type: "text", placeholder: "株式会社〇〇", required: true, sensitive: true },
    { id: "app_corporate_number", label: "法人番号（13桁）", type: "text", placeholder: "1234567890123", required: true, sensitive: true, validate: v => /^\d{13}$/.test(v) ? null : "13桁の数字" },
    { id: "app_representative", label: "代表者 氏名", type: "text", placeholder: "山田 太郎", required: true, sensitive: true },
    { id: "app_rep_title", label: "代表者 役職", type: "text", placeholder: "代表取締役社長", required: true },
    { id: "app_address", label: "本社所在地", type: "text", placeholder: "千葉県〇〇市...", required: true, sensitive: true },
    { id: "app_tel", label: "電話番号", type: "text", placeholder: "043-000-0000", required: true, sensitive: true },
    { id: "app_email", label: "メールアドレス", type: "text", placeholder: "info@example.co.jp", required: true, sensitive: true, validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "正しいメールアドレスを入力" },
    { id: "app_contact_name", label: "担当者 氏名", type: "text", placeholder: "鈴木 花子", required: true },
    { id: "app_contact_dept", label: "担当者 部署", type: "text", placeholder: "経営企画部" },
    { id: "app_contact_tel", label: "担当者 電話番号", type: "text", placeholder: "043-000-0001", required: true, sensitive: true },
    { id: "app_contact_email", label: "担当者 メールアドレス", type: "text", placeholder: "suzuki@example.co.jp", required: true, sensitive: true },
  ]},
  { section: "GビズID情報", fields: [
    { id: "app_gbiz_id", label: "GビズIDプライム アカウントID", type: "text", placeholder: "gBizxxxxxxxx", required: true, sensitive: true },
    { id: "app_gbiz_status", label: "GビズIDの状態", type: "select", options: ["取得済み・利用可能","申請中（発行待ち）","未申請"], required: true },
  ]},
  { section: "企業規模・適格性", fields: [
    { id: "app_sme_category", label: "中小企業基本法上の区分", type: "select", options: ["製造業（資本金3億円以下 or 従業員300人以下）","卸売業（資本金1億円以下 or 従業員100人以下）","小売業（資本金5千万円以下 or 従業員50人以下）","サービス業（資本金5千万円以下 or 従業員100人以下）"], required: true },
    { id: "app_capital", label: "資本金（万円）", type: "number", placeholder: "5000", required: true, sensitive: true },
    { id: "app_employee_count", label: "常勤従業員数", type: "number", placeholder: "150", required: true },
    { id: "app_sales_y1", label: "直近期 売上高（万円）", type: "number", placeholder: "250000", required: true, sensitive: true },
    { id: "app_sales_y2", label: "前期 売上高（万円）", type: "number", placeholder: "230000", required: true, sensitive: true },
    { id: "app_sales_y3", label: "前々期 売上高（万円）", type: "number", placeholder: "210000", required: true, sensitive: true },
    { id: "app_profit_y1", label: "直近期 経常利益（万円）", type: "number", placeholder: "15000", required: true, sensitive: true },
    { id: "app_established_date", label: "設立年月日", type: "text", placeholder: "1985-04-01", required: true },
  ]},
  { section: "100億宣言情報", fields: [
    { id: "app_declaration_status", label: "100億宣言の状況", type: "select", options: ["公表済み（ポータル掲載済み）","申請済み（公表待ち）","未申請（これから申請）"], required: true },
    { id: "app_declaration_date", label: "宣言申請日（予定含む）", type: "text", placeholder: "2026-03-10", required: true },
    { id: "app_portal_url", label: "ポータル掲載URL", type: "text", placeholder: "https://100oku-portal.smrj.go.jp/..." },
    { id: "app_target_sales", label: "目標売上高（億円）", type: "number", placeholder: "100", required: true },
    { id: "app_target_year_achieve", label: "達成目標年度", type: "select", options: ["2028年度","2029年度","2030年度","2031年度","2032年度","2033年度"], required: true },
  ]},
  { section: "投資計画（税抜）", fields: [
    { id: "app_inv_building", label: "建物費（万円・税抜）", type: "number", placeholder: "30000", required: true, sensitive: true },
    { id: "app_inv_equipment", label: "機械装置費（万円・税抜）", type: "number", placeholder: "20000", required: true, sensitive: true },
    { id: "app_inv_software", label: "ソフトウェア費（万円・税抜）", type: "number", placeholder: "5000", required: true, sensitive: true },
    { id: "app_inv_outsource", label: "外注費（万円・税抜）", type: "number", placeholder: "3000", sensitive: true },
    { id: "app_inv_expert", label: "専門家経費（万円・税抜）", type: "number", placeholder: "500" },
    { id: "app_inv_location", label: "投資実施場所", type: "text", placeholder: "千葉県〇〇市...", required: true },
    { id: "app_inv_start", label: "事業開始予定日", type: "text", placeholder: "2026-10-01", required: true },
    { id: "app_inv_end", label: "事業完了予定日", type: "text", placeholder: "2028-03-31", required: true },
    { id: "app_inv_summary", label: "投資概要", type: "textarea", placeholder: "新工場建設と最新自動化ラインの導入...", required: true },
  ]},
  { section: "賃上げ計画", fields: [
    { id: "app_wage_current", label: "基準年度の1人当たり給与（万円/年）", type: "number", placeholder: "420", required: true, sensitive: true },
    { id: "app_wage_y1", label: "1年後目標（万円/年）", type: "number", placeholder: "439", required: true },
    { id: "app_wage_y2", label: "2年後目標（万円/年）", type: "number", placeholder: "459", required: true },
    { id: "app_wage_y3", label: "3年後目標（万円/年）", type: "number", placeholder: "479", required: true },
    { id: "app_wage_method", label: "賃上げの方法", type: "textarea", placeholder: "ベースアップ3%＋成果連動1.5%...", required: true },
  ]},
  { section: "添付書類の確認", fields: [
    { id: "app_doc_plan", label: "事業計画書（最大15枚・PDF）", type: "file_check", required: true },
    { id: "app_doc_financial", label: "直近3期分の決算書", type: "file_check", required: true },
    { id: "app_doc_registry", label: "登記簿謄本（3ヶ月以内）", type: "file_check", required: true },
    { id: "app_doc_tax", label: "納税証明書", type: "file_check", required: true },
    { id: "app_doc_quotes", label: "見積書（相見積もり含む）", type: "file_check", required: true },
    { id: "app_doc_wage", label: "賃上げ計画の根拠資料", type: "file_check", required: true },
    { id: "app_doc_org", label: "組織図・実施体制図", type: "file_check", required: true },
    { id: "app_doc_declaration", label: "100億宣言の公表画面スクリーンショット", type: "file_check", required: true },
  ]},
];

// ═══════════════════════════════════════
// GUIDE DATA
// ═══════════════════════════════════════
const guideSections = [
  { id: "overview", label: "制度の概要" }, { id: "structure", label: "全体構造" },
  { id: "declaration", label: "100億宣言とは" }, { id: "subsidy", label: "補助金の詳細" },
  { id: "schedule", label: "スケジュール" }, { id: "requirements", label: "申請要件" },
  { id: "changes", label: "第2次変更点" }, { id: "review", label: "審査のポイント" },
  { id: "tips", label: "採択率を上げるコツ" }, { id: "faq", label: "よくある質問" },
  { id: "contacts", label: "相談窓口" },
];
const faqData = [
  { q: "売上がまだ10億円に届いていませんが、申請できますか？", a: "100億宣言および補助金の対象は「売上高10億円以上100億円未満」の中小企業です。10億円に満たない場合は対象外となります。ただし、直近決算で10億円を超える見込みがある場合は、個別に事務局へご相談ください。" },
  { q: "GビズIDプライムをまだ持っていません。今から間に合いますか？", a: "GビズIDプライムの発行には通常1〜2週間かかります。第2次公募の締切（3/26）に間に合わせるには、今すぐ申請が必要です。" },
  { q: "第1次公募で不採択でした。再チャレンジできますか？", a: "再申請は可能です。第1次のフィードバックを活かして事業計画を改善すれば、より高い評価を得られる可能性があります。ただし第2次公募では賃上げ要件が4.5%に引き上げられるなど要件が変わっています。" },
  { q: "外部コンサルタントに申請を手伝ってもらえますか？", a: "事業計画書の作成支援は利用可能ですが、第2次審査（プレゼン）には経営者本人のみが参加でき、コンサルタントの同席は明確に禁止されています。" },
  { q: "投資の対象に「土地代」は含まれますか？", a: "含まれません。補助対象は建物費、機械装置費、ソフトウェア費、外注費、専門家経費に限られます。" },
  { q: "賃上げ目標を達成できなかった場合は？", a: "未達成率に応じて補助金の一部返還が求められます。実績が申請時の直近年度を下回った場合は全額返還となります。" },
  { q: "100億宣言だけして補助金に申請しないことは可能？", a: "可能です。宣言自体は独立した制度で、公式ロゴマーク使用や経営者ネットワーク参加などのメリットがあります。" },
  { q: "第3次公募はありますか？", a: "2026年度末までに合計3回の公募が予定されています。第3次は秋以降の見込みですが、残予算減少により審査が厳しくなる可能性があります。" },
];

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════
const Card = ({ children, accent, style: sx }) => (
  <div style={{ background: C.bgCard, border: `1px solid ${accent || C.border}`, borderRadius: 8, padding: "18px 20px", marginBottom: 14, ...sx }}>{children}</div>
);
const Btn = ({ children, primary, disabled, onClick, style: sx }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    padding: "10px 24px", borderRadius: 6, border: primary ? "none" : `1px solid ${C.border}`, cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#e8e5df" : primary ? C.accent : C.bgCard, color: disabled ? C.textLight : primary ? "#fff" : C.text,
    fontSize: 13, fontWeight: 600, fontFamily: font, opacity: disabled ? 0.6 : 1, transition: "all 0.2s", ...sx
  }}>{children}</button>
);
const Badge = ({ status }) => {
  const m = { pass: { bg: C.successLight, c: C.success, t: "充足" }, fail: { bg: C.dangerLight, c: C.danger, t: "未達" }, warn: { bg: C.warnLight, c: C.warn, t: "確認中" }, unknown: { bg: "#f0ede8", c: C.textLight, t: "未入力" } };
  const s = m[status] || m.unknown;
  return <span style={{ fontSize: 10, background: s.bg, color: s.c, padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>{s.t}</span>;
};
const StatusDot = ({ status }) => {
  const m = { pass: C.success, fail: C.danger, warn: C.warn, unknown: "#ccc" };
  return <div style={{ width: 10, height: 10, borderRadius: "50%", background: m[status] || "#ccc", flexShrink: 0 }} />;
};
const Callout = ({ type = "info", title, children }) => {
  const m = { info: { bg: C.accentPale, border: C.accent + "44", color: C.accent }, warn: { bg: C.warnLight, border: C.warn + "44", color: C.warn }, danger: { bg: C.dangerLight, border: C.danger + "44", color: C.danger }, success: { bg: C.successLight, border: C.success + "44", color: C.success } };
  const s = m[type];
  return <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: "0 8px 8px 0", padding: "14px 18px", marginBottom: 16 }}>
    {title && <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginBottom: 4 }}>{title}</div>}
    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8 }}>{children}</div>
  </div>;
};

const renderFormField = (field, data, handler, errors) => (
  <div key={field.id} style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>
      {field.required && <span style={{ color: C.danger, marginRight: 2 }}>*</span>}{field.label}
      {field.sensitive && <span style={{ fontSize: 9, color: C.warn, marginLeft: 4, background: C.warnLight, padding: "1px 4px", borderRadius: 2 }}>機密</span>}
    </label>
    {(field.type === "text" || field.type === "number") && <input type={field.type} placeholder={field.placeholder} value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", outline: "none" }} />}
    {field.type === "textarea" && <textarea placeholder={field.placeholder} value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />}
    {field.type === "select" && <select value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, outline: "none" }}><option value="">選択してください</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
    {field.type === "file_check" && <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }} onClick={() => handler(field.id, !data[field.id])}><div style={{ width: 20, height: 20, borderRadius: 4, background: data[field.id] ? C.success : C.bgInput, border: data[field.id] ? "none" : `1.5px solid ${errors[field.id] ? C.danger : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>{data[field.id] && "✓"}</div><span style={{ fontSize: 12, color: data[field.id] ? C.success : C.textMuted }}>準備済み</span></label>}
    {field.hint && !errors[field.id] && <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{field.hint}</div>}
    {errors[field.id] && <div style={{ fontSize: 10, color: C.danger, marginTop: 2 }}>* {errors[field.id]}</div>}
  </div>
);

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  // ─── Auth ───
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_TIMEOUT);
  const [failCount, setFailCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [auditLog, setAuditLog] = useState([]);

  // ─── Page Router ───
  const [currentPage, setCurrentPage] = useState("dashboard"); // dashboard | guide
  const [mobileMenu, setMobileMenu] = useState(false);

  // ─── Dashboard State ───
  const [activeTab, setActiveTab] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});
  const [hearingData, setHearingData] = useState({});
  const [multiSelects, setMultiSelects] = useState({});
  const [appData, setAppData] = useState({});
  const [appErrors, setAppErrors] = useState({});
  const [appStep, setAppStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState("");
  const [appInvestmentItems, setAppInvestmentItems] = useState([
    { category: "建物", name: "", amount: "", note: "" },
  ]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [appExpandedSection, setAppExpandedSection] = useState(0);
  const [registeredData, setRegisteredData] = useState(null);
  const [showSensitive, setShowSensitive] = useState({});
  const [supportNotes, setSupportNotes] = useState({});
  const [showAuditLog, setShowAuditLog] = useState(false);

  // ─── Guide State ───
  const [activeGuideSection, setActiveGuideSection] = useState("overview");
  const [openFaq, setOpenFaq] = useState(null);
  const guideRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const addLog = useCallback((action, detail = "") => {
    setAuditLog(prev => [...prev, { ts: new Date().toLocaleString("ja-JP"), role: userRole, action, detail }].slice(-100));
  }, [userRole]);

  // ─── Session ───
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const remaining = SESSION_TIMEOUT - (Date.now() - sessionStart);
      if (remaining <= 0) handleLogout("セッションタイムアウト");
      else setSessionRemaining(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionStart]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      if (currentPage === "guide" && guideRef.current) {
        const els = guideRef.current.querySelectorAll("[data-section]");
        let cur = "overview";
        els.forEach(el => { if (el.getBoundingClientRect().top <= 140) cur = el.dataset.section; });
        setActiveGuideSection(cur);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentPage]);

  // ─── Auth Handlers ───
  const handleLogin = () => {
    if (Date.now() < lockoutUntil) { setLoginError(`ロックアウト中（${Math.ceil((lockoutUntil - Date.now()) / 1000)}秒）`); return; }
    const matched = Object.values(CREDENTIALS).find(c => c.idHash === HASH(loginId.trim()) && c.passHash === HASH(loginPass));
    if (matched) { setIsAuthenticated(true); setUserRole(matched.role); setSessionStart(Date.now()); setFailCount(0); setLoginError(""); }
    else { const nf = failCount + 1; setFailCount(nf); setLoginError(nf >= 5 ? (setLockoutUntil(Date.now() + 60000), "5回連続失敗。60秒間ロック。") : `IDまたはパスワードが正しくありません（${nf}/5）`); }
  };
  const handleLogout = (reason = "") => { addLog("ログアウト", reason); setIsAuthenticated(false); setUserRole(null); setSessionStart(null); setLoginId(""); setLoginPass(""); setShowSensitive({}); };
  const resetSession = () => setSessionStart(Date.now());

  // ─── Dashboard Handlers ───
  const toggleCheck = (id) => { setCheckedItems(prev => ({ ...prev, [id]: !prev[id] })); addLog("チェック更新", id); };
  const handleInput = (id, value) => setHearingData(prev => ({ ...prev, [id]: value }));
  const handleAppInput = (id, value) => { setAppData(prev => ({ ...prev, [id]: value })); setAppErrors(prev => { const n = { ...prev }; delete n[id]; return n; }); };
  const toggleMultiSelect = (id, option) => { setMultiSelects(prev => { const cur = prev[id] || []; return { ...prev, [id]: cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option] }; }); };

  // ─── Calculations ───
  const totalChecks = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const doneChecks = Object.values(checkedItems).filter(Boolean).length;
  const progress = Math.round((doneChecks / totalChecks) * 100);
  const investmentTotal = Number(hearingData.building_cost || 0) + Number(hearingData.equipment_cost || 0) + Number(hearingData.software_cost || 0);
  const investmentOk = investmentTotal > 10000;
  const wageTarget = hearingData.avg_salary ? Math.round(Number(hearingData.avg_salary) * Math.pow(1.045, 3)) : null;
  const filledFields = Object.values(hearingData).filter(v => v && String(v).trim()).length;
  const totalHearingFields = HEARING_FIELDS.reduce((s, sec) => s + sec.fields.length, 0);
  const appInvCore = Number(appData.app_inv_building || 0) + Number(appData.app_inv_equipment || 0) + Number(appData.app_inv_software || 0);
  const appInvTotal = appInvCore + Number(appData.app_inv_outsource || 0) + Number(appData.app_inv_expert || 0);
  const appInvOk = appInvCore > 10000;
  const appSubsidy = Math.min(appInvTotal / 2, 50000);
  const appWageCurrent = Number(appData.app_wage_current || 0);
  const appWageY3 = Number(appData.app_wage_y3 || 0);
  const appWageCAGR = appWageCurrent > 0 && appWageY3 > 0 ? ((Math.pow(appWageY3 / appWageCurrent, 1/3) - 1) * 100) : 0;
  const appWageOk = appWageCAGR >= 4.5;
  const appSalesOk = (() => { const s = Number(appData.app_sales_y1 || 0); return s >= 100000 && s < 1000000; })();
  const appGbizOk = appData.app_gbiz_status === "取得済み・利用可能";
  const appDeclarationOk = appData.app_declaration_status === "公表済み（ポータル掲載済み）" || appData.app_declaration_status === "申請済み（公表待ち）";
  const requirements = [
    { id: "req_sme", label: "中小企業であること", desc: appData.app_sme_category || "未確認", status: appData.app_sme_category ? "pass" : "unknown", critical: true },
    { id: "req_sales", label: "売上高10億〜100億円", desc: appData.app_sales_y1 ? `${(Number(appData.app_sales_y1)/10000).toFixed(1)}億円` : "未入力", status: appData.app_sales_y1 ? (appSalesOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_gbiz", label: "GビズIDプライム取得", desc: appData.app_gbiz_status || "未確認", status: appData.app_gbiz_status ? (appGbizOk ? "pass" : appData.app_gbiz_status === "申請中（発行待ち）" ? "warn" : "fail") : "unknown", critical: true },
    { id: "req_declaration", label: "100億宣言の公表", desc: appData.app_declaration_status || "未確認", status: appData.app_declaration_status ? (appDeclarationOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_investment", label: "投資下限1億円超", desc: appInvCore > 0 ? `${(appInvCore/10000).toFixed(1)}億円` : "未入力", status: appInvCore > 0 ? (appInvOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_wage", label: "賃上げ年率4.5%以上", desc: appWageCAGR > 0 ? `${appWageCAGR.toFixed(1)}%` : "未入力", status: appWageCurrent > 0 && appWageY3 > 0 ? (appWageOk ? "pass" : "fail") : "unknown", critical: true },
  ];
  const reqCriticalPass = requirements.filter(r => r.critical && r.status === "pass").length;
  const allCriticalPassed = reqCriticalPass === requirements.filter(r => r.critical).length;

  const validateAppForm = () => { const errors = {}; APPLICATION_SECTIONS.forEach(sec => sec.fields.forEach(f => { if (f.required && f.type !== "file_check" && (!appData[f.id] || !String(appData[f.id]).trim())) errors[f.id] = "必須"; else if (f.validate && appData[f.id]) { const e = f.validate(appData[f.id]); if (e) errors[f.id] = e; } if (f.type === "file_check" && f.required && !appData[f.id]) errors[f.id] = "必須"; })); setAppErrors(errors); return Object.keys(errors).length === 0; };
  const handleRegister = () => { setRegisteredData({ ...appData, registered_at: new Date().toLocaleString("ja-JP"), investment_core: appInvCore, subsidy_amount: appSubsidy, wage_cagr: appWageCAGR.toFixed(2) }); setAppStep(3); addLog("申請登録"); };
  const exportJSON = () => { if (!registeredData) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(registeredData, null, 2)], { type: "application/json" })); a.download = `100oku_${appData.app_company || "draft"}_${Date.now()}.json`; a.click(); addLog("JSONエクスポート"); };
  const maskValue = (val) => val ? val.toString().replace(/./g, (c, i) => i < 2 ? c : "•") : "—";

  const generatePrompt = useCallback(() => {
    const st = multiSelects.growth_strategy || [];
    const investmentLines = appInvestmentItems
      .filter(it => (it.name && it.name.trim()) || (it.amount && String(it.amount).trim()))
      .map(
        it =>
          `- 区分:${it.category} 金額:${it.amount || "（金額未入力）"}万円 内容:${it.name || "（名称未入力）"}${
            it.note ? ` 備考:${it.note}` : ""
          }`
      )
      .join("\n");
    return `# 中小企業成長加速化補助金 申請書・100億宣言文 作成依頼

## 企業基本情報
- 会社名：${hearingData.company_name || appData.app_company || "（未入力）"}
- 代表者：${hearingData.representative || appData.app_representative || "（未入力）"}
- 業種：${hearingData.industry || "（未入力）"}
- 従業員数：${hearingData.employees || appData.app_employee_count || "?"}名
- 売上高：${hearingData.current_sales ? hearingData.current_sales + "億" : appData.app_sales_y1 ? (Number(appData.app_sales_y1)/10000).toFixed(1) + "億" : "？"}

## 成長戦略・ロードマップ
- 100億円達成目標年：${hearingData.target_year || appData.app_target_year_achieve || "？"}
- 主な成長戦略：${st.join("、") || "（未入力）"}
- 対象市場・トレンド：${hearingData.market || "（未入力）"}
- 自社の強み・独自性：${hearingData.competitive_advantage || "（未入力）"}
- 現在のボトルネック・課題：${hearingData.bottleneck || "（未入力）"}
- 3年後までの具体的マイルストーン：${hearingData.roadmap_3year || "（未入力）"}
- 5年後（100億達成時）の姿：${hearingData.roadmap_5year || "（未入力）"}
- 今後12ヶ月の月次マイルストーン：${hearingData.monthly_milestones || "（未入力）"}

## 100億宣言の要点（ドラフトに反映）
- 宣言メッセージ（要約）：${hearingData.declaration_summary || "（未入力）"}
- 宣言に盛り込みたいキーワード：${hearingData.declaration_keywords || "（未入力）"}
- 顧客への価値・約束：${hearingData.declaration_story_customers || "（未入力）"}
- 従業員に見せたい未来：${hearingData.declaration_story_employees || "（未入力）"}
- 地域・社会へのインパクト：${hearingData.declaration_story_region || "（未入力）"}

## 経営の日課・週間ルーティン
- 経営陣の週間ルーティン：${hearingData.weekly_routine || "（未入力）"}
- 経営者の日課・行動原則：${hearingData.daily_routine || "（未入力）"}

## 投資計画（補助対象）
- 建物費：${appData.app_inv_building ? (Number(appData.app_inv_building)/10000).toFixed(1) + "億" : "？"}
- 機械装置費：${appData.app_inv_equipment ? (Number(appData.app_inv_equipment)/10000).toFixed(1) + "億" : "？"}
- ソフトウェア費：${appData.app_inv_software ? (Number(appData.app_inv_software)/10000).toFixed(1) + "億" : "？"}
- コア投資合計：${appInvCore > 0 ? (appInvCore/10000).toFixed(1) + "億" : "？"} ${appInvOk ? "✅（1億円超）" : "⚠（1億円未満の可能性）"}
- 投資内容の詳細：${hearingData.investment_detail || appData.app_inv_summary || "（未入力）"}
${investmentLines ? `\n### 投資内訳（電子申請形式イメージ）\n${investmentLines}` : ""}

## 賃上げ計画
- 現在の1人当たり給与：${appData.app_wage_current || hearingData.avg_salary || "？"}万/年
- 3年後目標：${appData.app_wage_y3 || wageTarget || "？"}万/年
- 年平均上昇率（CAGR）：${appWageCAGR > 0 ? appWageCAGR.toFixed(1) + "%" : "？"}

## リスクとBプラン
- 主なリスク：${hearingData.declaration_risks || "（未入力）"}
- リスクへの対応方針（Bプラン）：${hearingData.declaration_risks_plan || hearingData.risk_plan || "（未入力）"}

## 経営者の想い
${hearingData.vision || "（未入力）"}

---
### 作成してほしいもの
1. 「100億宣言」本文（ポータル掲載用）：上記「100億宣言の要点」を反映し、5つの構成要素（企業概要／目標と課題／具体的措置／実施体制／経営者のコミットメント）で日本語で作成してください。
2. 「中小企業成長加速化補助金」事業計画書ドラフト（最大15枚相当の構成案）：市場分析→強み→ロードマップ→投資計画→収支→賃上げ→地域波及→リスク→体制、の順で見出しと要約本文を作成してください。

### 制度要件（参考情報として踏まえてください）
- 補助率1/2、上限5億円、投資下限1億円（税抜）
- 賃上げ年率4.5%以上（役員除外、従業員1人当たり給与ベース）
- プレゼン審査は経営者本人のみ参加（コンサル同席不可）`;
  }, [hearingData, appData, multiSelects, appInvCore, appInvOk, wageTarget, appWageCAGR]);
  const copyPrompt = () => {
    const text = adminPrompt && adminPrompt.trim().length > 0 ? adminPrompt : generatePrompt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog("プロンプトコピー");
  };

  const scrollTo = (id) => { const el = document.querySelector(`[data-section="${id}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  // 申請者にはAIプロンプト関連タブを表示しない
  const TABS = userRole === "support"
    ? ["スケジュール","チェックリスト","ヒアリング","要件チェック・申請","AI申請書生成（管理者専用）","サポートノート"]
    : ["スケジュール","チェックリスト","ヒアリング","要件チェック・申請"];
  const sessionMin = Math.floor(sessionRemaining / 60000);
  const sessionSec = Math.floor((sessionRemaining % 60000) / 1000);

  // ═══════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 20 }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.headerBg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: C.headerText, marginBottom: 16 }}>百</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>100億宣言 申請サポート</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>中小企業成長加速化補助金 第2次公募</p>
          </div>
          <Card>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>ログインID</label>
              <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="IDを入力" onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off" style={{ width: "100%", padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: font, color: C.text, boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>パスワード</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="パスワードを入力" onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off" style={{ width: "100%", padding: "10px 12px", paddingRight: 40, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: font, color: C.text, boxSizing: "border-box", outline: "none" }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textLight, fontSize: 12, fontFamily: font }}>{showPass ? "隠す" : "表示"}</button>
              </div>
            </div>
            {loginError && <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}33`, borderRadius: 5, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.danger }}>{loginError}</div>}
            <Btn primary onClick={handleLogin} style={{ width: "100%", padding: "12px", fontSize: 14 }}>ログイン</Btn>
          </Card>
          <div style={{ marginTop: 16, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>デモ用アカウント</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: C.bgInput, borderRadius: 5, padding: "8px 10px" }}><div style={{ fontSize: 10, color: C.textLight }}>申請者</div><div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>applicant / apply2026</div></div>
              <div style={{ background: C.bgInput, borderRadius: 5, padding: "8px 10px" }}><div style={{ fontSize: 10, color: C.textLight }}>サポート</div><div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>support / support2026</div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SHARED HEADER NAV
  // ═══════════════════════════════════════
  const Header = () => (
    <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Row 1: Brand bar (dark) */}
      <div style={{ background: C.headerBg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>百</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.headerText }}>100億宣言 申請サポート</div>
            <div style={{ fontSize: 9, color: "#6a6560", marginLeft: 6 }}>第2次公募｜締切 2026/3/26</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 10, color: "#a09a90" }}>{userRole === "support" ? "サポート担当" : "申請者"}</span>
            <span style={{ fontSize: 10, color: sessionMin < 5 ? "#e07a5f" : "#7a7570" }}>残り {sessionMin}:{String(sessionSec).padStart(2, "0")}</span>
            <button onClick={() => handleLogout()} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "#999", fontSize: 10, cursor: "pointer", fontFamily: font }}>ログアウト</button>
          </div>
        </div>
      </div>

      {/* Row 2: Main Navigation (white/light — highly visible) */}
      <div style={{ background: "#fff", borderBottom: `2px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "stretch", gap: 0 }}>

          {/* Nav: 申請管理 */}
          <button onClick={() => { setCurrentPage("dashboard"); window.scrollTo({ top: 0 }); }} style={{
            padding: "16px 28px", background: currentPage === "dashboard" ? C.accentPale : "transparent",
            border: "none", cursor: "pointer", fontFamily: font,
            borderBottom: currentPage === "dashboard" ? `4px solid ${C.accent}` : "4px solid transparent",
            display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s",
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: currentPage === "dashboard" ? C.accent : "#e8e5df", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentPage === "dashboard" ? "#fff" : "#888"} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/></svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentPage === "dashboard" ? C.accent : "#666", letterSpacing: 0.5 }}>申請管理画面</div>
              <div style={{ fontSize: 10, color: currentPage === "dashboard" ? C.accentLight : "#aaa", marginTop: 2 }}>スケジュール・チェックリスト・ヒアリング・申請入力</div>
            </div>
          </button>

          {/* Separator */}
          <div style={{ width: 1, background: C.borderLight, margin: "10px 0" }} />

          {/* Nav: 制度説明 */}
          <button onClick={() => { setCurrentPage("guide"); window.scrollTo({ top: 0 }); }} style={{
            padding: "16px 28px", background: currentPage === "guide" ? C.accentPale : "transparent",
            border: "none", cursor: "pointer", fontFamily: font,
            borderBottom: currentPage === "guide" ? `4px solid ${C.accent}` : "4px solid transparent",
            display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s",
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: currentPage === "guide" ? C.accent : "#e8e5df", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentPage === "guide" ? "#fff" : "#888"} strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentPage === "guide" ? C.accent : "#666", letterSpacing: 0.5 }}>制度説明ガイド</div>
              <div style={{ fontSize: 10, color: currentPage === "guide" ? C.accentLight : "#aaa", marginTop: 2 }}>100億宣言と補助金の完全解説・FAQ・相談窓口</div>
            </div>
          </button>

          {/* Right: Quick Stats */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, paddingRight: 4 }}>
            {[
              { v: "14日", l: "宣言期限", c: "#d35c3a", bg: "#fdf0ec" },
              { v: "27日", l: "補助金締切", c: "#a07420", bg: "#faf4e6" },
              { v: `${progress}%`, l: "準備進捗", c: "#3a7a52", bg: "#ebf5ee" },
            ].map((d, i) => (
              <div key={i} style={{ textAlign: "center", background: d.bg, borderRadius: 6, padding: "6px 12px", minWidth: 56 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: d.c, lineHeight: 1.2 }}>{d.v}</div>
                <div style={{ fontSize: 8, color: d.c, opacity: 0.7, marginTop: 1 }}>{d.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }} onClick={resetSession}>
      <Header />

      {/* ═══════════════════════════════════════ */}
      {/* DASHBOARD PAGE                          */}
      {/* ═══════════════════════════════════════ */}
      {currentPage === "dashboard" && (
        <div>
          {/* Dashboard Tabs */}
          <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", minWidth: 600 }}>
              {TABS.map((tab, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: "11px 4px", background: "none", border: "none", borderBottom: activeTab === i ? `2px solid ${C.accent}` : "2px solid transparent", color: activeTab === i ? C.accent : C.textLight, fontSize: 11.5, fontWeight: activeTab === i ? 700 : 400, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>{tab}</button>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 60px" }}>
            {/* Tab 0: Schedule */}
            {activeTab === 0 && <div>
              <Callout type="danger" title="重要な注意事項">・締切は <b>15:00</b>（第1次17:00より前倒し）<br/>・100億宣言は補助金の<b>前提条件</b>（事前公表必須）<br/>・宣言公表に2〜3週間 → <b>3/13</b>までに申請<br/>・GビズIDプライム未取得 → <b>最優先確認</b></Callout>
              {SCHEDULE_DATA.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 2 }}>
                  <div style={{ width: 60, textAlign: "right", paddingTop: 12, flexShrink: 0, fontSize: 11, fontWeight: 600, color: item.status === "today" ? C.accent : item.deadline ? C.danger : C.textLight }}>{item.date}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                    <div style={{ width: item.deadline || item.status === "today" ? 10 : 6, height: item.deadline || item.status === "today" ? 10 : 6, borderRadius: "50%", background: item.status === "today" ? C.accent : item.deadline ? C.danger : item.status === "future" ? C.border : C.accentLight, marginTop: 14, zIndex: 1 }} />
                    {i < SCHEDULE_DATA.length - 1 && <div style={{ width: 1, flex: 1, background: C.borderLight, minHeight: 24 }} />}
                  </div>
                  <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${item.status === "today" ? C.accent + "44" : item.deadline ? C.danger + "33" : C.borderLight}`, borderRadius: 6, padding: "10px 14px", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.status === "today" ? C.accent : item.deadline ? C.danger : C.text }}>{item.label}</span>
                    {item.deadline && <span style={{ fontSize: 9, background: C.dangerLight, color: C.danger, padding: "1px 6px", borderRadius: 3, fontWeight: 600, marginLeft: 6 }}>期限</span>}
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>}

            {/* Tab 1: Checklist */}
            {activeTab === 1 && <div>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600 }}>全体進捗</span><span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? C.success : C.accent }}>{progress}%</span></div>
                <div style={{ height: 6, background: C.bgInput, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? C.success : C.accent, borderRadius: 3, transition: "width 0.4s" }} /></div>
              </Card>
              {CHECKLIST_SECTIONS.map((section, si) => (
                <div key={si} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}><span style={{ color: C.accent }}>{section.icon}</span> {section.title} <span style={{ fontSize: 10, color: C.textLight, fontWeight: 400 }}>({section.items.filter(i => checkedItems[i.id]).length}/{section.items.length})</span></div>
                  {section.items.map(item => (
                    <label key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 2, cursor: "pointer", background: checkedItems[item.id] ? C.successLight : item.critical ? C.dangerLight : C.bgCard, border: `1px solid ${checkedItems[item.id] ? C.success + "44" : item.critical ? C.danger + "22" : C.borderLight}`, borderRadius: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, background: checkedItems[item.id] ? C.success : C.bgInput, border: checkedItems[item.id] ? "none" : `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>{checkedItems[item.id] && "✓"}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: checkedItems[item.id] ? C.success : C.text, textDecoration: checkedItems[item.id] ? "line-through" : "none" }}>{item.critical && !checkedItems[item.id] && <span style={{ color: C.danger, marginRight: 3 }}>●</span>}{item.label}</div>
                        {item.note && <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{item.note}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>}

            {/* Tab 2: Hearing */}
            {activeTab === 2 && <div>
              <Card accent={C.accent + "44"}><div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>ヒアリングシート</div><div style={{ fontSize: 12, color: C.textMuted }}>進捗：<b style={{ color: C.accent }}>{filledFields}/{totalHearingFields}</b></div></Card>
              {HEARING_FIELDS.map((section, si) => (
                <div key={si} style={{ marginBottom: 12 }}>
                  <button onClick={() => setExpandedSection(expandedSection === si ? null : si)} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: font, marginBottom: expandedSection === si ? 8 : 0 }}><span>{section.section}</span><span style={{ fontSize: 10, color: C.textLight }}>{section.fields.filter(f => hearingData[f.id] || (f.type === "multiselect" && multiSelects[f.id]?.length)).length}/{section.fields.length} {expandedSection === si ? "▲" : "▼"}</span></button>
                  {expandedSection === si && <Card>{section.fields.map(field => (
                    <div key={field.id} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>{field.label}</label>
                      {(field.type === "text" || field.type === "number") && <input type={field.type} placeholder={field.placeholder} value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", outline: "none" }} />}
                      {field.type === "textarea" && <textarea placeholder={field.placeholder} value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />}
                      {field.type === "select" && <select value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, outline: "none" }}><option value="">選択</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                      {field.type === "multiselect" && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{field.options.map(o => { const sel = (multiSelects[field.id] || []).includes(o); return <button key={o} onClick={() => toggleMultiSelect(field.id, o)} style={{ padding: "4px 12px", borderRadius: 14, fontSize: 11, fontFamily: font, cursor: "pointer", background: sel ? C.accent + "18" : C.bgInput, border: `1px solid ${sel ? C.accent + "55" : C.border}`, color: sel ? C.accent : C.textMuted, fontWeight: sel ? 600 : 400 }}>{sel && "✓ "}{o}</button>; })}</div>}
                    </div>
                  ))}</Card>}
                </div>
              ))}
            </div>}

            {/* Tab 3: Requirements & Application */}
            {activeTab === 3 && <div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
                {["要件チェック","申請入力","確認","完了"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: appStep >= i ? (appStep === i ? C.accent : C.success) : C.bgInput, color: appStep >= i ? "#fff" : C.textLight, border: appStep < i ? `1px solid ${C.border}` : "none" }}>{appStep > i ? "✓" : i + 1}</div>
                      <span style={{ fontSize: 10, color: appStep >= i ? C.text : C.textLight, fontWeight: appStep === i ? 700 : 400, whiteSpace: "nowrap" }}>{s}</span>
                    </div>
                    {i < 3 && <div style={{ flex: 1, height: 1, background: appStep > i ? C.success : C.border, margin: "0 6px", minWidth: 16 }} />}
                  </div>
                ))}
              </div>

              {/* Step 0: Requirements */}
              {appStep === 0 && <div>
                <Card accent={C.accent + "44"}><div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>申請要件チェック</div><div style={{ fontSize: 12, color: C.textMuted }}>必須6項目クリアで次へ進めます</div></Card>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginBottom: 18 }}>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>売上高</div><input type="number" placeholder="250000（=25億）" value={appData.app_sales_y1 || ""} onChange={e => handleAppInput("app_sales_y1", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, boxSizing: "border-box", outline: "none" }} />{appData.app_sales_y1 && <div style={{ marginTop: 4, fontSize: 10, color: appSalesOk ? C.success : C.danger }}>{(Number(appData.app_sales_y1)/10000).toFixed(1)}億円 {appSalesOk ? "✓" : "✗"}</div>}</Card>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>企業区分</div><select value={appData.app_sme_category || ""} onChange={e => handleAppInput("app_sme_category", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}><option value="">選択</option>{["製造業","卸売業","小売業","サービス業"].map(o => <option key={o} value={o}>{o}</option>)}</select></Card>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>GビズID</div><select value={appData.app_gbiz_status || ""} onChange={e => handleAppInput("app_gbiz_status", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}><option value="">選択</option>{["取得済み・利用可能","申請中（発行待ち）","未申請"].map(o => <option key={o} value={o}>{o}</option>)}</select>{appData.app_gbiz_status === "未申請" && <div style={{ marginTop: 4, fontSize: 10, color: C.danger }}>即日申請が必要</div>}</Card>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>100億宣言</div><select value={appData.app_declaration_status || ""} onChange={e => handleAppInput("app_declaration_status", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}><option value="">選択</option>{["公表済み（ポータル掲載済み）","申請済み（公表待ち）","未申請（これから申請）"].map(o => <option key={o} value={o}>{o}</option>)}</select></Card>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>投資額（税抜）</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>{[["建物","app_inv_building"],["機械","app_inv_equipment"],["SW","app_inv_software"]].map(([l,k]) => <div key={k}><div style={{ fontSize: 9, color: C.textLight }}>{l}（万円）</div><input type="number" placeholder="0" value={appData[k] || ""} onChange={e => handleAppInput(k, e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} /></div>)}</div>{appInvCore > 0 && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: appInvOk ? C.success : C.danger }}>{(appInvCore/10000).toFixed(1)}億 {appInvOk ? "✓" : "✗"}</div>}</Card>
                  <Card><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>賃上げ（年率4.5%）</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}><div><div style={{ fontSize: 9, color: C.textLight }}>現在（万/年）</div><input type="number" placeholder="420" value={appData.app_wage_current || ""} onChange={e => handleAppInput("app_wage_current", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} /></div><div><div style={{ fontSize: 9, color: C.textLight }}>3年後目標</div><input type="number" placeholder="479" value={appData.app_wage_y3 || ""} onChange={e => handleAppInput("app_wage_y3", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} /></div></div>{appWageCurrent > 0 && appWageY3 > 0 && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: appWageOk ? C.success : C.danger }}>CAGR {appWageCAGR.toFixed(1)}% {appWageOk ? "✓" : "✗"}</div>}</Card>
                </div>
                <Card><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>要件サマリー</div>{requirements.map((req, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < requirements.length - 1 ? `1px solid ${C.borderLight}` : "none" }}><StatusDot status={req.status} /><div style={{ flex: 1, fontSize: 12 }}>{req.label}</div><div style={{ fontSize: 10, color: C.textMuted, marginRight: 8 }}>{req.desc}</div><Badge status={req.status} /></div>)}</Card>
                <div style={{ textAlign: "right", marginTop: 12 }}><Btn primary disabled={!allCriticalPassed} onClick={() => { setAppStep(1); addLog("要件チェック通過"); }}>{allCriticalPassed ? "申請入力へ →" : `必須 ${reqCriticalPass}/6`}</Btn></div>
              </div>}

            {/* Step 1: Form */}
            {appStep === 1 && (
              <div>
                <Card accent={C.accent + "44"}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>申請情報入力</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    <span style={{ color: C.danger }}>*</span> 必須 ・{" "}
                    <span style={{ fontSize: 9, background: C.warnLight, color: C.warn, padding: "1px 4px", borderRadius: 2 }}>
                      機密
                    </span>{" "}
                    暗号化対象
                  </div>
                </Card>

                {APPLICATION_SECTIONS.map((section, si) => (
                  <div key={si} style={{ marginBottom: 10 }}>
                    <button
                      onClick={() => setAppExpandedSection(appExpandedSection === si ? null : si)}
                      style={{
                        width: "100%",
                        background: C.bgCard,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: "10px 14px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        color: C.text,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: font,
                        marginBottom: appExpandedSection === si ? 6 : 0,
                      }}
                    >
                      <span>{section.section}</span>
                      <span style={{ fontSize: 10, color: C.textLight }}>
                        {section.fields.filter(f => appData[f.id]).length}/{section.fields.length}{" "}
                        {appExpandedSection === si ? "▲" : "▼"}
                      </span>
                    </button>
                    {appExpandedSection === si && (
                      <Card>
                        {section.fields.map(f => renderFormField(f, appData, handleAppInput, appErrors))}

                        {section.section === "投資計画（税抜）" && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                              投資計画の内訳（電子申請イメージ・任意）
                            </div>
                            <div
                              style={{
                                border: `1px solid ${C.borderLight}`,
                                borderRadius: 6,
                                overflowX: "auto",
                                background: C.bgInput,
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 11,
                                  minWidth: 520,
                                }}
                              >
                                <thead>
                                  <tr style={{ background: C.bgCard }}>
                                    {["区分", "設備・ソフト名／内容", "金額（万円・税抜）", "備考", ""].map((h, idx) => (
                                      <th
                                        key={idx}
                                        style={{
                                          borderBottom: `1px solid ${C.borderLight}`,
                                          padding: "6px 8px",
                                          textAlign: idx === 4 ? "center" : "left",
                                          color: C.textMuted,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {appInvestmentItems.map((row, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? C.bgInput : C.bgCard }}>
                                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${C.borderLight}` }}>
                                        <select
                                          value={row.category}
                                          onChange={e => {
                                            const v = e.target.value;
                                            setAppInvestmentItems(prev => {
                                              const next = [...prev];
                                              next[idx] = { ...next[idx], category: v };
                                              return next;
                                            });
                                          }}
                                          style={{
                                            width: "100%",
                                            padding: "4px 6px",
                                            borderRadius: 4,
                                            border: `1px solid ${C.border}`,
                                            background: "#fff",
                                            fontSize: 11,
                                            fontFamily: font,
                                          }}
                                        >
                                          {["建物", "機械装置", "ソフトウェア", "その他"].map(opt => (
                                            <option key={opt} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${C.borderLight}` }}>
                                        <input
                                          type="text"
                                          value={row.name}
                                          onChange={e => {
                                            const v = e.target.value;
                                            setAppInvestmentItems(prev => {
                                              const next = [...prev];
                                              next[idx] = { ...next[idx], name: v };
                                              return next;
                                            });
                                          }}
                                          placeholder="例）新工場建屋／自動化ライン一式 など"
                                          style={{
                                            width: "100%",
                                            padding: "4px 6px",
                                            borderRadius: 4,
                                            border: `1px solid ${C.border}`,
                                            fontSize: 11,
                                            fontFamily: font,
                                            background: "#fff",
                                          }}
                                        />
                                      </td>
                                      <td
                                        style={{
                                          padding: "4px 6px",
                                          borderBottom: `1px solid ${C.borderLight}`,
                                          width: 110,
                                        }}
                                      >
                                        <input
                                          type="number"
                                          value={row.amount}
                                          onChange={e => {
                                            const v = e.target.value;
                                            setAppInvestmentItems(prev => {
                                              const next = [...prev];
                                              next[idx] = { ...next[idx], amount: v };
                                              return next;
                                            });
                                          }}
                                          placeholder="例）30000"
                                          style={{
                                            width: "100%",
                                            padding: "4px 6px",
                                            borderRadius: 4,
                                            border: `1px solid ${C.border}`,
                                            fontSize: 11,
                                            fontFamily: font,
                                            background: "#fff",
                                            textAlign: "right",
                                          }}
                                        />
                                      </td>
                                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${C.borderLight}` }}>
                                        <input
                                          type="text"
                                          value={row.note}
                                          onChange={e => {
                                            const v = e.target.value;
                                            setAppInvestmentItems(prev => {
                                              const next = [...prev];
                                              next[idx] = { ...next[idx], note: v };
                                              return next;
                                            });
                                          }}
                                          placeholder="任意：更新理由、仕様、メーカー名など"
                                          style={{
                                            width: "100%",
                                            padding: "4px 6px",
                                            borderRadius: 4,
                                            border: `1px solid ${C.border}`,
                                            fontSize: 11,
                                            fontFamily: font,
                                            background: "#fff",
                                          }}
                                        />
                                      </td>
                                      <td
                                        style={{
                                          padding: "4px 6px",
                                          borderBottom: `1px solid ${C.borderLight}`,
                                          textAlign: "center",
                                          width: 42,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAppInvestmentItems(prev => {
                                              if (prev.length === 1) return prev;
                                              return prev.filter((_, i) => i !== idx);
                                            });
                                          }}
                                          style={{
                                            border: "none",
                                            background: "none",
                                            color: C.textLight,
                                            cursor: appInvestmentItems.length === 1 ? "default" : "pointer",
                                            fontSize: 12,
                                          }}
                                          disabled={appInvestmentItems.length === 1}
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setAppInvestmentItems(prev => [
                                    ...prev,
                                    { category: "機械装置", name: "", amount: "", note: "" },
                                  ])
                                }
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 4,
                                  border: `1px solid ${C.border}`,
                                  background: C.bgCard,
                                  fontSize: 11,
                                  fontFamily: font,
                                  cursor: "pointer",
                                  color: C.text,
                                }}
                              >
                                ＋ 行を追加
                              </button>
                              <div style={{ fontSize: 10, color: C.textLight }}>
                                ※ 電子申請画面の「経費内訳」イメージです（任意入力）。
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <Btn onClick={() => setAppStep(0)}>← 要件チェック</Btn>
                  <Btn
                    primary
                    onClick={() => {
                      if (validateAppForm()) {
                        setAppStep(2);
                        addLog("申請入力完了");
                      }
                    }}
                  >
                    確認画面へ →
                  </Btn>
                </div>
              </div>
            )}

              {/* Step 2: Confirm */}
              {appStep === 2 && <div>
                <Callout type="success" title="最終確認">機密項目はマスク表示。「表示」ボタンで確認可能です。</Callout>
                {APPLICATION_SECTIONS.map((section, si) => <Card key={si} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{section.section}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>{section.fields.map(f => <div key={f.id} style={{ padding: "3px 0" }}><div style={{ fontSize: 9, color: C.textLight }}>{f.label}</div><div style={{ fontSize: 11, fontWeight: 500 }}>{f.type === "file_check" ? (appData[f.id] ? "✓ 準備済み" : "— 未準備") : f.sensitive && !showSensitive[f.id] ? maskValue(appData[f.id]) : appData[f.id] ? (f.type === "number" ? Number(appData[f.id]).toLocaleString() : appData[f.id]) : "—"}{f.sensitive && appData[f.id] && <button onClick={() => { setShowSensitive(p => ({ ...p, [f.id]: !p[f.id] })); addLog("機密表示", f.label); }} style={{ marginLeft: 4, fontSize: 9, color: C.accent, background: "none", border: `1px solid ${C.accent}44`, borderRadius: 3, padding: "0 4px", cursor: "pointer", fontFamily: font }}>{showSensitive[f.id] ? "隠す" : "表示"}</button>}</div></div>)}</div></Card>)}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>コア投資額</div><div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{(appInvCore/10000).toFixed(1)}億</div></Card>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>補助申請額</div><div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{(appSubsidy/10000).toFixed(1)}億</div></Card>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>賃上げCAGR</div><div style={{ fontSize: 18, fontWeight: 800, color: appWageOk ? C.success : C.danger }}>{appWageCAGR.toFixed(1)}%</div></Card>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><Btn onClick={() => setAppStep(1)}>← 修正</Btn><Btn primary onClick={handleRegister} style={{ background: C.success, padding: "12px 36px" }}>登録する</Btn></div>
              </div>}

              {/* Step 3: Done */}
              {appStep === 3 && <div style={{ textAlign: "center", paddingTop: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.success, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#fff" }}>✓</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.success, marginBottom: 6 }}>登録完了</h2>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{registeredData?.registered_at}</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Btn primary onClick={exportJSON}>JSONダウンロード</Btn>
                  {userRole === "support" && <Btn onClick={() => setActiveTab(4)}>AI申請書生成へ</Btn>}
                  <Btn onClick={() => setAppStep(0)}>最初に戻る</Btn>
                </div>
              </div>}
            </div>}

            {/* Tab 4: AI Prompt（管理者専用） */}
            {userRole === "support" && activeTab === 4 && (
              <div>
                <Card accent={C.accent + "44"}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>AI申請書作成プロンプト（管理者専用）</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    下のテキストエリアに、AIに渡すプロンプトを自由に記入してください。申請者には表示されません。
                    <br />
                    右下のボタンから、ヒアリング内容を元にした雛形を挿入することもできます。
                  </div>
                </Card>
                <Card>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>AI用プロンプト</span>
                    <button
                      type="button"
                      onClick={() => setAdminPrompt(generatePrompt())}
                      style={{
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: `1px solid ${C.border}`,
                        background: C.bgInput,
                        cursor: "pointer",
                        fontFamily: font,
                        color: C.textMuted,
                      }}
                    >
                      雛形を挿入
                    </button>
                  </div>
                  <textarea
                    rows={14}
                    value={adminPrompt}
                    onChange={e => setAdminPrompt(e.target.value)}
                    placeholder="ここにChatGPTなどに渡す指示文（プロンプト）を書いてください。企業情報や強調したいポイントなどを自由に加筆できます。"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: C.bgInput,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: `${font}, monospace`,
                      color: C.text,
                      boxSizing: "border-box",
                      resize: "vertical",
                      lineHeight: 1.7,
                    }}
                  />
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: C.textLight }}>
                      コピー対象: 入力済みプロンプト（未入力の場合は自動生成プロンプト）
                    </span>
                    <Btn primary onClick={copyPrompt}>{copied ? "✓ コピー完了" : "この内容をコピー"}</Btn>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 5: Support Notes */}
            {activeTab === 5 && userRole === "support" && <div>
              <Card accent={C.accent + "44"}><div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>サポートノート</div><div style={{ fontSize: 12, color: C.textMuted }}>申請者には非表示</div></Card>
              <Card>
                {["todo:確認事項","strategy:審査対策","risk:リスク"].map(k => { const [id, label] = k.split(":"); return <div key={id} style={{ marginBottom: 10 }}><label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>{label}</label><textarea value={supportNotes[id] || ""} onChange={e => setSupportNotes(p => ({ ...p, [id]: e.target.value }))} rows={3} placeholder={`${label}をメモ...`} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} /></div>; })}
              </Card>
              <button onClick={() => setShowAuditLog(!showAuditLog)} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: font }}><span>監査ログ（{auditLog.length}件）</span><span style={{ color: C.textLight }}>{showAuditLog ? "▲" : "▼"}</span></button>
              {showAuditLog && <Card style={{ maxHeight: 250, overflow: "auto" }}>{auditLog.length === 0 ? <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: 16 }}>ログなし</div> : [...auditLog].reverse().map((log, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 11 }}><span style={{ color: C.textLight, width: 130, flexShrink: 0 }}>{log.ts}</span><span style={{ color: log.role === "support" ? C.accent : C.success, width: 50, flexShrink: 0 }}>{log.role === "support" ? "サポート" : "申請者"}</span><span>{log.action}</span>{log.detail && <span style={{ color: C.textLight }}>{log.detail}</span>}</div>)}</Card>}
            </div>}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* GUIDE PAGE                              */}
      {/* ═══════════════════════════════════════ */}
      {currentPage === "guide" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0, padding: "0 16px" }}>
          {/* Sidebar */}
          <nav style={{ width: 180, flexShrink: 0, position: "sticky", top: 120, height: "calc(100vh - 120px)", overflowY: "auto", padding: "16px 14px 16px 0", borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, letterSpacing: 1.5, marginBottom: 10, paddingLeft: 10 }}>目次</div>
            {guideSections.map(s => <button key={s.id} onClick={() => scrollTo(s.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 1, background: activeGuideSection === s.id ? C.accentPale : "transparent", border: "none", borderRadius: 4, borderLeft: activeGuideSection === s.id ? `3px solid ${C.accent}` : "3px solid transparent", color: activeGuideSection === s.id ? C.accent : C.textMuted, fontSize: 11.5, fontWeight: activeGuideSection === s.id ? 700 : 400, cursor: "pointer", fontFamily: font }}>{s.label}</button>)}
          </nav>

          {/* Guide Content */}
          <main ref={guideRef} style={{ flex: 1, minWidth: 0, padding: "24px 0 60px 28px" }}>
            {/* Overview */}
            <section data-section="overview" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>100億企業成長支援プロジェクトとは</h2>
              <p style={{ fontSize: 13.5, color: C.text, lineHeight: 2, marginBottom: 16 }}>日本の中小企業政策は、従来の「存続支援」から<b>「成長・規模拡大支援」</b>へと大きく転換しています。その象徴が「100億企業成長支援プロジェクト」です。</p>
              <Card accent={C.gold + "44"} style={{ background: C.goldPale }}><div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 6 }}>プロジェクトの目的</div><div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.9 }}>売上高<b>10億円〜100億円未満</b>の中小企業が、売上高100億円を超える<b>「中堅企業」</b>へ飛躍することを支援する国家プロジェクト。単なる補助金ではなく、経営者のマインドセット変革、大規模設備投資の促進、地域経済への波及効果を狙った重層的な支援体系です。</div></Card>
              <Callout type="info" title="なぜ「100億円」なのか？">売上高100億円規模の企業は、高い賃金水準の維持、輸出による外需獲得、協力会社への仕入れによる経済波及効果が極めて大きく、地域経済の「稼ぐ力」を牽引するエンジンとなります。</Callout>
            </section>

            {/* Structure */}
            <section data-section="structure" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>プロジェクトの全体構造</h2>
              <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                <Card style={{ flex: "1 1 260px", borderTop: `4px solid ${C.accent}` }}><div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1, marginBottom: 4 }}>第1の柱</div><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>100億宣言</div><div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.8 }}>経営者が「売上高100億円を目指す」意志と戦略を公に宣言する制度。</div></Card>
                <Card style={{ flex: "1 1 260px", borderTop: `4px solid ${C.gold}` }}><div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, marginBottom: 4 }}>第2の柱</div><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>成長加速化補助金</div><div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.8 }}>最大5億円（補助率1/2）の大規模設備投資への資金支援。</div></Card>
              </div>
              <Card style={{ textAlign: "center", padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ background: C.accentPale, padding: "6px 14px", borderRadius: 5, fontSize: 12, fontWeight: 700, color: C.accent }}>宣言を申請</span><span style={{ color: C.textFaint }}>→</span><span style={{ background: C.warnLight, padding: "6px 14px", borderRadius: 5, fontSize: 12, fontWeight: 700, color: C.warn }}>ポータルに公表</span><span style={{ color: C.textFaint }}>→</span><span style={{ background: C.goldPale, padding: "6px 14px", borderRadius: 5, fontSize: 12, fontWeight: 700, color: C.gold }}>補助金を申請</span>
                </div>
                <div style={{ fontSize: 11, color: C.danger, marginTop: 8, fontWeight: 600 }}>※ 宣言がポータルに公表済みでないと補助金は申請不可（第2次公募で厳格化）</div>
              </Card>
            </section>

            {/* Declaration */}
            <section data-section="declaration" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>100億宣言とは</h2>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.9, marginBottom: 16 }}>100億宣言は、単なる事務手続きではなく、企業の将来ビジョンをステークホルダーに示す<b>公約</b>としての性格を持ちます。</p>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>宣言書に盛り込む5つの構成要素</div>
              {[
                { t: "企業概要", d: "直近の売上高、従業員数、現在の事業ポートフォリオなど足元の立ち位置を明確に。" },
                { t: "売上100億円実現の目標と課題", d: "いつまでに、どの成長率で達成するかのロードマップ。ボトルネックの特定。" },
                { t: "具体的措置", d: "新工場建設、海外展開、M&A、DXなど課題を解決する戦略。" },
                { t: "実施体制", d: "成長を支える組織図、次世代リーダー育成、外部専門家との連携。" },
                { t: "経営者のコミットメント", d: "なぜ100億円を目指すのか。情熱と社会的責任を経営者自身の言葉で。" },
              ].map((item, i) => <Card key={i} style={{ display: "flex", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div><div><div style={{ fontSize: 13, fontWeight: 700 }}>{item.t}</div><div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.8, marginTop: 2 }}>{item.d}</div></div></Card>)}
            </section>

            {/* Subsidy */}
            <section data-section="subsidy" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>成長加速化補助金の詳細</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                {[{ v: "5億円", l: "補助上限" }, { v: "1/2", l: "補助率" }, { v: "1億円", l: "投資下限", c: C.danger }].map((s, i) => <div key={i} style={{ textAlign: "center", padding: "14px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, flex: "1 1 120px" }}><div style={{ fontSize: 24, fontWeight: 900, color: s.c || C.accent }}>{s.v}</div><div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.l}</div></div>)}
              </div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.9, marginBottom: 16 }}>最大の特徴は、通常の補助金では認められにくい<b>「建物費」が広範に認められている</b>点。新工場建設から最新設備の導入まで「攻めの投資」を後押しします。</p>
              <Callout type="warn" title="投資下限1億円の壁"><b>建物費＋機械装置費＋ソフトウェア費</b>の合計が税抜1億円超必須。外注費・専門家経費は含まれません。</Callout>
            </section>

            {/* Schedule */}
            <section data-section="schedule" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>スケジュール</h2>
              <Callout type="danger" title="第2次の変更">締切は<b>15:00</b>（第1次17:00から前倒し）。100億宣言の事前公表が必須条件に厳格化。</Callout>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.9 }}>詳細なタイムラインは「申請管理」画面のスケジュールタブで確認できます。</p>
            </section>

            {/* Requirements */}
            <section data-section="requirements" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>申請要件</h2>
              {[
                { t: "中小企業であること", d: "業種ごとの資本金・従業員数の上限あり" },
                { t: "売上高10億円以上100億円未満", d: "直近決算書の売上高が対象範囲内" },
                { t: "GビズIDプライム取得", d: "発行に1〜2週間。未取得なら最優先" },
                { t: "100億宣言がポータルに公表済み", d: "第2次公募で厳格化された新要件" },
                { t: "投資額が税抜1億円超", d: "建物＋機械＋SWのコア経費合計" },
                { t: "賃上げ年率4.5%以上", d: "従業員（役員除外）の給与CAGR" },
              ].map((r, i) => <Card key={i} style={{ display: "flex", gap: 12 }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div><div><div style={{ fontSize: 13, fontWeight: 700 }}>{r.t} <span style={{ fontSize: 9, background: C.dangerLight, color: C.danger, padding: "1px 6px", borderRadius: 3 }}>必須</span></div><div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, marginTop: 2 }}>{r.d}</div></div></Card>)}
            </section>

            {/* Changes */}
            <section data-section="changes" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>第2次公募の変更点</h2>
              {[
                { t: "賃上げ要件の統一・引き上げ", d: "全国一律「年平均4.5%以上」に統一。第1次は都道府県ごとに3.2%〜4.3%だった。未達で一部返還、直近年度割れで全額返還。", type: "danger" },
                { t: "100億宣言の事前公表が必須に", d: "申請時点でポータルに公表されていることが必須。第1次では同時並行が可能だった。", type: "warn" },
                { t: "プレゼン審査でのコンサル同席禁止", d: "第2次審査に外部コンサルタントの同席が明確に禁止。経営者自身の理解度が問われる。", type: "info" },
              ].map((c, i) => <Callout key={i} type={c.type} title={c.t}>{c.d}</Callout>)}
            </section>

            {/* Review */}
            <section data-section="review" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>審査のポイント</h2>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.9, marginBottom: 16 }}>第1次公募の採択倍率は<b style={{ color: C.danger }}>約6倍</b>。書面審査とプレゼン審査の二段構え。</p>
              <Card><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>重視される3つの指標</div>{[
                { t: "売上高投資比率", d: "収益規模に対してどれだけ大胆にリスクを取っているか", c: C.accent },
                { t: "付加価値増加率", d: "投資による生産性向上。1人当たりの「稼ぐ力」の改善", c: C.gold },
                { t: "地域波及効果", d: "雇用拡大、地元仕入れ増加など地域全体への貢献", c: C.success },
              ].map((item, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}><div style={{ width: 4, borderRadius: 2, background: item.c, flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 700, color: item.c }}>{item.t}</div><div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, marginTop: 2 }}>{item.d}</div></div></div>)}</Card>
            </section>

            {/* Tips */}
            <section data-section="tips" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>採択率を上げるコツ</h2>
              <Callout type="danger" title="jGrantsの落とし穴">・締切直前はサーバー混雑。<b>3/25を実質的な締め切りに</b><br/>・ファイル名は半角英数推奨・容量制限あり</Callout>
              <Callout type="success" title="丸投げ厳禁">外部コンサルを起用する場合でも、計画を「自分の言葉で語れる」まで内面化してください。プレゼン審査で合否を分ける最大の要因です。</Callout>
            </section>

            {/* FAQ */}
            <section data-section="faq" style={{ marginBottom: 40, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>よくある質問</h2>
              {faqData.map((faq, i) => <div key={i} style={{ marginBottom: 6 }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: C.bgCard, border: `1px solid ${openFaq === i ? C.accent + "44" : C.border}`, borderRadius: openFaq === i ? "6px 6px 0 0" : 6, cursor: "pointer", fontFamily: font, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 8 }}><span style={{ color: C.accent, fontWeight: 800, fontSize: 13 }}>Q</span><span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5 }}>{faq.q}</span></div>
                  <span style={{ color: C.textFaint, marginLeft: 8, flexShrink: 0 }}>{openFaq === i ? "−" : "＋"}</span>
                </button>
                {openFaq === i && <div style={{ padding: "12px 16px 12px 36px", background: C.bgCard, border: `1px solid ${C.accent}44`, borderTop: "none", borderRadius: "0 0 6px 6px" }}><div style={{ fontSize: 12, color: C.text, lineHeight: 1.9 }}>{faq.a}</div></div>}
              </div>)}
            </section>

            {/* Contacts */}
            <section data-section="contacts" style={{ marginBottom: 24, scrollMarginTop: 130 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>相談窓口</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                {[
                  { org: "関東経済産業局 中小企業課", tel: "048-600-0332", desc: "100億宣言に関する相談" },
                  { org: "関東経済産業局 経営支援課", tel: "048-600-0334", desc: "補助金に関する相談" },
                  { org: "中小機構 関東本部", tel: "03-5470-1620", desc: "総合的な経営支援" },
                  { org: "千葉県産業振興センター", tel: "043-299-2901", desc: "千葉県内の中小企業支援" },
                ].map((c, i) => <Card key={i}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{c.org}</div><div style={{ fontSize: 15, fontWeight: 800, color: C.accent, marginBottom: 3 }}>{c.tel}</div><div style={{ fontSize: 10, color: C.textMuted }}>{c.desc}</div></Card>)}
              </div>
              <Callout type="info" title="千葉県よろず支援拠点">千葉県産業振興センター内で、補助金申請に精通したコーディネーターによる無料の経営相談を受けられます。</Callout>
            </section>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}><div style={{ fontSize: 10, color: C.textFaint }}>2026年2月27日時点の公開情報に基づいて作成。最新情報は各公式サイトをご確認ください。</div></div>
          </main>
        </div>
      )}

      {/* Scroll to top */}
      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, width: 42, height: 42, borderRadius: "50%", background: C.accent, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(44,74,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 3L3 10h4v5h4v-5h4L9 3z" fill="#fff" /></svg></button>}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 20px", textAlign: "center" }}><div style={{ fontSize: 9, color: C.textLight }}>ハッシュ認証 ・ セッション自動タイムアウト ・ 操作監査ログ ・ 機密項目マスク表示</div></div>
    </div>
  );
}
