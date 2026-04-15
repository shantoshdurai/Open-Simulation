import { useState, useEffect, useRef } from 'react'
import { chatWithGemini, hasApiKey, setApiKey, getApiKey } from '../utils/gemini.js'
import { buildSystemPrompt } from '../utils/personalities.js'

export default function ChatPanel({ npc, onClose, worldContext }) {
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [needsKey, setNeedsKey] = useState(!hasApiKey())
  const [keyInput, setKeyInput] = useState(getApiKey())
  const inputRef = useRef()
  const scrollRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [npc])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveKey = () => {
    if (!keyInput.trim()) return
    setApiKey(keyInput)
    setNeedsKey(false)
  }

  const send = async () => {
    if (!input.trim() || busy) return
    const userMsg = input.trim()
    setInput('')
    setBusy(true)
    setError(null)
    const newHistory = [...history, { role: 'user', text: userMsg }]
    setHistory(newHistory)

    try {
      const systemPrompt = buildSystemPrompt(npc, worldContext)
      const reply = await chatWithGemini({
        systemPrompt,
        history: newHistory.slice(0, -1),
        userMessage: userMsg
      })
      setHistory([...newHistory, { role: 'npc', text: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="chat-overlay">
      <div className="chat-panel" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div>
            <div className="chat-name">{npc.name}</div>
            <div className="chat-sub">{npc.age} • {npc.job} • {npc.mood}</div>
            <div className="chat-traits">{npc.traits.join(' · ')}</div>
          </div>
          <button className="chat-close" onClick={onClose}>×</button>
        </div>

        {needsKey ? (
          <div className="chat-keyform">
            <p>To talk to NPCs, paste a free Gemini API key.</p>
            <p className="chat-keyhint">
              Get one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
            </p>
            <input
              type="password"
              placeholder="AIza..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
            />
            <button onClick={saveKey}>Save & Talk</button>
            <p className="chat-keyhint">Stored only in your browser's localStorage.</p>
          </div>
        ) : (
          <>
            <div className="chat-body" ref={scrollRef}>
              {history.length === 0 && (
                <div className="chat-empty">Say hello to {npc.firstName}.</div>
              )}
              {history.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  <div className="chat-msg-label">{m.role === 'user' ? 'You' : npc.firstName}</div>
                  <div className="chat-msg-text">{m.text}</div>
                </div>
              ))}
              {busy && <div className="chat-msg npc"><div className="chat-msg-text">…</div></div>}
              {error && <div className="chat-error">{error}</div>}
            </div>

            <div className="chat-input">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Say something to ${npc.firstName}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                disabled={busy}
              />
              <button onClick={send} disabled={busy || !input.trim()}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
