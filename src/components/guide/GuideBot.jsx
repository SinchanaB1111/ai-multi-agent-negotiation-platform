import { useEffect, useRef, useState } from "react";
import { askGuideAI, getContextualQuickQuestions } from "../../services/guideBotService.js";
import "./GuideBot.css";

export default function GuideBot({ page="Dashboard" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([{ id:"welcome", role:"bot", text:"Hi! I am your NegoSphere AI Guide. Ask me about the platform, negotiation, reports, or any general question." }]);
  const endRef = useRef(null);
  const questions = getContextualQuickQuestions(page);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const ask = async (value) => {
    const question = String(value || input).trim();
    if (!question || busy) return;
    const nextMessages = [...messages, { id:`u-${Date.now()}`, role:"user", text:question }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    const answer = await askGuideAI({ question, page, history: messages });
    setMessages((current) => [...current, { id:`b-${Date.now()}`, role:"bot", text:answer.message, source:answer.source }]);
    setBusy(false);
  };

  return <>
    <button className="guide-fab" onClick={() => setOpen(true)} aria-label="Open AI Guide">✦ AI Guide</button>
    {open && <aside className="guide-panel" aria-label="NegoSphere AI Guide">
      <header><div><b>AI Negotiation Guide</b><small>{page} · {busy ? "Thinking…" : "Online"}</small></div><button onClick={() => setOpen(false)} aria-label="Close guide">×</button></header>
      <div className="guide-messages">
        {messages.map((m) => <div key={m.id} className={`guide-msg ${m.role}`}><div className="guide-msg-label">{m.role === "bot" ? "NegoSphere AI" : "You"}</div><div>{m.text.split("\n").map((line,i)=><div key={i}>{line}</div>)}</div></div>)}
        {busy && <div className="guide-msg bot"><div className="guide-msg-label">NegoSphere AI</div><div className="guide-thinking"><i/><i/><i/></div></div>}
        <div ref={endRef} />
      </div>
      {!busy && <div className="guide-quick">{questions.slice(0,3).map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}</div>}
      <form onSubmit={(e)=>{e.preventDefault();ask();}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything…"/><button disabled={busy}>→</button></form>
    </aside>}
  </>;
}
