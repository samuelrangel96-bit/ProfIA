export interface Env {
  AI: any;
  ASSETS: Fetcher;
}

const SYSTEM_PROMPT = `You are ProfIA, a friendly and patient English teacher for Brazilians. 
- Always be encouraging. 
- Explain grammar in Portuguese when needed, but practice in English.
- Correct the user gently with examples.
- Keep answers short, 2-4 paragraphs max.`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "online", ai: !!env.AI });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message, history } = await request.json() as any;
        if (!message) return Response.json({ error: "Digite uma mensagem" }, { status: 400 });
        if (!env.AI) return Response.json({ error: "AI binding not found", details: "env.AI undefined" }, { status: 500 });

        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...(Array.isArray(history) ? history.slice(-10) : []),
          { role: "user", content: message }
        ];

        const result: any = await env.AI.run("@cf/meta/llama-3-8b-instruct" as any, {
          messages,
          max_tokens: 512
        });

        return Response.json({ reply: result.response || result.result || "Sorry, no response" });
      } catch (e: any) {
        return Response.json({ error: "Falha ao conectar com o professor", details: String(e?.message || e) }, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
} as ExportedHandler<Env>;
