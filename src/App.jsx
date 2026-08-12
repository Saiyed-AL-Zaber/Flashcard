import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Folder, Plus, Play, Shuffle, ArrowLeft, Check, X, Edit2, Trash2,
  ChevronLeft, ChevronRight, RotateCw, BookOpen, ListChecks, PenLine,
  Settings2, FolderPlus, Layers, RefreshCw, Award, ArrowRight, Palette,
  Sun, Moon, LogOut, Cloud, CloudOff
} from "lucide-react";
import { supabase } from "./supabase";

/* ---------------------------------- helpers ---------------------------------- */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const CARD_COLORS = [
  { name: "Paper",   hex: "#F3ECD9" },
  { name: "Coral",   hex: "#E8735B" },
  { name: "Marigold",hex: "#E3A73B" },
  { name: "Sage",    hex: "#7FA37D" },
  { name: "Teal",    hex: "#4B9C9C" },
  { name: "Sky",     hex: "#5B8DBE" },
  { name: "Plum",    hex: "#8B6BA8" },
  { name: "Rose",    hex: "#D46A8F" },
  { name: "Ink",     hex: "#3E4356" },
];

const ACCENT = "#E3A73B";

function isLight(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}



/* ---------------------------------- theme tokens ---------------------------------- */

const THEMES = {
  light: {
    bgGradient: "radial-gradient(1200px 600px at 20% -10%, #F2ECDA 0%, #EAE2CB 55%, #E1D8BE 100%)",
    text: "#2A2318",
    textStrong: "#1C1710",
    textDim: "#6B5F47",
    textFaint: "#8f8266",
    surface: "#F8F3E6",
    surfaceAlt: "#F1EAD6",
    surfaceActive: "#EFE2C4",
    border: "#DCD0AE",
    borderStrong: "#C9BB90",
    inputBg: "#FCFAF2",
    onAccent: "#241d16",
    shadow: "0 10px 26px rgba(60,45,20,.14)",
    correctBg: "#E4F3DA", correctBorder: "#8FBF71", correctText: "#2F5A1D",
    wrongBg: "#FBE4E4", wrongBorder: "#D98888", wrongText: "#7A2020",
    danger: "#B23B3B", dangerBg: "#F8E3E3", dangerBorder: "#E0B4B4",
  },
  dark: {
    bgGradient: "radial-gradient(1200px 600px at 20% -10%, #4A4D52 0%, #34363A 55%, #26282B 100%)",
    text: "#EDEDEE",
    textStrong: "#F7F7F8",
    textDim: "#B7B9BD",
    textFaint: "#8b8d91",
    surface: "#3A3C40",
    surfaceAlt: "#424448",
    surfaceActive: "#4A4C51",
    border: "#525459",
    borderStrong: "#63656A",
    inputBg: "#2C2E31",
    onAccent: "#201a15",
    shadow: "0 10px 30px rgba(0,0,0,.35)",
    correctBg: "#2f3a2a", correctBorder: "#5a8a3f", correctText: "#c9f0b0",
    wrongBg: "#3d2c2c", wrongBorder: "#8a4040", wrongText: "#f0b0b0",
    danger: "#f0a0a0", dangerBg: "#3a2222", dangerBorder: "#5c3131",
  },
};

/* ---------------------------------- root ---------------------------------- */

export default function FlashcardApp({ user }) {
  const [data, setData] = useState({ folders: [], sets: [] });
  const [loaded, setLoaded] = useState(false);
  const [dark, setDark] = useState(false);
  const [nav, setNav] = useState({ screen: "home" });
  const [connected, setConnected] = useState(true);

  // fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const applyRow = (row) => {
    if (!row) return;
    setData({ folders: row.data?.folders || [], sets: row.data?.sets || [] });
    if (typeof row.dark === "boolean") setDark(row.dark);
  };

  // initial load + live sync: fires on first load AND whenever this row changes on any device
  useEffect(() => {
    let channel;
    (async () => {
      const { data: row, error } = await supabase
        .from("flashcard_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) { console.error("load error", error); setConnected(false); }
      else if (row) { applyRow(row); setConnected(true); }
      else {
        // first time this user has ever opened the app — create their row
        await supabase.from("flashcard_data").upsert({ user_id: user.id, data: { folders: [], sets: [] } });
      }
      setLoaded(true);

      channel = supabase
        .channel("flashcard_data_" + user.id)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "flashcard_data", filter: `user_id=eq.${user.id}` },
          (payload) => { applyRow(payload.new); setConnected(true); }
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user.id]);

  const persist = async (next) => {
    setData(next);
    const { error } = await supabase.from("flashcard_data").upsert({ user_id: user.id, data: next });
    if (error) { console.error("save failed", error); setConnected(false); } else setConnected(true);
  };

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      supabase.from("flashcard_data").upsert({ user_id: user.id, dark: next })
        .then(({ error }) => setConnected(!error));
      return next;
    });
  };

  /* ---------- CRUD ---------- */
  const addFolder = (name, color) => {
    const f = { id: uid(), name, color, createdAt: Date.now() };
    persist({ ...data, folders: [...data.folders, f] });
  };
  const updateFolder = (id, patch) => {
    persist({ ...data, folders: data.folders.map(f => f.id === id ? { ...f, ...patch } : f) });
  };
  const deleteFolder = (id) => {
    persist({
      ...data,
      folders: data.folders.filter(f => f.id !== id),
      sets: data.sets.filter(s => s.folderId !== id),
    });
  };

  const addSet = (folderId, name, color) => {
    const s = { id: uid(), folderId, name, color, createdAt: Date.now(), cards: [] };
    persist({ ...data, sets: [...data.sets, s] });
    return s.id;
  };
  const updateSet = (id, patch) => {
    persist({ ...data, sets: data.sets.map(s => s.id === id ? { ...s, ...patch } : s) });
  };
  const deleteSet = (id) => {
    persist({ ...data, sets: data.sets.filter(s => s.id !== id) });
  };

  const addCard = (setId, card) => {
    persist({
      ...data,
      sets: data.sets.map(s => s.id === setId
        ? { ...s, cards: [...s.cards, { id: uid(), createdAt: Date.now(), color: "#F3ECD9", ...card }] }
        : s)
    });
  };
  const addBlankCards = (setId, count) => {
    const blanks = Array.from({ length: count }, (_, i) => ({
      id: uid(), createdAt: Date.now() + i, front: "", back: "", color: "#F3ECD9"
    }));
    persist({
      ...data,
      sets: data.sets.map(s => s.id === setId
        ? { ...s, cards: [...s.cards, ...blanks] }
        : s)
    });
  };
  const updateCard = (setId, cardId, patch) => {
    persist({
      ...data,
      sets: data.sets.map(s => s.id === setId
        ? { ...s, cards: s.cards.map(c => c.id === cardId ? { ...c, ...patch } : c) }
        : s)
    });
  };
  const deleteCard = (setId, cardId) => {
    persist({
      ...data,
      sets: data.sets.map(s => s.id === setId
        ? { ...s, cards: s.cards.filter(c => c.id !== cardId) }
        : s)
    });
  };

  const goHome = () => setNav({ screen: "home" });
  const openFolder = (folderId) => setNav({ screen: "folder", folderId });
  const openEdit = (setId) => setNav({ screen: "edit", setId });
  const openStudy = (setId) => setNav({ screen: "study", setId });
  const openTestSetup = (setId) => setNav({ screen: "test-setup", setId });

  const currentFolder = data.folders.find(f => f.id === nav.folderId);
  const currentSet = data.sets.find(s => s.id === nav.setId);
  const theme = dark ? THEMES.dark : THEMES.light;

  if (!loaded) {
    return (
      <Shell theme={theme} dark={dark} toggleDark={toggleDark} user={user} connected={connected}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: theme.textDim, fontFamily: "Inter" }}>
          Opening the drawer…
        </div>
      </Shell>
    );
  }

  const screenKey = `${nav.screen}-${nav.folderId || ""}-${nav.setId || ""}`;

  return (
    <Shell theme={theme} dark={dark} toggleDark={toggleDark} user={user} connected={connected}>
      <div key={screenKey} className="fade-in">
        {nav.screen === "home" && (
          <Home theme={theme} data={data} onOpenFolder={openFolder} onAddFolder={addFolder}
            onDeleteFolder={deleteFolder} onRenameFolder={updateFolder} />
        )}
        {nav.screen === "folder" && currentFolder && (
          <FolderView
            theme={theme}
            folder={currentFolder}
            sets={data.sets.filter(s => s.folderId === currentFolder.id)}
            onBack={goHome}
            onAddSet={addSet}
            onOpenEdit={openEdit}
            onOpenStudy={openStudy}
            onOpenTest={openTestSetup}
            onDeleteSet={deleteSet}
          />
        )}
        {nav.screen === "edit" && currentSet && (
          <SetEditor
            theme={theme}
            set={currentSet}
            onBack={() => openFolder(currentSet.folderId)}
            onUpdateSet={updateSet}
            onAddCard={addCard}
            onAddBlankCards={addBlankCards}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
          />
        )}
        {nav.screen === "study" && currentSet && (
          <StudyMode theme={theme} set={currentSet} onBack={() => openFolder(currentSet.folderId)} />
        )}
        {nav.screen === "test-setup" && currentSet && (
          <TestSetup theme={theme} set={currentSet} onBack={() => openFolder(currentSet.folderId)}
            onStart={(config) => setNav({ screen: "test", setId: currentSet.id, config })} />
        )}
        {nav.screen === "test" && currentSet && (
          <TestRunner theme={theme} set={currentSet} config={nav.config}
            onExit={() => openFolder(currentSet.folderId)}
            onFinish={(results) => setNav({ screen: "test-results", setId: currentSet.id, config: nav.config, results })} />
        )}
        {nav.screen === "test-results" && currentSet && (
          <TestResults theme={theme} set={currentSet} config={nav.config} results={nav.results}
            onRetryAll={() => setNav({ screen: "test", setId: currentSet.id, config: nav.config })}
            onRetryMissed={(missedIds) => setNav({ screen: "test", setId: currentSet.id, config: { ...nav.config, onlyIds: missedIds } })}
            onDone={() => openFolder(currentSet.folderId)}
          />
        )}
      </div>
    </Shell>
  );
}

/* ---------------------------------- shell / chrome ---------------------------------- */

function Shell({ children, theme, dark, toggleDark, user, connected }) {
  return (
    <div style={{
      minHeight: "100vh",
      overflowX: "hidden",
      width: "100%",
      background: theme.bgGradient,
      fontFamily: "'Inter', sans-serif",
      color: theme.text,
      padding: "clamp(14px, 4vw, 36px)",
      boxSizing: "border-box",
      transition: "background 0.5s ease, color 0.35s ease",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: ${ACCENT}; color: #201a15; }
        .disp { font-family: 'Space Grotesk', sans-serif; }
        .hand { font-family: 'Caveat', cursive; }
        input, select, textarea, button { font-family: inherit; }
        button { cursor: pointer; }

        .card-flip-wrap { perspective: 1600px; -webkit-perspective: 1600px; position: relative; }
        .swipe-layer {
          position: relative; touch-action: pan-y; cursor: grab; outline: none;
          -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none;
        }
        .swipe-layer:active { cursor: grabbing; }
        .swipe-layer:focus-visible { box-shadow: 0 0 0 3px ${ACCENT}88; border-radius: 18px; }
        .swipe-stamp {
          position: absolute; top: 16px; z-index: 5; padding: 6px 14px; border-radius: 8px;
          font-weight: 800; font-size: 12.5px; letter-spacing: .05em; text-transform: uppercase;
          border: 2.5px solid; pointer-events: none;
        }
        .swipe-stamp-know { right: 16px; color: #2F5A1D; border-color: #2F5A1D; background: rgba(228,243,218,.92); transform: rotate(8deg); }
        .swipe-stamp-learn { left: 16px; color: #7A2020; border-color: #7A2020; background: rgba(251,228,228,.92); transform: rotate(-8deg); }
        .tap-flash { position: absolute; inset: 0; border-radius: 18px; pointer-events: none;
          background: radial-gradient(circle, rgba(255,255,255,.55), transparent 70%);
          opacity: 0; transition: opacity .45s ease-out; }
        .tap-flash.show { opacity: .9; transition: opacity 0s; }
        .card-flip-inner {
          position: relative; width: 100%; height: 100%;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          -webkit-transition: -webkit-transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-flip-inner.flipped { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }
        .card-face {
          position: absolute; inset: 0;
          -webkit-backface-visibility: hidden; backface-visibility: hidden;
          border-radius: 18px; display: flex; align-items: center; justify-content: center;
          padding: 28px; text-align: center;
          transition: background-color .4s ease, color .4s ease, box-shadow .4s ease;
        }
        .card-back-face { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }

        .scale-in { animation: scaleIn .3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleIn { from { opacity: 0; transform: scale(.96) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0);} }

        .fade-in { animation: fadeIn .35s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .punch { position:absolute; top:10px; width:14px; height:14px; border-radius:50%;
          background: rgba(0,0,0,.35); box-shadow: inset 0 2px 3px rgba(0,0,0,.5); }

        .iconbtn { transition: transform .18s cubic-bezier(0.16,1,0.3,1), filter .18s ease, background-color .25s ease, border-color .25s ease, box-shadow .18s ease; }
        .iconbtn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .iconbtn:active { transform: translateY(0) scale(.97); }

        .hoverlift { transition: transform .22s cubic-bezier(0.16,1,0.3,1), box-shadow .22s ease, border-color .25s ease; }
        .hoverlift:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,.12); }

        input::placeholder, textarea::placeholder { color: ${theme.textFaint}; }
        input, select, textarea { transition: background-color .3s ease, border-color .25s ease, color .3s ease; }

        .theme-toggle {
          position: relative; width: 56px; height: 30px; border-radius: 999px;
          border: 1px solid ${theme.border}; background: ${theme.surfaceAlt};
          transition: background-color .35s ease, border-color .35s ease;
          flex-shrink: 0;
        }
        .theme-knob {
          position: absolute; top: 2px; left: ${dark ? "28px" : "2px"};
          width: 24px; height: 24px; border-radius: 50%;
          background: ${ACCENT};
          display: flex; align-items: center; justify-content: center; color: #201a15;
          transition: left .35s cubic-bezier(0.65, 0, 0.35, 1);
          box-shadow: 0 2px 6px rgba(0,0,0,.25);
        }

        a { color: inherit; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
        }
      `}</style>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: connected ? theme.textFaint : theme.wrongText }}>
            {connected ? <Cloud size={14} /> : <CloudOff size={14} />}
            {connected ? "Synced" : "Offline — changes saved once reconnected"}
            <span style={{ marginLeft: 6, color: theme.textFaint }}>· {user.email}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => supabase.auth.signOut()} className="iconbtn" aria-label="Log out" title="Log out"
              style={{
                width: 36, height: 36, borderRadius: "50%", border: `1px solid ${theme.border}`, background: theme.surfaceAlt,
                display: "flex", alignItems: "center", justifyContent: "center", color: theme.text
              }}>
              <LogOut size={15} />
            </button>
            <button onClick={toggleDark} className="theme-toggle" aria-label="Toggle dark mode" title={dark ? "Switch to light mode" : "Switch to dark mode"}>
              <span className="theme-knob">{dark ? <Moon size={13} /> : <Sun size={13} />}</span>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function TopBar({ theme, title, subtitle, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack} className="iconbtn" style={{
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 10,
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text
          }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="disp" style={{ margin: 0, fontSize: "clamp(20px,4vw,28px)", fontWeight: 700, color: theme.textStrong }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: theme.textDim, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Btn({ children, onClick, variant = "solid", color = ACCENT, style, disabled, size = "md", theme }) {
  const pad = size === "sm" ? "8px 12px" : "11px 18px";
  const base = {
    border: "none", borderRadius: 12, fontWeight: 600, fontSize: size === "sm" ? 13 : 14,
    padding: pad, display: "inline-flex", alignItems: "center", gap: 8,
    opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto",
  };
  const variants = {
    solid: { background: color, color: theme ? theme.onAccent : "#201a15" },
    ghost: { background: "transparent", color: theme ? theme.text : "#EFE7D6", border: `1px solid ${theme ? theme.border : "#443a2c"}` },
    danger: { background: theme ? theme.dangerBg : "#3a2222", color: theme ? theme.danger : "#f0a0a0", border: `1px solid ${theme ? theme.dangerBorder : "#5c3131"}` },
  };
  return <button onClick={onClick} disabled={disabled} className="iconbtn" style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function ColorSwatchPicker({ value, onChange }) {
  const isPreset = CARD_COLORS.some(c => c.hex.toLowerCase() === (value || "").toLowerCase());
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {CARD_COLORS.map(c => (
        <button key={c.hex} onClick={() => onChange(c.hex)} title={c.name} className="iconbtn"
          style={{
            width: 28, height: 28, borderRadius: 8, background: c.hex, cursor: "pointer",
            border: value === c.hex ? "2px solid #F6EFDE" : "2px solid transparent",
            boxShadow: value === c.hex ? "0 0 0 2px #201a15" : "none",
          }} />
      ))}
      <label title="Custom color" className="iconbtn" style={{
        width: 28, height: 28, borderRadius: 8, cursor: "pointer", position: "relative", overflow: "hidden",
        border: !isPreset ? "2px solid #F6EFDE" : "2px dashed #9c8f70",
        boxShadow: !isPreset ? "0 0 0 2px #201a15" : "none",
        background: !isPreset ? value : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <input type="color" value={isPreset ? "#ffffff" : value} onChange={e => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none", padding: 0 }} />
        {isPreset && <Palette size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))" }} />}
      </label>
    </div>
  );
}

function EmptyState({ theme, icon, title, sub, action }) {
  const Icon = icon;
  return (
    <div style={{
      border: `1.5px dashed ${theme.borderStrong}`, borderRadius: 18, padding: "44px 20px",
      textAlign: "center", color: theme.textDim
    }}>
      <Icon size={30} style={{ opacity: 0.6, marginBottom: 10 }} />
      <div className="disp" style={{ fontSize: 17, color: theme.textStrong, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>{sub}</div>
      {action}
    </div>
  );
}

/* ---------------------------------- HOME (folders) ---------------------------------- */

function Home({ theme, data, onOpenFolder, onAddFolder, onDeleteFolder, onRenameFolder }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_COLORS[4].hex);

  const setCount = (folderId) => data.sets.filter(s => s.folderId === folderId).length;
  const cardCount = (folderId) => data.sets.filter(s => s.folderId === folderId).reduce((n, s) => n + s.cards.length, 0);

  return (
    <div>
      <TopBar theme={theme}
        title="Your Study Desk"
        subtitle={`${data.folders.length} folder${data.folders.length === 1 ? "" : "s"} · ${data.sets.length} set${data.sets.length === 1 ? "" : "s"}`}
        right={<Btn theme={theme} onClick={() => setShowNew(true)}><FolderPlus size={16} /> New folder</Btn>}
      />

      {showNew && (
        <div className="scale-in" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Folder name</div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Biology 101"
            style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", color: theme.text, fontSize: 14, marginBottom: 14 }} />
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Tab color</div>
          <ColorSwatchPicker value={color} onChange={setColor} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn theme={theme} onClick={() => { if (name.trim()) { onAddFolder(name.trim(), color); setName(""); setShowNew(false); } }}>
              <Check size={16} /> Create
            </Btn>
            <Btn theme={theme} variant="ghost" onClick={() => { setShowNew(false); setName(""); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {data.folders.length === 0 && !showNew ? (
        <EmptyState theme={theme} icon={Folder} title="No folders yet" sub="Create a folder to organize your flashcard sets by subject."
          action={<Btn theme={theme} onClick={() => setShowNew(true)}><FolderPlus size={16} /> New folder</Btn>} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
          {data.folders.map(f => (
            <FolderCard key={f.id} theme={theme} folder={f} setCount={setCount(f.id)} cardCount={cardCount(f.id)}
              onOpen={() => onOpenFolder(f.id)} onDelete={() => onDeleteFolder(f.id)}
              onRename={(newName) => onRenameFolder(f.id, { name: newName })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderCard({ theme, folder, setCount, cardCount, onOpen, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [val, setVal] = useState(folder.name);
  return (
    <div className="hoverlift" style={{
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ height: 8, background: folder.color, transition: "background-color .3s ease" }} />
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          {editing ? (
            <input autoFocus value={val} onChange={e => setVal(e.target.value)}
              onBlur={() => { if (val.trim()) onRename(val.trim()); setEditing(false); }}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "4px 8px", color: theme.text, fontSize: 15, width: "100%" }} />
          ) : (
            <div className="disp" style={{ fontWeight: 600, fontSize: 16, cursor: "pointer" }} onClick={onOpen}>{folder.name}</div>
          )}
          <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
            {confirming ? (
              <>
                <span style={{ fontSize: 11, color: theme.wrongText, marginRight: 2, whiteSpace: "nowrap" }}>Delete?</span>
                <button onClick={onDelete} className="iconbtn" style={{ background: theme.dangerBg, border: `1px solid ${theme.dangerBorder}`, borderRadius: 6, color: theme.danger, padding: "3px 7px", fontSize: 11, fontWeight: 700 }}>Yes</button>
                <button onClick={() => setConfirming(false)} className="iconbtn" style={{ background: "none", border: "none", color: theme.textFaint }}><X size={14} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="iconbtn" style={{ background: "none", border: "none", color: theme.textFaint }}><Edit2 size={14} /></button>
                <button onClick={() => setConfirming(true)} className="iconbtn" style={{ background: "none", border: "none", color: theme.textFaint }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: theme.textDim, marginTop: 6 }}>{setCount} set{setCount === 1 ? "" : "s"} · {cardCount} card{cardCount === 1 ? "" : "s"}</div>
        <div style={{ marginTop: "auto", paddingTop: 14 }}>
          <button onClick={onOpen} className="iconbtn" style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "8px", color: theme.text, fontSize: 13, fontWeight: 600 }}>Open</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- FOLDER (sets list) ---------------------------------- */

function FolderView({ theme, folder, sets, onBack, onAddSet, onOpenEdit, onOpenStudy, onOpenTest, onDeleteSet }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(folder.color);

  return (
    <div>
      <TopBar theme={theme} title={folder.name} subtitle={`${sets.length} set${sets.length === 1 ? "" : "s"}`}
        onBack={onBack}
        right={<Btn theme={theme} onClick={() => setShowNew(true)} color={folder.color}><Plus size={16} /> New set</Btn>} />

      {showNew && (
        <div className="scale-in" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Set name</div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chapter 3 — Cell Structure"
            style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", color: theme.text, fontSize: 14, marginBottom: 14 }} />
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Accent color</div>
          <ColorSwatchPicker value={color} onChange={setColor} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn theme={theme} onClick={() => { if (name.trim()) { const id = onAddSet(folder.id, name.trim(), color); setName(""); setShowNew(false); onOpenEdit(id); } }}>
              <Check size={16} /> Create & add cards
            </Btn>
            <Btn theme={theme} variant="ghost" onClick={() => setShowNew(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {sets.length === 0 && !showNew ? (
        <EmptyState theme={theme} icon={Layers} title="No sets in this folder" sub="Create a flashcard set to start adding cards."
          action={<Btn theme={theme} onClick={() => setShowNew(true)} color={folder.color}><Plus size={16} /> New set</Btn>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sets.map(s => (
            <SetRow key={s.id} theme={theme} s={s}
              onOpenEdit={() => onOpenEdit(s.id)}
              onOpenStudy={() => onOpenStudy(s.id)}
              onOpenTest={() => onOpenTest(s.id)}
              onDelete={() => onDeleteSet(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SetRow({ theme, s, onOpenEdit, onOpenStudy, onOpenTest, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="hoverlift" style={{
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
    }}>
      <div style={{ width: 10, height: 40, borderRadius: 4, background: s.color, flexShrink: 0, transition: "background-color .3s ease" }} />
      <div style={{ flex: 1, minWidth: 140 }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 15.5 }}>{s.name}</div>
        <div style={{ fontSize: 12.5, color: theme.textDim }}>{s.cards.length} card{s.cards.length === 1 ? "" : "s"}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {confirming ? (
          <>
            <span style={{ fontSize: 12, color: theme.wrongText, whiteSpace: "nowrap" }}>Delete "{s.name}"?</span>
            <Btn theme={theme} size="sm" onClick={onDelete} style={{ background: theme.dangerBg, color: theme.danger, border: `1px solid ${theme.dangerBorder}` }}>Yes, delete</Btn>
            <Btn theme={theme} size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Btn>
          </>
        ) : (
          <>
            <Btn theme={theme} size="sm" variant="ghost" onClick={onOpenEdit}><Edit2 size={14} /> Edit</Btn>
            <Btn theme={theme} size="sm" variant="ghost" onClick={onOpenStudy} disabled={s.cards.length === 0}><BookOpen size={14} /> Study</Btn>
            <Btn theme={theme} size="sm" color={s.color} onClick={onOpenTest} disabled={s.cards.length === 0}><ListChecks size={14} /> Test</Btn>
            <button onClick={() => setConfirming(true)} className="iconbtn"
              style={{ background: "none", border: "none", color: theme.textFaint, padding: 4 }}><Trash2 size={15} /></button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- SET EDITOR ---------------------------------- */

function SetEditor({ theme, set, onBack, onUpdateSet, onAddCard, onAddBlankCards, onUpdateCard, onDeleteCard }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0].hex);
  const [bulkCount, setBulkCount] = useState(5);
  const frontRef = useRef(null);

  const submit = () => {
    if (!front.trim() || !back.trim()) return;
    onAddCard(set.id, { front: front.trim(), back: back.trim(), color });
    setFront(""); setBack("");
    frontRef.current?.focus();
  };

  const emptyCount = set.cards.filter(c => !c.front.trim() && !c.back.trim()).length;

  return (
    <div>
      <TopBar theme={theme} title={set.name}
        subtitle={`${set.cards.length} card${set.cards.length === 1 ? "" : "s"}${emptyCount ? ` · ${emptyCount} blank to fill in` : ""} · editing`}
        onBack={onBack} />

      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, color: theme.textDim, marginBottom: 6 }}>Term / Front</div>
            <textarea ref={frontRef} value={front} onChange={e => setFront(e.target.value)} rows={2} placeholder="e.g. Mitochondria"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", color: theme.text, fontSize: 14, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: theme.textDim, marginBottom: 6 }}>Definition / Back</div>
            <textarea value={back} onChange={e => setBack(e.target.value)} rows={2} placeholder="e.g. The powerhouse of the cell"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", color: theme.text, fontSize: 14, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, color: theme.textDim, marginBottom: 6 }}>Card color</div>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
          <div style={{ textAlign: "right" }}>
            <Btn theme={theme} onClick={submit} color={set.color} disabled={!front.trim() || !back.trim()}><Plus size={16} /> Add card</Btn>
            {(!front.trim() || !back.trim()) && (
              <div style={{ fontSize: 11.5, color: theme.textFaint, marginTop: 6 }}>Fill in both sides to add the card</div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        background: theme.surface, border: `1.5px dashed ${theme.borderStrong}`, borderRadius: 16,
        padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
      }}>
        <Layers size={16} color={theme.textDim} />
        <div style={{ fontSize: 13, color: theme.textDim, flex: 1, minWidth: 180 }}>
          Or drop in a batch of blank cards and fill them in one by one, whenever you like
        </div>
        <input type="number" min={1} max={50} value={bulkCount}
          onChange={e => setBulkCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
          style={{ width: 60, background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", color: theme.text, fontSize: 14, textAlign: "center" }} />
        <Btn theme={theme} variant="ghost" onClick={() => onAddBlankCards(set.id, bulkCount)}>
          <Plus size={15} /> Add {bulkCount} blank card{bulkCount === 1 ? "" : "s"}
        </Btn>
      </div>

      {set.cards.length === 0 ? (
        <EmptyState theme={theme} icon={PenLine} title="No cards yet" sub="Add a card above, or add a batch of blanks to fill in later." action={null} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {set.cards.map(c => (
            <CardRow key={c.id} theme={theme} card={c}
              onUpdate={(patch) => onUpdateCard(set.id, c.id, patch)}
              onDelete={() => onDeleteCard(set.id, c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardRow({ theme, card, onUpdate, onDelete }) {
  const isBlank = !card.front.trim() && !card.back.trim();
  const [editing, setEditing] = useState(isBlank);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const save = () => { onUpdate({ front, back }); setEditing(false); };

  return (
    <div className="hoverlift" style={{
      background: isBlank ? theme.surfaceAlt : theme.surface,
      border: isBlank ? `1.5px dashed ${theme.borderStrong}` : `1px solid ${theme.border}`,
      borderRadius: 12, padding: 12, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap"
    }}>
      <div style={{ width: 6, alignSelf: "stretch", borderRadius: 4, background: card.color, minHeight: 40, transition: "background-color .3s ease" }} />
      {editing ? (
        <div style={{ flex: "1 1 220px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          <input value={front} onChange={e => setFront(e.target.value)} placeholder="Term / front"
            onKeyDown={e => { if (e.key === "Enter") save(); }}
            style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", color: theme.text, boxSizing: "border-box" }} />
          <input value={back} onChange={e => setBack(e.target.value)} placeholder="Definition / back"
            onKeyDown={e => { if (e.key === "Enter") save(); }}
            style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", color: theme.text, boxSizing: "border-box" }} />
        </div>
      ) : (
        <div style={{ flex: "1 1 220px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          <div style={{ fontSize: 14, wordBreak: "break-word" }}>{card.front}</div>
          <div style={{ fontSize: 14, color: theme.textDim, wordBreak: "break-word" }}>{card.back}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center", marginLeft: "auto" }}>
        <ColorDotPicker value={card.color} onChange={(hex) => onUpdate({ color: hex })} />
        {editing ? (
          <button onClick={save} className="iconbtn" title="Save card"
            style={{ background: theme.correctBg, border: `1px solid ${theme.correctBorder}`, borderRadius: 8, color: theme.correctText, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} />
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="iconbtn" title="Edit card"
            style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.textFaint, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit2 size={14} />
          </button>
        )}
        <button onClick={onDelete} className="iconbtn" title="Delete card"
          style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.textFaint, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function ColorDotPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Card color" className="iconbtn"
        style={{ width: 22, height: 22, borderRadius: "50%", background: value, border: "1.5px solid rgba(0,0,0,.2)" }} />
      {open && (
        <div className="scale-in" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 20,
          background: "#2b241c", border: "1px solid #443a2c", borderRadius: 12, padding: 10,
          display: "flex", gap: 6, flexWrap: "wrap", width: 128, boxShadow: "0 10px 24px rgba(0,0,0,.3)"
        }}>
          {CARD_COLORS.map(c => (
            <button key={c.hex} onClick={() => { onChange(c.hex); setOpen(false); }} title={c.name} className="iconbtn"
              style={{ width: 22, height: 22, borderRadius: 6, background: c.hex, border: value === c.hex ? "2px solid #F6EFDE" : "2px solid transparent" }} />
          ))}
          <label title="Custom color" style={{
            width: 22, height: 22, borderRadius: 6, cursor: "pointer", position: "relative", overflow: "hidden",
            border: "1px dashed #9c8f70", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
          }}>
            <input type="color" value={value} onChange={e => { onChange(e.target.value); }}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </label>
        </div>
      )}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />}
    </div>
  );
}

/* ---------------------------------- STUDY MODE ---------------------------------- */

function sortCards(cards, sortBy) {
  const arr = [...cards];
  switch (sortBy) {
    case "az": return arr.sort((a, b) => a.front.localeCompare(b.front));
    case "za": return arr.sort((a, b) => b.front.localeCompare(a.front));
    case "newest": return arr.sort((a, b) => b.createdAt - a.createdAt);
    case "oldest": return arr.sort((a, b) => a.createdAt - b.createdAt);
    default: return arr;
  }
}

function StudyMode({ theme, set, onBack }) {
  const [sortBy, setSortBy] = useState("oldest");
  const [shuffled, setShuffled] = useState(false);
  const [order, setOrder] = useState(set.cards.map(c => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flash, setFlash] = useState(false);
  const [orientation, setOrientation] = useState("front"); // "front" | "back"
  const [marks, setMarks] = useState({}); // cardId -> "known" | "unknown"
  const [phase, setPhase] = useState("study"); // "study" | "summary"

  useEffect(() => {
    const base = sortCards(set.cards, sortBy).map(c => c.id);
    setOrder(shuffled ? shuffleArr(base) : base);
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setPhase("study");
  }, [sortBy]); // eslint-disable-line

  const reshuffle = () => {
    setShuffled(true);
    setOrder(shuffleArr(order));
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setPhase("study");
  };
  const unshuffle = () => {
    setShuffled(false);
    setOrder(sortCards(set.cards, sortBy).map(c => c.id));
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setPhase("study");
  };

  const cardsById = useMemo(() => Object.fromEntries(set.cards.map(c => [c.id, c])), [set.cards]);
  const current = cardsById[order[index]];

  const doFlip = () => {
    setFlipped(f => !f);
    setFlash(true);
    setTimeout(() => setFlash(false), 30);
  };

  const go = (dir) => {
    setFlipped(false);
    setTimeout(() => setIndex(i => Math.max(0, Math.min(order.length - 1, i + dir))), 140);
  };

  const mark = (status) => {
    if (!current) return;
    setMarks(m => ({ ...m, [current.id]: status }));
    setFlipped(false);
    setTimeout(() => {
      if (index + 1 >= order.length) setPhase("summary");
      else setIndex(i => i + 1);
    }, 160);
  };

  // --- swipe gesture (all decision state lives in refs, not React state,
  // so a fast tap can never race against a pending re-render) ---
  const [dragX, setDragX] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);
  const pointerActive = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const activePointerId = useRef(null);
  const SWIPE_THRESHOLD = 90;

  const onCardPointerDown = (e) => {
    if (phase !== "study") return;
    pointerActive.current = true;
    activePointerId.current = e.pointerId;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
    setTransitionOn(false);
  };
  const onCardPointerMove = (e) => {
    if (!pointerActive.current || e.pointerId !== activePointerId.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      dragMoved.current = true;
      setDragX(dx);
    }
  };
  const settleDrag = () => {
    setTransitionOn(false); // instant reset, no transition
    setDragX(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)));
  };
  const finishSwipe = (status) => {
    setTransitionOn(true);
    setDragX(status === "known" ? 640 : -640);
    setTimeout(() => { mark(status); settleDrag(); }, 220);
  };
  const onCardPointerUp = (e) => {
    if (!pointerActive.current || e.pointerId !== activePointerId.current) return;
    pointerActive.current = false;
    const dx = dragMoved.current ? (e.clientX - dragStart.current.x) : 0;
    setTransitionOn(true);
    if (dx > SWIPE_THRESHOLD) finishSwipe("known");
    else if (dx < -SWIPE_THRESHOLD) finishSwipe("unknown");
    else {
      setDragX(0);
      if (!dragMoved.current) doFlip();
    }
  };
  const onCardPointerCancel = () => { pointerActive.current = false; setTransitionOn(true); setDragX(0); };

  const knowOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const learnOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

  const knownCount = Object.values(marks).filter(v => v === "known").length;
  const unknownIds = Object.entries(marks).filter(([, v]) => v === "unknown").map(([id]) => id);

  const reviewMissed = () => {
    setOrder(unknownIds);
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setPhase("study");
  };
  const restudyAll = () => {
    const base = sortCards(set.cards, sortBy).map(c => c.id);
    setOrder(shuffled ? shuffleArr(base) : base);
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setPhase("study");
  };

  if (phase === "summary") {
    const missedCards = unknownIds.map(id => cardsById[id]).filter(Boolean);
    return (
      <div>
        <TopBar theme={theme} title={set.name} subtitle="Session complete" onBack={onBack} />
        <div className="scale-in" style={{
          textAlign: "center", padding: "30px 20px", borderRadius: 18, marginBottom: 22,
          background: theme.surface, border: `1px solid ${theme.border}`
        }}>
          <Award size={32} color={ACCENT} style={{ marginBottom: 8 }} />
          <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>
            {knownCount} known · {unknownIds.length} to review
          </div>
        </div>

        {missedCards.length > 0 ? (
          <div style={{ marginBottom: 22 }}>
            <div className="disp" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Still learning</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {missedCards.map(c => (
                <div key={c.id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 6, alignSelf: "stretch", borderRadius: 4, background: c.color, minHeight: 20 }} />
                  <div style={{ flex: 1, fontSize: 13.5 }}>{c.front}</div>
                  <div style={{ flex: 1, fontSize: 13.5, color: theme.textDim }}>{c.back}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState theme={theme} icon={Award} title="You knew every card!" sub="Nice work — restudy anytime to keep it fresh." action={null} />
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {missedCards.length > 0 && (
            <Btn theme={theme} color={set.color} onClick={reviewMissed}><RefreshCw size={15} /> Review missed cards</Btn>
          )}
          <Btn theme={theme} variant="ghost" onClick={restudyAll}><RotateCw size={15} /> Restudy all</Btn>
          <Btn theme={theme} variant="ghost" onClick={onBack}>Done</Btn>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const frontFirst = orientation === "front";
  const faceA = frontFirst ? current.front : current.back;
  const faceB = frontFirst ? current.back : current.front;

  return (
    <div>
      <TopBar theme={theme} title={set.name} subtitle={`Studying · card ${index + 1} of ${order.length} · ${knownCount} known · ${unknownIds.length} to review`} onBack={onBack} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "9px 12px", color: theme.text, fontSize: 13 }}>
          <option value="oldest">Sort: Original order</option>
          <option value="az">Sort: A → Z</option>
          <option value="za">Sort: Z → A</option>
          <option value="newest">Sort: Newest first</option>
        </select>
        <Btn theme={theme} size="sm" variant={shuffled ? "solid" : "ghost"} color={set.color} onClick={shuffled ? unshuffle : reshuffle}>
          <Shuffle size={14} /> {shuffled ? "Shuffled" : "Shuffle"}
        </Btn>
        <div style={{ display: "flex", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden" }}>
          <button onClick={() => setOrientation("front")} className="iconbtn" style={{
            padding: "9px 12px", fontSize: 13, border: "none", color: orientation === "front" ? theme.onAccent : theme.text,
            background: orientation === "front" ? ACCENT : "transparent"
          }}>Term first</button>
          <button onClick={() => setOrientation("back")} className="iconbtn" style={{
            padding: "9px 12px", fontSize: 13, border: "none", color: orientation === "back" ? theme.onAccent : theme.text,
            background: orientation === "back" ? ACCENT : "transparent"
          }}>Definition first</button>
        </div>
      </div>

      <div className="swipe-layer" role="button" tabIndex={0}
        aria-label="Flip card, or swipe right if you knew it, left if still learning"
        style={{
          height: 320, marginBottom: 22,
          transform: `translateX(${dragX}px) rotate(${dragX / 22}deg)`,
          transition: transitionOn ? "transform .32s cubic-bezier(0.16,1,0.3,1)" : "none",
        }}
        onPointerDown={onCardPointerDown}
        onPointerMove={onCardPointerMove}
        onPointerUp={onCardPointerUp}
        onPointerCancel={onCardPointerCancel}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doFlip(); } }}>
        <div className="swipe-stamp swipe-stamp-know" style={{ opacity: knowOpacity }}>Know it</div>
        <div className="swipe-stamp swipe-stamp-learn" style={{ opacity: learnOpacity }}>Learning</div>
        <div className="card-flip-wrap" style={{ height: "100%" }}>
          <div className={flipped ? "card-flip-inner flipped" : "card-flip-inner"} style={{ height: "100%", cursor: "pointer" }}>
            <div className="card-face" style={{
              background: current.color, color: isLight(current.color) ? "#201a15" : "#F6EFDE",
              border: "1px solid rgba(0,0,0,.15)", boxShadow: theme.shadow
            }}>
              <div className="punch" style={{ left: "50%", transform: "translateX(-50%)" }} />
              <div>
                <div className="hand" style={{ fontSize: 15, opacity: 0.65, marginBottom: 10 }}>{frontFirst ? "Term" : "Definition"}</div>
                <div className="disp" style={{ fontSize: "clamp(20px, 3.4vw, 28px)", fontWeight: 600, lineHeight: 1.3 }}>{faceA}</div>
              </div>
            </div>
            <div className="card-face card-back-face" style={{
              background: current.color, color: isLight(current.color) ? "#201a15" : "#F6EFDE",
              border: "1px solid rgba(0,0,0,.15)", boxShadow: theme.shadow
            }}>
              <div className="punch" style={{ left: "50%", transform: "translateX(-50%)" }} />
              <div>
                <div className="hand" style={{ fontSize: 15, opacity: 0.65, marginBottom: 10 }}>{frontFirst ? "Definition" : "Term"}</div>
                <div className="disp" style={{ fontSize: "clamp(20px, 3.4vw, 28px)", fontWeight: 600, lineHeight: 1.3 }}>{faceB}</div>
              </div>
            </div>
          </div>
          <div className={"tap-flash" + (flash ? " show" : "")} />
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 12.5, color: theme.textFaint, marginTop: -14, marginBottom: 18 }}>tap to flip · swipe right if you knew it, left if you're still learning</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <button onClick={() => go(-1)} disabled={index === 0} className="iconbtn" style={{
          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, width: 46, height: 46, color: theme.text, opacity: index === 0 ? 0.4 : 1
        }}><ChevronLeft size={20} /></button>
        <div style={{ fontSize: 13, color: theme.textDim, minWidth: 60, textAlign: "center" }}>{index + 1} / {order.length}</div>
        <button onClick={() => go(1)} disabled={index === order.length - 1} className="iconbtn" style={{
          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, width: 46, height: 46, color: theme.text, opacity: index === order.length - 1 ? 0.4 : 1
        }}><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}

/* ---------------------------------- TEST SETUP ---------------------------------- */

function TestSetup({ theme, set, onBack, onStart }) {
  const [mode, setMode] = useState("multiple-choice");
  const [orientation, setOrientation] = useState("front");
  const [count, setCount] = useState(Math.min(10, set.cards.length));

  const modes = [
    { id: "true-false", label: "True / False", icon: ListChecks, min: 2, desc: "See a term + a proposed answer. Decide if it's correct." },
    { id: "multiple-choice", label: "Multiple choice", icon: Layers, min: 3, desc: "Pick the right definition from several options." },
    { id: "written", label: "Written", icon: PenLine, min: 1, desc: "Type the answer yourself." },
  ];
  const available = set.cards.length;

  return (
    <div>
      <TopBar theme={theme} title={`Test: ${set.name}`} subtitle={`${available} card${available === 1 ? "" : "s"} in this set`} onBack={onBack} />

      <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 10 }}>Choose a test type</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        {modes.map(m => {
          const Icon = m.icon;
          const disabled = available < m.min;
          const active = mode === m.id;
          return (
            <button key={m.id} disabled={disabled} onClick={() => setMode(m.id)} className="hoverlift"
              style={{
                textAlign: "left", padding: 16, borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer",
                background: active ? theme.surfaceActive : theme.surface, border: active ? `1.5px solid ${set.color}` : `1px solid ${theme.border}`,
                opacity: disabled ? 0.4 : 1,
              }}>
              <Icon size={18} color={active ? set.color : theme.text} />
              <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>{disabled ? `Needs ${m.min}+ cards` : m.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Ask with</div>
          <div style={{ display: "flex", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden" }}>
            {[["front", "Term shown"], ["back", "Definition shown"], ["mixed", "Mixed"]].map(([val, label]) => (
              <button key={val} onClick={() => setOrientation(val)} className="iconbtn" style={{
                padding: "9px 12px", fontSize: 13, border: "none",
                color: orientation === val ? theme.onAccent : theme.text,
                background: orientation === val ? set.color : "transparent"
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 8 }}>Number of questions</div>
          <input type="range" min={1} max={available} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: 180 }} />
          <div style={{ fontSize: 13, marginTop: 4 }}>{count} question{count === 1 ? "" : "s"}</div>
        </div>
      </div>

      <Btn theme={theme} color={set.color} onClick={() => onStart({ mode, orientation, count })}>
        <Play size={16} /> Start test
      </Btn>
    </div>
  );
}

/* ---------------------------------- TEST RUNNER ---------------------------------- */

function buildQuestions(set, config) {
  const pool = config.onlyIds ? set.cards.filter(c => config.onlyIds.includes(c.id)) : set.cards;
  const chosen = shuffleArr(pool).slice(0, config.onlyIds ? pool.length : config.count);
  return chosen.map(card => {
    const showFront = config.orientation === "mixed" ? Math.random() < 0.5 : config.orientation === "front";
    const prompt = showFront ? card.front : card.back;
    const answer = showFront ? card.back : card.front;

    if (config.mode === "true-false") {
      const isTrue = Math.random() < 0.5;
      let shown = answer;
      if (!isTrue) {
        const others = set.cards.filter(c => c.id !== card.id);
        const other = others[Math.floor(Math.random() * others.length)];
        shown = showFront ? other.back : other.front;
      }
      return { card, prompt, answer, type: "true-false", shownAnswer: shown, correctBool: isTrue };
    }
    if (config.mode === "multiple-choice") {
      const others = shuffleArr(set.cards.filter(c => c.id !== card.id)).slice(0, 3);
      const optionCards = shuffleArr([card, ...others]);
      const options = optionCards.map(c => showFront ? c.back : c.front);
      return { card, prompt, answer, type: "multiple-choice", options };
    }
    return { card, prompt, answer, type: "written" };
  });
}

function TestRunner({ theme, set, config, onExit, onFinish }) {
  const [questions] = useState(() => buildQuestions(set, config));
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [written, setWritten] = useState("");
  const [revealed, setRevealed] = useState(false);

  const q = questions[i];
  if (!q) return null;

  const submitAnswer = (userAnswer, correct) => {
    if (revealed) return;
    setSelected(userAnswer);
    setRevealed(true);
    const record = { question: q, userAnswer, correct };
    setTimeout(() => {
      const next = [...answers, record];
      setAnswers(next);
      setRevealed(false);
      setSelected(null);
      setWritten("");
      if (i + 1 >= questions.length) onFinish(next);
      else setI(i + 1);
    }, 800);
  };

  return (
    <div>
      <TopBar theme={theme} title={`Test: ${set.name}`} subtitle={`Question ${i + 1} of ${questions.length}`} onBack={onExit} />

      <div style={{ height: 6, background: theme.surface, borderRadius: 4, marginBottom: 26, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(i / questions.length) * 100}%`, background: set.color, transition: "width .45s cubic-bezier(0.65,0,0.35,1)" }} />
      </div>

      <div key={i} className="fade-in" style={{
        background: set.color, color: isLight(set.color) ? "#201a15" : "#F6EFDE",
        borderRadius: 18, padding: "34px 24px", textAlign: "center", marginBottom: 24,
        boxShadow: theme.shadow, transition: "background-color .4s ease"
      }}>
        <div className="hand" style={{ fontSize: 15, opacity: 0.65, marginBottom: 8 }}>Question</div>
        <div className="disp" style={{ fontSize: "clamp(19px,3vw,26px)", fontWeight: 600 }}>{q.prompt}</div>
      </div>

      {q.type === "true-false" && (
        <div>
          <div style={{ textAlign: "center", fontSize: 15, marginBottom: 20, color: theme.text }}>
            Proposed answer: <strong style={{ color: theme.textStrong }}>{q.shownAnswer}</strong>
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <TFButton theme={theme} label="True" active={selected === true} correctState={revealed ? q.correctBool === true : null}
              onClick={() => submitAnswer(true, q.correctBool === true)} />
            <TFButton theme={theme} label="False" active={selected === false} correctState={revealed ? q.correctBool === false : null}
              onClick={() => submitAnswer(false, q.correctBool === false)} />
          </div>
        </div>
      )}

      {q.type === "multiple-choice" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {q.options.map((opt, idx) => {
            const isCorrectOpt = opt === q.answer;
            const isSelected = selected === opt;
            let bg = theme.surface, border = theme.border, color = theme.text;
            if (revealed && isCorrectOpt) { bg = theme.correctBg; border = theme.correctBorder; color = theme.correctText; }
            else if (revealed && isSelected && !isCorrectOpt) { bg = theme.wrongBg; border = theme.wrongBorder; color = theme.wrongText; }
            return (
              <button key={idx} onClick={() => submitAnswer(opt, isCorrectOpt)} className="iconbtn"
                style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12, background: bg, border: `1px solid ${border}`, color, fontSize: 14.5 }}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "written" && (
        <div>
          <input autoFocus value={written} onChange={e => setWritten(e.target.value)} disabled={revealed}
            onKeyDown={e => { if (e.key === "Enter" && written.trim()) {
              const correct = written.trim().toLowerCase() === q.answer.trim().toLowerCase();
              submitAnswer(written.trim(), correct);
            } }}
            placeholder="Type your answer…"
            style={{ width: "100%", background: theme.inputBg, border: `1px solid ${revealed ? (written.trim().toLowerCase() === q.answer.trim().toLowerCase() ? theme.correctBorder : theme.wrongBorder) : theme.border}`, borderRadius: 12, padding: "13px 16px", color: theme.text, fontSize: 15, marginBottom: 14 }} />
          {revealed && (
            <div style={{ fontSize: 13.5, color: theme.textDim, marginBottom: 14 }}>Correct answer: <strong style={{ color: theme.text }}>{q.answer}</strong></div>
          )}
          <Btn theme={theme} color={set.color} disabled={!written.trim() || revealed} onClick={() => {
            const correct = written.trim().toLowerCase() === q.answer.trim().toLowerCase();
            submitAnswer(written.trim(), correct);
          }}>Submit <ArrowRight size={15} /></Btn>
        </div>
      )}
    </div>
  );
}

function TFButton({ theme, label, active, correctState, onClick }) {
  let bg = theme.surface, border = theme.border, color = theme.text;
  if (correctState === true) { bg = theme.correctBg; border = theme.correctBorder; color = theme.correctText; }
  if (correctState === false && active) { bg = theme.wrongBg; border = theme.wrongBorder; color = theme.wrongText; }
  return (
    <button onClick={onClick} className="iconbtn" style={{ padding: "14px 36px", borderRadius: 12, background: bg, border: `1px solid ${border}`, color, fontSize: 15, fontWeight: 600 }}>
      {label}
    </button>
  );
}

/* ---------------------------------- TEST RESULTS ---------------------------------- */

function TestResults({ theme, set, results, onRetryAll, onRetryMissed, onDone }) {
  const correctCount = results.filter(r => r.correct).length;
  const pct = Math.round((correctCount / results.length) * 100);
  const missed = results.filter(r => !r.correct);

  return (
    <div>
      <TopBar theme={theme} title="Results" subtitle={set.name} />
      <div className="scale-in" style={{
        textAlign: "center", padding: "34px 20px", borderRadius: 18, marginBottom: 26,
        background: theme.surface, border: `1px solid ${theme.border}`
      }}>
        <Award size={36} color={pct >= 70 ? ACCENT : theme.textFaint} style={{ marginBottom: 10 }} />
        <div className="disp" style={{ fontSize: 40, fontWeight: 700 }}>{pct}%</div>
        <div style={{ color: theme.textDim, fontSize: 14, marginTop: 4 }}>{correctCount} of {results.length} correct</div>
      </div>

      {missed.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="disp" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Missed questions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missed.map((r, idx) => (
              <div key={idx} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, fontSize: 13.5 }}>
                <div style={{ color: theme.text, marginBottom: 4 }}>{r.question.prompt}</div>
                <div style={{ color: theme.wrongText }}>Your answer: {String(r.userAnswer)}</div>
                <div style={{ color: theme.correctText }}>Correct: {String(r.question.type === "true-false" ? r.question.correctBool : r.question.answer)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn theme={theme} color={set.color} onClick={onRetryAll}><RefreshCw size={15} /> Retry all</Btn>
        {missed.length > 0 && <Btn theme={theme} variant="ghost" onClick={() => onRetryMissed(missed.map(m => m.question.card.id))}><RotateCw size={15} /> Retry missed only</Btn>}
        <Btn theme={theme} variant="ghost" onClick={onDone}>Done</Btn>
      </div>
    </div>
  );
}
