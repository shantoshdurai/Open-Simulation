import { useState, useEffect, useRef } from 'react'
import { chatWithGemini, getApiKey } from '../utils/gemini.js'
import { buildSystemPrompt } from '../utils/personalities.js'

export default function ChatPanel({ npc, onClose, worldContext }) {
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [minimized, setMinimized] = useState(false)
  const inputRef = useRef()
  const scrollRef = useRef()

  useEffect(() => {
    if (!minimized) setTimeout(() => inputRef.current?.focus(), 50)
  }, [npc, minimized])

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
    <div className="chat-hud" onClick={(e) => e.stopPropagation()}>
      {/* NPC identity bar */}
      <div className="chat-hud-header">
        <div className="chat-hud-identity">
          <span className="chat-hud-name">{npc.name}</span>
          <span className="chat-hud-meta">{npc.age} · {npc.job} · {npc.mood}</span>
          {npc.activeGoals && !minimized && (
            <span className="chat-hud-goal">{npc.activeGoals[0]}</span>
          )}
        </div>
        <div className="chat-hud-actions">
          <button className="chat-hud-btn" onClick={() => setMinimized(m => !m)} title={minimized ? 'Expand' : 'Minimize'}>
            {minimized ? '▲' : '▼'}
          </button>
          <button className="chat-hud-btn chat-hud-close" onClick={onClose} title="Close (Esc)">×</button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Conversation history */}
          <div className="chat-hud-body" ref={scrollRef}>
            {history.length === 0 && (
              <div className="chat-hud-empty">Press Enter to speak with {npc.firstName}</div>
            )}
            {history.map((m, i) => (
              <div key={i} className={`chat-hud-line ${m.role}`}>
                <span className="chat-hud-who">{m.role === 'user' ? 'You' : npc.firstName}</span>
                <span className="chat-hud-text">{m.text}</span>
              </div>
            ))}
            {busy && (
              <div className="chat-hud-line npc">
                <span className="chat-hud-who">{npc.firstName}</span>
                <span className="chat-hud-text chat-hud-thinking">
                  <span className="dot">·</span><span className="dot">·</span><span className="dot">·</span>
                </span>
              </div>
            )}
            {error && <div className="chat-hud-error">{error}</div>}
          </div>

          {/* Input row */}
          <div className="chat-hud-input">
            <input
              ref={inputRef}
              type="text"
              placeholder={`Speak to ${npc.firstName}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={busy}
              autoComplete="off"
            />
            <button onClick={send} disabled={busy || !input.trim()}>↵</button>
          </div>
        </>
      )}
    </div>
  )
}
