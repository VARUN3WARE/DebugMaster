const DEFAULT_ENDPOINT =
  import.meta.env.VITE_LLM_ENDPOINT ||
  'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4o-mini';

export const requestHint = async ({ apiKey, challenge, code }) => {
  if (!apiKey) {
    throw new Error('Missing API key. Add one to request a hint.');
  }

  const response = await fetch(DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You are a debugging mentor. Explain why the bug happens, avoid giving the exact fix or code changes.',
        },
        {
          role: 'user',
          content: `Challenge: ${challenge.title}\nBug: ${challenge.description}\nHint request: ${challenge.hint}\n\nCode:\n${code}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hint request failed: ${errorText}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content?.trim();

  if (!message) {
    throw new Error('No hint returned from the API.');
  }

  return message;
};
