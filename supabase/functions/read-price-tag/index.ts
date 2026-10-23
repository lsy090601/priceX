declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

// 가격표 사진을 Gemini 로 읽어서 식재료 이름, 가격, 중량/수량, 단위를 돌려줍니다.
const GEMINI_TIMEOUT_MS = 25_000;
// 사진을 base64 로 보내므로, 너무 큰 사진은 거절합니다. (약 4MB)
const MAX_BASE64_LENGTH = 5_600_000;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_UNITS = ["g", "kg", "개", "포기", "단", "봉지", "ml", "L"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Reading = {
  name: string | null;
  price: number | null;
  amount: number | null;
  unit: string | null;
};

/** 모델이 돌려준 값을 앱에서 쓸 수 있는 값으로 정리합니다. 읽지 못한 값은 null 입니다. */
function normalize(raw: unknown): Reading {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim().slice(0, 40)
      : null;
  const price =
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price > 0 &&
    value.price <= 10_000_000
      ? Math.round(value.price)
      : null;
  const amount =
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    value.amount <= 100_000
      ? value.amount
      : null;
  const unit =
    typeof value.unit === "string" && ALLOWED_UNITS.includes(value.unit)
      ? value.unit
      : null;
  return { name, price, amount, unit };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey)
    return jsonResponse({ error: "AI service is not configured" }, 503);

  let imageBase64: string;
  let mimeType: string;
  try {
    const body = await request.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";
    if (typeof imageBase64 !== "string" || imageBase64.length === 0)
      return jsonResponse({ error: "imageBase64 is required" }, 400);
    if (imageBase64.length > MAX_BASE64_LENGTH)
      return jsonResponse({ error: "Image is too large" }, 413);
    if (!ALLOWED_MIME.includes(mimeType))
      return jsonResponse({ error: "Unsupported image type" }, 400);
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
                "당신은 한국 마트의 가격표 사진을 읽는 도우미입니다.",
                "사진에 보이는 식재료 하나의 이름, 판매 가격(원), 중량 또는 수량, 단위를 읽으세요.",
                "단위는 g, kg, 개, 포기, 단, 봉지, ml, L 중 하나여야 합니다. 100g당 가격처럼 기준 단위만 적혀 있으면 그 기준을 amount 와 unit 으로 쓰세요.",
                "가격은 실제 판매가 숫자만 적고, 사진에 없거나 확실하지 않은 값은 지어내지 말고 null 로 두세요.",
              ].join(" "),
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: "이 가격표에서 식재료 정보를 읽어주세요." },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              name: { type: ["string", "null"] },
              price: { type: ["number", "null"] },
              amount: { type: ["number", "null"] },
              unit: { type: ["string", "null"] },
            },
            required: ["name", "price", "amount", "unit"],
            additionalProperties: false,
          },
          maxOutputTokens: 512,
        },
      }),
    },
  ).catch((error: unknown) => {
    console.error("Gemini request timed out or failed", model, error);
    return null;
  });
  if (!geminiResponse) return jsonResponse({ error: "AI request timed out" }, 504);

  let responseBody: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    responseBody = await geminiResponse.json();
  } catch {
    console.error("Gemini returned a non-JSON response", geminiResponse.status);
    return jsonResponse({ error: "Price tag reading failed" }, 502);
  }
  if (!geminiResponse.ok) {
    console.error("Gemini request failed", geminiResponse.status, responseBody);
    return jsonResponse({ error: "Price tag reading failed" }, 502);
  }

  const outputText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!outputText) return jsonResponse({ error: "AI returned no text" }, 502);

  try {
    return jsonResponse({ reading: normalize(JSON.parse(outputText)) });
  } catch {
    return jsonResponse({ error: "AI returned invalid JSON" }, 502);
  }
});
