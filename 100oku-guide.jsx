import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#f6f5f2",
  paper: "#ffffff",
  ink: "#1e1e1e",
  inkLight: "#4a4a4a",
  inkMuted: "#7a756d",
  inkFaint: "#a8a29e",
  accent: "#2c4a6e",
  accentLight: "#3d6590",
  accentPale: "#e8eef5",
  gold: "#8b7335",
  goldPale: "#f5f0e3",
  success: "#3d6b4f",
  successPale: "#eaf2ec",
  danger: "#8b3a3a",
  dangerPale: "#f5eded",
  warn: "#8b6b2a",
  warnPale: "#f7f2e6",
  border: "#e0dbd3",
  borderLight: "#ece8e1",
};

const sections = [
  { id: "overview", label: "制度の概要" },
  { id: "structure", label: "全体構造" },
  { id: "declaration", label: "100億宣言とは" },
  { id: "subsidy", label: "補助金の詳細" },
  { id: "schedule", label: "スケジュール" },
  { id: "requirements", label: "申請要件" },
  { id: "changes", label: "第2次公募の変更点" },
  { id: "review", label: "審査のポイント" },
  { id: "tips", label: "採択率を上げるコツ" },
  { id: "faq", label: "よくある質問" },
  { id: "contacts", label: "相談窓口" },
];

const faqData = [
  { q: "売上がまだ10億円に届いていませんが、申請できますか？", a: "100億宣言および補助金の対象は「売上高10億円以上100億円未満」の中小企業です。10億円に満たない場合は対象外となります。ただし、直近決算で10億円を超える見込みがある場合は、個別に事務局へご相談ください。" },
  { q: "GビズIDプライムをまだ持っていません。今から間に合いますか？", a: "GビズIDプライムの発行には通常1〜2週間かかります。第2次公募の締切（3/26）に間に合わせるには、今すぐ申請が必要です。オンラインで即日申請できますが、審査・発行には時間がかかるため、一日でも早い対応をお勧めします。" },
  { q: "第1次公募で不採択になりました。第2次公募に再チャレンジできますか？", a: "再申請は可能です。むしろ第1次のフィードバックを活かして事業計画を改善すれば、より高い評価を得られる可能性があります。ただし、第2次公募では賃上げ要件が4.5%に引き上げられるなど要件が変わっている点にご注意ください。" },
  { q: "外部コンサルタントに申請を手伝ってもらえますか？", a: "事業計画書の作成支援は利用可能ですが、第2次審査（プレゼンテーション）には経営者本人のみが参加でき、コンサルタントの同席は明確に禁止されています。計画の中身を経営者自身が深く理解していることが合否を左右します。" },
  { q: "投資の対象に「土地代」は含まれますか？", a: "含まれません。補助対象は建物費（新設・増築・改修・中古取得）、機械装置費、ソフトウェア費、外注費、専門家経費に限られます。土地、外構工事、駐車場舗装なども対象外です。" },
  { q: "賃上げ目標を達成できなかった場合はどうなりますか？", a: "未達成率に応じて補助金の一部返還が求められます。特に深刻なのは、実績が申請時の直近年度を下回った場合で、この場合は「全額返還」となります。無理のない、しかし意欲的な計画設計が重要です。" },
  { q: "100億宣言だけして、補助金に申請しないことは可能ですか？", a: "可能です。宣言自体は補助金申請とは独立した制度で、宣言を行うことで公式ロゴマークの使用、経営者ネットワークへの参加、伴走支援などのメリットが得られます。" },
  { q: "第3次公募はありますか？", a: "制度全体として2026年度末までに合計3回の公募が予定されています。第3次公募の詳細は未定ですが、秋以降に開始される可能性が高いです。ただし、回を追うごとに残予算が減り、審査が厳しくなる可能性があります。" },
];

export default function App() {
  // ─── Auth ───
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);

  const handleLogin = () => {
    if (Date.now() < lockoutUntil) {
      setLoginError(`ロックアウト中です。${Math.ceil((lockoutUntil - Date.now()) / 1000)}秒後に再試行してください。`);
      return;
    }
    const valid = (loginId.trim() === "applicant" && loginPass === "apply2026") ||
                  (loginId.trim() === "support" && loginPass === "support2026");
    if (valid) {
      setIsAuthenticated(true);
      setLoginError("");
      setFailCount(0);
    } else {
      const nf = failCount + 1;
      setFailCount(nf);
      if (nf >= 5) {
        setLockoutUntil(Date.now() + 60000);
        setLoginError("5回連続失敗のため60秒間ロックされました。");
      } else {
        setLoginError(`IDまたはパスワードが正しくありません。（${nf}/5）`);
      }
    }
  };

  // ─── App state ───
  const [activeSection, setActiveSection] = useState("overview");
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const contentRef = useRef(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const sectionEls = contentRef.current.querySelectorAll("[data-section]");
      let current = "overview";
      sectionEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = el.dataset.section;
      });
      setActiveSection(current);
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNav(false);
  };

  const Heading = ({ children, sub }) => (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: -0.3, lineHeight: 1.4 }}>{children}</h2>
      {sub && <p style={{ fontSize: 13, color: C.inkMuted, margin: "6px 0 0", lineHeight: 1.6 }}>{sub}</p>}
      <div style={{ width: 40, height: 3, background: C.accent, borderRadius: 2, marginTop: 12 }} />
    </div>
  );

  const Card = ({ children, accent, style: sx }) => (
    <div style={{ background: C.paper, border: `1px solid ${accent || C.border}`, borderRadius: 8, padding: "18px 20px", marginBottom: 16, ...sx }}>{children}</div>
  );

  const Callout = ({ type = "info", title, children }) => {
    const m = { info: { bg: C.accentPale, border: C.accent + "44", color: C.accent }, warn: { bg: C.warnPale, border: C.warn + "44", color: C.warn }, danger: { bg: C.dangerPale, border: C.danger + "44", color: C.danger }, success: { bg: C.successPale, border: C.success + "44", color: C.success } };
    const s = m[type];
    return (
      <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: "0 8px 8px 0", padding: "14px 18px", marginBottom: 16 }}>
        {title && <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginBottom: 4 }}>{title}</div>}
        <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.8 }}>{children}</div>
      </div>
    );
  };

  const Stat = ({ value, label, sub, color }) => (
    <div style={{ textAlign: "center", padding: "16px 12px", background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, flex: "1 1 140px" }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || C.accent, lineHeight: 1.1, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const Step = ({ num, title, desc, highlight }) => (
    <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: highlight ? C.accent : C.accentPale, color: highlight ? "#fff" : C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{num}</div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.7 }}>{desc}</div>
      </div>
    </div>
  );

  const TableRow = ({ cells, header }) => (
    <div style={{ display: "grid", gridTemplateColumns: cells.length === 2 ? "180px 1fr" : cells.length === 3 ? "160px 1fr 1fr" : `repeat(${cells.length}, 1fr)`, borderBottom: `1px solid ${C.borderLight}`, background: header ? C.accentPale : "transparent" }}>
      {cells.map((cell, i) => (
        <div key={i} style={{ padding: "10px 14px", fontSize: header ? 11 : 12.5, fontWeight: header ? 700 : 400, color: header ? C.accent : C.inkLight, lineHeight: 1.6, borderRight: i < cells.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>{cell}</div>
      ))}
    </div>
  );

  // ═══ LOGIN SCREEN ═══
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", padding: 20 }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 16 }}>百</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>100億宣言 完全ガイド</h1>
            <p style={{ fontSize: 12, color: C.inkMuted, margin: 0 }}>閲覧にはログインが必要です</p>
          </div>

          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.inkMuted, display: "block", marginBottom: 4 }}>ログインID</label>
              <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="IDを入力"
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off"
                style={{ width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: C.inkMuted, display: "block", marginBottom: 4 }}>パスワード</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="パスワードを入力"
                  onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="off"
                  style={{ width: "100%", padding: "10px 12px", paddingRight: 48, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, fontFamily: "inherit", color: C.ink, boxSizing: "border-box", outline: "none" }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkFaint, fontSize: 12, fontFamily: "inherit" }}>
                  {showPass ? "隠す" : "表示"}
                </button>
              </div>
            </div>
            {loginError && (
              <div style={{ background: C.dangerPale, border: `1px solid ${C.danger}33`, borderRadius: 5, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.danger }}>{loginError}</div>
            )}
            <button onClick={handleLogin} style={{ width: "100%", padding: "12px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ログイン
            </button>
          </div>

          <div style={{ marginTop: 16, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>デモ用アカウント</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: C.bg, borderRadius: 5, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.inkFaint }}>申請者</div>
                <div style={{ fontSize: 11, color: C.ink, fontFamily: "monospace" }}>applicant / apply2026</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 5, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.inkFaint }}>サポート</div>
                <div style={{ fontSize: 11, color: C.ink, fontFamily: "monospace" }}>support / support2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MAIN CONTENT ═══
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ Header ═══ */}
      <header style={{ background: C.accent, color: "#fff", padding: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900 }}>百</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7, letterSpacing: 2, marginBottom: 2 }}>中小企業成長加速化支援プロジェクト</div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.3 }}>100億宣言 完全ガイド</h1>
              </div>
            </div>
            <button onClick={() => { setIsAuthenticated(false); setLoginId(""); setLoginPass(""); }} style={{ padding: "7px 16px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
              ログアウト
            </button>
          </div>
          <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.7, maxWidth: 700, margin: 0 }}>
            売上高100億円を目指す中小企業のための「100億宣言」と「中小企業成長加速化補助金」。<br />
            制度の全体像から申請の実務まで、わかりやすく解説します。
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            {[{ v: "5億円", l: "補助上限" }, { v: "4.5%", l: "賃上げ要件" }, { v: "3/26", l: "第2次締切" }].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{s.v}</div>
                <div style={{ fontSize: 10, opacity: 0.65 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ═══ Mobile Nav Toggle ═══ */}
      <button onClick={() => setMobileNav(!mobileNav)} style={{
        display: "none", position: "fixed", bottom: 20, right: 20, zIndex: 100, width: 48, height: 48, borderRadius: "50%",
        background: C.accent, color: "#fff", border: "none", fontSize: 20, cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}>
        ☰
      </button>

      {/* ═══ Layout ═══ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0, padding: "0 16px" }}>

        {/* Sidebar */}
        <nav style={{ width: 200, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto", padding: "20px 16px 20px 0", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, letterSpacing: 1.5, marginBottom: 12, paddingLeft: 12 }}>目次</div>
          {sections.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "8px 12px", marginBottom: 2,
              background: activeSection === s.id ? C.accentPale : "transparent",
              border: "none", borderRadius: 5, borderLeft: activeSection === s.id ? `3px solid ${C.accent}` : "3px solid transparent",
              color: activeSection === s.id ? C.accent : C.inkMuted, fontSize: 12, fontWeight: activeSection === s.id ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s"
            }}>
              {s.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 12px 12px", paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: C.inkFaint, lineHeight: 1.6 }}>
              最終更新：2026年2月27日<br />
              第2次公募対応版
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main ref={contentRef} style={{ flex: 1, minWidth: 0, padding: "28px 0 60px 32px" }}>

          {/* ─── Overview ─── */}
          <section data-section="overview" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="この制度は何か、なぜ生まれたのか">100億企業成長支援プロジェクトとは</Heading>
            <div style={{ fontSize: 14, color: C.inkLight, lineHeight: 2, marginBottom: 20 }}>
              日本の中小企業政策は、従来の「存続支援」から<b style={{ color: C.ink }}>「成長・規模拡大支援」</b>へと大きく転換しています。
              その象徴が「100億企業成長支援プロジェクト」です。
            </div>
            <Card accent={C.gold + "44"} style={{ background: C.goldPale }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 8 }}>プロジェクトの目的</div>
              <div style={{ fontSize: 14, color: C.inkLight, lineHeight: 1.9 }}>
                売上高<b>10億円〜100億円未満</b>の中小企業が、売上高100億円を超える<b>「中堅企業」</b>へ飛躍することを支援する国家プロジェクト。
                単なる補助金ではなく、経営者のマインドセット変革、大規模設備投資の促進、地域経済への波及効果を狙った重層的な支援体系です。
              </div>
            </Card>
            <Callout type="info" title="なぜ「100億円」なのか？">
              売上高100億円規模の企業は、高い賃金水準の維持、輸出による外需獲得、協力会社への仕入れによる経済波及効果が極めて大きく、地域経済の「稼ぐ力」を牽引するエンジンとなります。政府はこうした企業を増やすことで、日本全体の経済基盤を強化しようとしています。
            </Callout>
          </section>

          {/* ─── Structure ─── */}
          <section data-section="structure" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="2本柱で構成される支援体系">プロジェクトの全体構造</Heading>
            <div style={{ fontSize: 13.5, color: C.inkLight, lineHeight: 1.9, marginBottom: 20 }}>
              このプロジェクトは、大きく<b style={{ color: C.ink }}>2つの柱</b>で構成されています。
              2つは独立した制度ですが、補助金申請には宣言が前提条件となる密接な関係にあります。
            </div>

            {/* Visual Diagram */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <Card style={{ flex: "1 1 280px", borderTop: `4px solid ${C.accent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1, marginBottom: 6 }}>第1の柱</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>100億宣言</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.8 }}>
                  経営者が「売上高100億円を目指す」意志と戦略を公に宣言する制度。ポータルサイトに掲載され、公式ロゴマークの使用が認められます。
                </div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["ロゴマーク提供", "経営者ネットワーク", "伴走支援", "ポータル掲載"].map(t => (
                    <span key={t} style={{ fontSize: 10, background: C.accentPale, color: C.accent, padding: "3px 8px", borderRadius: 3, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </Card>
              <Card style={{ flex: "1 1 280px", borderTop: `4px solid ${C.gold}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, marginBottom: 6 }}>第2の柱</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>成長加速化補助金</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.8 }}>
                  宣言を実行に移すための「実弾」。大規模な設備投資に対し、最大5億円（補助率1/2）の資金支援を行う、中小企業支援策の中でも最大級の補助金です。
                </div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["最大5億円", "補助率1/2", "建物費対象", "投資下限1億円"].map(t => (
                    <span key={t} style={{ fontSize: 10, background: C.goldPale, color: C.gold, padding: "3px 8px", borderRadius: 3, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </Card>
            </div>

            {/* Flow Arrow */}
            <Card style={{ textAlign: "center", padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ background: C.accentPale, padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: C.accent }}>100億宣言を申請</div>
                <div style={{ fontSize: 20, color: C.inkFaint }}>→</div>
                <div style={{ background: C.warnPale, padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: C.warn }}>ポータルに公表</div>
                <div style={{ fontSize: 20, color: C.inkFaint }}>→</div>
                <div style={{ background: C.goldPale, padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: C.gold }}>補助金を申請</div>
              </div>
              <div style={{ fontSize: 11, color: C.danger, marginTop: 8, fontWeight: 600 }}>※ 宣言がポータルに公表されていないと補助金は申請できません（第2次公募で厳格化）</div>
            </Card>
          </section>

          {/* ─── Declaration ─── */}
          <section data-section="declaration" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="補助金申請の前提条件となる公約">100億宣言とは</Heading>

            <div style={{ fontSize: 13.5, color: C.inkLight, lineHeight: 1.9, marginBottom: 20 }}>
              100億宣言は、単なる事務手続きではなく、企業の将来ビジョンをステークホルダーに示す<b style={{ color: C.ink }}>公約</b>としての性格を持ちます。
              宣言は「100億企業成長ポータル」に掲載され、広く公開されます。
            </div>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>対象となる企業</div>
              <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.8, marginBottom: 12 }}>
                中小企業基本法上の「中小企業」であり、かつ<b>売上高10億円以上100億円未満</b>の企業
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {[
                  { industry: "製造業", capital: "3億円以下", emp: "300人以下" },
                  { industry: "卸売業", capital: "1億円以下", emp: "100人以下" },
                  { industry: "小売業", capital: "5千万円以下", emp: "50人以下" },
                  { industry: "サービス業", capital: "5千万円以下", emp: "100人以下" },
                ].map((r, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{r.industry}</div>
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 3 }}>資本金 {r.capital} or 従業員 {r.emp}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12, marginTop: 24 }}>宣言書に盛り込む5つの構成要素</div>
            <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 16 }}>後に提出する補助金の事業計画書と深く整合させる必要があります。</div>

            {[
              { num: "1", title: "企業概要", desc: "直近の売上高、従業員数、現在の事業ポートフォリオなど、足元の立ち位置を明確にします。" },
              { num: "2", title: "売上100億円実現の目標と課題", desc: "いつまでに、どのような成長率で目標を達成するかのロードマップ。生産能力の限界、人材不足、市場の狭さなど現状のボトルネックの特定。" },
              { num: "3", title: "具体的措置", desc: "新工場の建設、海外展開の加速、M&Aによる規模拡大、DXによる生産性向上など、課題を解決するための戦略。" },
              { num: "4", title: "実施体制", desc: "成長を支える組織図、次世代リーダーの育成計画、外部専門家との連携体制。" },
              { num: "5", title: "経営者のコミットメント", desc: "なぜ100億円を目指すのか。その情熱と社会に対する責任を、経営者自身の言葉で表現します。審査員は「本気度」を見ています。" },
            ].map((item, i) => (
              <Card key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{item.num}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.8 }}>{item.desc}</div>
                </div>
              </Card>
            ))}

            <Callout type="warn" title="重要：宣言と補助金の整合性">
              宣言の「具体的措置」に記載した設備投資の内容が、補助金の対象事業と矛盾していると、審査で一貫性を疑われるリスクがあります。宣言書の作成時から補助金申請を見据えた内容にしてください。
            </Callout>
          </section>

          {/* ─── Subsidy ─── */}
          <section data-section="subsidy" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="最大5億円・中小企業支援策の中でも最大級">成長加速化補助金の詳細</Heading>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <Stat value="5億円" label="補助上限額" />
              <Stat value="1/2" label="補助率" sub="以内" />
              <Stat value="1億円" label="投資下限額" sub="税抜・コア経費合計" color={C.danger} />
            </div>

            <div style={{ fontSize: 13.5, color: C.inkLight, lineHeight: 1.9, marginBottom: 20 }}>
              この補助金の最大の特徴は、通常の補助金では認められにくい<b style={{ color: C.ink }}>「建物費」が広範に認められている</b>点です。
              新工場の建設から最新設備の導入まで、企業の構造を変える「攻めの投資」を強力に後押しします。
            </div>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>補助対象経費</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
                <TableRow header cells={["経費項目", "具体例", "注意事項"]} />
                <TableRow cells={["建物費", "工場・物流拠点の新設、増築、改修、中古建物の取得", "土地代、外構工事、駐車場舗装は対象外"]} />
                <TableRow cells={["機械装置費", "生産ライン、検査装置、自動化ロボット", "単なる老朽更新は不可。生産性向上が必須"]} />
                <TableRow cells={["ソフトウェア費", "生産管理システム、ERP、DX推進の専用ソフト", "クラウド利用料含む（補助事業期間内に限る）"]} />
                <TableRow cells={["外注費", "設計、加工、検査の一部委託", "補助事業遂行に直接必要なものに限る"]} />
                <TableRow cells={["専門家経費", "コンサルタント、技術指導員への謝礼・旅費", "申請代行費用は含まれない"]} />
              </div>
            </Card>

            <Callout type="info" title="活用例：10億円プロジェクト">
              「新たな製造拠点を5億円で建設し、5億円の最新機械を導入する」──このような10億円規模のプロジェクトに対し、上限の5億円の補助を受けるといった活用が可能です。
            </Callout>

            <Card style={{ background: C.dangerPale, border: `1px solid ${C.danger}33` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, marginBottom: 8 }}>投資下限1億円の壁</div>
              <div style={{ fontSize: 12.5, color: C.inkLight, lineHeight: 1.8 }}>
                <b>建物費＋機械装置費＋ソフトウェア費</b>の合計が税抜1億円を超える必要があります。外注費・専門家経費は含まれません。
                この要件は、単なる設備更新ではなく、企業の構造を抜本的に変える「攻めの投資」を求めていることの証です。
              </div>
            </Card>
          </section>

          {/* ─── Schedule ─── */}
          <section data-section="schedule" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="第2次公募のクリティカル・パス">スケジュール</Heading>

            <Callout type="danger" title="第1次との違い：締切時間が2時間前倒し">
              第2次公募の締切は<b>15:00</b>です（第1次公募は17:00でした）。また、100億宣言の「事前公表」が必須条件に厳格化されました。
            </Callout>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>申請タイムライン</div>
              {[
                { date: "2月27日（金）", title: "起点日（本日）", desc: "経営判断を下し、宣言書作成チームを編成する", tag: "今日", tagColor: C.accent },
                { date: "3月1日〜6日", title: "戦略策定", desc: "5年後の売上100億円への具体的ロードマップを策定" },
                { date: "3月9日〜12日", title: "システム入力", desc: "jGrants上での宣言申請準備。GビズIDプライムの確認" },
                { date: "3月13日（金）", title: "100億宣言の申請期限", desc: "この日までに宣言をオンライン申請しないと、補助金締切までに公表が間に合わない可能性あり", tag: "期限", tagColor: C.danger },
                { date: "3月16日〜25日", title: "本申請準備", desc: "補助金用の詳細な事業計画書（最大15枚）を完成させる。宣言の公表を待つ" },
                { date: "3月25日（水）", title: "推奨提出日", desc: "システム負荷を避け、この日までに提出を完了させることを強く推奨", tag: "実質締切", tagColor: C.warn },
                { date: "3月26日（木）", title: "補助金申請 締切15:00", desc: "送信ボタンを押す時間ではなく、すべての処理が完了していなければならない時間", tag: "最終期限", tagColor: C.danger },
                { date: "5月下旬", title: "第1次審査結果公表", desc: "jGrantsを通じた書面審査の結果" },
                { date: "6/22〜7/10", title: "第2次審査", desc: "オンラインまたは対面でのプレゼンテーション審査。経営者本人のみ参加可能" },
                { date: "7月下旬以降", title: "最終採択発表", desc: "採択企業の決定" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 110, textAlign: "right", flexShrink: 0, paddingTop: 2 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: item.tagColor || C.inkMuted }}>{item.date}</div>
                  </div>
                  <div style={{ width: 10, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.tagColor || C.border, flexShrink: 0, marginTop: 5 }} />
                    {i < 9 && <div style={{ width: 1, flex: 1, background: C.borderLight, minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.title}</span>
                      {item.tag && <span style={{ fontSize: 9, fontWeight: 700, background: item.tagColor + "18", color: item.tagColor, padding: "2px 6px", borderRadius: 3 }}>{item.tag}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.6, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Callout type="warn" title="宣言の公表に2〜3週間かかります">
              第2次公募では「宣言がポータルに公表済みであること」が必須です。事務局は宣言の申請を<b>3月13日（金）まで</b>に行うよう呼びかけています。
              それ以降の申請は公表が間に合わない可能性があります。
            </Callout>
          </section>

          {/* ─── Requirements ─── */}
          <section data-section="requirements" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="申請の可否を左右する6つの必須要件">申請要件</Heading>

            {[
              { num: "1", title: "中小企業であること", desc: "中小企業基本法上の中小企業に該当すること。業種ごとに資本金・従業員数の上限が異なります。", severity: "必須" },
              { num: "2", title: "売上高10億円以上100億円未満", desc: "直近決算書の売上高が対象範囲内であること。100億円以上は「中堅企業」となり対象外です。", severity: "必須" },
              { num: "3", title: "GビズIDプライムの取得", desc: "jGrantsでの電子申請に必要な認証ID。発行に1〜2週間かかるため、未取得の場合は最優先で申請。", severity: "必須" },
              { num: "4", title: "100億宣言がポータルに公表済み", desc: "第2次公募から厳格化。申請時点でポータルに掲載されていなければ申請不可。", severity: "必須" },
              { num: "5", title: "投資額が税抜1億円超", desc: "建物費＋機械装置費＋ソフトウェア費の合計が1億円を超える投資計画であること。", severity: "必須" },
              { num: "6", title: "賃上げ年率4.5%以上", desc: "従業員（役員除外）の1人当たり給与支給総額を年平均4.5%以上引き上げる計画。未達の場合は返還義務あり。", severity: "必須" },
            ].map((req, i) => (
              <Card key={i} style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{req.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{req.title}</span>
                    <span style={{ fontSize: 9, background: C.dangerPale, color: C.danger, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{req.severity}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.8, marginTop: 3 }}>{req.desc}</div>
                </div>
              </Card>
            ))}
          </section>

          {/* ─── Changes ─── */}
          <section data-section="changes" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="第1次公募との違いを正確に把握する">第2次公募の変更点</Heading>

            <Card accent={C.danger + "44"} style={{ borderLeft: `4px solid ${C.danger}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.danger, marginBottom: 10 }}>変更点 1：賃上げ要件の統一・引き上げ</div>
              <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.9, marginBottom: 12 }}>
                第1次公募では都道府県ごとに異なる基準（3.2%〜4.3%）でしたが、第2次公募では<b style={{ color: C.danger }}>全国一律「年平均4.5%以上」</b>に統一・引き上げされました。
              </div>
              <div style={{ background: C.bg, borderRadius: 6, padding: "12px 16px", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>計算式（CAGR）</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: C.accent, lineHeight: 1.6 }}>
                  年平均上昇率 = [ (3年後の1人当たり給与 ÷ 基準年度の1人当たり給与)^(1/3) − 1 ] × 100 ≧ 4.5%
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.8 }}>
                ・計算対象は<b>従業員（非常勤含む）</b>の1人当たり給与支給総額のみ<br />
                ・<b>役員は除外</b>（経営陣の報酬アップで帳尻を合わせることを防止）<br />
                ・未達成の場合は補助金の一部返還。直近年度を下回った場合は<b style={{ color: C.danger }}>全額返還</b>
              </div>
            </Card>

            <Card accent={C.warn + "44"} style={{ borderLeft: `4px solid ${C.warn}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.warn, marginBottom: 10 }}>変更点 2：100億宣言の事前公表が必須に</div>
              <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.9 }}>
                第1次公募では補助金申請と同時並行で宣言を行うことが認められていましたが、第2次公募では<b>申請時点で宣言がポータルに公表されている</b>ことが必須条件に厳格化されました。
              </div>
            </Card>

            <Card accent={C.accent + "44"} style={{ borderLeft: `4px solid ${C.accent}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 10 }}>変更点 3：プレゼン審査でのコンサル同席禁止</div>
              <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.9 }}>
                第2次審査（プレゼンテーション）において、外部コンサルタントや顧問が「経営顧問」等の名目で同席することが<b>明確に禁止</b>されました。経営者自身が計画を「自分の血肉」にまで昇華させておくことが必須です。
              </div>
            </Card>

            <Card accent={C.success + "44"} style={{ borderLeft: `4px solid ${C.success}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.success, marginBottom: 10 }}>変更点 4：新たな加点項目の追加</div>
              <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.9 }}>
                以下の項目が新たに加点対象となりました：
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {["知的財産の保護", "重要技術の流出防止（経済安全保障）", "健康経営優良法人の認定"].map(t => (
                  <span key={t} style={{ fontSize: 11, background: C.successPale, color: C.success, padding: "4px 10px", borderRadius: 4, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </Card>
          </section>

          {/* ─── Review ─── */}
          <section data-section="review" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="審査員は何を見ているのか">審査のポイント</Heading>

            <div style={{ fontSize: 13.5, color: C.inkLight, lineHeight: 1.9, marginBottom: 20 }}>
              第1次公募の採択倍率は<b style={{ color: C.danger }}>約6倍</b>という厳しい結果でした。書面審査（第1次）とプレゼン審査（第2次）の二段構えで評価されます。
            </div>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>重視される3つの指標</div>
              {[
                { title: "売上高投資比率", desc: "収益規模に対してどれだけ大胆にリスクを取っているか。採択企業の平均は50%超。自社の体力を振り絞った投資であることが評価されます。", color: C.accent },
                { title: "付加価値増加率", desc: "投資によって生産性がどれだけ向上するか。1人当たりの「稼ぐ力」の劇的な改善が求められます。", color: C.gold },
                { title: "地域波及効果", desc: "投資場所の雇用拡大、地元企業からの仕入れ増加など、自社だけでなく地域全体にどう貢献するか。", color: C.success },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 4, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.title}</div>
                    <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.8, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>審査フロー</div>
              <Step num="1" title="書面審査（第1次審査）" desc="jGrantsで提出された事業計画書（最大15枚）を審査委員が評価。結果は5月下旬に公表。" highlight />
              <Step num="2" title="プレゼン審査（第2次審査）" desc="6月22日〜7月10日。経営者本人がオンラインまたは対面で計画を説明。コンサルタントの同席は禁止。計画への深い理解と当事者意識が問われます。" highlight />
              <Step num="3" title="最終採択発表" desc="7月下旬以降。採択企業が正式に決定し、補助事業がスタートします。" />
            </Card>
          </section>

          {/* ─── Tips ─── */}
          <section data-section="tips" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="約6倍の倍率を突破するために">採択率を上げるコツ</Heading>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 14 }}>事業計画書（15枚）の構成ガイド</div>
              {[
                { title: "市場環境の分析", desc: "追い風が吹いている市場（半導体、EV、海外需要等）に身を置いていることを客観的なデータで示す" },
                { title: "独自性と優位性", desc: "なぜ他社ではなく自社がその市場を勝ち取れるのか。技術力、特許、顧客基盤を具体的に" },
                { title: "投資計画の具体性", desc: "建設計画・導入設備の詳細、見積もり根拠、投資のROIを定量的に示す" },
                { title: "賃上げの持続可能性", desc: "4.5%の賃上げを3年継続できる収益構造の証明。「稼ぐ仕組み」の構想" },
                { title: "地域波及効果", desc: "雇用創出数、地元仕入れ増加額、税収貢献など具体的な数字で示す" },
                { title: "リスクへの対応（Bプラン）", desc: "建築費高騰、金利上昇、人材確保の難航などへの代替案を提示" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accentPale, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Callout type="danger" title="jGrantsの「落とし穴」に注意">
              ・ファイル名に特殊文字を使えない（半角英数推奨）<br />
              ・容量制限を超えると送信できない<br />
              ・締切直前はサーバーが重くなる（全国からアクセス集中）<br />
              ・<b>3月25日を実質的な締め切りとして行動する</b>ことを強く推奨
            </Callout>

            <Callout type="success" title="丸投げ厳禁──「自分の血肉」にする">
              外部コンサルタントを起用する場合でも、計画の中身を経営陣が「自分たちの言葉で語れる」まで内面化してください。
              特にプレゼン審査では、経営者の当事者意識と計画への深い理解が直接問われます。これが合否を分ける最大の要因です。
            </Callout>
          </section>

          {/* ─── FAQ ─── */}
          <section data-section="faq" style={{ marginBottom: 48, scrollMarginTop: 20 }}>
            <Heading sub="よく寄せられる疑問への回答">よくある質問</Heading>
            {faqData.map((faq, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", textAlign: "left", padding: "14px 18px", background: C.paper,
                  border: `1px solid ${openFaq === i ? C.accent + "44" : C.border}`, borderRadius: openFaq === i ? "8px 8px 0 0" : 8,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
                    <span style={{ color: C.accent, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>Q</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>{faq.q}</span>
                  </div>
                  <span style={{ color: C.inkFaint, fontSize: 14, marginLeft: 10, flexShrink: 0 }}>{openFaq === i ? "−" : "＋"}</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "14px 18px 14px 44px", background: C.paper, border: `1px solid ${C.accent}44`, borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                    <div style={{ fontSize: 12.5, color: C.inkLight, lineHeight: 1.9 }}>{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* ─── Contacts ─── */}
          <section data-section="contacts" style={{ marginBottom: 24, scrollMarginTop: 20 }}>
            <Heading sub="申請に関する公的相談窓口">相談窓口</Heading>

            <div style={{ fontSize: 13.5, color: C.inkLight, lineHeight: 1.9, marginBottom: 16 }}>
              不明点がある場合は、以下の公的機関で無料相談が可能です。
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {[
                { org: "関東経済産業局 中小企業課", tel: "048-600-0332", desc: "100億宣言に関する相談" },
                { org: "関東経済産業局 経営支援課", tel: "048-600-0334", desc: "補助金に関する相談" },
                { org: "中小機構 関東本部", tel: "03-5470-1620", desc: "総合的な経営支援" },
                { org: "公益財団法人 千葉県産業振興センター", tel: "043-299-2901", desc: "千葉県内の中小企業支援（千葉市美浜区）" },
              ].map((c, i) => (
                <Card key={i}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{c.org}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 4, letterSpacing: 0.5 }}>{c.tel}</div>
                  <div style={{ fontSize: 11, color: C.inkMuted }}>{c.desc}</div>
                </Card>
              ))}
            </div>

            <Callout type="info" title="千葉県よろず支援拠点（千葉市中央区）">
              千葉県産業振興センター内の「千葉県よろず支援拠点」では、補助金申請に精通したコーディネーターによる無料の経営相談を受けることができます。事業計画のブラッシュアップや申請書類の作成支援など、個別のアドバイスが可能です。
            </Callout>
          </section>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 40 }}>
            <div style={{ fontSize: 11, color: C.inkFaint, lineHeight: 1.8 }}>
              本ページは2026年2月27日時点の公開情報に基づいて作成しています。最新の情報は各公式サイトをご確認ください。<br />
              本内容は情報提供を目的としたものであり、申請の採択を保証するものではありません。
            </div>
          </div>
        </main>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed", bottom: 28, right: 28, zIndex: 100,
            width: 44, height: 44, borderRadius: "50%",
            background: C.accent, color: "#fff", border: "none",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
            boxShadow: "0 2px 12px rgba(44,74,110,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "opacity 0.3s, transform 0.3s",
            opacity: 1, transform: "translateY(0)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(44,74,110,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(44,74,110,0.3)"; }}
          aria-label="ページトップへ"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: "block" }}>
            <path d="M9 3L3 10h4v5h4v-5h4L9 3z" fill="#fff" />
          </svg>
        </button>
      )}
    </div>
  );
}
