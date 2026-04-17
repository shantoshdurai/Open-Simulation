import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CharacterMesh from './CharacterMesh.jsx'
import SpeechBubble from './SpeechBubble.jsx'
import { JOB_WORK_TYPES } from '../utils/personalities.js'
import {
  createBrain,
  tickNeeds,
  tickFacts,
  composeConversation,
  applyConversationEffects,
  addFact
} from '../utils/npcBrain.js'

const STATES = {
  IDLE:             'idle',
  WANDER:           'wander',
  WORK:             'work',
  SOCIALIZE:        'socialize',
  REST:             'rest',
  CHATTING:         'chatting',
  RETURN_HOME:      'return_home',
  TALKING_TO_PLAYER:'talking_to_player'
}

// How long each schedule-phase lasts before re-evaluating (seconds of sim time)
const SCHEDULE_CHECK_INTERVAL = 30 // Don't check schedule more than every 30s

export default function NPC({ planet, npc, registry, timeRef, village, season, brainBank }) {
  const [speechBubble, setSpeechBubble] = useState(null)

  const groupRef = useRef()
  const meshRef  = useRef()

  // One brain per NPC, keyed by id in the shared brainBank Map
  const brain = useMemo(() => {
    if (!brainBank) return createBrain(Math.random)
    if (!brainBank.has(npc.id)) {
      const rng = mulberry32(npc.seed * 7919 + 3)
      brainBank.set(npc.id, createBrain(rng))
    }
    return brainBank.get(npc.id)
  }, [brainBank, npc.id, npc.seed])

  const state = useRef({
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(1, 0, 0),
    yaw: 0,
    speed: 0,
    targetSpeed: 0,
    behavior: STATES.WANDER,
    behaviorTimer: Math.random() * 5,
    scheduleTimer: Math.random() * 30,
    walkPhase: Math.random() * Math.PI * 2,
    chatPartner: null,
    lookYaw: 0,
    workType: 'chop',
    homePosition: null,
    workSpot: null,
    conversation: null,
    speechText: null,
    speechVisible: false,
    waterBounceCount: 0,
    waterBounceTimer: 0,
    _skipFrame: false,
    isResting: false,
    // Brain ticks (cheaper than running every frame)
    brainTickTimer: Math.random() * 2,
    chatCooldown: 0
  }).current

  // Spawn near assigned village
  useMemo(() => {
    const rng = mulberry32(npc.seed * 9973 + 1)

    if (village) {
      const up = village.center.clone().normalize()
      const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, up).normalize()
      const fwd   = new THREE.Vector3().crossVectors(up, right).normalize()

      // Spawn spread widely across the village so NPCs don't stack at the well.
      // Tries a few spots until one lands on land and isn't inside a house.
      let spawnDir = village.center.clone().normalize()
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = rng() * Math.PI * 2
        const dist  = 8 + rng() * 22
        const offset = right.clone().multiplyScalar(Math.cos(angle) * dist)
          .addScaledVector(fwd, Math.sin(angle) * dist)
        const candidate = up.clone().multiplyScalar(planet.radius).add(offset).normalize()
        if (!planet.isLand(candidate.x, candidate.y, candidate.z)) continue
        // Avoid spawning on a house footprint (~3 unit radius)
        const pt = planet.groundSampler.getGroundPoint(candidate)
        const clash = village.houses?.some(h => pt.distanceTo(h.position) < 3.5)
        if (clash) continue
        spawnDir = candidate
        break
      }

      const groundPt = planet.groundSampler.getGroundPoint(spawnDir)
      state.position.copy(groundPt)
      state.homePosition = planet.groundSampler.getGroundPoint(village.center.clone().normalize())

      const workAngle = rng() * Math.PI * 2
      const workDist  = 8 + rng() * 18
      const workOffset = right.clone().multiplyScalar(Math.cos(workAngle) * workDist)
        .addScaledVector(fwd, Math.sin(workAngle) * workDist)
      let workDir = up.clone().multiplyScalar(planet.radius).add(workOffset).normalize()
      if (!planet.isLand(workDir.x, workDir.y, workDir.z)) workDir = spawnDir.clone()
      state.workSpot = workDir

      const a = rng() * Math.PI * 2
      state.direction.copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)).normalize()
    } else {
      let dir = new THREE.Vector3(0, 1, 0)
      for (let i = 0; i < 100; i++) {
        const u = rng() * 2 - 1
        const theta = rng() * Math.PI * 2
        const r = Math.sqrt(1 - u * u)
        dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
        if (planet.isLand(dir.x, dir.y, dir.z) && Math.abs(dir.y) < 0.85) break
      }
      const groundPt = planet.groundSampler.getGroundPoint(dir)
      state.position.copy(groundPt)
      state.homePosition = groundPt.clone()
      state.workSpot     = dir.clone()

      const up  = dir.clone()
      const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, up).normalize()
      const fwd   = new THREE.Vector3().crossVectors(up, right).normalize()
      const a = rng() * Math.PI * 2
      state.direction.copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)).normalize()
    }

    state.workType = JOB_WORK_TYPES[npc.job] || 'chop'
  }, [planet, npc.seed, village])

  useEffect(() => {
    if (!registry) return
    registry.add(npc.id, {
      npc,
      brain,
      getPosition:    () => state.position.clone(),
      getBehavior:    () => state.behavior,
      setBehavior:    (b) => { state.behavior = b; state.behaviorTimer = 0 },
      getConversation:() => state.conversation,
      setConversation:(conv) => { state.conversation = conv },
      receiveFact:    (fact) => addFact(brain, fact)
    })
    return () => registry.remove(npc.id)
  }, [npc, registry])

  const scratch = useMemo(() => ({
    up:     new THREE.Vector3(),
    worldUp: new THREE.Vector3(0, 1, 0),
    right:  new THREE.Vector3(),
    fwd:    new THREE.Vector3(),
    tmp:    new THREE.Vector3()
  }), [])

  const pickNewDirection = (rngFn = Math.random) => {
    scratch.up.copy(state.position).normalize()
    const ref   = Math.abs(scratch.up.y) < 0.95 ? scratch.worldUp : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, scratch.up).normalize()
    const fwd   = new THREE.Vector3().crossVectors(scratch.up, right).normalize()
    const a = rngFn() * Math.PI * 2
    state.direction.copy(fwd).multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)).normalize()
  }

  const moveToward = (targetPos) => {
    scratch.tmp.copy(targetPos).sub(state.position)
    scratch.up.copy(state.position).normalize()
    // Project to tangent plane so NPCs don't try to go through the planet
    scratch.tmp.addScaledVector(scratch.up, -scratch.tmp.dot(scratch.up)).normalize()
    if (scratch.tmp.lengthSq() > 0.001) state.direction.copy(scratch.tmp)
  }

  // Schedules: only WANDER → WORK → SOCIALIZE → WANDER cycle. No lying down.
  const getScheduledBehavior = (t) => {
    const hour = t * 24
    // Night: slow wander near home
    if (hour < 6 || hour >= 22) return STATES.WANDER
    // Morning: work starts
    if (hour < 9) return STATES.WANDER
    // Work hours
    if (hour < 17) return STATES.WORK
    // Evening social
    if (hour < 21) return STATES.SOCIALIZE
    return STATES.WANDER
  }

  useFrame((rs, delta) => {
    const dt = Math.min(delta, 0.05)

    // LOD throttle
    const distToCam = state.position.distanceTo(rs.camera.position)
    if (distToCam > 160) {
      if (groupRef.current) {
        groupRef.current.position.copy(state.position)
        // Still orient upright cheaply — stand with the planet normal as up
        scratch.up.copy(state.position).normalize()
        const qUp = new THREE.Quaternion().setFromUnitVectors(scratch.worldUp, scratch.up)
        groupRef.current.quaternion.copy(qUp)
      }
      return
    }
    if (distToCam > 90) {
      state._skipFrame = !state._skipFrame
      if (state._skipFrame) {
        if (groupRef.current) groupRef.current.position.copy(state.position)
        return
      }
    }

    // Timers
    state.behaviorTimer  -= dt
    state.scheduleTimer  -= dt
    state.brainTickTimer -= dt
    if (state.chatCooldown > 0) state.chatCooldown -= dt
    if (state.waterBounceTimer > 0) {
      state.waterBounceTimer -= dt
      if (state.waterBounceTimer <= 0) state.waterBounceCount = 0
    }

    // Brain tick (every 2s — needs decay, facts fade, conversation-memory ages)
    if (state.brainTickTimer <= 0) {
      state.brainTickTimer = 2
      tickNeeds(brain.needs, 2)
      tickFacts(brain, 2)
      // Age lastSpokeWith map
      for (const [id, t] of brain.lastSpokeWith) {
        const newT = t + 2
        if (newT > 60) brain.lastSpokeWith.delete(id)
        else brain.lastSpokeWith.set(id, newT)
      }
    }

    // Schedule transitions — staggered, don't interrupt chatting/player-talk
    const isSpecial = state.behavior === STATES.CHATTING || state.behavior === STATES.TALKING_TO_PLAYER
    if (!isSpecial && state.scheduleTimer <= 0) {
      state.scheduleTimer = SCHEDULE_CHECK_INTERVAL + Math.random() * 10
      const desired = getScheduledBehavior(timeRef ? timeRef.current : 0.5)
      if (state.behavior !== desired) {
        state.behavior      = desired
        state.behaviorTimer = 3 + Math.random() * 5
        state.chatPartner   = null
        state.isResting     = false
        if (state.conversation) {
          state.conversation  = null
          state.speechText    = null
          state.speechVisible = false
          setSpeechBubble(null)
        }
      }
    }

    let speed = 0

    switch (state.behavior) {

      case STATES.IDLE:
        speed = 0
        if (state.behaviorTimer <= 0) {
          state.behavior      = STATES.WANDER
          state.behaviorTimer = 4 + Math.random() * 4
          pickNewDirection()
        }
        break

      case STATES.WANDER: {
        // At night NPCs wander very slowly near home
        const hour = (timeRef ? timeRef.current : 0.5) * 24
        const isNight = hour < 6 || hour >= 22
        speed = isNight ? 0.5 : 1.4

        if (state.homePosition) {
          const distHome = state.position.distanceTo(state.homePosition)
          const leash = isNight ? 10 : 28
          if (distHome > leash) {
            moveToward(state.homePosition)
            speed = isNight ? 0.7 : 1.6
          }
        }
        if (state.behaviorTimer <= 0) {
          if (Math.random() < 0.4) {
            state.behavior      = STATES.IDLE
            state.behaviorTimer = 2 + Math.random() * 4
          } else {
            pickNewDirection()
            state.behaviorTimer = 4 + Math.random() * 5
          }
        }
        break
      }

      case STATES.WORK: {
        const workPoint = planet.groundSampler.getGroundPoint(state.workSpot)
        const distToWork = state.position.distanceTo(workPoint)

        if (state.workType === 'fish') {
          if (state.hitWaterEdge || distToWork < 2) {
            speed = 0
            if (state.behaviorTimer <= 0) {
              state.behaviorTimer = 5 + Math.random() * 5
              if (Math.random() < 0.15) {
                pickNewDirection()
                state.workSpot = state.position.clone().addScaledVector(state.direction, 40).normalize()
                state.hitWaterEdge = false
              }
            }
          } else {
            speed = 1.6
            moveToward(workPoint)
          }
        } else if (state.workType === 'idle') {
          if (state.homePosition) {
            const d = state.position.distanceTo(state.homePosition)
            if (d > 10) {
              moveToward(state.homePosition)
              speed = 1.0
            } else {
              speed = 0
              if (state.behaviorTimer <= 0) {
                state.behaviorTimer = 4 + Math.random() * 6
                if (Math.random() < 0.25) { pickNewDirection(); speed = 0.5 }
              }
            }
          }
        } else {
          if (distToWork > 8) {
            moveToward(workPoint)
            speed = 1.6
          } else {
            speed = 0  // Stand and work
            if (state.behaviorTimer <= 0) {
              // Occasionally reposition slightly
              if (Math.random() < 0.35) {
                pickNewDirection()
                state.behaviorTimer = 1 + Math.random() * 2
                speed = 0.8
              } else {
                state.behaviorTimer = 2 + Math.random() * 4
              }
            }
          }
        }
        break
      }

      case STATES.SOCIALIZE: {
        // Move toward village center first
        if (state.homePosition) {
          const distHome = state.position.distanceTo(state.homePosition)
          if (distHome > 14) {
            moveToward(state.homePosition)
            speed = 1.6
            break
          }
        }

        // Find chat partner — only if not already in conversation and not
        // on cooldown from recently finishing one.
        if (!state.chatPartner && state.behaviorTimer <= 0 && state.chatCooldown <= 0) {
          const nearest = registry.findNearest(state.position, 18, npc.id)
          if (nearest && nearest.distance > 2.5) {
            const pb = nearest.getBehavior()
            const recentlySpoke = brain.lastSpokeWith.has(nearest.npc.id)
            if (!recentlySpoke && (pb === STATES.SOCIALIZE || pb === STATES.IDLE || pb === STATES.WANDER)) {
              state.chatPartner   = nearest.npc.id
              state.behaviorTimer = 10
            }
          } else if (!nearest) {
            pickNewDirection()
            state.behaviorTimer = 3 + Math.random() * 3
          }
        }

        if (state.chatPartner) {
          const partner = registry.get(state.chatPartner)
          if (partner) {
            const partnerPos = partner.getPosition()
            const dist = state.position.distanceTo(partnerPos)
            if (dist < 3.0) {
              // Start conversation
              state.behavior   = STATES.CHATTING
              state.isSitting  = Math.random() > 0.5

              // Compose a conversation from brain state (facts + needs + context).
              // This also propagates the fact from A -> B (chain reaction).
              const conv = composeConversation(
                npc, brain,
                partner.npc, partner.brain,
                timeRef ? timeRef.current : 0.5
              )
              state._convTopic = conv.topic
              const totalTime = conv.lines.length * 5 + 2
              state.behaviorTimer  = totalTime
              state.conversation = {
                lines:          conv.lines,
                lineIndex:      0,
                lineTimer:      5,
                partnerId:      state.chatPartner,
                iAmInitiator:   true,
                partnerNpcData: partner.npc,
                topic:          conv.topic
              }
              partner.setConversation({
                lines:          conv.lines,
                lineIndex:      0,
                lineTimer:      5,
                partnerId:      npc.id,
                iAmInitiator:   false,
                partnerNpcData: npc,
                topic:          conv.topic
              })
              if (partner.getBehavior() !== STATES.CHATTING) {
                partner.setBehavior(STATES.CHATTING)
              }
              speed = 0
            } else {
              moveToward(partnerPos)
              speed = 1.8
            }
          } else {
            state.chatPartner = null
          }
        } else {
          // Wander slowly near village center
          speed = 0.7
          if (state.behaviorTimer <= 0) {
            pickNewDirection()
            state.behaviorTimer = 3 + Math.random() * 4
          }
        }
        break
      }

      case STATES.CHATTING: {
        speed = 0

        if (state.conversation) {
          state.conversation.lineTimer -= dt

          if (state.conversation.lineTimer <= 0) {
            state.conversation.lineIndex++
            state.conversation.lineTimer = 5

            // Sync partner
            if (state.conversation.iAmInitiator && state.chatPartner) {
              const partner = registry.get(state.conversation.partnerId)
              if (partner) {
                const pc = partner.getConversation()
                if (pc) {
                  pc.lineIndex = state.conversation.lineIndex
                  pc.lineTimer = 5
                }
              }
            }
          }

          const idx = state.conversation.lineIndex
          if (idx < state.conversation.lines.length) {
            const line = state.conversation.lines[idx]
            const iAmSpeaking = state.conversation.iAmInitiator
              ? line.speaker === 0
              : line.speaker === 1

            if (iAmSpeaking) {
              if (state.speechText !== line.text) {
                state.speechText    = line.text
                state.speechVisible = true
                setSpeechBubble({ text: line.text, name: npc.firstName })
              }
            } else if (state.speechVisible) {
              state.speechText    = null
              state.speechVisible = false
              setSpeechBubble(null)
            }
          } else {
            // Conversation finished — stand up and wander
            endConversation()
          }
        }

        if (state.behaviorTimer <= 0) endConversation()

        // Face partner
        if (state.chatPartner) {
          const partner = registry.get(state.chatPartner)
          if (partner) {
            const toP = partner.getPosition().sub(state.position)
            scratch.up.copy(state.position).normalize()
            toP.addScaledVector(scratch.up, -toP.dot(scratch.up)).normalize()
            if (toP.lengthSq() > 0.01) state.direction.copy(toP)
          }
        }
        break
      }

      case STATES.RETURN_HOME: {
        if (state.homePosition) {
          const d = state.position.distanceTo(state.homePosition)
          if (d > 4) {
            moveToward(state.homePosition)
            speed = 1.2
          } else {
            speed = 0
            state.behavior      = STATES.WANDER
            state.behaviorTimer = 5
          }
        }
        break
      }

      case STATES.TALKING_TO_PLAYER:
        speed = 0
        break
    }

    function endConversation() {
      // Apply social/purpose bumps from the topic we just discussed
      if (state.chatPartner) {
        const partner = registry.get(state.chatPartner)
        if (partner && partner.brain) {
          const topic = state.conversation?.topic || 'midday'
          applyConversationEffects(brain, partner.brain, topic)
          // Remember we spoke so we don't rechat the same person in 60s
          brain.lastSpokeWith.set(state.chatPartner, 0)
        }
      }
      state.conversation  = null
      state.speechText    = null
      state.speechVisible = false
      setSpeechBubble(null)
      state.chatPartner   = null
      state.behavior      = STATES.WANDER
      state.behaviorTimer = 3 + Math.random() * 4
      state.isSitting     = false
      state.chatCooldown  = 8   // don't immediately start another chat
    }

    state.targetSpeed = speed
    state.speed += (state.targetSpeed - state.speed) * Math.min(1, dt * 8)

    // Move
    const prevPos = state.position.clone()
    if (state.speed > 0.08) {
      state.position.addScaledVector(state.direction, state.speed * dt)
    }

    // Ground-snap & water collision
    scratch.up.copy(state.position).normalize()
    const dir = scratch.up

    if (!planet.isLand(dir.x, dir.y, dir.z)) {
      state.position.copy(prevPos)
      if (state.behavior === STATES.WORK && state.workType === 'fish') {
        state.hitWaterEdge = true
      } else {
        // Perpendicular bounce
        const perp = new THREE.Vector3().crossVectors(scratch.up, state.direction).normalize()
        state.direction.copy(perp)
        state.behaviorTimer = 1.5

        state.waterBounceCount++
        state.waterBounceTimer = 8
        if (state.waterBounceCount > 4 && state.homePosition) {
          state.position.copy(state.homePosition)
          state.waterBounceCount = 0
          pickNewDirection()
        }
      }
    } else {
      const surfR = planet.surfaceRadius(dir.x, dir.y, dir.z)
      state.position.copy(dir).multiplyScalar(surfR)
      if (state.behavior === STATES.WORK && state.workType === 'fish') {
        state.hitWaterEdge = false
      }
    }

    // Keep direction on tangent plane
    scratch.up.copy(state.position).normalize()
    state.direction.addScaledVector(scratch.up, -state.direction.dot(scratch.up))
    if (state.direction.lengthSq() < 0.001) pickNewDirection()
    else state.direction.normalize()

    // Animation
    let animAction = 'idle'
    if (state.behavior === STATES.WORK && state.speed < 0.15 && state.workType !== 'idle') {
      animAction = state.workType
    } else if (state.behavior === STATES.CHATTING && state.speechVisible) {
      animAction = 'talk'
    } else if (state.speed > 0.1) {
      animAction = 'walk'
    }

    if (animAction === 'walk') {
      state.walkPhase += dt * (4 + state.speed * 3)
    } else if (animAction === 'talk') {
      state.walkPhase += dt * 2
    } else if (['chop', 'build', 'fish'].includes(animAction)) {
      state.walkPhase += dt * 5
    }

    if (meshRef.current) meshRef.current.setAnimation(state.walkPhase, state.speed, animAction)

    // Orientation — always upright. Build basis using first align-up then
    // rotate around up to face direction. Guaranteed orthonormal.
    if (groupRef.current) {
      groupRef.current.position.copy(state.position)

      const Y = scratch.up.clone()
      // Project direction onto tangent plane
      const fwdTangent = state.direction.clone().addScaledVector(Y, -state.direction.dot(Y))

      // If direction degenerates, pick a stable fallback on the tangent plane
      if (fwdTangent.lengthSq() < 1e-4) {
        const ref = Math.abs(Y.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
        const right = new THREE.Vector3().crossVectors(ref, Y).normalize()
        fwdTangent.copy(new THREE.Vector3().crossVectors(Y, right))
      }
      fwdTangent.normalize()

      // Align world-up (0,1,0) to Y
      const qUp = new THREE.Quaternion().setFromUnitVectors(scratch.worldUp, Y)
      // After qUp, the model's +Z points in qUp.rotate(0,0,1). Compute the yaw
      // around Y needed to rotate that into fwdTangent.
      const modelFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qUp)
      // angle from modelFwd to fwdTangent around Y
      let cos = THREE.MathUtils.clamp(modelFwd.dot(fwdTangent), -1, 1)
      const cross = new THREE.Vector3().crossVectors(modelFwd, fwdTangent)
      const sign = cross.dot(Y) >= 0 ? 1 : -1
      const yaw = Math.acos(cos) * sign
      const qYaw = new THREE.Quaternion().setFromAxisAngle(Y, yaw)

      groupRef.current.quaternion.multiplyQuaternions(qYaw, qUp)
    }
  })

  // Tool
  let equippedItem = null
  if (state.behavior === STATES.WORK && state.speed < 0.15 && state.workType !== 'idle') {
    if (state.workType === 'chop') equippedItem = 'axe'
    else if (state.workType === 'build') equippedItem = 'hammer'
    else if (state.workType === 'fish') equippedItem = 'fishing-rod'
  }

  return (
    <group ref={groupRef}>
      <CharacterMesh ref={meshRef} appearance={npc.appearance} equippedItem={equippedItem} />
      <BehaviorDot stateRef={state} appearance={npc.appearance} />
      {speechBubble && (
        <SpeechBubble
          text={speechBubble.text}
          speakerName={speechBubble.name}
          position={[0, 3.0 + npc.appearance.heightScale * 0.5, 0]}
        />
      )}
    </group>
  )
}

function BehaviorDot({ stateRef, appearance }) {
  const meshRef = useRef()
  const matRef  = useRef()
  useFrame((rs) => {
    if (!meshRef.current) return
    meshRef.current.position.y = 2.4 * appearance.heightScale + Math.sin(rs.clock.elapsedTime * 1.8) * 0.06
    if (matRef.current) {
      const b = stateRef.behavior
      const color = b === 'work'                               ? '#e89a3a'
        : b === 'socialize' || b === 'chatting'                 ? '#e85a8a'
        : b === 'return_home'                                    ? '#5a8acc'
        : b === 'idle'                                           ? '#777777'
        : '#7ac97a'
      matRef.current.color.set(color)
    }
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 6, 5]} />
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
