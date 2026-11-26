import { useState, useRef, useEffect } from "react";
type Msg = { role: "user" | "assistant"; content: string };
export default function App() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: "Hi! I'm ProfIA 🇺🇸\nComo posso te ajudar hoje?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [messages]);
  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, history: messages.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages(m => [...m, { role: "assistant", content: `❌ Erro: ${err.message}` }]);
    } finally { setLoading(false); }
  }
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", display: "flex", flexDirection: "column", fontFamily: "system-ui" }}>
      <header style={{ padding: "16px", textAlign: "center", fontWeight: 700 }}>ProfIA • Professor de Inglês 🇺🇸🇧🇷</header>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "700px", margin: "0 auto", width: "100%" }}>
        {messages.map((m, i) => (<div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? "#2563eb" : "#1e293b", padding: "12px 16px", borderRadius: "18px", maxWidth: "85%", whiteSpace: "pre-wrap" }}>{m.content}</div>))}
        {loading && <div style={{ color: "#94a3b8" }}>Professor digitando...</div>}
      </div>
      <div style={{ padding: "12px", display: "flex", gap: "8px", maxWidth: "700px", margin: "0 auto", width: "100%" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Digite em inglês ou português..." style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: "999px", padding: "14px 18px", color: "white", outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ background: "#2563eb", border: "none", borderRadius: "999px", padding: "0 22px", color: "white", fontWeight: 700 }}>Enviar</button>
      </div>
    </div>
  );
}
