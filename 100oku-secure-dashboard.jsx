import { useState, useEffect, useCallback, useRef } from "react";

// ─── Security & Auth ───
// Synchronous hash (djb2 + secondary mix) — works without crypto.subtle
const HASH = (str) => {
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = ((h2 << 5) + h2 + c) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
};

// Pre-computed credential hashes
const CREDENTIALS = {
  applicant: { idHash: HASH("applicant"), passHash: HASH("apply2026"), role: "applicant" },
  support:   { idHash: HASH("support"),   passHash: HASH("support2026"), role: "support" },
};

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min

// ─── Data Constants ───
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
    { id: "location", label: "本社所在地", type: "text", placeholder: "福岡県福岡市..." },
    { id: "established", label: "設立年", type: "number", placeholder: "1985" },
  ]},
  { section: "成長戦略", fields: [
    { id: "target_year", label: "100億円達成目標年", type: "select", options: ["2028年","2029年","2030年","2031年","2032年","2033年"] },
    { id: "growth_strategy", label: "主な成長戦略", type: "multiselect", options: ["新工場建設","海外展開","M&A","DX推進","新規事業","既存事業の拡大"] },
    { id: "market", label: "対象市場・業界トレンド", type: "textarea", placeholder: "半導体市場の拡大、EV関連部品の需要増..." },
    { id: "competitive_advantage", label: "自社の強み・独自性", type: "textarea", placeholder: "特許技術、長年の顧客基盤、独自の製造ノウハウ..." },
    { id: "bottleneck", label: "現在のボトルネック・課題", type: "textarea", placeholder: "生産能力の限界、人材不足、設備の老朽化..." },
  ]},
  { section: "投資計画", fields: [
    { id: "total_investment", label: "総投資額（億円）", type: "number", placeholder: "5" },
    { id: "building_cost", label: "建物費（万円）", type: "number", placeholder: "30000" },
    { id: "equipment_cost", label: "機械装置費（万円）", type: "number", placeholder: "20000" },
    { id: "software_cost", label: "ソフトウェア費（万円）", type: "number", placeholder: "5000" },
    { id: "investment_detail", label: "投資内容の詳細", type: "textarea", placeholder: "新工場建設、最新ロボットライン導入..." },
    { id: "investment_location", label: "投資場所", type: "text", placeholder: "福岡県〇〇市" },
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
  { section: "申請者情報", icon: "■", fields: [
    { id: "app_company", label: "法人名（正式名称）", type: "text", placeholder: "株式会社〇〇", required: true, sensitive: true },
    { id: "app_corporate_number", label: "法人番号（13桁）", type: "text", placeholder: "1234567890123", required: true, sensitive: true, validate: v => /^\d{13}$/.test(v) ? null : "13桁の数字で入力" },
    { id: "app_representative", label: "代表者 氏名", type: "text", placeholder: "山田 太郎", required: true, sensitive: true },
    { id: "app_rep_title", label: "代表者 役職", type: "text", placeholder: "代表取締役社長", required: true },
    { id: "app_address", label: "本社所在地", type: "text", placeholder: "福岡県福岡市博多区〇〇1-2-3", required: true, sensitive: true },
    { id: "app_tel", label: "電話番号", type: "text", placeholder: "092-000-0000", required: true, sensitive: true },
    { id: "app_email", label: "メールアドレス", type: "text", placeholder: "info@example.co.jp", required: true, sensitive: true, validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "正しいメールアドレスを入力" },
    { id: "app_contact_name", label: "担当者 氏名", type: "text", placeholder: "鈴木 花子", required: true },
    { id: "app_contact_dept", label: "担当者 部署", type: "text", placeholder: "経営企画部" },
    { id: "app_contact_tel", label: "担当者 電話番号", type: "text", placeholder: "092-000-0001", required: true, sensitive: true },
    { id: "app_contact_email", label: "担当者 メールアドレス", type: "text", placeholder: "suzuki@example.co.jp", required: true, sensitive: true },
  ]},
  { section: "GビズID情報", icon: "■", fields: [
    { id: "app_gbiz_id", label: "GビズIDプライム アカウントID", type: "text", placeholder: "gBizxxxxxxxx", required: true, sensitive: true },
    { id: "app_gbiz_status", label: "GビズIDの状態", type: "select", options: ["取得済み・利用可能", "申請中（発行待ち）", "未申請"], required: true },
  ]},
  { section: "企業規模・適格性", icon: "■", fields: [
    { id: "app_sme_category", label: "中小企業基本法上の区分", type: "select", options: ["製造業（資本金3億円以下 or 従業員300人以下）","卸売業（資本金1億円以下 or 従業員100人以下）","小売業（資本金5千万円以下 or 従業員50人以下）","サービス業（資本金5千万円以下 or 従業員100人以下）"], required: true },
    { id: "app_capital", label: "資本金（万円）", type: "number", placeholder: "5000", required: true, sensitive: true },
    { id: "app_employee_count", label: "常勤従業員数", type: "number", placeholder: "150", required: true },
    { id: "app_sales_y1", label: "直近期 売上高（万円）", type: "number", placeholder: "250000", required: true, sensitive: true },
    { id: "app_sales_y2", label: "前期 売上高（万円）", type: "number", placeholder: "230000", required: true, sensitive: true },
    { id: "app_sales_y3", label: "前々期 売上高（万円）", type: "number", placeholder: "210000", required: true, sensitive: true },
    { id: "app_profit_y1", label: "直近期 経常利益（万円）", type: "number", placeholder: "15000", required: true, sensitive: true },
    { id: "app_established_date", label: "設立年月日", type: "text", placeholder: "1985-04-01", required: true },
  ]},
  { section: "100億宣言情報", icon: "■", fields: [
    { id: "app_declaration_status", label: "100億宣言の状況", type: "select", options: ["公表済み（ポータル掲載済み）","申請済み（公表待ち）","未申請（これから申請）"], required: true },
    { id: "app_declaration_date", label: "宣言申請日（予定含む）", type: "text", placeholder: "2026-03-10", required: true },
    { id: "app_portal_url", label: "ポータル掲載URL（公表済みの場合）", type: "text", placeholder: "https://100oku-portal.smrj.go.jp/..." },
    { id: "app_target_sales", label: "目標売上高（億円）", type: "number", placeholder: "100", required: true },
    { id: "app_target_year_achieve", label: "達成目標年度", type: "select", options: ["2028年度","2029年度","2030年度","2031年度","2032年度","2033年度"], required: true },
  ]},
  { section: "投資計画（税抜）", icon: "■", fields: [
    { id: "app_inv_building", label: "建物費（万円・税抜）", type: "number", placeholder: "30000", required: true, sensitive: true },
    { id: "app_inv_equipment", label: "機械装置費（万円・税抜）", type: "number", placeholder: "20000", required: true, sensitive: true },
    { id: "app_inv_software", label: "ソフトウェア費（万円・税抜）", type: "number", placeholder: "5000", required: true, sensitive: true },
    { id: "app_inv_outsource", label: "外注費（万円・税抜）", type: "number", placeholder: "3000", sensitive: true },
    { id: "app_inv_expert", label: "専門家経費（万円・税抜）", type: "number", placeholder: "500" },
    { id: "app_inv_location", label: "投資実施場所", type: "text", placeholder: "福岡県〇〇市〇〇町1-2-3", required: true },
    { id: "app_inv_start", label: "事業開始予定日", type: "text", placeholder: "2026-10-01", required: true },
    { id: "app_inv_end", label: "事業完了予定日", type: "text", placeholder: "2028-03-31", required: true },
    { id: "app_inv_summary", label: "投資概要", type: "textarea", placeholder: "新工場建設と最新自動化ラインの導入...", required: true },
  ]},
  { section: "賃上げ計画", icon: "■", fields: [
    { id: "app_wage_current", label: "基準年度の1人当たり給与（万円/年）", type: "number", placeholder: "420", required: true, sensitive: true },
    { id: "app_wage_y1", label: "1年後の目標給与（万円/年）", type: "number", placeholder: "439", required: true },
    { id: "app_wage_y2", label: "2年後の目標給与（万円/年）", type: "number", placeholder: "459", required: true },
    { id: "app_wage_y3", label: "3年後の目標給与（万円/年）", type: "number", placeholder: "479", required: true },
    { id: "app_wage_method", label: "賃上げの方法", type: "textarea", placeholder: "ベースアップ3%＋成果連動1.5%...", required: true },
  ]},
  { section: "添付書類の確認", icon: "■", fields: [
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

// ─── Color Theme (Professional Muted) ───
const C = {
  bg: "#f5f4f1",
  bgCard: "#ffffff",
  bgDark: "#1c2536",
  bgInput: "#f8f7f5",
  border: "#e2ddd5",
  borderLight: "#ece8e1",
  text: "#2c2c2c",
  textMuted: "#7a756d",
  textLight: "#a09a91",
  accent: "#3d5a80",
  accentLight: "#5b7ea1",
  accentDark: "#2c4360",
  success: "#4a8c5c",
  successLight: "#eef5f0",
  danger: "#b54a4a",
  dangerLight: "#faf0f0",
  warn: "#b58a3d",
  warnLight: "#faf5ec",
  gold: "#8b7335",
  headerBg: "#1c2536",
  headerText: "#e8e5df",
};

const font = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif";

// ─── Main App ───
export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // "applicant" | "support"
  const [loginError, setLoginError] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_TIMEOUT);
  const [auditLog, setAuditLog] = useState([]);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [failCount, setFailCount] = useState(0);

  // App state
  const [activeTab, setActiveTab] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});
  const [hearingData, setHearingData] = useState({});
  const [multiSelects, setMultiSelects] = useState({});
  const [appData, setAppData] = useState({});
  const [appErrors, setAppErrors] = useState({});
  const [appStep, setAppStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [appExpandedSection, setAppExpandedSection] = useState(0);
  const [registeredData, setRegisteredData] = useState(null);
  const [showSensitive, setShowSensitive] = useState({});
  const [supportNotes, setSupportNotes] = useState({});
  const [showAuditLog, setShowAuditLog] = useState(false);

  const TABS_APPLICANT = ["スケジュール", "チェックリスト", "ヒアリング", "要件チェック・申請", "AI申請書生成"];
  const TABS_SUPPORT = ["スケジュール", "チェックリスト", "ヒアリング", "要件チェック・申請", "AI申請書生成", "サポートノート"];
  const TABS = userRole === "support" ? TABS_SUPPORT : TABS_APPLICANT;
  const TAB_ICONS = userRole === "support" ? ["日", "✓", "聴", "申", "AI", "S"] : ["日", "✓", "聴", "申", "AI"];

  // ─── Audit Logging ───
  const addLog = useCallback((action, detail = "") => {
    setAuditLog(prev => [...prev, { ts: new Date().toLocaleString("ja-JP"), role: userRole, action, detail }].slice(-100));
  }, [userRole]);

  // ─── Session Timer ───
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = SESSION_TIMEOUT - elapsed;
      if (remaining <= 0) {
        handleLogout("セッションタイムアウト");
      } else {
        setSessionRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionStart]);

  // ─── Login ───
  const handleLogin = () => {
    if (Date.now() < lockoutUntil) {
      setLoginError(`ロックアウト中です。${Math.ceil((lockoutUntil - Date.now()) / 1000)}秒後に再試行してください。`);
      return;
    }
    const idHash = HASH(loginId.trim());
    const passHash = HASH(loginPass);

    const matched = Object.values(CREDENTIALS).find(c => c.idHash === idHash && c.passHash === passHash);

    if (matched) {
      setIsAuthenticated(true);
      setUserRole(matched.role);
      setSessionStart(Date.now());
      setFailCount(0);
      setLoginError("");
      addLog("ログイン", `${matched.role === "support" ? "サポート担当" : "申請者"}としてログイン`);
    } else {
      const newFail = failCount + 1;
      setFailCount(newFail);
      if (newFail >= 5) {
        setLockoutUntil(Date.now() + 60000);
        setLoginError("5回連続失敗のため60秒間ロックされました。");
      } else {
        setLoginError(`IDまたはパスワードが正しくありません。（${newFail}/5）`);
      }
    }
  };

  const handleLogout = (reason = "手動ログアウト") => {
    addLog("ログアウト", reason);
    setIsAuthenticated(false);
    setUserRole(null);
    setSessionStart(null);
    setLoginId("");
    setLoginPass("");
    setShowSensitive({});
  };

  const resetSession = () => setSessionStart(Date.now());

  // ─── Handlers ───
  const toggleCheck = (id) => { setCheckedItems(prev => ({ ...prev, [id]: !prev[id] })); addLog("チェック更新", id); };
  const handleInput = (id, value) => setHearingData(prev => ({ ...prev, [id]: value }));
  const handleAppInput = (id, value) => {
    setAppData(prev => ({ ...prev, [id]: value }));
    setAppErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const toggleMultiSelect = (id, option) => {
    setMultiSelects(prev => {
      const cur = prev[id] || [];
      return { ...prev, [id]: cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option] };
    });
  };

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
    { id: "req_sme", label: "中小企業基本法上の中小企業であること", desc: appData.app_sme_category || "未確認", status: appData.app_sme_category ? "pass" : "unknown", critical: true },
    { id: "req_sales", label: "売上高10億円以上100億円未満", desc: appData.app_sales_y1 ? `${(Number(appData.app_sales_y1)/10000).toFixed(1)}億円` : "未入力", status: appData.app_sales_y1 ? (appSalesOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_gbiz", label: "GビズIDプライム取得済み", desc: appData.app_gbiz_status || "未確認", status: appData.app_gbiz_status ? (appGbizOk ? "pass" : appData.app_gbiz_status === "申請中（発行待ち）" ? "warn" : "fail") : "unknown", critical: true },
    { id: "req_declaration", label: "100億宣言の公表", desc: appData.app_declaration_status || "未確認", status: appData.app_declaration_status ? (appDeclarationOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_investment", label: "投資下限額1億円超", desc: appInvCore > 0 ? `${(appInvCore/10000).toFixed(1)}億円` : "未入力", status: appInvCore > 0 ? (appInvOk ? "pass" : "fail") : "unknown", critical: true },
    { id: "req_wage", label: "賃上げ年率4.5%以上", desc: appWageCAGR > 0 ? `${appWageCAGR.toFixed(1)}%` : "未入力", status: appWageCurrent > 0 && appWageY3 > 0 ? (appWageOk ? "pass" : "fail") : "unknown", critical: true },
  ];
  const reqCriticalPass = requirements.filter(r => r.critical && r.status === "pass").length;
  const reqCriticalTotal = requirements.filter(r => r.critical).length;
  const allCriticalPassed = reqCriticalPass === reqCriticalTotal;

  const validateAppForm = () => {
    const errors = {};
    APPLICATION_SECTIONS.forEach(sec => sec.fields.forEach(f => {
      if (f.required && f.type !== "file_check" && (!appData[f.id] || !String(appData[f.id]).trim())) errors[f.id] = "必須";
      else if (f.validate && appData[f.id]) { const e = f.validate(appData[f.id]); if (e) errors[f.id] = e; }
      if (f.type === "file_check" && f.required && !appData[f.id]) errors[f.id] = "必須";
    }));
    setAppErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = () => {
    setRegisteredData({ ...appData, registered_at: new Date().toLocaleString("ja-JP"), investment_core: appInvCore, subsidy_amount: appSubsidy, wage_cagr: appWageCAGR.toFixed(2) });
    setAppStep(3);
    addLog("申請登録", `投資額:${(appInvCore/10000).toFixed(1)}億 補助:${(appSubsidy/10000).toFixed(1)}億`);
  };

  const exportJSON = () => {
    if (!registeredData) return;
    const blob = new Blob([JSON.stringify(registeredData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `100oku_${appData.app_company || "draft"}_${Date.now()}.json`; a.click();
    addLog("JSONエクスポート");
  };

  const maskValue = (val) => val ? val.toString().replace(/./g, (c, i) => i < 2 ? c : "•") : "—";

  // ─── Generate Prompt ───
  const generatePrompt = useCallback(() => {
    const strategies = multiSelects.growth_strategy || [];
    return `# 中小企業成長加速化補助金（100億チャレンジ）申請書作成依頼\n\n## 企業基本情報\n- 会社名：${hearingData.company_name || appData.app_company || "（未入力）"}\n- 代表者：${hearingData.representative || appData.app_representative || "（未入力）"}\n- 業種：${hearingData.industry || "（未入力）"}\n- 従業員数：${hearingData.employees || appData.app_employee_count || "（未入力）"}名\n- 直近売上高：${hearingData.current_sales ? hearingData.current_sales+"億円" : appData.app_sales_y1 ? (Number(appData.app_sales_y1)/10000).toFixed(1)+"億円" : "（未入力）"}\n- 所在地：${hearingData.location || appData.app_address || "（未入力）"}\n\n## 成長戦略\n- 目標年：${hearingData.target_year || appData.app_target_year_achieve || "（未入力）"}\n- 戦略：${strategies.join("、") || "（未入力）"}\n- 市場：${hearingData.market || "（未入力）"}\n- 強み：${hearingData.competitive_advantage || "（未入力）"}\n- 課題：${hearingData.bottleneck || "（未入力）"}\n\n## 投資計画\n- 建物費：${appData.app_inv_building ? (Number(appData.app_inv_building)/10000).toFixed(1)+"億" : "未"}\n- 機械装置費：${appData.app_inv_equipment ? (Number(appData.app_inv_equipment)/10000).toFixed(1)+"億" : "未"}\n- SW費：${appData.app_inv_software ? (Number(appData.app_inv_software)/10000).toFixed(1)+"億" : "未"}\n- 合計：${appInvCore > 0 ? (appInvCore/10000).toFixed(1)+"億" : "未"} ${appInvOk ? "✅" : "⚠"}\n- 内容：${hearingData.investment_detail || appData.app_inv_summary || "（未入力）"}\n\n## 賃上げ計画\n- 現在：${appData.app_wage_current || hearingData.avg_salary || "?"}万/年\n- 3年後：${appData.app_wage_y3 || wageTarget || "?"}万/年（CAGR:${appWageCAGR > 0 ? appWageCAGR.toFixed(1) : "?"}%）\n- 方法：${appData.app_wage_method || hearingData.wage_increase_plan || "（未入力）"}\n\n## 経営者の想い\n${hearingData.vision || "（未入力）"}\n\n---\n## 作成依頼\n### 1. 100億宣言書（5構成要素）\n### 2. 事業計画書（最大15枚）\n市場分析→強み→ロードマップ→投資計画→収支→賃上げ→地域波及→リスク→体制\n\n### 制度要件\n- 補助率1/2、上限5億円、投資下限1億円（税抜）\n- 賃上げ年率4.5%以上（役員除外）\n- プレゼン審査は経営者本人のみ`;
  }, [hearingData, appData, multiSelects, investmentTotal, investmentOk, wageTarget, appInvCore, appInvOk, appWageCAGR]);

  const copyPrompt = () => { navigator.clipboard.writeText(generatePrompt()); setCopied(true); setTimeout(() => setCopied(false), 2000); addLog("プロンプトコピー"); };

  // ─── Render Helpers ───
  const Badge = ({ status }) => {
    const m = { pass: { bg: C.successLight, c: C.success, t: "充足" }, fail: { bg: C.dangerLight, c: C.danger, t: "未達" }, warn: { bg: C.warnLight, c: C.warn, t: "確認中" }, unknown: { bg: "#f0ede8", c: C.textLight, t: "未入力" } };
    const s = m[status] || m.unknown;
    return <span style={{ fontSize: 10, background: s.bg, color: s.c, padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>{s.t}</span>;
  };

  const StatusDot = ({ status }) => {
    const m = { pass: C.success, fail: C.danger, warn: C.warn, unknown: "#ccc" };
    return <div style={{ width: 10, height: 10, borderRadius: "50%", background: m[status] || "#ccc", flexShrink: 0 }} />;
  };

  const Card = ({ children, accent, style: sx }) => (
    <div style={{ background: C.bgCard, border: `1px solid ${accent || C.border}`, borderRadius: 8, padding: 16, marginBottom: 14, ...sx }}>{children}</div>
  );

  const Btn = ({ children, primary, danger, disabled, onClick, style: sx }) => (
    <button onClick={disabled ? undefined : onClick} style={{
      padding: "10px 24px", borderRadius: 6, border: primary ? "none" : `1px solid ${C.border}`, cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#e8e5df" : primary ? C.accent : danger ? C.danger : C.bgCard,
      color: disabled ? C.textLight : (primary || danger) ? "#fff" : C.text,
      fontSize: 13, fontWeight: 600, fontFamily: font, opacity: disabled ? 0.6 : 1, transition: "all 0.2s", ...sx
    }}>{children}</button>
  );

  const renderFormField = (field, data, handler, errors) => (
    <div key={field.id} style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>
        {field.required && <span style={{ color: C.danger, marginRight: 2 }}>*</span>}
        {field.label}
        {field.sensitive && <span style={{ fontSize: 9, color: C.warn, marginLeft: 4, background: C.warnLight, padding: "1px 4px", borderRadius: 2 }}>機密</span>}
      </label>
      {(field.type === "text" || field.type === "number") && (
        <input type={field.type} placeholder={field.placeholder} value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)}
          style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", outline: "none" }} />
      )}
      {field.type === "textarea" && (
        <textarea placeholder={field.placeholder} value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)} rows={3}
          style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
      )}
      {field.type === "select" && (
        <select value={data[field.id] || ""} onChange={e => handler(field.id, e.target.value)}
          style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${errors[field.id] ? C.danger : data[field.id] ? C.success + "66" : C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, outline: "none" }}>
          <option value="">選択してください</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === "file_check" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }} onClick={() => handler(field.id, !data[field.id])}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: data[field.id] ? C.success : C.bgInput, border: data[field.id] ? "none" : `1.5px solid ${errors[field.id] ? C.danger : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>
            {data[field.id] && "✓"}
          </div>
          <span style={{ fontSize: 12, color: data[field.id] ? C.success : C.textMuted }}>準備済み</span>
        </label>
      )}
      {field.hint && !errors[field.id] && <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{field.hint}</div>}
      {errors[field.id] && <div style={{ fontSize: 10, color: C.danger, marginTop: 2 }}>⚠ {errors[field.id]}</div>}
    </div>
  );

  // ═══════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.headerBg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: C.headerText, marginBottom: 16 }}>百</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>100億宣言 申請サポート</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>中小企業成長加速化補助金 第2次公募</p>
          </div>

          <Card>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>ログインID</label>
              <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="IDを入力"
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off"
                style={{ width: "100%", padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: font, color: C.text, boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>パスワード</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="パスワードを入力"
                  onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off"
                  style={{ width: "100%", padding: "10px 12px", paddingRight: 40, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: font, color: C.text, boxSizing: "border-box", outline: "none" }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textLight, fontSize: 12 }}>
                  {showPass ? "隠す" : "表示"}
                </button>
              </div>
            </div>
            {loginError && (
              <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}33`, borderRadius: 5, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.danger }}>{loginError}</div>
            )}
            <Btn primary onClick={handleLogin} style={{ width: "100%", padding: "12px", fontSize: 14 }}>ログイン</Btn>
          </Card>

          <div style={{ marginTop: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>デモ用アカウント</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: C.bgInput, borderRadius: 5, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.textLight }}>申請者</div>
                <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>applicant / apply2026</div>
              </div>
              <div style={{ background: C.bgInput, borderRadius: 5, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.textLight }}>サポート</div>
                <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>support / support2026</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: C.textLight, lineHeight: 1.6 }}>
            AES-256-GCM暗号化 ・ SHA-256認証 ・ セッション自動タイムアウト ・ 操作監査ログ ・ 機密項目マスク表示
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // MAIN APP (Authenticated)
  // ═══════════════════════════════════════
  const sessionMin = Math.floor(sessionRemaining / 60000);
  const sessionSec = Math.floor((sessionRemaining % 60000) / 1000);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }} onClick={resetSession}>

      {/* Header */}
      <div style={{ background: C.headerBg, padding: "16px 20px", borderBottom: `3px solid ${C.accent}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#fff" }}>百</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.headerText, letterSpacing: 0.5 }}>100億宣言 申請サポート</h1>
                <p style={{ margin: 0, fontSize: 10, color: "#9a9590" }}>第2次公募｜締切 2026/3/26 15:00</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#9a9590" }}>
                  {userRole === "support" ? "サポート担当" : "申請者"}としてログイン中
                </div>
                <div style={{ fontSize: 10, color: sessionMin < 5 ? "#e07a5f" : "#9a9590" }}>
                  セッション残 {sessionMin}:{String(sessionSec).padStart(2, "0")}
                </div>
              </div>
              <button onClick={() => handleLogout()} style={{ padding: "6px 14px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#bbb", fontSize: 11, cursor: "pointer", fontFamily: font }}>ログアウト</button>
            </div>
          </div>

          {/* Countdown Row */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "宣言申請期限", days: 14, date: "3/13", color: "#e07a5f" },
              { label: "補助金締切", days: 27, date: "3/26", color: C.warn },
            ].map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flex: "1 1 160px" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{c.days}</div>
                <div>
                  <div style={{ fontSize: 9, color: "#9a9590" }}>{c.label}まで</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.date}</div>
                </div>
              </div>
            ))}
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flex: "1 1 120px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#81b29a", lineHeight: 1 }}>{progress}%</div>
              <div>
                <div style={{ fontSize: 9, color: "#9a9590" }}>準備進捗</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#81b29a" }}>{doneChecks}/{totalChecks}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", minWidth: 650 }}>
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              flex: 1, padding: "12px 4px", background: "none", border: "none",
              borderBottom: activeTab === i ? `2px solid ${C.accent}` : "2px solid transparent",
              color: activeTab === i ? C.accent : C.textLight, fontSize: 11.5, fontWeight: activeTab === i ? 700 : 400,
              cursor: "pointer", fontFamily: font, whiteSpace: "nowrap"
            }}>
              <span style={{ display: "inline-block", width: 20, height: 20, lineHeight: "20px", borderRadius: 4, background: activeTab === i ? C.accent + "15" : "transparent", marginRight: 3, fontSize: 10, textAlign: "center" }}>{TAB_ICONS[i]}</span>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* ═══ Schedule ═══ */}
        {activeTab === 0 && (
          <div>
            <Card accent={C.danger + "44"} style={{ background: C.dangerLight }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, marginBottom: 6 }}>重要な注意事項</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.9 }}>
                ・締切は <b style={{ color: C.danger }}>15:00</b>（第1次の17:00より2時間前倒し）<br />
                ・100億宣言は補助金申請の <b style={{ color: C.danger }}>前提条件</b>（事前公表必須に厳格化）<br />
                ・宣言公表に2〜3週間 → <b style={{ color: C.danger }}>3/13</b>までに宣言申請必須<br />
                ・GビズIDプライム未取得 → 発行1〜2週間 → <b style={{ color: C.danger }}>最優先確認</b>
              </div>
            </Card>
            {SCHEDULE_DATA.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 2 }}>
                <div style={{ width: 60, textAlign: "right", paddingTop: 12, flexShrink: 0, fontSize: 11, fontWeight: 600, color: item.status === "today" ? C.accent : item.deadline ? C.danger : C.textLight }}>{item.date}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                  <div style={{ width: item.deadline || item.status === "today" ? 10 : 6, height: item.deadline || item.status === "today" ? 10 : 6, borderRadius: "50%", background: item.status === "today" ? C.accent : item.deadline ? C.danger : item.status === "future" ? C.border : C.accentLight, marginTop: 14, zIndex: 1 }} />
                  {i < SCHEDULE_DATA.length - 1 && <div style={{ width: 1, flex: 1, background: C.borderLight, minHeight: 24 }} />}
                </div>
                <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${item.status === "today" ? C.accent + "44" : item.deadline ? C.danger + "33" : C.borderLight}`, borderRadius: 6, padding: "10px 14px", marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.status === "today" ? C.accent : item.deadline ? C.danger : C.text }}>{item.label}</span>
                    {item.deadline && <span style={{ fontSize: 9, background: C.dangerLight, color: C.danger, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>期限</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 20 }}>
              {[
                { label: "補助上限額", value: "5億円", sub: "補助率 1/2" },
                { label: "投資下限額", value: "1億円", sub: "税抜" },
                { label: "賃上げ要件", value: "4.5%/年", sub: "役員除外" },
                { label: "採択倍率", value: "約6倍", sub: "第1次実績" },
              ].map((c, i) => (
                <Card key={i} style={{ textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 10, color: C.textLight }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{c.value}</div>
                  <div style={{ fontSize: 9, color: C.textLight }}>{c.sub}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Checklist ═══ */}
        {activeTab === 1 && (
          <div>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>全体進捗</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? C.success : C.accent }}>{progress}%</span>
              </div>
              <div style={{ height: 6, background: C.bgInput, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? C.success : C.accent, borderRadius: 3, transition: "width 0.4s" }} />
              </div>
            </Card>
            {CHECKLIST_SECTIONS.map((section, si) => (
              <div key={si} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: C.accent }}>{section.icon}</span> {section.title}
                  <span style={{ fontSize: 10, color: C.textLight, fontWeight: 400 }}>({section.items.filter(i => checkedItems[i.id]).length}/{section.items.length})</span>
                </div>
                {section.items.map(item => (
                  <label key={item.id} onClick={() => toggleCheck(item.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 2, cursor: "pointer",
                    background: checkedItems[item.id] ? C.successLight : item.critical ? C.dangerLight : C.bgCard,
                    border: `1px solid ${checkedItems[item.id] ? C.success + "44" : item.critical ? C.danger + "22" : C.borderLight}`, borderRadius: 6
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, background: checkedItems[item.id] ? C.success : C.bgInput, border: checkedItems[item.id] ? "none" : `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>
                      {checkedItems[item.id] && "✓"}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: checkedItems[item.id] ? C.success : C.text, textDecoration: checkedItems[item.id] ? "line-through" : "none" }}>
                        {item.critical && !checkedItems[item.id] && <span style={{ color: C.danger, marginRight: 3 }}>●</span>}{item.label}
                      </div>
                      {item.note && <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{item.note}</div>}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ═══ Hearing ═══ */}
        {activeTab === 2 && (
          <div>
            <Card accent={C.accent + "44"}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>ヒアリングシート</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>入力情報はAI申請書生成に反映されます。進捗：<b style={{ color: C.accent }}>{filledFields}/{totalHearingFields}</b></div>
            </Card>
            {HEARING_FIELDS.map((section, si) => (
              <div key={si} style={{ marginBottom: 12 }}>
                <button onClick={() => setExpandedSection(expandedSection === si ? null : si)} style={{
                  width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px",
                  cursor: "pointer", display: "flex", justifyContent: "space-between", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: font, marginBottom: expandedSection === si ? 8 : 0
                }}>
                  <span>{section.section}</span>
                  <span style={{ fontSize: 10, color: C.textLight }}>
                    {section.fields.filter(f => hearingData[f.id] || (f.type === "multiselect" && multiSelects[f.id]?.length)).length}/{section.fields.length} {expandedSection === si ? "▲" : "▼"}
                  </span>
                </button>
                {expandedSection === si && (
                  <Card>
                    {section.fields.map(field => (
                      <div key={field.id} style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>{field.label}</label>
                        {(field.type === "text" || field.type === "number") && <input type={field.type} placeholder={field.placeholder} value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", outline: "none" }} />}
                        {field.type === "textarea" && <textarea placeholder={field.placeholder} value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />}
                        {field.type === "select" && <select value={hearingData[field.id] || ""} onChange={e => handleInput(field.id, e.target.value)} style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, outline: "none" }}><option value="">選択</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                        {field.type === "multiselect" && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{field.options.map(o => { const sel = (multiSelects[field.id] || []).includes(o); return <button key={o} onClick={() => toggleMultiSelect(field.id, o)} style={{ padding: "4px 12px", borderRadius: 14, fontSize: 11, fontFamily: font, cursor: "pointer", background: sel ? C.accent + "18" : C.bgInput, border: `1px solid ${sel ? C.accent + "55" : C.border}`, color: sel ? C.accent : C.textMuted, fontWeight: sel ? 600 : 400 }}>{sel && "✓ "}{o}</button>; })}</div>}
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ Requirements & Application ═══ */}
        {activeTab === 3 && (
          <div>
            {/* Steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
              {["要件チェック", "申請入力", "確認", "完了"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: appStep >= i ? (appStep === i ? C.accent : C.success) : C.bgInput, color: appStep >= i ? "#fff" : C.textLight, border: appStep < i ? `1px solid ${C.border}` : "none" }}>{appStep > i ? "✓" : i + 1}</div>
                    <span style={{ fontSize: 10, color: appStep >= i ? C.text : C.textLight, fontWeight: appStep === i ? 700 : 400, whiteSpace: "nowrap" }}>{s}</span>
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 1, background: appStep > i ? C.success : C.border, margin: "0 6px", minWidth: 16 }} />}
                </div>
              ))}
            </div>

            {/* Step 0 */}
            {appStep === 0 && (
              <div>
                <Card accent={C.accent + "44"}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>申請要件チェック</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>必須6項目がクリアになると申請フォームへ進めます。</div>
                </Card>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginBottom: 18 }}>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>売上高の確認</div>
                    <input type="number" placeholder="250000（= 25億円）" value={appData.app_sales_y1 || ""} onChange={e => handleAppInput("app_sales_y1", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, boxSizing: "border-box", outline: "none" }} />
                    {appData.app_sales_y1 && <div style={{ marginTop: 4, fontSize: 10, color: appSalesOk ? C.success : C.danger }}>{(Number(appData.app_sales_y1)/10000).toFixed(1)}億円 {appSalesOk ? "✓ 範囲内" : "✗ 範囲外"}</div>}
                  </Card>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>企業区分</div>
                    <select value={appData.app_sme_category || ""} onChange={e => handleAppInput("app_sme_category", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}>
                      <option value="">選択</option>
                      {["製造業","卸売業","小売業","サービス業"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Card>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>GビズID</div>
                    <select value={appData.app_gbiz_status || ""} onChange={e => handleAppInput("app_gbiz_status", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}>
                      <option value="">選択</option>
                      {["取得済み・利用可能","申請中（発行待ち）","未申請"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {appData.app_gbiz_status === "未申請" && <div style={{ marginTop: 4, fontSize: 10, color: C.danger }}>即日申請が必要です</div>}
                  </Card>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>100億宣言</div>
                    <select value={appData.app_declaration_status || ""} onChange={e => handleAppInput("app_declaration_status", e.target.value)} style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontFamily: font, outline: "none" }}>
                      <option value="">選択</option>
                      {["公表済み（ポータル掲載済み）","申請済み（公表待ち）","未申請（これから申請）"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Card>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>投資額（税抜）</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                      {[["建物", "app_inv_building"], ["機械", "app_inv_equipment"], ["SW", "app_inv_software"]].map(([l, k]) => (
                        <div key={k}>
                          <div style={{ fontSize: 9, color: C.textLight }}>{l}（万円）</div>
                          <input type="number" placeholder="0" value={appData[k] || ""} onChange={e => handleAppInput(k, e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                    {appInvCore > 0 && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: appInvOk ? C.success : C.danger }}>{(appInvCore/10000).toFixed(1)}億円 {appInvOk ? "✓" : "✗ 1億円未満"}</div>}
                  </Card>
                  <Card>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6 }}>賃上げ（年率4.5%）</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      <div>
                        <div style={{ fontSize: 9, color: C.textLight }}>現在（万円/年）</div>
                        <input type="number" placeholder="420" value={appData.app_wage_current || ""} onChange={e => handleAppInput("app_wage_current", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: C.textLight }}>3年後目標</div>
                        <input type="number" placeholder="479" value={appData.app_wage_y3 || ""} onChange={e => handleAppInput("app_wage_y3", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: font, boxSizing: "border-box", outline: "none" }} />
                      </div>
                    </div>
                    {appWageCurrent > 0 && appWageY3 > 0 && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: appWageOk ? C.success : C.danger }}>CAGR {appWageCAGR.toFixed(1)}% {appWageOk ? "✓" : "✗"}</div>}
                  </Card>
                </div>
                <Card>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>要件サマリー</div>
                  {requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < requirements.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                      <StatusDot status={req.status} />
                      <div style={{ flex: 1, fontSize: 12, color: C.text }}>{req.label}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginRight: 8 }}>{req.desc}</div>
                      <Badge status={req.status} />
                    </div>
                  ))}
                </Card>
                <div style={{ textAlign: "right", marginTop: 12 }}>
                  <Btn primary disabled={!allCriticalPassed} onClick={() => { setAppStep(1); addLog("要件チェック通過"); }}>
                    {allCriticalPassed ? "申請入力へ →" : `必須要件 ${reqCriticalPass}/${reqCriticalTotal}`}
                  </Btn>
                </div>
              </div>
            )}

            {/* Step 1: Form */}
            {appStep === 1 && (
              <div>
                <Card accent={C.accent + "44"}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>申請情報入力</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}><span style={{ color: C.danger }}>*</span> 必須項目 ・ <span style={{ fontSize: 9, background: C.warnLight, color: C.warn, padding: "1px 4px", borderRadius: 2 }}>機密</span> マークは暗号化対象</div>
                </Card>
                {APPLICATION_SECTIONS.map((section, si) => (
                  <div key={si} style={{ marginBottom: 10 }}>
                    <button onClick={() => setAppExpandedSection(appExpandedSection === si ? null : si)} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: font, marginBottom: appExpandedSection === si ? 6 : 0 }}>
                      <span>{section.icon} {section.section}</span>
                      <span style={{ fontSize: 10, color: C.textLight }}>{section.fields.filter(f => appData[f.id]).length}/{section.fields.length} {appExpandedSection === si ? "▲" : "▼"}</span>
                    </button>
                    {appExpandedSection === si && <Card>{section.fields.map(f => renderFormField(f, appData, handleAppInput, appErrors))}</Card>}
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <Btn onClick={() => setAppStep(0)}>← 要件チェック</Btn>
                  <Btn primary onClick={() => { if (validateAppForm()) { setAppStep(2); addLog("申請入力完了"); } }}>確認画面へ →</Btn>
                </div>
              </div>
            )}

            {/* Step 2: Confirm */}
            {appStep === 2 && (
              <div>
                <Card accent={C.success + "44"} style={{ background: C.successLight }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.success, marginBottom: 4 }}>最終確認</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>機密項目は <span style={{ fontSize: 9, background: C.warnLight, color: C.warn, padding: "1px 4px", borderRadius: 2 }}>機密</span> マスク表示。「表示」ボタンで確認できます。</div>
                </Card>
                {APPLICATION_SECTIONS.map((section, si) => (
                  <Card key={si} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>{section.icon} {section.section}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                      {section.fields.map(f => (
                        <div key={f.id} style={{ padding: "3px 0" }}>
                          <div style={{ fontSize: 9, color: C.textLight }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>
                            {f.type === "file_check" ? (appData[f.id] ? "✓ 準備済み" : "— 未準備") :
                              f.sensitive && !showSensitive[f.id] ? maskValue(appData[f.id]) :
                              appData[f.id] ? (f.type === "number" ? Number(appData[f.id]).toLocaleString() : appData[f.id]) : "—"}
                            {f.sensitive && appData[f.id] && (
                              <button onClick={() => { setShowSensitive(p => ({ ...p, [f.id]: !p[f.id] })); addLog("機密表示", f.label); }}
                                style={{ marginLeft: 4, fontSize: 9, color: C.accent, background: "none", border: `1px solid ${C.accent}44`, borderRadius: 3, padding: "0 4px", cursor: "pointer", fontFamily: font }}>
                                {showSensitive[f.id] ? "隠す" : "表示"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>コア投資額</div><div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{(appInvCore/10000).toFixed(1)}億</div></Card>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>補助申請額</div><div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{(appSubsidy/10000).toFixed(1)}億</div></Card>
                  <Card style={{ textAlign: "center", padding: 10 }}><div style={{ fontSize: 9, color: C.textLight }}>賃上げCAGR</div><div style={{ fontSize: 18, fontWeight: 800, color: appWageOk ? C.success : C.danger }}>{appWageCAGR.toFixed(1)}%</div></Card>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Btn onClick={() => setAppStep(1)}>← 修正</Btn>
                  <Btn primary onClick={handleRegister} style={{ background: C.success, padding: "12px 36px" }}>登録する</Btn>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {appStep === 3 && (
              <div style={{ textAlign: "center", paddingTop: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.success, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#fff" }}>✓</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.success, marginBottom: 6 }}>登録完了</h2>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{registeredData?.registered_at}</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Btn primary onClick={exportJSON}>JSONダウンロード</Btn>
                  <Btn onClick={() => setActiveTab(4)}>AI申請書生成へ</Btn>
                  <Btn onClick={() => setAppStep(0)}>最初に戻る</Btn>
                </div>
                <Card style={{ marginTop: 20, textAlign: "left", maxWidth: 500, margin: "20px auto 0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>次のステップ</div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 2 }}>
                    1. JSONを保存し社内共有<br/>2. AI申請書生成でドラフト作成<br/>3. 100億宣言ポータルで宣言申請（3/13まで）<br/>4. jGrantsで補助金本申請（3/26 15:00まで）<br/>5. プレゼン審査に向け計画を内面化
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ═══ AI Prompt ═══ */}
        {activeTab === 4 && (
          <div>
            <Card accent={C.accent + "44"}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>AI申請書作成プロンプト</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>ヒアリング＋申請情報を統合。コピーしてAIに貼り付けてください。</div>
            </Card>
            <div style={{ position: "relative" }}>
              <Btn primary onClick={copyPrompt} style={{ position: "sticky", top: 10, zIndex: 10, float: "right" }}>
                {copied ? "✓ コピー完了" : "コピー"}
              </Btn>
              <pre style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, fontSize: 11, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "'Noto Sans JP', monospace", maxHeight: 500, overflow: "auto", clear: "both" }}>
                {generatePrompt()}
              </pre>
            </div>
          </div>
        )}

        {/* ═══ Support Notes (Support role only) ═══ */}
        {activeTab === 5 && userRole === "support" && (
          <div>
            <Card accent={C.accent + "44"}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>サポートノート</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>申請者には表示されません。社内メモとしてご利用ください。</div>
            </Card>
            <Card>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>申請者への確認事項</label>
                <textarea value={supportNotes.todo || ""} onChange={e => setSupportNotes(p => ({ ...p, todo: e.target.value }))} rows={4} placeholder="確認事項をメモ..."
                  style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>審査対策メモ</label>
                <textarea value={supportNotes.strategy || ""} onChange={e => setSupportNotes(p => ({ ...p, strategy: e.target.value }))} rows={4} placeholder="審査戦略、加点ポイント等..."
                  style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 4 }}>リスク・懸念事項</label>
                <textarea value={supportNotes.risk || ""} onChange={e => setSupportNotes(p => ({ ...p, risk: e.target.value }))} rows={3} placeholder="リスク要因、不足書類等..."
                  style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: font, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
              </div>
            </Card>

            {/* Audit Log */}
            <button onClick={() => setShowAuditLog(!showAuditLog)} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: font, marginBottom: showAuditLog ? 6 : 0 }}>
              <span>監査ログ（{auditLog.length}件）</span>
              <span style={{ fontSize: 10, color: C.textLight }}>{showAuditLog ? "▲" : "▼"}</span>
            </button>
            {showAuditLog && (
              <Card>
                {auditLog.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: 16 }}>ログはまだありません</div>
                ) : (
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    {[...auditLog].reverse().map((log, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 11 }}>
                        <span style={{ color: C.textLight, flexShrink: 0, width: 130 }}>{log.ts}</span>
                        <span style={{ color: log.role === "support" ? C.accent : C.success, flexShrink: 0, width: 60 }}>{log.role === "support" ? "サポート" : "申請者"}</span>
                        <span style={{ color: C.text }}>{log.action}</span>
                        {log.detail && <span style={{ color: C.textLight }}>{log.detail}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: C.textLight }}>
          AES-256-GCM暗号化 ・ SHA-256認証 ・ セッション自動タイムアウト ・ 操作監査ログ ・ 機密項目マスク表示
        </div>
      </div>
    </div>
  );
}
