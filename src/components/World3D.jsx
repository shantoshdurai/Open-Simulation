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
import { createEventScheduler, tickEventScheduler } from '../utils/worldEvents.js'

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter']

export default function World3D({ config }) {
  const [cameraMode, setCameraMode] = useState('third')
  const [season, setSeason] = useState(1)
  const [timeOfDay, setTimeOfDay] = useState(0.4)
  const [autoTime, setAutoTime] = useState(true)
  const [activeNPC, setActiveNPC] = useState(null)
  const [ready, setReady] = useState(false)

  const registry = useMemo(() => createNPCRegistry(), [])
  // Shared brain storage: npc.id -> brain. Lives outside components so brains
  // survive remounts and all NPCs can exchange facts through the registry.
  const brainBank = useMemo(() => new Map(), [])
  const timeRef = useRef(0.4)
  timeRef.current = timeOfDay

  const npcs = useMemo(() => {
    const count = Math.round(config.population)
    return Array.from({ length: count }, (_, i) => generateNPC(i + 1))
  }, [config.population])

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

  // Evenly spread NPCs across villages, with a modest bias toward the spawn
  // village (index 0) so the starting area feels populated without a pileup.
  const assignNPCsToVillages = (villages) => {
    if (!villages || villages.length === 0) return npcs.map(n => ({ npc: n, village: null }))
    const weights = villages.map((_, i) => (i === 0 ? 2 : 1))
    const totalW = weights.reduce((a, b) => a + b, 0)
    return npcs.map((n, i) => {
      // Weighted round-robin
      const r = (i / npcs.length) * totalW
      let acc = 0
      for (let v = 0; v < villages.length; v++) {
        acc += weights[v]
        if (r < acc) return { npc: n, village: villages[v] }
      }
      return { npc: n, village: villages[villages.length - 1] }
    })
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
          {(planet, villages) => {
            const assignments = assignNPCsToVillages(villages)
            return (
              <>
                <Player
                  planet={planet}
                  cameraMode={cameraMode}
                  onCameraModeChange={setCameraMode}
                  onInteract={handleInteract}
                  isPaused={!!activeNPC}
                  appearance={playerAppearance}
                  spawnVillage={villages?.[0]}
                />
                {assignments.map(({ npc: n, village }) => (
                  <NPC
                    key={n.id}
                    planet={planet}
                    npc={n}
                    registry={registry}
                    timeRef={timeRef}
                    village={village}
                    season={SEASON_NAMES[Math.floor(season) % 4]}
                    brainBank={brainBank}
                  />
                ))}
                <EventTicker registry={registry} npcs={npcs} />
                <Ambient planet={planet} />
                <Fish planet={planet} />
                <SnowParticles planet={planet} />
                <OceanMist planet={planet} />
                <Fireflies planet={planet} timeRef={timeRef} villages={villages} />
                <DesertDust planet={planet} />
              </>
            )
          }}
        </Planet>
      </Canvas>

      {!ready && (
        <div className="loading-screen">
          <div className="loading-text">Generating world…</div>
          <div className="loading-sub">Building terrain, placing trees, waking inhabitants</div>
        </div>
      )}

      <div className="world-hud">
        <div className="hud-title">Open Simulation</div>
        <div className="stat"><span>Inhabitants</span><span>{Math.round(config.population)}</span></div>
        <div className="stat"><span>Climate</span><span>{climateLabel}</span></div>
        <div className="stat"><span>Season</span><span>{SEASON_NAMES[Math.floor(season) % 4]}</span></div>
        <div className="stat"><span>Time</span><span>{timeLabel}</span></div>
        <div className="stat"><span>Camera</span><span>{cameraMode === 'first' ? '1st' : '3rd'} Person</span></div>
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

// ── Event Ticker — periodically spawns world events (wolves, storms, babies,
// harvests, festivals, traders, strangers) and plants the fact into a random
// NPC. From there it propagates via conversations, so village news feels
// connected without any API calls.
function EventTicker({ registry, npcs }) {
  const sched = useRef(createEventScheduler())
  useFrame((_, dt) => {
    const clamped = Math.min(dt, 0.1)
    // Pull live brains/npc data out of the registry so we only seed into NPCs
    // that are actually mounted and ready.
    const entries = []
    for (const n of npcs) {
      const e = registry.get?.(n.id)
      if (e && e.brain) entries.push(e)
    }
    if (entries.length === 0) return
    const brains = entries.map(e => e.brain)
    const ev = tickEventScheduler(sched.current, clamped, entries, brains, registry, Math.random)
    if (ev) {
      const target = entries[ev.witnessIdx % entries.length]
      if (target && target.receiveFact) target.receiveFact(ev.fact)
    }
  })
  return null
}

// ── Butterflies ──
function Ambient({ planet }) {
  const meshRef = useRef()
  const COUNT = 80

  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
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
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.25, 0.06, 0.25]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}

// ── Fish ──
function Fish({ planet }) {
  const meshRef = useRef()
  const COUNT = 160

  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, () => {
      let dir = new THREE.Vector3(0, 1, 0)
      for (let j = 0; j < 30; j++) {
        const u = Math.random() * 2 - 1
        const theta = Math.random() * Math.PI * 2
        const r = Math.sqrt(1 - u * u)
        dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
        if (!planet.isLand(dir.x, dir.y, dir.z)) break
      }
      return {
        center: dir.clone(),
        radius: 3 + Math.random() * 6,
        speed: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        depth: planet.waterRadius - (1 + Math.random() * 3),
        color: ['#ff8fbf', '#44aaff', '#e0e0e0', '#ffaa5a'][Math.floor(Math.random() * 4)]
      }
    })
  }, [planet])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3)
    seeds.forEach((s, i) => {
      const c = new THREE.Color(s.color)
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
    })
    return arr
  }, [seeds])

  const geo = useMemo(() => new THREE.ConeGeometry(0.3, 1.2, 4).rotateX(Math.PI / 2), [])

  useEffect(() => {
    if (!meshRef.current) return
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
  }, [colors])

  useFrame((rs) => {
    if (!meshRef.current) return
    const t = rs.clock.elapsedTime
    seeds.forEach((s, i) => {
      const up = s.center
      const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, up).normalize()
      const fwd = new THREE.Vector3().crossVectors(up, right).normalize()
      const angle = t * s.speed + s.phase
      const offset = right.clone().multiplyScalar(Math.cos(angle) * s.radius)
        .addScaledVector(fwd, Math.sin(angle) * s.radius)
      const tangent = right.clone().multiplyScalar(-Math.sin(angle))
        .addScaledVector(fwd, Math.cos(angle)).normalize()
      const pos = up.clone().multiplyScalar(s.depth).add(offset)
      const wiggle = Math.sin(t * 10 + s.phase) * 0.2
      pos.addScaledVector(right, wiggle)

      const mat = new THREE.Matrix4()
      const Z = tangent.clone()
      const Y = up.clone()
      const X = Y.clone().cross(Z).normalize()
      Z.copy(X).cross(Y).normalize()
      mat.makeBasis(X, Y, Z)

      dummy.position.copy(pos)
      dummy.quaternion.setFromRotationMatrix(mat)
      dummy.scale.setScalar(0.7)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geo, undefined, COUNT]} frustumCulled={false}>
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}

// Helper: build tangent frame from a surface normal
function tangentFrame(up) {
  const ref   = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const right = new THREE.Vector3().crossVectors(ref, up).normalize()
  const fwd   = new THREE.Vector3().crossVectors(up, right).normalize()
  return { right, fwd }
}

// ── Snow Particles — float 1–20 units above surface, drift and fall ──
function SnowParticles({ planet }) {
  const meshRef = useRef()

  // Gather all snowy/tundra surface points first, then spawn particles above them
  const seeds = useMemo(() => {
    const out = []
    let attempts = 0
    while (out.length < 250 && attempts < 2500) {
      attempts++
      const u     = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const rr    = Math.sqrt(1 - u * u)
      const dir   = new THREE.Vector3(rr * Math.cos(theta), u, rr * Math.sin(theta))
      const biome = planet.sampleBiome(dir.x, dir.y, dir.z)
      if (biome !== 'snow' && biome !== 'tundra') continue
      // Store the EXACT ground radius so we can add height on top
      const surfR = planet.surfaceRadius(dir.x, dir.y, dir.z)
      out.push({
        dir:         dir.clone(),
        surfR,
        startHeight: 1 + Math.random() * 18,  // starts 1–18 units above ground
        fallSpeed:   0.25 + Math.random() * 0.35,
        driftSpeed:  0.04 + Math.random() * 0.08,
        phase:       Math.random() * Math.PI * 2
      })
    }
    return out
  }, [planet])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((rs) => {
    if (!meshRef.current || seeds.length === 0) return
    const t = rs.clock.elapsedTime
    seeds.forEach((s, i) => {
      const { right, fwd } = tangentFrame(s.dir)
      // Wrap height so flake resets above when it hits ground (startHeight cycles)
      const h    = s.surfR + ((s.startHeight - t * s.fallSpeed) % 18 + 18) % 18 + 0.5
      const dX   = Math.sin(t * s.driftSpeed * 1.4 + s.phase) * 2.5
      const dZ   = Math.cos(t * s.driftSpeed * 0.9 + s.phase) * 2.5
      dummy.position.copy(s.dir).multiplyScalar(h).addScaledVector(right, dX).addScaledVector(fwd, dZ)
      dummy.scale.setScalar(0.18)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (seeds.length === 0) return null
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
      <sphereGeometry args={[0.3, 4, 3]} />
      <meshBasicMaterial color="#e8f4ff" transparent opacity={0.85} />
    </instancedMesh>
  )
}

// ── Ocean Mist — rises from just above water level ──
function OceanMist({ planet }) {
  const meshRef = useRef()

  const seeds = useMemo(() => {
    const out = []
    let attempts = 0
    while (out.length < 120 && attempts < 1400) {
      attempts++
      const u     = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const rr    = Math.sqrt(1 - u * u)
      const dir   = new THREE.Vector3(rr * Math.cos(theta), u, rr * Math.sin(theta))
      const biome = planet.sampleBiome(dir.x, dir.y, dir.z)
      if (biome !== 'beach') continue
      out.push({
        dir:        dir.clone(),
        waterR:     planet.waterRadius,
        riseSpeed:  0.1 + Math.random() * 0.18,
        driftSpeed: 0.025 + Math.random() * 0.04,
        phase:      Math.random() * Math.PI * 2,
        startH:     Math.random() * 5   // stagger phases so not all sync
      })
    }
    return out
  }, [planet])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((rs) => {
    if (!meshRef.current || seeds.length === 0) return
    const t = rs.clock.elapsedTime
    seeds.forEach((s, i) => {
      const { right, fwd } = tangentFrame(s.dir)
      const rise = ((s.startH + t * s.riseSpeed) % 5)          // 0–5 units above water
      const h    = s.waterR + rise + 0.2
      const dX   = Math.sin(t * s.driftSpeed + s.phase) * 3.5
      const dZ   = Math.cos(t * s.driftSpeed * 0.7 + s.phase) * 3.5
      dummy.position.copy(s.dir).multiplyScalar(h).addScaledVector(right, dX).addScaledVector(fwd, dZ)
      const fadeIn = Math.min(1, rise)
      const fadeOut = 1 - rise / 5
      dummy.scale.setScalar((0.4 * fadeIn * fadeOut + 0.08) * 2.5)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (seeds.length === 0) return null
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 5, 4]} />
      <meshBasicMaterial color="#cce8f8" transparent opacity={0.28} />
    </instancedMesh>
  )
}

// ── Fireflies — hover 1–4 units above ground near villages ──
function Fireflies({ planet, timeRef, villages }) {
  const meshRef = useRef()
  const COUNT = 80

  const seeds = useMemo(() => {
    if (!villages || villages.length === 0) return []
    return Array.from({ length: COUNT }, (_, i) => {
      const village = villages[i % villages.length]
      const up      = village.center.clone().normalize()
      const { right, fwd } = tangentFrame(up)
      const angle  = Math.random() * Math.PI * 2
      const dist   = 4 + Math.random() * 22
      const offset = right.clone().multiplyScalar(Math.cos(angle) * dist)
        .addScaledVector(fwd, Math.sin(angle) * dist)
      const dir = up.clone().multiplyScalar(planet.radius).add(offset).normalize()
      // Pre-compute the exact surface radius at this spot
      const surfR = planet.surfaceRadius(dir.x, dir.y, dir.z)
      return {
        dir,
        surfR,
        speed:       0.25 + Math.random() * 0.45,
        phase:       Math.random() * Math.PI * 2,
        blinkSpeed:  1.5 + Math.random() * 3.5,
        hoverHeight: 1.2 + Math.random() * 2.8,   // 1–4 units ABOVE ground
        orbitR:      0.6 + Math.random() * 1.8
      }
    })
  }, [planet, villages])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((rs) => {
    if (!meshRef.current || seeds.length === 0) return
    const t    = rs.clock.elapsedTime
    const hour = (timeRef.current || 0.5) * 24
    const visible = hour >= 18.5 || hour < 5.5

    seeds.forEach((s, i) => {
      const { right, fwd } = tangentFrame(s.dir)
      const angle = t * s.speed + s.phase
      const h     = s.surfR + s.hoverHeight + Math.sin(t * 1.8 + s.phase) * 0.4
      dummy.position.copy(s.dir).multiplyScalar(h)
        .addScaledVector(right, Math.cos(angle) * s.orbitR)
        .addScaledVector(fwd,   Math.sin(angle) * s.orbitR)
      const blink = visible ? Math.max(0, Math.sin(t * s.blinkSpeed + s.phase)) : 0
      dummy.scale.setScalar(0.28 * blink)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (seeds.length === 0) return null
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
      <sphereGeometry args={[0.2, 4, 3]} />
      <meshBasicMaterial color="#bbff44" />
    </instancedMesh>
  )
}

// ── Desert Dust — swirls 0.5–5 units above desert ground ──
function DesertDust({ planet }) {
  const meshRef = useRef()

  const seeds = useMemo(() => {
    const out = []
    let attempts = 0
    while (out.length < 100 && attempts < 1200) {
      attempts++
      const u     = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const rr    = Math.sqrt(1 - u * u)
      const dir   = new THREE.Vector3(rr * Math.cos(theta), u, rr * Math.sin(theta))
      if (planet.sampleBiome(dir.x, dir.y, dir.z) !== 'desert') continue
      const surfR = planet.surfaceRadius(dir.x, dir.y, dir.z)
      out.push({
        dir,
        surfR,
        driftSpeed: 0.12 + Math.random() * 0.18,
        phase:      Math.random() * Math.PI * 2,
        height:     0.6 + Math.random() * 4.5   // 0.6–5 above ground
      })
    }
    return out
  }, [planet])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((rs) => {
    if (!meshRef.current || seeds.length === 0) return
    const t = rs.clock.elapsedTime
    seeds.forEach((s, i) => {
      const { right, fwd } = tangentFrame(s.dir)
      const dX = ((t * s.driftSpeed + Math.sin(t * 0.25 + s.phase) * 2.5) % 12) - 6
      const dZ = Math.sin(t * s.driftSpeed * 0.55 + s.phase) * 3.5
      const h  = s.surfR + s.height
      dummy.position.copy(s.dir).multiplyScalar(h)
        .addScaledVector(right, dX)
        .addScaledVector(fwd,   dZ)
      dummy.rotation.set(t * 0.8 + s.phase, t * 1.2 + s.phase, t * 0.4)
      dummy.scale.setScalar(0.22)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (seeds.length === 0) return null
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
      <octahedronGeometry args={[0.25, 0]} />
      <meshBasicMaterial color="#d4b870" transparent opacity={0.5} />
    </instancedMesh>
  )
}

// ── Sun Light ──
function SunLight({ timeOfDay }) {
  const lightRef = useRef()
  useFrame(() => {
    if (!lightRef.current) return
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2
    const dist = 600
    lightRef.current.position.set(Math.cos(sunAngle) * dist, Math.sin(sunAngle) * dist, 0)
    lightRef.current.target.position.set(0, 0, 0)
    lightRef.current.target.updateMatrixWorld()
    const above = Math.max(0, Math.sin(sunAngle))
    lightRef.current.intensity = 0.3 + above * 1.6
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
