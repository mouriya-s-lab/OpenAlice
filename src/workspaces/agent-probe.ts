/**
 * Per-workspace AI provider probes — used by the Workspace AI config modal's
 * Test button. Sends a minimal "Hi" prompt to verify baseUrl + apiKey + model
 * end-to-end. Returns the model's reply text on success so the UI can show
 * "the AI actually spoke back."
 *
 * Lives in `src/workspaces/` rather than inlined in the route so future
 * surfaces (Telegram /workspace test, CLI) can reuse the same probe.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface ProbeResult {
  text: string;
}

export interface ClaudeProbeInput {
  baseUrl: string;
  apiKey: string;
  model: string;
  /**
   * Which HTTP header carries the key. `x-api-key` is Anthropic's first-party
   * standard (the default); `bearer` sends `Authorization: Bearer <key>`,
   * which is what most anthropic-compatible *gateways* expect (MiniMax's
   * international endpoint, OpenRouter-style proxies, etc.). Mirrors the
   * ANTHROPIC_API_KEY vs ANTHROPIC_AUTH_TOKEN split the real session uses.
   */
  authMode?: 'x-api-key' | 'bearer';
}

export interface CodexProbeInput {
  baseUrl: string;
  apiKey: string;
  model: string;
  wireApi: 'chat' | 'responses';
}

export async function probeAnthropic(input: ClaudeProbeInput): Promise<ProbeResult> {
  // `authToken` makes the SDK send `Authorization: Bearer`; `apiKey` makes it
  // send `x-api-key`. Pick exactly one — sending both can trip gateways that
  // reject ambiguous auth, and Anthropic's own API now 401s OAuth-via-Bearer.
  const client = input.authMode === 'bearer'
    ? new Anthropic({ authToken: input.apiKey, baseURL: input.baseUrl })
    : new Anthropic({ apiKey: input.apiKey, baseURL: input.baseUrl });
  const msg = await client.messages.create({
    model: input.model,
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Hi' }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { text };
}

export async function probeOpenAI(input: CodexProbeInput): Promise<ProbeResult> {
  const client = new OpenAI({ apiKey: input.apiKey, baseURL: input.baseUrl });
  if (input.wireApi === 'responses') {
    const resp = await client.responses.create({
      model: input.model,
      input: 'Hi',
      max_output_tokens: 32,
    });
    return { text: resp.output_text ?? '' };
  }
  const resp = await client.chat.completions.create({
    model: input.model,
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 32,
  });
  return { text: resp.choices[0]?.message?.content ?? '' };
}
