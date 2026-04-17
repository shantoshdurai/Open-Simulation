// Direct browser → Gemini Flash API client.
// Stores key in localStorage. Free tier: 1500 req/day on gemini-2.0-flash.

const STORAGE_KEY = 'opensim_gemini_key'
// gemini-2.0-flash-lite: fastest, cheapest, ~10x lower quota consumption than flash
// Perfect for short NPC dialogue (max 80 tokens)
const MODEL = 'gemini-2.0-flash-lite'

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

export function hasApiKey() {
  return !!getApiKey()
}

// Only send the most recent turns to Gemini. Older history doesn't change the
// reply much and uses input tokens every call. 6 turns = 3 exchanges back.
const HISTORY_WINDOW = 6

export async function chatWithGemini({ systemPrompt, history, userMessage }) {
  const key = getApiKey()
  if (!key) throw new Error('No Gemini API key set')

  const trimmed = history.slice(-HISTORY_WINDOW)
  const contents = []
  trimmed.forEach(h => {
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
      temperature: 0.85,
      maxOutputTokens: 60,
      topP: 0.92
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text()
    // For quota errors give a clear message
    if (res.status === 429) {
      throw new Error('Daily quota reached — get a new free key at aistudio.google.com/apikey')
    }
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 160)}`)
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!reply) throw new Error('Gemini returned no text')
  return reply
}
