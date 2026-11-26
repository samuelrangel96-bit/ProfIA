
import { useState, useRef, useEffect } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

type SpeechRecognitionResult = {
  0: { transcript: string };
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResult[];
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function App() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ProfIA 🇺🇸\n\nSeu professor particular de inglês está pronto para ensinar. What would you like to learn today?"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("pt-BR");

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      alert("Seu navegador não suporta reprodução de voz.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;

    const SpeechRecognition =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Use o Google Chrome para utilizar o microfone.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;

      if (transcript) {
        setInput(current =>
          current ? `${current} ${transcript}` : transcript
        );
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();

    setMessages(m => [
      ...m,
      { role: "user", content: userMsg }
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Erro na comunicação");
      }

      setMessages(m => [
        ...m,
        { role: "assistant", content: data.reply }
      ]);

    } catch (err: any) {
      setMessages(m => [
        ...m,
        {
          role: "assistant",
          content: `❌ Erro: ${err.message}`
        }
      ]);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #080d19;
          font-family: Inter, system-ui, sans-serif;
        }

        .app {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(ellipse at 50% -20%, #19346b 0%, transparent 55%),
            #080d19;
          color: #f8fafc;
        }

        .header {
          height: 76px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(10,16,31,.8);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          width: 43px;
          height: 43px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 21px;
          font-weight: 800;
          background: linear-gradient(135deg,#2563eb,#7c3aed);
          box-shadow: 0 5px 25px rgba(59,130,246,.3);
        }

        .brand-name {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.5px;
        }

        .brand-sub {
          font-size: 11px;
          color: #8492aa;
          margin-top: 3px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: #a5b4fc;
          background: rgba(99,102,241,.1);
          border: 1px solid rgba(99,102,241,.2);
          padding: 8px 12px;
          border-radius: 30px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          background: #34d399;
          border-radius: 50%;
          box-shadow: 0 0 10px #34d399;
        }

        .main {
          flex: 1;
          width: 100%;
          max-width: 900px;
          margin: auto;
          padding: 35px 22px 20px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .welcome {
          text-align: center;
          margin: 15px 0 35px;
        }

        .welcome-icon {
          width: 65px;
          height: 65px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          margin: auto auto 18px;
          font-size: 30px;
          background: linear-gradient(135deg,#172e63,#38216d);
          border: 1px solid rgba(129,140,248,.3);
          box-shadow: 0 10px 35px rgba(59,130,246,.15);
        }

        .welcome h1 {
          font-size: clamp(24px,5vw,34px);
          letter-spacing: -1px;
          margin: 0 0 10px;
        }

        .welcome p {
          color: #8492aa;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }

        .chat {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px 4px 25px;
          min-height: 180px;
          scrollbar-width: thin;
          scrollbar-color: #273958 transparent;
        }

        .message-row {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          max-width: 90%;
          animation: appear .25s ease;
        }

        .message-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .avatar {
          width: 35px;
          height: 35px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg,#1e40af,#6d28d9);
          font-size: 16px;
        }

        .user .avatar {
          background: #263752;
        }

        .bubble {
          padding: 14px 17px;
          border-radius: 5px 18px 18px 18px;
          background: #141f33;
          border: 1px solid rgba(255,255,255,.07);
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.75;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .user .bubble {
          border-radius: 18px 5px 18px 18px;
          background: linear-gradient(135deg,#2563eb,#4338ca);
          border: none;
          color: white;
        }

        .typing {
          display: flex;
          gap: 5px;
          padding: 5px 2px;
        }

        .typing span {
          width: 7px;
          height: 7px;
          background: #818cf8;
          border-radius: 50%;
          animation: bounce 1s infinite alternate;
        }

        .typing span:nth-child(2) {
          animation-delay: .2s;
        }

        .typing span:nth-child(3) {
          animation-delay: .4s;
        }

        .composer-area {
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .composer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 9px 8px 18px;
          border-radius: 20px;
          background: #111c30;
          border: 1px solid #293953;
          transition: .2s;
          box-shadow: 0 12px 35px rgba(0,0,0,.2);
        }

        .composer:focus-within {
          border-color: #4f72db;
          box-shadow: 0 0 0 3px rgba(79,114,219,.12);
        }

        .composer input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 14px;
          padding: 12px 0;
        }

        .composer input::placeholder {
          color: #71809a;
        }

        .send {
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg,#3b82f6,#6366f1);
          color: white;
          font-size: 20px;
          cursor: pointer;
          transition: .2s;
          box-shadow: 0 5px 15px rgba(59,130,246,.25);
        }

        .send:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.15);
        }

        .send:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .mic-button,
        .language-button {
          border: 1px solid #334563;
          background: #1b2940;
          color: white;
          border-radius: 13px;
          height: 43px;
          min-width: 43px;
          cursor: pointer;
          font-size: 17px;
          flex-shrink: 0;
        }

        .mic-button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .mic-button.recording {
          background: #dc2626;
          border-color: #ef4444;
          animation: bounce .7s infinite alternate;
        }

        .language-button {
          font-size: 12px;
          font-weight: 800;
          color: #a5b4fc;
        }

        .speak-button {
          display: block;
          margin-top: 12px;
          padding: 7px 11px;
          border: 1px solid #344563;
          border-radius: 10px;
          background: #1d2c46;
          color: #a5b4fc;
          font-size: 12px;
          cursor: pointer;
        }

        .speak-button:hover {
          background: #293d60;
        }

        .footer {
          text-align: center;
          color: #59677e;
          font-size: 11px;
          padding: 14px 0 4px;
        }

        @keyframes appear {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce {
          to { transform: translateY(-5px); opacity: .5; }
        }

        @media(max-width:600px) {
          .header {
            height: 68px;
            padding: 0 15px;
          }

          .main {
            padding: 22px 13px 12px;
          }

          .welcome {
            margin: 10px 0 22px;
          }

          .welcome-icon {
            width: 55px;
            height: 55px;
            font-size: 25px;
          }

          .message-row {
            max-width: 96%;
          }

          .bubble {
            font-size: 13px;
            padding: 12px 14px;
          }

          .status {
            font-size: 10px;
            padding: 7px 9px;
          }

          .composer {
            gap: 6px;
            padding-left: 9px;
          }

          .composer input {
            font-size: 12px;
          }

          .mic-button,
          .language-button {
            min-width: 37px;
            height: 39px;
          }

          .send {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>

      <header className="header">
        <div className="brand">
          <div className="logo">P</div>
          <div>
            <div className="brand-name">ProfIA 🇺🇸</div>
            <div className="brand-sub">
              Your Personal English Teacher
            </div>
          </div>
        </div>

        <div className="status">
          <span className="status-dot" />
          AI Assistant
        </div>
      </header>

      <main className="main">

        <section className="welcome">
          <div className="welcome-icon">🎓</div>
          <h1>Welcome to ProfIA</h1>
          <p>
            Learn English. Practice every day.
            <br />
            Your personal AI teacher is here.
          </p>
        </section>

        <div className="chat" ref={listRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`message-row ${m.role}`}
            >
              <div className="avatar">
                {m.role === "assistant" ? "🎓" : "👤"}
              </div>

              <div className="bubble">
                {m.content}

                {m.role === "assistant" &&
                  !m.content.startsWith("❌ Erro:") && (
                    <button
                      className="speak-button"
                      onClick={() => speak(m.content)}
                      title="Listen to the professor"
                    >
                      🔊 Ouvir resposta
                    </button>
                  )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row">
              <div className="avatar">🎓</div>
              <div className="bubble">
                Professor is thinking...
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="composer-area">
          <div className="composer">

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Type in English or Portuguese..."
              disabled={loading}
            />

            <button
              className={`mic-button ${listening ? "recording" : ""}`}
              onClick={startListening}
              disabled={loading}
              title="Speak"
              aria-label="Start voice recognition"
            >
              {listening ? "⏹" : "🎤"}
            </button>

            <button
              className="language-button"
              onClick={() =>
                setVoiceLanguage(current =>
                  current === "pt-BR" ? "en-US" : "pt-BR"
                )
              }
              disabled={listening}
              title="Change recognition language"
            >
              {voiceLanguage === "pt-BR" ? "PT" : "EN"}
            </button>

            <button
              className="send"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>

          <div className="footer">
            ProfIA • Your journey to English fluency starts here
          </div>
        </div>

      </main>
    </div>
  );
      }
        
