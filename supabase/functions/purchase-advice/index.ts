declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function readOutputText(response: Record<string, unknown>): string | null {
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object' || !('content' in item)) continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        'type' in part &&
        part.type === 'output_text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text;
      }
    }
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'AI service is not configured' }, 503);

  let facts: AdviceFacts;
  try {
    const body = await request.json();
    facts = body.facts;
    if (
      !facts ||
      typeof facts.title !== 'string' ||
      typeof facts.summary !== 'string' ||
      !Array.isArray(facts.actions) ||
      facts.actions.some((action) => typeof action !== 'string')
    ) {
      return jsonResponse({ error: 'Invalid advice facts' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-6-luna',
      store: false,
      reasoning: { effort: 'none' },
      instructions: [
        '당신은 한국의 장보기 가격 조언 도우미입니다.',
        '입력된 계산 결과만 사용해 친절하고 간결한 한국어로 설명하세요.',
        '가격, 비율, 날짜, 상품명, 판매점명은 절대 변경하거나 새로 만들지 마세요.',
        '미래 가격을 예측하지 말고 확정적인 절약을 보장하지 마세요.',
        '조사일이 지난 데이터일 수 있으므로 실제 매장 가격 확인을 안내하세요.',
      ].join(' '),
      input: JSON.stringify(facts),
      max_output_tokens: 500,
      text: {
        format: {
          type: 'json_schema',
          name: 'purchase_advice',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              actions: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'summary', 'actions'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const responseBody = (await openAIResponse.json()) as Record<string, unknown>;
  if (!openAIResponse.ok) {
    console.error('OpenAI request failed', openAIResponse.status, responseBody);
    return jsonResponse({ error: 'AI advice generation failed' }, 502);
  }

  const outputText = readOutputText(responseBody);
  if (!outputText) return jsonResponse({ error: 'AI returned no text' }, 502);

  try {
    return jsonResponse({ advice: JSON.parse(outputText) });
  } catch {
    return jsonResponse({ error: 'AI returned invalid JSON' }, 502);
  }
});

