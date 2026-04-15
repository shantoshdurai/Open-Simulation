import { useState } from 'react'
import Earth from './components/Earth.jsx'
import WorldBuilder from './components/WorldBuilder.jsx'
import World3D from './components/World3D.jsx'

export default function App() {
  const [config, setConfig] = useState({
    waterLevel: 0.55,
    worldSize: 0.5,
    population: 5,
    temperature: 0.5
  })
  const [stage, setStage] = useState('home') // 'home' | 'transitioning' | 'world'

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
