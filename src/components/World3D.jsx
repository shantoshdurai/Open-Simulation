import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import Planet from './Planet.jsx'
import Player from './Player.jsx'
import NPC from './NPC.jsx'
import Sky from './Sky.jsx'
import ChatPanel from './ChatPanel.jsx'
import { generateNPC } from '../utils/personalities.js'
import { createNPCRegistry } from '../utils/registry.js'

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter']

export default function World3D({ config }) {
  const [cameraMode, setCameraMode] = useState('third')
  const [season, setSeason] = useState(1) // 0..3
  const [timeOfDay, setTimeOfDay] = useState(0.4)
  const [autoTime, setAutoTime] = useState(true)
  const [activeNPC, setActiveNPC] = useState(null)
  const [ready, setReady] = useState(false)

  const registry = useMemo(() => createNPCRegistry(), [])
  // Ref shared with NPCs so they read the latest time without re-rendering
  const timeRef = useRef(0.4)
  timeRef.current = timeOfDay

  const npcs = useMemo(() => {
    const count = Math.round(config.population)
    return Array.from({ length: count }, (_, i) => generateNPC(i + 1))
  }, [config.population])

  // Player appearance — first NPC's appearance, but distinct shirt
  const playerAppearance = useMemo(() => {
    const a = generateNPC(9999).appearance
    a.shirtColor = '#3a5a8a'
    return a
  }, [])

  // Auto day/night cycle (1 full day = 4 minutes)
  useEffect(() => {
    if (!autoTime) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setTimeOfDay(t => (t + dt / 240) % 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoTime])

  const handleInteract = (playerPos) => {
    const nearest = registry.findNearest(playerPos, 5)
    if (nearest) {
      setActiveNPC(nearest.npc)
      // Release pointer lock so chat is usable
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }

  const closeChat = () => setActiveNPC(null)

  const climateLabel = config.temperature < 0.33 ? 'Cold' : config.temperature < 0.66 ? 'Temperate' : 'Hot'
  const timeLabel = (() => {
    const hours = Math.floor(timeOfDay * 24)
    const mins = Math.floor((timeOfDay * 24 - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  })()

  const worldContext = {
    climate: climateLabel,
    season: SEASON_NAMES[Math.floor(season) % 4],
    timeOfDay: timeLabel
  }

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 250, 0], fov: 65, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
      >
        <Sky timeOfDay={timeOfDay} climate={climateLabel} planetRadius={200} />

        <SunLight timeOfDay={timeOfDay} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#bfd6f2', '#3a2a1a', 0.35]} />

        <Planet config={config} season={season} onReady={() => setReady(true)}>
          {(planet) => (
            <>
              <Player
                planet={planet}
                cameraMode={cameraMode}
                onCameraModeChange={setCameraMode}
                onInteract={handleInteract}
                isPaused={!!activeNPC}
                appearance={playerAppearance}
              />
              {npcs.map(n => (
                <NPC key={n.id} planet={planet} npc={n} registry={registry} timeRef={timeRef} />
              ))}
              <Ambient planet={planet} />
            </>
          )}
        </Planet>
      </Canvas>

      {!ready && (
        <div className="loading-screen">
          <div className="loading-text">Generating world…</div>
          <div className="loading-sub">Building terrain, placing trees, waking inhabitants</div>
        </div>
      )}

      <div className="world-hud">
        <div className="hud-title">World Active</div>
        <div className="stat"><span>Population</span><span>{Math.round(config.population)}</span></div>
        <div className="stat"><span>Climate</span><span>{climateLabel}</span></div>
        <div className="stat"><span>Season</span><span>{SEASON_NAMES[Math.floor(season) % 4]}</span></div>
        <div className="stat"><span>Time</span><span>{timeLabel}</span></div>
        <div className="stat"><span>Camera</span><span>{cameraMode === 'first' ? '1st Person' : '3rd Person'}</span></div>
      </div>

      <div className="world-controls">
        <div className="ctrl-row">
          <label>Season</label>
          <input
            type="range"
            min={0}
            max={3.99}
            step={0.01}
            value={season}
            onChange={e => setSeason(parseFloat(e.target.value))}
          />
        </div>
        <div className="ctrl-row">
          <label>
            Time
            <button className="ctrl-mini" onClick={() => setAutoTime(a => !a)}>
              {autoTime ? 'Auto' : 'Manual'}
            </button>
          </label>
          <input
            type="range"
            min={0}
            max={0.999}
            step={0.001}
            value={timeOfDay}
            onChange={e => { setTimeOfDay(parseFloat(e.target.value)); setAutoTime(false) }}
          />
        </div>
      </div>

      <div className="controls-hint">
        <div><b>Click</b> to lock mouse</div>
        <div><b>WASD</b> move &nbsp; <b>Shift</b> sprint &nbsp; <b>Space</b> jump</div>
        <div><b>Mouse</b> look &nbsp; <b>V</b> camera &nbsp; <b>E</b> talk to NPC &nbsp; <b>Esc</b> release</div>
      </div>

      {activeNPC && (
        <ChatPanel
          npc={activeNPC}
          onClose={closeChat}
          worldContext={worldContext}
        />
      )}
    </>
  )
}

// Ambient living-world: butterflies fluttering above the planet surface.
// Cheap — uses an InstancedMesh with simple sin-based motion.
function Ambient({ planet }) {
  const meshRef = useRef()
  const COUNT = 80

  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      // Spawn each butterfly at a random land point
      let dir = new THREE.Vector3(0, 1, 0)
      for (let j = 0; j < 30; j++) {
        const u = Math.random() * 2 - 1
        const theta = Math.random() * Math.PI * 2
        const r = Math.sqrt(1 - u * u)
        dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
        if (planet.isLand(dir.x, dir.y, dir.z) && Math.abs(dir.y) < 0.85) break
      }
      return {
        center: dir.clone(),
        radius: 1.5 + Math.random() * 2,
        speed: 0.5 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        height: 1 + Math.random() * 2,
        color: ['#ff8fbf', '#ffe45a', '#a8dafe', '#ffaa5a'][Math.floor(Math.random() * 4)]
      }
    })
  }, [planet])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3)
    seeds.forEach((s, i) => {
      const c = new THREE.Color(s.color)
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    })
    return arr
  }, [seeds])

  useEffect(() => {
    if (!meshRef.current) return
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
  }, [colors])

  useFrame((rs) => {
    if (!meshRef.current) return
    const t = rs.clock.elapsedTime
    seeds.forEach((s, i) => {
      // Local tangent frame at center
      const up = s.center
      const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, up).normalize()
      const fwd = new THREE.Vector3().crossVectors(up, right).normalize()
      const angle = t * s.speed + s.phase
      const offset = right.clone().multiplyScalar(Math.cos(angle) * s.radius)
        .addScaledVector(fwd, Math.sin(angle) * s.radius)
      const surface = up.clone().multiplyScalar(planet.surfaceRadius(up.x, up.y, up.z))
      const pos = surface.clone()
        .add(offset)
        .addScaledVector(up, s.height + Math.sin(t * 3 + s.phase) * 0.3)

      const upQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
      dummy.position.copy(pos)
      dummy.quaternion.copy(upQ)
      dummy.scale.setScalar(0.6 + Math.sin(t * 8 + s.phase) * 0.15)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[0.25, 0.06, 0.25]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}

// Directional light that follows the sun position
function SunLight({ timeOfDay }) {
  const lightRef = useRef()
  useFrame(() => {
    if (!lightRef.current) return
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2
    const dist = 600
    lightRef.current.position.set(Math.cos(sunAngle) * dist, Math.sin(sunAngle) * dist, 0)
    lightRef.current.target.position.set(0, 0, 0)
    lightRef.current.target.updateMatrixWorld()

    // Intensity falls off at night
    const above = Math.max(0, Math.sin(sunAngle))
    lightRef.current.intensity = 0.3 + above * 1.6
    // Color: warm at horizon, white at noon
    const warmth = 1 - Math.min(1, above * 1.5)
    const c = new THREE.Color('#fff5d6').lerp(new THREE.Color('#ff9a5a'), warmth * 0.6)
    lightRef.current.color.copy(c)
  })

  return (
    <directionalLight
      ref={lightRef}
      position={[400, 400, 0]}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-150}
      shadow-camera-right={150}
      shadow-camera-top={150}
      shadow-camera-bottom={-150}
      shadow-camera-near={1}
      shadow-camera-far={1500}
    />
  )
}
