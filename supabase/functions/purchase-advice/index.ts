declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const GEMINI_TIMEOUT_MS = 15_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AdviceFacts = {
  title: string;
  summary: string;
  actions: string[];
  dataAsOf: string | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey)
    return jsonResponse({ error: "AI service is not configured" }, 503);

  let facts: AdviceFacts;
  try {
    const body = await request.json();
    facts = body.facts;
    if (
      !facts ||
      typeof facts.title !== "string" ||
      typeof facts.summary !== "string" ||
      !Array.isArray(facts.actions) ||
      facts.actions.some((action) => typeof action !== "string")
    ) {
      return jsonResponse({ error: "Invalid advice facts" }, 400);
    }
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "당신은 한국의 장보기 가격 조언 도우미입니다.",
                "입력된 계산 결과만 사용해 친절하고 간결한 한국어로 설명하세요.",
                "가격, 비율, 날짜, 상품명, 판매점명은 절대 변경하거나 새로 만들지 마세요.",
                "미래 가격을 예측하지 말고 확정적인 절약을 보장하지 마세요.",
                "조사일이 지난 데이터일 수 있으므로 실제 매장 가격 확인을 안내하세요.",
              ].join(" "),
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(facts) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              actions: { type: "array", items: { type: "string" } },
            },
            required: ["title", "summary", "actions"],
            additionalProperties: false,
          },
          maxOutputTokens: 1024,
        },
      }),
    },
  ).catch((error: unknown) => {
    console.error("Gemini request timed out or failed", model, error);
    return null;
  });
  if (!geminiResponse) {
    return jsonResponse({ error: "AI request timed out" }, 504);
  }

  let responseBody: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    responseBody = await geminiResponse.json();
  } catch {
    console.error("Gemini returned a non-JSON response", geminiResponse.status);
    return jsonResponse({ error: "AI advice generation failed" }, 502);
  }
  if (!geminiResponse.ok) {
    console.error("Gemini request failed", geminiResponse.status, responseBody);
    return jsonResponse({ error: "AI advice generation failed" }, 502);
  }

  const outputText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!outputText) return jsonResponse({ error: "AI returned no text" }, 502);

  try {
    return jsonResponse({ advice: JSON.parse(outputText) });
  } catch {
    return jsonResponse({ error: "AI returned invalid JSON" }, 502);
  }
});
