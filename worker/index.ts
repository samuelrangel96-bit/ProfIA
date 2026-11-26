export interface Env {
  AI: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const SYSTEM_PROMPT = `You are ProfIA, an English teacher from USA/Brazil. 
Rules:
- Always answer in English, but you can explain in Portuguese if the student is confused.
- Be friendly, encouraging, and correct mistakes gently.
- Teach vocabulary, grammar, and conversation.
- Keep answers short and interactive.
- If user says "Hi", greet and ask level: beginner, intermediate, advanced.
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "online", ai: !!env.AI });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message, history } = await request.json() as any;
        if (!message) return Response.json({ error: "No message" }, { status: 400 });
        if (!env.AI) return Response.json({ error: "AI not bound" }, { status: 500 });

        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...(Array.isArray(history) ? history.slice(-10) : []),
          { role: "user", content: message }
        ];

        const result: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages,
          max_tokens: 512
        });

        return Response.json({ reply: result.response || result.result || "Sorry, try again!" });
      } catch (e: any) {
        return Response.json({ error: "Falha ao conectar: " + (e?.message || e) }, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
} as ExportedHandler<Env>;
