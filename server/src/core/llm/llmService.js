/**
 * llmService.js — Real LLM interpretation pipeline
 * Strictly complies with BUP CSE Fest 2026 Problem Statement Specification
 */

const { z } = require('zod');

// ── Exact Six Directive Schemas per BUP Specification ──────────────────────────
const SolarReductionAdjustment = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  factor: z.number().min(0).max(1),
});

const MinimumBatteryReserveAdjustment = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  minimum_energy_kwh: z.number().min(0),
});

const NoChargeWindowAdjustment = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
});

const NoDischargeWindowAdjustment = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
});

const MaxGridWindowAdjustment = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  max_grid_kwh: z.number().min(0),
});

const DirectiveSchema = z.object({
  note_index: z.number().int().min(0),
  applies: z.boolean(),
  directive_type: z.enum([
    'solar_reduction',
    'minimum_battery_reserve',
    'no_charge_window',
    'no_discharge_window',
    'max_grid_window',
    'no_op',
  ]),
  structured_adjustment: z.union([
    SolarReductionAdjustment,
    MinimumBatteryReserveAdjustment,
    NoChargeWindowAdjustment,
    NoDischargeWindowAdjustment,
    MaxGridWindowAdjustment,
    z.null(),
  ]),
  explanation: z.string(),
}).refine((d) => {
  if (!d.applies) {
    return d.directive_type === 'no_op' && d.structured_adjustment === null;
  }
  if (d.directive_type === 'solar_reduction') {
    return d.structured_adjustment && 'factor' in d.structured_adjustment && 'hours' in d.structured_adjustment;
  }
  if (d.directive_type === 'minimum_battery_reserve') {
    return d.structured_adjustment && 'minimum_energy_kwh' in d.structured_adjustment && 'hours' in d.structured_adjustment;
  }
  if (d.directive_type === 'no_charge_window') {
    return d.structured_adjustment && 'hours' in d.structured_adjustment;
  }
  if (d.directive_type === 'no_discharge_window') {
    return d.structured_adjustment && 'hours' in d.structured_adjustment;
  }
  if (d.directive_type === 'max_grid_window') {
    return d.structured_adjustment && 'max_grid_kwh' in d.structured_adjustment && 'hours' in d.structured_adjustment;
  }
  return true;
}, {
  message: 'Invalid structured_adjustment for directive_type per BUP CSE Fest specification',
});

const LLMResponseSchema = z.array(DirectiveSchema);

// ── System Prompt adhering strictly to BUP CSE Fest 2026 ────────────────────────
function buildSystemPrompt() {
  return `You are GridWise, an expert AI energy management system. Your ONLY job is to interpret human operator notes into structured machine directives according to the BUP CSE Fest 2026 Problem Statement.

EXACT SIX DIRECTIVE SCHEMAS:
1. solar_reduction:
   When solar availability is reduced by a factor (0.0 to 1.0) over specific hours.
   "hours": array of affected hours (0-23). If note applies to whole day, use all 24 hours [0, 1, ..., 23].
   "factor": fraction remaining (e.g. "reduce by 20%" -> factor is 0.8; "reduce by 50%" -> factor is 0.5).
   Schema: { "hours": [number], "factor": number }

2. minimum_battery_reserve:
   Ensures battery maintains a minimum energy reserve in kWh over specific hours.
   "hours": array of affected hours (0-23). If whole day, use all 24 hours [0, 1, ..., 23].
   "minimum_energy_kwh": number >= 0.
   Schema: { "hours": [number], "minimum_energy_kwh": number }

3. no_charge_window:
   Battery charging is disallowed during specific hours.
   "hours": array of restricted hours (0-23).
   Schema: { "hours": [number] }

4. no_discharge_window:
   Battery discharging is disallowed during specific hours.
   "hours": array of restricted hours (0-23).
   Schema: { "hours": [number] }

5. max_grid_window:
   Caps maximum grid import in kWh during specific hours.
   "hours": array of affected hours (0-23).
   "max_grid_kwh": number >= 0.
   Schema: { "hours": [number], "max_grid_kwh": number }

6. no_op:
   The operator note does not affect energy optimization or constraints.
   "structured_adjustment": null, "applies": false.

TIME SEMANTICS (CRITICAL - START-INCLUSIVE, END-EXCLUSIVE):
- "2 PM to 4 PM" -> hours: [14, 15]  (14 is 2 PM, 15 is 3 PM; 16 is 4 PM and is EXCLUDED)
- "1 PM to 3 PM" -> hours: [13, 14]
- "Midnight to 6 AM" -> hours: [0, 1, 2, 3, 4, 5]
- "5 PM to 9 PM" -> hours: [17, 18, 19, 20]
- "before noon" -> hours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

OUTPUT FORMAT:
Respond with ONLY a valid JSON array matching the number of notes:
[
  {
    "note_index": 0,
    "applies": true,
    "directive_type": "no_charge_window",
    "structured_adjustment": { "hours": [14, 15] },
    "explanation": "Battery charging prohibited between 2 PM and 4 PM."
  }
]

RULES:
- Output EXACTLY one directive per note, with note_index matching 0, 1, 2.
- If applies=false, directive_type MUST be "no_op" and structured_adjustment MUST be null.
- Do NOT optimize or calculate schedules or costs.
- Do NOT invent hours or values not in the note.`;
}

function buildUserPrompt(notes) {
  const listed = notes.map((n, i) => `Note ${i}: "${n}"`).join('\n');
  return `Interpret these operator notes:\n${listed}\n\nRespond with ONLY the JSON array.`;
}

// ── Provider Execution ────────────────────────────────────────────────────────
async function callOpenAI(notes, apiKey, model = 'gpt-4o-mini') {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(notes) },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content;
  let parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    parsed = key ? parsed[key] : [];
  }
  return parsed;
}

async function callGemini(notes, apiKey, model = 'gemini-3.6-flash') {
  const prompt = buildSystemPrompt() + '\n\n' + buildUserPrompt(notes);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
    let parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
      parsed = key ? parsed[key] : [parsed];
    }
    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Stub fallback per BUP specification ───────────────────────────────────────
function stubInterpret(notes) {
  return notes.map((note, i) => {
    const lower = note.toLowerCase();

    // Check no_charge_window
    const noChargeMatch = lower.match(/no\s+charg|do\s+not\s+charge|don't\s+charge/);
    if (noChargeMatch) {
      const pmMatch = lower.match(/(\d+)\s*(?:pm)?\s*(?:to|-)\s*(\d+)\s*pm/);
      let hours = [14, 15]; // default 2 PM - 4 PM
      if (pmMatch) {
        let start = parseInt(pmMatch[1], 10);
        let end = parseInt(pmMatch[2], 10);
        if (start < 12) start += 12;
        if (end < 12) end += 12;
        hours = Array.from({ length: end - start }, (_, idx) => start + idx);
      }
      return {
        note_index: i,
        applies: true,
        directive_type: 'no_charge_window',
        structured_adjustment: { hours },
        explanation: `Battery charging disabled during hours ${hours.join(', ')}.`,
      };
    }

    // Check no_discharge_window
    const noDischargeMatch = lower.match(/no\s+discharg|do\s+not\s+discharge|don't\s+discharge/);
    if (noDischargeMatch) {
      let hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // default before noon
      return {
        note_index: i,
        applies: true,
        directive_type: 'no_discharge_window',
        structured_adjustment: { hours },
        explanation: `Battery discharging disabled during specified hours.`,
      };
    }

    // Check minimum_battery_reserve
    const reserveMatch = lower.match(/(?:at\s+least|reserve|keep|maintain)\s*(\d+)\s*(?:kwh)?/);
    if (reserveMatch) {
      const reserve = parseFloat(reserveMatch[1]);
      return {
        note_index: i,
        applies: true,
        directive_type: 'minimum_battery_reserve',
        structured_adjustment: { hours: Array.from({ length: 24 }, (_, h) => h), minimum_energy_kwh: reserve },
        explanation: `Maintain minimum battery reserve of ${reserve} kWh.`,
      };
    }

    // Check solar_reduction
    const solarMatch = lower.match(/reduc.*solar.*(\d+)%/);
    if (solarMatch) {
      const pct = parseFloat(solarMatch[1]);
      const factor = (100 - pct) / 100;
      return {
        note_index: i,
        applies: true,
        directive_type: 'solar_reduction',
        structured_adjustment: { hours: Array.from({ length: 24 }, (_, h) => h), factor },
        explanation: `Reduce solar availability by ${pct}% (factor: ${factor}).`,
      };
    }

    // Default safe no_op
    return {
      note_index: i,
      applies: false,
      directive_type: 'no_op',
      structured_adjustment: null,
      explanation: 'Note does not affect mathematical optimization constraints.',
    };
  });
}

function applyGuardrails(directives, noteCount) {
  const result = [];
  for (let i = 0; i < noteCount; i++) {
    const d = directives.find((x) => x.note_index === i);
    if (!d) {
      result.push({
        note_index: i,
        applies: false,
        directive_type: 'no_op',
        structured_adjustment: null,
        explanation: 'No directive generated for this note.',
      });
    } else {
      result.push(d);
    }
  }
  return result;
}

// ── Main interpretNotes ───────────────────────────────────────────────────────
async function interpretNotes(notes) {
  if (!notes || notes.length === 0) return [];

  const geminiKey = process.env.GEMINI_API_KEY;
  const genericKey = process.env.LLM_API_KEY;
  const configuredProvider = (process.env.LLM_PROVIDER || (geminiKey ? 'gemini' : 'openai')).toLowerCase();

  let apiKey = genericKey;
  let provider = configuredProvider;
  if (provider === 'gemini') {
    apiKey = geminiKey || genericKey;
  }

  const model = process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini');

  if (!apiKey || apiKey === 'your_llm_api_key_here' || apiKey === 'your_openai_or_gemini_api_key_here') {
    const stub = stubInterpret(notes);
    return applyGuardrails(stub, notes.length);
  }

  let rawDirectives;
  try {
    if (provider === 'gemini') {
      rawDirectives = await callGemini(notes, apiKey, model);
    } else {
      rawDirectives = await callOpenAI(notes, apiKey, model);
    }
  } catch (err) {
    console.warn('[llm] Provider call failed, falling back to deterministic parser:', err.message);
    const stub = stubInterpret(notes);
    return applyGuardrails(stub, notes.length);
  }

  // Validate with Zod schema
  const validation = LLMResponseSchema.safeParse(rawDirectives);
  if (!validation.success) {
    console.warn('[llm] Zod validation failed, falling back to deterministic parser:', validation.error.message);
    const stub = stubInterpret(notes);
    return applyGuardrails(stub, notes.length);
  }

  return applyGuardrails(validation.data, notes.length);
}

module.exports = {
  interpretNotes,
  DirectiveSchema,
  LLMResponseSchema,
  SolarReductionAdjustment,
  MinimumBatteryReserveAdjustment,
  NoChargeWindowAdjustment,
  NoDischargeWindowAdjustment,
  MaxGridWindowAdjustment,
};
