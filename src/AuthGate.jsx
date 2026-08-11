import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If your Supabase project has "Confirm email" turned on, there's no
        // session yet — the user needs to click the link in their inbox first.
        if (data.user && !data.session) {
          setNotice("Account created — check your email to confirm it, then log in.");
          setMode("login");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) {
    return <div style={styles.center}><div style={{ color: "#6B5F47", fontFamily: "sans-serif" }}>Loading…</div></div>;
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <form onSubmit={submit} style={styles.card}>
          <h2 style={styles.h2}>{mode === "login" ? "Log in" : "Create your account"}</h2>
          <p style={styles.p}>
            {mode === "login"
              ? "Use the same account on your phone and computer to keep your flashcards in sync."
              : "One account, used on every device — your flashcards will follow you."}
          </p>
          <input style={styles.input} type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <input style={styles.input} type="password" placeholder="Password (6+ characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {notice && <div style={styles.notice}>{notice}</div>}
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
          <div style={styles.switchLine}>
            {mode === "login" ? (
              <span>No account yet?{" "}
                <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); setMode("signup"); setError(""); setNotice(""); }}>Sign up</a>
              </span>
            ) : (
              <span>Already have an account?{" "}
                <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); setNotice(""); }}>Log in</a>
              </span>
            )}
          </div>
        </form>
      </div>
    );
  }

  return children(user);
}

const styles = {
  center: {
    minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(1200px 600px at 20% -10%, #F2ECDA 0%, #EAE2CB 55%, #E1D8BE 100%)",
    fontFamily: "'Inter', sans-serif", padding: 20, boxSizing: "border-box",
  },
  card: {
    background: "#F8F3E6", padding: "30px 28px", borderRadius: 18, width: "100%", maxWidth: 340,
    boxShadow: "0 10px 30px rgba(60,45,20,.15)", border: "1px solid #DCD0AE",
  },
  h2: { margin: "0 0 8px", color: "#1C1710", fontSize: 21 },
  p: { margin: "0 0 18px", color: "#6B5F47", fontSize: 13, lineHeight: 1.4 },
  input: {
    width: "100%", padding: "11px 13px", marginBottom: 10, borderRadius: 10,
    border: "1px solid #DCD0AE", fontSize: 14, background: "#FCFAF2", color: "#2A2318",
    boxSizing: "border-box",
  },
  notice: { color: "#2F5A1D", fontSize: 12.5, marginBottom: 10, lineHeight: 1.4 },
  error: { color: "#B23B3B", fontSize: 12.5, marginBottom: 10, lineHeight: 1.4 },
  btn: {
    width: "100%", padding: "11px", borderRadius: 10, border: "none",
    background: "#E3A73B", color: "#241d16", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  switchLine: { marginTop: 14, fontSize: 13, textAlign: "center", color: "#6B5F47" },
  link: { color: "#B2791E", fontWeight: 600, textDecoration: "none" },
};
