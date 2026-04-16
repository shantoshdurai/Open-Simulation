import { useState } from 'react'

export default function TitleScreen({ onEnter }) {
  const [fading, setFading] = useState(false)

  const handleEnter = () => {
    setFading(true)
    setTimeout(onEnter, 800)
  }

  return (
    <div className={`title-screen ${fading ? 'fading' : ''}`}>
      <div className="title-content">
        <h1 className="title-main">Open Simulation</h1>
        <p className="title-sub">A living world with stories to tell</p>
        <div className="title-features">
          <span>40 unique NPCs</span>
          <span>Dynamic conversations</span>
          <span>Day & night cycle</span>
          <span>Seasonal changes</span>
        </div>
        <button className="enter-btn" onClick={handleEnter}>
          Enter World
        </button>
        <p className="title-hint">WASD to move &middot; Mouse to look &middot; E to talk</p>
      </div>
    </div>
  )
}
