
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

  const [speechRate, setSpeechRate] = useState(() => {
    try {
      const saved = localStorage.getItem("profia-speech-rate");
      const rate = saved ? Number(saved) : 0.9;

      return Number.isFinite(rate) && rate >= 0.5 && rate <= 1.5
        ? rate
        : 0.9;
    } catch {
      return 0.9;
    }
  });

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("profia-speech-rate", String(speechRate));
    } catch {
      // Armazenamento opcional
    }
  }, [speechRate]);

  // Rolagem automática
  useEffect(() => {
    const chat = listRef.current;
    if (!chat) return;

    const frame = requestAnimationFrame(() => {
      chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth"
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  // Limpeza ao sair
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Identificação do idioma
  function detectLanguage(sentence: string): string {
    const text = sentence.toLowerCase();

    const portugueseWords =
      /\b(o|a|os|as|um|uma|de|do|da|dos|das|que|não|sim|você|vocês|eu|ele|ela|nós|meu|minha|seu|sua|para|com|por|porque|como|está|estão|ser|estar|mas|também|então|muito|mais|isso|essa|esse|obrigado|obrigada|vamos|pode|posso|exemplo|significa|palavra|frase|inglês|português|pronúncia|correto|correta)\b/gi;

    const englishWords =
      /\b(the|is|are|was|were|you|your|we|they|he|she|it|this|that|what|when|where|why|how|with|for|from|have|has|had|do|does|did|can|could|would|should|will|hello|hi|yes|no|please|thank|thanks|because|about|learn|learning|english|teacher|today|example|sentence|word|pronunciation|good|morning|great|let|don't|doesn't|i'm|you're|it's)\b/gi;

    const portugueseCount =
      (text.match(portugueseWords) || []).length;

    const englishCount =
      (text.match(englishWords) || []).length;

    const hasPortugueseAccents =
      /[ãõáéíóúâêôç]/i.test(text);

    if (hasPortugueseAccents || portugueseCount > englishCount) {
      return "pt-BR";
    }

    return "en-US";
  }

  // Separar frases para reprodução individual
  function splitSentences(text: string): string[] {
    return (
      text.match(/[^.!?\n]+[.!?]?|\n+/g) || [text]
    )
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }

  // Reprodução de voz com idioma automático
  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      alert("Seu navegador não suporta reprodução de voz.");
      return;
    }

    window.speechSynthesis.cancel();

    const sentences = splitSentences(text);
    const voices = window.speechSynthesis.getVoices();

    sentences.forEach(sentence => {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) return;

      const language = detectLanguage(cleanSentence);

      const utterance =
        new SpeechSynthesisUtterance(cleanSentence);

      utterance.lang = language;
      utterance.rate = speechRate;
      utterance.pitch = 1;

      const preferredVoice = voices.find(
        voice =>
          voice.lang.toLowerCase() === language.toLowerCase()
      );

      const alternativeVoice = voices.find(voice =>
        voice.lang.toLowerCase().startsWith(
          language === "pt-BR" ? "pt" : "en"
        )
      );

      if (preferredVoice || alternativeVoice) {
        utterance.voice = preferredVoice || alternativeVoice!;
      }

      window.speechSynthesis.speak(utterance);
    });
  }

  // Alternar idioma do microfone
  function toggleVoiceLanguage() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    setVoiceLanguage(current =>
      current === "pt-BR" ? "en-US" : "pt-BR"
    );
  }

  // Microfone
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

    recognition.onresult = event => {
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

  // Enviar mensagem para o servidor
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
        throw new Error(
          data.details || data.error || "Erro na comunicação"
        );
      }

      if (typeof data.reply !== "string") {
        throw new Error("O servidor retornou uma resposta inválida.");
      }

      setMessages(m => [
        ...m,
        { role: "assistant", content: data.reply }
      ]);

    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";

      setMessages(m => [
        ...m,
        {
          role: "assistant",
          content: `❌ Erro: ${errorMessage}`
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
          min-height: 76px;
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
          flex: 1 1 auto;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px 4px 25px;
          min-height: 180px;
          max-height: 60vh;
          scrollbar-width: thin;
          scrollbar-color: #273958 transparent;
          overscroll-behavior: contain;
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
          min-width: 0;
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

        .speed-control {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 8px 13px;
          flex-wrap: wrap;
        }

        .speed-label {
          font-size: 12px;
          color: #94a3b8;
          white-space: nowrap;
        }

        .speed-select {
          flex: 1;
          min-width: 110px;
          accent-color: #6366f1;
          cursor: pointer;
        }

        .speed-value {
          min-width: 42px;
          text-align: center;
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 800;
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
          padding: 0 9px;
          min-width: 55px;
          transition: .2s;
        }

        .language-button:hover {
          background: #293d60;
          border-color: #7185b8;
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

        .sentence-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .sentence-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 11px;
          background: rgba(30,45,70,.65);
        }

        .sentence-text {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          line-height: 1.6;
          color: #dbeafe;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .sentence-play {
          flex-shrink: 0;
          border: 1px solid #40557a;
          background: #263b5d;
          color: #a5b4fc;
          border-radius: 9px;
          min-width: 36px;
          height: 34px;
          cursor: pointer;
          font-size: 15px;
        }

        .sentence-play:hover {
          background: #354e78;
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
            min-height: 68px;
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

          .language-button {
            font-size: 11px;
            padding: 0 5px;
          }

          .send {
            width: 40px;
            height: 40px;
          }

          .sentence-text {
            font-size: 12px;
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
                    <>
                      <button
                        className="speak-button"
                        onClick={() => speak(m.content)}
                        title="Ouvir resposta completa"
                      >
                        🔊 Ouvir resposta completa
                      </button>

                      <div className="sentence-list">
                        {splitSentences(m.content).map(
                          (sentence, sentenceIndex) => (
                            <div
                              className="sentence-item"
                              key={sentenceIndex}
                            >
                              <div className="sentence-text">
                                {sentence}
                              </div>

                              <button
                                className="sentence-play"
                                onClick={() => speak(sentence)}
                                title="Ouvir somente esta frase"
                                aria-label={`Ouvir frase ${sentenceIndex + 1}`}
                              >
                                🔊
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </>
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

          <div className="speed-control">
            <span className="speed-label">
              🔊 Velocidade da voz
            </span>

            <input
              className="speed-select"
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={speechRate}
              onChange={e =>
                setSpeechRate(Number(e.target.value))
              }
              aria-label="Velocidade da voz"
            />

            <span className="speed-value">
              {speechRate.toFixed(2).replace(".", ",")}x
            </span>
          </div>

          <div className="composer">

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type in English or Portuguese..."
              disabled={loading}
            />

            <button
              className="language-button"
              onClick={toggleVoiceLanguage}
              disabled={loading}
              title="Alternar idioma do microfone"
              aria-label="Alternar idioma do microfone"
            >
              {voiceLanguage === "pt-BR" ? "🇧🇷 PT" : "🇺🇸 EN"}
            </button>

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
              className="send"
              onClick={send}
              disabled={!input.trim() || loading}
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
            >
              ➤
            </button>

          </div>

          <div className="footer">
            ProfIA • Your Personal English Teacher 🇺🇸
          </div>

        </div>
      </main>
    </div>
  );
            }
