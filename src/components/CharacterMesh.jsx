import { forwardRef, useRef, useImperativeHandle } from 'react'

// Shared low-poly character mesh used by Player and NPC.
// Exposes a ref with `setWalk(speed)` that animates the leg/arm swing.
//
// Appearance fields:
//   skinTone, hairColor, shirtColor, pantsColor,
//   hasHat, hatColor, heightScale, bodyWidth, headSize, hairStyle (0..3)

const CharacterMesh = forwardRef(function CharacterMesh({ appearance }, ref) {
  const a = appearance
  const groupRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const bodyRef = useRef()

  useImperativeHandle(ref, () => ({
    group: () => groupRef.current,
    setWalk: (phase, speed) => {
      const swing = Math.sin(phase) * Math.min(0.9, speed * 0.18)
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.8
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.8
      if (bodyRef.current) bodyRef.current.position.y = 0.78 + Math.abs(Math.sin(phase * 2)) * 0.04 * Math.min(1, speed * 0.4)
    }
  }))

  const h = a.heightScale
  const w = a.bodyWidth
  const hs = a.headSize

  return (
    <group ref={groupRef} scale={[1, h, 1]}>
      {/* Legs — pivot from top so rotation looks like walking */}
      <group position={[-0.13 * w, 0.42, 0]}>
        <group ref={leftLegRef}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18 * w, 0.44, 0.2]} />
            <meshStandardMaterial color={a.pantsColor} flatShading />
          </mesh>
        </group>
      </group>
      <group position={[0.13 * w, 0.42, 0]}>
        <group ref={rightLegRef}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18 * w, 0.44, 0.2]} />
            <meshStandardMaterial color={a.pantsColor} flatShading />
          </mesh>
        </group>
      </group>

      {/* Body */}
      <group ref={bodyRef} position={[0, 0.78, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55 * w, 0.7, 0.38 * w]} />
          <meshStandardMaterial color={a.shirtColor} flatShading />
        </mesh>

        {/* Arms — pivot from shoulder */}
        <group position={[-0.32 * w, 0.25, 0]}>
          <group ref={leftArmRef}>
            <mesh position={[0, -0.28, 0]} castShadow>
              <boxGeometry args={[0.14 * w, 0.6, 0.16]} />
              <meshStandardMaterial color={a.shirtColor} flatShading />
            </mesh>
            <mesh position={[0, -0.62, 0]} castShadow>
              <boxGeometry args={[0.13, 0.13, 0.13]} />
              <meshStandardMaterial color={a.skinTone} flatShading />
            </mesh>
          </group>
        </group>
        <group position={[0.32 * w, 0.25, 0]}>
          <group ref={rightArmRef}>
            <mesh position={[0, -0.28, 0]} castShadow>
              <boxGeometry args={[0.14 * w, 0.6, 0.16]} />
              <meshStandardMaterial color={a.shirtColor} flatShading />
            </mesh>
            <mesh position={[0, -0.62, 0]} castShadow>
              <boxGeometry args={[0.13, 0.13, 0.13]} />
              <meshStandardMaterial color={a.skinTone} flatShading />
            </mesh>
          </group>
        </group>

        {/* Head */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.42 * hs, 0.42 * hs, 0.42 * hs]} />
          <meshStandardMaterial color={a.skinTone} flatShading />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.08 * hs, 0.58, 0.21 * hs]}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.08 * hs, 0.58, 0.21 * hs]}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Hair */}
        {a.hairStyle === 1 && (
          <mesh position={[0, 0.78, 0]} castShadow>
            <boxGeometry args={[0.46 * hs, 0.12, 0.46 * hs]} />
            <meshStandardMaterial color={a.hairColor} flatShading />
          </mesh>
        )}
        {a.hairStyle === 2 && (
          <mesh position={[0, 0.82, 0]} castShadow>
            <coneGeometry args={[0.22 * hs, 0.25, 6]} />
            <meshStandardMaterial color={a.hairColor} flatShading />
          </mesh>
        )}
        {a.hairStyle === 3 && (
          <>
            <mesh position={[0, 0.78, 0]} castShadow>
              <boxGeometry args={[0.48 * hs, 0.16, 0.48 * hs]} />
              <meshStandardMaterial color={a.hairColor} flatShading />
            </mesh>
            <mesh position={[0, 0.6, -0.18 * hs]} castShadow>
              <boxGeometry args={[0.46 * hs, 0.4, 0.08]} />
              <meshStandardMaterial color={a.hairColor} flatShading />
            </mesh>
          </>
        )}

        {/* Hat */}
        {a.hasHat && (
          <>
            <mesh position={[0, 0.85, 0]} castShadow>
              <cylinderGeometry args={[0.26 * hs, 0.26 * hs, 0.18, 8]} />
              <meshStandardMaterial color={a.hatColor} flatShading />
            </mesh>
            <mesh position={[0, 0.78, 0]} castShadow>
              <cylinderGeometry args={[0.36 * hs, 0.36 * hs, 0.04, 8]} />
              <meshStandardMaterial color={a.hatColor} flatShading />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
})

export default CharacterMesh
