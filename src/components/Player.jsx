import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CharacterMesh from './CharacterMesh.jsx'

// Spherical-gravity player controller with walking animation.
// - WASD: move along the local tangent plane
// - Mouse: look (pointer-lock)
// - Space: jump
// - Shift: sprint
// - V: toggle 1st/3rd person
// - E: interact with nearest NPC (handled by parent via registry)

const WALK_SPEED = 7
const RUN_SPEED = 14
const JUMP_VEL = 9
const GRAVITY = 22
const EYE_HEIGHT = 1.55
const PLAYER_HEIGHT = 1.85

export default function Player({
  planet,
  cameraMode,
  onCameraModeChange,
  onInteract,
  isPaused,
  appearance
}) {
  const { camera, gl } = useThree()
  const groupRef = useRef()
  const meshRef = useRef()

  const state = useRef({
    position: new THREE.Vector3(0, planet.radius + 30, 0),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    keys: { w: false, a: false, s: false, d: false, shift: false, space: false },
    grounded: false,
    locked: false,
    walkPhase: 0
  }).current

  // Spawn on a known land spot using the raycast sampler for exact placement
  useMemo(() => {
    let dir = new THREE.Vector3(0.2, 0.6, 0.7).normalize()
    for (let i = 0; i < 100; i++) {
      if (planet.isLand(dir.x, dir.y, dir.z) && Math.abs(dir.y) < 0.7) break
      dir.set(Math.random() - 0.5, (Math.random() - 0.5) * 1.4, Math.random() - 0.5).normalize()
    }
    // Use raycast sampler for exact ground position, then drop in from slightly above
    const groundPt = planet.groundSampler.getGroundPoint(dir)
    state.position.copy(groundPt).addScaledVector(dir, 0.3)
  }, [planet])

  // Pointer lock + key handlers
  useEffect(() => {
    const canvas = gl.domElement
    const onClick = () => { if (!state.locked && !isPaused) canvas.requestPointerLock() }
    const onLockChange = () => { state.locked = document.pointerLockElement === canvas }
    const onMouseMove = (e) => {
      if (!state.locked) return
      state.yaw -= e.movementX * 0.0025
      state.pitch -= e.movementY * 0.0025
      state.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.pitch))
    }
    const onKeyDown = (e) => {
      if (isPaused) return
      const k = e.key.toLowerCase()
      if (k === 'w') state.keys.w = true
      else if (k === 'a') state.keys.a = true
      else if (k === 's') state.keys.s = true
      else if (k === 'd') state.keys.d = true
      else if (k === 'shift') state.keys.shift = true
      else if (k === ' ') state.keys.space = true
      else if (k === 'v') onCameraModeChange(cameraMode === 'third' ? 'first' : 'third')
      else if (k === 'e' && onInteract) onInteract(state.position.clone())
    }
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'w') state.keys.w = false
      else if (k === 'a') state.keys.a = false
      else if (k === 's') state.keys.s = false
      else if (k === 'd') state.keys.d = false
      else if (k === 'shift') state.keys.shift = false
      else if (k === ' ') state.keys.space = false
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [gl, cameraMode, onCameraModeChange, onInteract, isPaused])

  const scratch = useMemo(() => ({
    up: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    worldUp: new THREE.Vector3(0, 1, 0),
    lookTarget: new THREE.Vector3()
  }), [])

  useFrame((_, delta) => {
    if (isPaused) {
      // Still update camera to follow player
      if (meshRef.current) meshRef.current.setWalk(state.walkPhase, 0)
      return
    }
    const dt = Math.min(delta, 0.05)

    scratch.up.copy(state.position).normalize()

    const ref = Math.abs(scratch.up.y) < 0.95 ? scratch.worldUp : new THREE.Vector3(1, 0, 0)
    scratch.right.crossVectors(ref, scratch.up).normalize()
    scratch.forward.crossVectors(scratch.up, scratch.right).normalize()

    const yawQ = new THREE.Quaternion().setFromAxisAngle(scratch.up, state.yaw)
    const f = scratch.forward.clone().applyQuaternion(yawQ)
    const r = scratch.right.clone().applyQuaternion(yawQ)

    scratch.move.set(0, 0, 0)
    if (state.keys.w) scratch.move.add(f)
    if (state.keys.s) scratch.move.sub(f)
    if (state.keys.d) scratch.move.add(r)
    if (state.keys.a) scratch.move.sub(r)
    const moving = scratch.move.lengthSq() > 0
    if (moving) {
      scratch.move.normalize().multiplyScalar(state.keys.shift ? RUN_SPEED : WALK_SPEED)
    }

    const gravity = scratch.up.clone().multiplyScalar(-GRAVITY * dt)
    state.velocity.add(gravity)

    if (state.keys.space && state.grounded) {
      state.velocity.add(scratch.up.clone().multiplyScalar(JUMP_VEL))
      state.grounded = false
    }

    const vertical = scratch.up.clone().multiplyScalar(state.velocity.dot(scratch.up))
    state.velocity.copy(vertical).add(scratch.move)

    state.position.addScaledVector(state.velocity, dt)

    // Ground snap. state.position = feet position (group origin = feet).
    // surfaceRadius gives the analytic ground radius at this direction — fast per frame.
    const dir = state.position.clone().normalize()
    const targetR = planet.surfaceRadius(dir.x, dir.y, dir.z)
    const distFromCenter = state.position.length()

    if (distFromCenter <= targetR) {
      state.position.copy(dir).multiplyScalar(targetR)
      const v = state.velocity.dot(scratch.up)
      if (v < 0) state.velocity.addScaledVector(scratch.up, -v)
      state.grounded = true
    } else {
      state.grounded = false
    }

    // Walk animation
    if (moving && state.grounded) {
      state.walkPhase += dt * (state.keys.shift ? 14 : 9)
    }
    if (meshRef.current) meshRef.current.setWalk(state.walkPhase, moving ? (state.keys.shift ? 4 : 2.5) : 0)

    // Apply transforms — character's local +Z = forward (where eyes look).
    // After upQ (which aligns local +Y to world up), rotating by yaw around
    // local Y points the body in the direction the camera is facing.
    if (groupRef.current) {
      groupRef.current.position.copy(state.position)
      // Align local +Y to surface normal, then yaw around that normal.
      // upQ: aligns world-up (0,1,0) → surface normal
      // yawQ: rotates around the surface normal by yaw
      // apply upQ first, then yawQ → correct surface-frame yaw
      const upQ  = new THREE.Quaternion().setFromUnitVectors(scratch.worldUp, scratch.up)
      const yawQ = new THREE.Quaternion().setFromAxisAngle(scratch.up, state.yaw)
      groupRef.current.quaternion.copy(yawQ).multiply(upQ)
    }

    // Camera
    const headOffset = scratch.up.clone().multiplyScalar(EYE_HEIGHT)
    const eyeBase = state.position.clone().add(headOffset)

    const pitchQ = new THREE.Quaternion().setFromAxisAngle(r, state.pitch)
    const lookDir = f.clone().applyQuaternion(pitchQ)

    if (cameraMode === 'first') {
      camera.position.copy(eyeBase).addScaledVector(lookDir, 0.05)
      scratch.lookTarget.copy(eyeBase).add(lookDir)
      camera.up.copy(scratch.up)
      camera.lookAt(scratch.lookTarget)
      if (groupRef.current) groupRef.current.visible = false
    } else {
      const back = lookDir.clone().multiplyScalar(-5.5)
      const upOff = scratch.up.clone().multiplyScalar(2.2)
      camera.position.copy(eyeBase).add(back).add(upOff)
      scratch.lookTarget.copy(eyeBase).add(lookDir.clone().multiplyScalar(2))
      camera.up.copy(scratch.up)
      camera.lookAt(scratch.lookTarget)
      if (groupRef.current) groupRef.current.visible = true
    }
  })

  return (
    <group ref={groupRef}>
      <CharacterMesh ref={meshRef} appearance={appearance} />
    </group>
  )
}
