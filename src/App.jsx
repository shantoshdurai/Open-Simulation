import { useState, useEffect } from 'react'
import Earth from './components/Earth.jsx'
import WorldBuilder from './components/WorldBuilder.jsx'
import World3D from './components/World3D.jsx'
import { setApiKey } from './utils/gemini.js'

// Pre-load the Gemini API key so users never need to enter it manually
const GEMINI_KEY = 'AIzaSyDlq0Lucv4FR439HME-0ipEA39Wo65sRzg'

export default function App() {
  const [config, setConfig] = useState({
    waterLevel: 0.48,
    worldSize: 0.6,
    population: 100,
    temperature: 0.5
  })
  const [stage, setStage] = useState('home') // 'home' | 'transitioning' | 'world'

  // Store API key on first load so Gemini chat works out of the box
  useEffect(() => {
    setApiKey(GEMINI_KEY)
  }, [])

  const handleCreate = () => {
    setStage('transitioning')
    setTimeout(() => setStage('world'), 900)
  }

  return (
    <div className="app">
      <div className={`homepage ${stage !== 'home' ? 'fading' : ''}`}>
        <div className="earth-stage">
          <div className="title-overlay">
            <h1>Open Simulation</h1>
            <p>Shape a world. Then watch it live.</p>
          </div>
          <Earth config={config} />
        </div>
        <WorldBuilder
          config={config}
          onChange={setConfig}
          onCreate={handleCreate}
        />
      </div>

      <div className={`world-scene ${stage === 'world' ? 'active' : ''}`}>
        {stage === 'world' && <World3D config={config} />}
      </div>
    </div>
  )
}
