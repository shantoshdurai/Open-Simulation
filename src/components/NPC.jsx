import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CharacterMesh from './CharacterMesh.jsx'

// NPC with behavior state machine driven by time of day.
//
// States: idle, wander, work, socialize, rest
// Schedule (rough):
//   06:00–09:00 wake & wander
//   09:00–17:00 work (gather/loiter near job spot)
//   17:00–20:00 socialize (seek other NPCs)
//   20:00–06:00 rest (slow down, occasional pause)
//
// NPC-to-NPC encounters: when within 4 units of another NPC, both stop and
// "chat" for 4-8 seconds. The registry lets us find the nearest.

const STATES = {
  IDLE: 'idle',
  WANDER: 'wander',
  WORK: 'work',
  SOCIALIZE: 'socialize',
  REST: 'rest',
  CHATTING: 'chatting',
  TALKING_TO_PLAYER: 'talking_to_player'
}

export default function NPC({ planet, npc, registry, timeRef }) {
  const groupRef = useRef()
  const meshRef = useRef()

  const state = useRef({
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    yaw: 0,
    speed: 0,
    targetSpeed: 0,
    behavior: STATES.WANDER,
    behaviorTimer: 0,
    walkPhase: Math.random() * Math.PI * 2,
    workSpot: null, // direction vector for work location
    chatPartner: null,
    lookYaw: 0
  }).current

  // Spawn on a random land spot (deterministic per seed)
  useMemo(() => {
    const rng = mulberry32(npc.seed * 9973 + 1)
    let dir = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < 100; i++) {
      const u = rng() * 2 - 1
      const theta = rng() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
      if (planet.isLand(dir.x, dir.y, dir.z) && Math.abs(dir.y) < 0.85) break
    }
    // Use raycast sampler for exact ground position
    const groundPt = planet.groundSampler.getGroundPoint(dir)
    state.position.copy(groundPt)
    state.workSpot = dir.clone()

    // Initial random tangent direction
    const up = dir.clone()
    const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, up).normalize()
    const fwd = new THREE.Vector3().crossVectors(up, right).normalize()
    const a = rng() * Math.PI * 2
    state.direction.copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)).normalize()
  }, [planet, npc.seed])

  // Register with parent
  useEffect(() => {
    if (!registry) return
    registry.add(npc.id, {
      npc,
      getPosition: () => state.position.clone(),
      getBehavior: () => state.behavior,
      setBehavior: (b) => { state.behavior = b; state.behaviorTimer = 0 }
    })
    return () => registry.remove(npc.id)
  }, [npc, registry])

  const scratch = useMemo(() => ({
    up: new THREE.Vector3(),
    worldUp: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    tmp: new THREE.Vector3()
  }), [])

  const pickNewDirection = (rng = Math.random) => {
    scratch.up.copy(state.position).normalize()
    const ref = Math.abs(scratch.up.y) < 0.95 ? scratch.worldUp : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, scratch.up).normalize()
    const fwd = new THREE.Vector3().crossVectors(scratch.up, right).normalize()
    const a = rng() * Math.PI * 2
    state.direction.copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)).normalize()
  }

  // Schedule based on time of day (0..1 = midnight to midnight)
  const scheduledBehavior = (t) => {
    const hour = t * 24
    if (hour < 6) return STATES.REST
    if (hour < 9) return STATES.WANDER
    if (hour < 17) return STATES.WORK
    if (hour < 20) return STATES.SOCIALIZE
    return STATES.REST
  }

  useFrame((rs, delta) => {
    const dt = Math.min(delta, 0.05)
    state.behaviorTimer -= dt

    // Don't override scheduled behavior if we're in a special state
    const isSpecial = state.behavior === STATES.CHATTING || state.behavior === STATES.TALKING_TO_PLAYER
    const scheduled = scheduledBehavior(timeRef ? timeRef.current : 0.5)
    if (!isSpecial && state.behavior !== scheduled && state.behaviorTimer <= 0) {
      state.behavior = scheduled
      state.behaviorTimer = 2 + Math.random() * 3
    }

    // Behavior logic
    let speed = 0
    let allowMove = true

    switch (state.behavior) {
      case STATES.IDLE:
        speed = 0
        if (state.behaviorTimer <= 0) {
          state.behavior = STATES.WANDER
          state.behaviorTimer = 4 + Math.random() * 4
        }
        break

      case STATES.WANDER:
        speed = 1.4
        if (state.behaviorTimer <= 0) {
          if (Math.random() < 0.5) {
            state.behavior = STATES.IDLE
            state.behaviorTimer = 2 + Math.random() * 3
          } else {
            pickNewDirection()
            state.behaviorTimer = 3 + Math.random() * 4
          }
        }
        break

      case STATES.WORK: {
        // Drift toward workSpot, then idle near it
        const workPoint = planet.groundSampler.getGroundPoint(state.workSpot)
        const distToWork = state.position.distanceTo(workPoint)
        if (distToWork > 8) {
          // Walk toward work
          scratch.tmp.copy(workPoint).sub(state.position)
          scratch.up.copy(state.position).normalize()
          scratch.tmp.addScaledVector(scratch.up, -scratch.tmp.dot(scratch.up)).normalize()
          state.direction.copy(scratch.tmp)
          speed = 1.6
        } else {
          // Loiter / pretend to work
          if (state.behaviorTimer <= 0) {
            if (Math.random() < 0.6) {
              speed = 0
              state.behaviorTimer = 1 + Math.random() * 2
            } else {
              pickNewDirection()
              state.behaviorTimer = 1 + Math.random() * 2
            }
          }
          speed = state.behaviorTimer > 0 && Math.random() < 0.3 ? 0.7 : speed
        }
        break
      }

      case STATES.SOCIALIZE: {
        // Look for a nearby NPC to walk toward
        if (!state.chatPartner && state.behaviorTimer <= 0) {
          const nearest = registry.findNearest(state.position, 25, npc.id)
          if (nearest && nearest.distance > 3) {
            state.chatPartner = nearest.npc.id
            state.behaviorTimer = 6
          } else {
            pickNewDirection()
            state.behaviorTimer = 2 + Math.random() * 2
          }
        }
        if (state.chatPartner) {
          const partner = registry.get(state.chatPartner)
          if (partner) {
            const partnerPos = partner.getPosition()
            const dist = state.position.distanceTo(partnerPos)
            if (dist < 2.5) {
              // Start chatting
              state.behavior = STATES.CHATTING
              state.behaviorTimer = 4 + Math.random() * 4
              speed = 0
              break
            }
            scratch.tmp.copy(partnerPos).sub(state.position)
            scratch.up.copy(state.position).normalize()
            scratch.tmp.addScaledVector(scratch.up, -scratch.tmp.dot(scratch.up)).normalize()
            state.direction.copy(scratch.tmp)
            speed = 1.8
          } else {
            state.chatPartner = null
          }
        } else {
          speed = 1.0
        }
        break
      }

      case STATES.CHATTING:
        speed = 0
        if (state.behaviorTimer <= 0) {
          state.chatPartner = null
          state.behavior = STATES.WANDER
          state.behaviorTimer = 2 + Math.random() * 3
        }
        // Idle look-around
        state.lookYaw = Math.sin(rs.clock.elapsedTime * 0.5 + npc.seed) * 0.4
        break

      case STATES.REST:
        speed = state.behaviorTimer > 0 && Math.random() < 0.2 ? 0.4 : 0
        if (state.behaviorTimer <= 0) {
          state.behaviorTimer = 4 + Math.random() * 6
          if (Math.random() < 0.3) pickNewDirection()
        }
        break

      case STATES.TALKING_TO_PLAYER:
        speed = 0
        // Held by external (chat panel). Stays put.
        break
    }

    state.targetSpeed = speed
    // Smooth speed blending for natural starts/stops
    state.speed += (state.targetSpeed - state.speed) * Math.min(1, dt * 6)

    // Move
    if (allowMove && state.speed > 0.05) {
      state.position.addScaledVector(state.direction, state.speed * dt)
    }

    // Ground-snap per frame using the analytic surface radius (fast)
    const dir = state.position.clone().normalize()
    const surfaceR = planet.surfaceRadius(dir.x, dir.y, dir.z)
    state.position.copy(dir).multiplyScalar(surfaceR)

    // If on water, turn around and head back
    if (!planet.isLand(dir.x, dir.y, dir.z)) {
      state.direction.multiplyScalar(-1)
      state.behaviorTimer = 1
    }

    // Re-orthogonalize direction to local tangent
    scratch.up.copy(dir)
    state.direction.addScaledVector(scratch.up, -state.direction.dot(scratch.up)).normalize()

    // Walk animation
    if (state.speed > 0.05) state.walkPhase += dt * (5 + state.speed * 3)
    if (meshRef.current) meshRef.current.setWalk(state.walkPhase, state.speed)

    // Rotation
    if (groupRef.current) {
      groupRef.current.position.copy(state.position)
      const upQ = new THREE.Quaternion().setFromUnitVectors(scratch.worldUp, scratch.up)
      const ref = Math.abs(scratch.up.y) < 0.95 ? scratch.worldUp : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, scratch.up).normalize()
      const fwd = new THREE.Vector3().crossVectors(scratch.up, right).normalize()
      let yaw = Math.atan2(state.direction.dot(right), state.direction.dot(fwd))
      yaw += state.lookYaw
      state.yaw = yaw
      const yawQ = new THREE.Quaternion().setFromAxisAngle(scratch.up, yaw)
      groupRef.current.quaternion.copy(yawQ).multiply(upQ)
    }

  })

  return (
    <group ref={groupRef}>
      <CharacterMesh ref={meshRef} appearance={npc.appearance} />
      {/* Tiny behavior icon above head */}
      <BehaviorIcon stateRef={state} appearance={npc.appearance} />
    </group>
  )
}

// A small floating icon above the NPC's head that hints at their state
function BehaviorIcon({ stateRef, appearance }) {
  const meshRef = useRef()
  const matRef = useRef()
  useFrame((rs) => {
    if (!meshRef.current) return
    const t = rs.clock.elapsedTime
    meshRef.current.position.y = 2.6 * appearance.heightScale + Math.sin(t * 2) * 0.05
    if (matRef.current) {
      const b = stateRef.behavior
      const color = b === 'rest' ? '#5a4a8a' : b === 'work' ? '#c97a3a' : b === 'socialize' || b === 'chatting' ? '#e85a8a' : b === 'idle' ? '#888888' : '#7ac97a'
      matRef.current.color.set(color)
    }
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 6, 5]} />
      <meshBasicMaterial ref={matRef} color="#7ac97a" />
    </mesh>
  )
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
