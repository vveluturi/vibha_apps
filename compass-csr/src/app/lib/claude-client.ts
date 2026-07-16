// Thin wrapper around the Anthropic Messages API, proxied through Vite's dev
// server (see vite.config.ts) so the API key never reaches the browser bundle.
export async function callClaude(system: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message ?? `API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText: string =
    data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("") ?? "";

  return rawText.trim();
}

export function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}
