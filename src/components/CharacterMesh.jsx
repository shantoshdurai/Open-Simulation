import { forwardRef, useRef, useImperativeHandle } from 'react'

// Shared low-poly character mesh used by Player and NPC.
// Exposes a ref with `setAnimation(phase, speed, action)` for walk/work/sit/talk.
//
// Appearance fields:
//   skinTone, hairColor, shirtColor, pantsColor,
//   hasHat, hatColor, heightScale, bodyWidth, headSize, hairStyle (0..3)

const CharacterMesh = forwardRef(function CharacterMesh({ appearance, equippedItem }, ref) {
  const a = appearance
  const groupRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const bodyRef = useRef()
  const headRef = useRef()

  useImperativeHandle(ref, () => ({
    group: () => groupRef.current,
    setAnimation: (phase, speed, action = 'idle') => {
      const swing = Math.sin(phase) * Math.min(0.9, speed * 0.18)
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing

      let lArmX = -swing * 0.8
      let rArmX = swing * 0.8
      let posY = 0.78 + Math.abs(Math.sin(phase * 2)) * 0.04 * Math.min(1, Math.max(speed * 0.4, 0))
      let bodyLeanX = 0
      let headBobY = 0.55

      if (action === 'chop') {
        rArmX = -Math.PI / 2.5 + Math.sin(phase * 5) * 0.5
        posY += Math.abs(Math.sin(phase * 2)) * 0.02
      } else if (action === 'build') {
        rArmX = -Math.PI / 4 + Math.sin(phase * 6) * 0.4
      } else if (action === 'fish') {
        rArmX = -Math.PI / 2.5 + Math.sin(phase * 2) * 0.05
        lArmX = -Math.PI / 3
      } else if (action === 'sit') {
        posY = 0.35
        bodyLeanX = 0.15 // Slight forward lean
        if (leftLegRef.current) { leftLegRef.current.rotation.x = -Math.PI / 1.8; leftLegRef.current.rotation.z = 0.3 }
        if (rightLegRef.current) { rightLegRef.current.rotation.x = -Math.PI / 1.8; rightLegRef.current.rotation.z = -0.3 }
        lArmX = -Math.PI / 4  // Arm resting on knee
        rArmX = -Math.PI / 6
      } else if (action === 'talk') {
        posY = 0.78
        // Head bob during speech
        headBobY = 0.55 + Math.sin(phase * 2) * 0.03
        // One hand gesturing
        rArmX = -Math.PI / 6 + Math.sin(phase * 3) * 0.15
        lArmX = 0
      }

      if (action !== 'sit') {
        if (leftLegRef.current) leftLegRef.current.rotation.z = 0
        if (rightLegRef.current) rightLegRef.current.rotation.z = 0
      }

      if (leftArmRef.current) leftArmRef.current.rotation.x = lArmX
      if (rightArmRef.current) rightArmRef.current.rotation.x = rArmX
      if (bodyRef.current) {
        bodyRef.current.position.y = posY
        bodyRef.current.rotation.x = bodyLeanX
      }
      if (headRef.current) {
        headRef.current.position.y = headBobY
      }
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
            {/* Tool in Right Hand — positions aligned to hand at [0, -0.62, 0] */}
            {equippedItem === 'stick' && (
              <mesh position={[0, -0.65, 0.15]} rotation={[Math.PI / 4, 0, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.8, 4]} />
                <meshStandardMaterial color="#6b4c3a" flatShading />
              </mesh>
            )}
            {equippedItem === 'axe' && (
              <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 4, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.03, 0.03, 0.7, 4]} />
                  <meshStandardMaterial color="#6b4c3a" />
                </mesh>
                <mesh position={[0, 0.25, 0.1]} castShadow>
                  <boxGeometry args={[0.05, 0.15, 0.25]} />
                  <meshStandardMaterial color="#8899aa" />
                </mesh>
              </group>
            )}
            {equippedItem === 'hammer' && (
              <group position={[0, -0.65, 0.12]} rotation={[Math.PI / 4, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
                  <meshStandardMaterial color="#6b4c3a" />
                </mesh>
                <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.2, 0.06]} />
                  <meshStandardMaterial color="#333333" />
                </mesh>
              </group>
            )}
            {equippedItem === 'fishing-rod' && (
              <group position={[0, -0.6, 0.2]} rotation={[Math.PI / 3, 0, 0.1]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.015, 0.025, 2.5, 6]} />
                  <meshStandardMaterial color="#4a705e" />
                </mesh>
                <mesh position={[0, 1.25, 0]} castShadow>
                  <boxGeometry args={[0.01, 0.01, 2]} />
                  <meshStandardMaterial color="#eeeeee" transparent opacity={0.6} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* Head */}
        <group ref={headRef} position={[0, 0.55, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42 * hs, 0.42 * hs, 0.42 * hs]} />
            <meshStandardMaterial color={a.skinTone} flatShading />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.08 * hs, 0.03, 0.21 * hs]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.08 * hs, 0.03, 0.21 * hs]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          {/* Hair */}
          {a.hairStyle === 1 && (
            <mesh position={[0, 0.23, 0]} castShadow>
              <boxGeometry args={[0.46 * hs, 0.12, 0.46 * hs]} />
              <meshStandardMaterial color={a.hairColor} flatShading />
            </mesh>
          )}
          {a.hairStyle === 2 && (
            <mesh position={[0, 0.27, 0]} castShadow>
              <coneGeometry args={[0.22 * hs, 0.25, 6]} />
              <meshStandardMaterial color={a.hairColor} flatShading />
            </mesh>
          )}
          {a.hairStyle === 3 && (
            <>
              <mesh position={[0, 0.23, 0]} castShadow>
                <boxGeometry args={[0.48 * hs, 0.16, 0.48 * hs]} />
                <meshStandardMaterial color={a.hairColor} flatShading />
              </mesh>
              <mesh position={[0, 0.05, -0.18 * hs]} castShadow>
                <boxGeometry args={[0.46 * hs, 0.4, 0.08]} />
                <meshStandardMaterial color={a.hairColor} flatShading />
              </mesh>
            </>
          )}

          {/* Hat */}
          {a.hasHat && (
            <>
              <mesh position={[0, 0.30, 0]} castShadow>
                <cylinderGeometry args={[0.26 * hs, 0.26 * hs, 0.18, 8]} />
                <meshStandardMaterial color={a.hatColor} flatShading />
              </mesh>
              <mesh position={[0, 0.23, 0]} castShadow>
                <cylinderGeometry args={[0.36 * hs, 0.36 * hs, 0.04, 8]} />
                <meshStandardMaterial color={a.hatColor} flatShading />
              </mesh>
            </>
          )}
        </group>
      </group>
    </group>
  )
})

export default CharacterMesh
