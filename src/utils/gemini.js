// Direct browser → Gemini Flash API client.
// Stores key in localStorage. Free tier: 1500 req/day on gemini-2.0-flash.

const STORAGE_KEY = 'opensim_gemini_key'
const MODEL = 'gemini-2.0-flash'

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

export function hasApiKey() {
  return !!getApiKey()
}

export async function chatWithGemini({ systemPrompt, history, userMessage }) {
  const key = getApiKey()
  if (!key) throw new Error('No Gemini API key set')

  // Gemini contents format: array of {role, parts}
  const contents = []
  history.forEach(h => {
    contents.push({
      role: h.role === 'npc' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })
  })
  contents.push({ role: 'user', parts: [{ text: userMessage }] })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 120,
      topP: 0.95
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!reply) throw new Error('Gemini returned no text')
  return reply
}
