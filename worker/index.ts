
export interface Env {
  AI: any;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const SYSTEM_PROMPT = `
You are ProfIA, a friendly English teacher.

Rules:
- Teach English to Brazilian students.
- Use simple, clear English.
- Explain in Portuguese when necessary.
- Correct mistakes gently.
- Teach vocabulary, grammar and conversation.
- Keep answers short and interactive.
- Ask the student's English level when appropriate.
- Never leave the student without a helpful response.
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "online",
        ai: !!env.AI,
        model: MODEL
      });
    }

    if (
      url.pathname === "/api/chat" &&
      request.method === "POST"
    ) {
      try {
        if (!env.AI) {
          return Response.json(
            { error: "AI binding not configured" },
            { status: 500 }
          );
        }

        const body: any = await request.json();

        const message = body.message;

        if (
          typeof message !== "string" ||
          !message.trim()
        ) {
          return Response.json(
            { error: "Please send a message." },
            { status: 400 }
          );
        }

        const history = Array.isArray(body.history)
          ? body.history
              .filter((item: any) =>
                ["user", "assistant"].includes(item?.role) &&
                typeof item?.content === "string"
              )
              .slice(-10)
          : [];

        const messages = [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          ...history,
          {
            role: "user",
            content: message.trim()
          }
        ];

        const result = await env.AI.run(MODEL, {
          messages,
          max_tokens: 512
        });

        const reply =
          result?.response ||
          result?.result?.response ||
          result?.result ||
          result?.output;

        if (!reply || typeof reply !== "string") {
          return Response.json(
            { error: "The AI returned an empty response." },
            { status: 502 }
          );
        }

        return Response.json({
          reply,
          model: MODEL
        });

      } catch (error: any) {
        return Response.json(
          {
            error:
              "ProfIA connection error: " +
              (error?.message || String(error))
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
} as ExportedHandler<Env>;
      
