import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { createPlanet } from '../utils/planet.js'

// Homepage rotating Earth — uses the same planet generator as the game
// so the preview matches what you'll get when you Create World.
function PreviewPlanet({ config }) {
  const earthRef = useRef()
  const cloudsRef = useRef()

  const planet = useMemo(() => createPlanet({
    radius: 1.6,
    detail: 5,
    seed: 1337,
    amplitude: 0.18,
    waterLevel: config.waterLevel,
    season: 1
  }), [config.waterLevel])

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.18
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.05
  })

  return (
    <group>
      <mesh ref={earthRef} geometry={planet.geometry}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} />
      </mesh>

      {/* Water sphere */}
      <mesh>
        <icosahedronGeometry args={[planet.waterRadius, 4]} />
        <meshStandardMaterial
          color="#1f4f7a"
          transparent
          opacity={0.85}
          roughness={0.2}
          flatShading
        />
      </mesh>

      <mesh ref={cloudsRef}>
        <icosahedronGeometry args={[1.78, 2]} />
        <meshStandardMaterial
          color="#f4ead5"
          transparent
          opacity={0.12}
          flatShading
        />
      </mesh>

      <mesh>
        <icosahedronGeometry args={[1.92, 3]} />
        <meshBasicMaterial
          color="#6db4ff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export default function Earth({ config }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.3} color="#fff5d6" />
      <directionalLight position={[-5, -2, -3]} intensity={0.3} color="#6db4ff" />
      <PreviewPlanet config={config} />
    </Canvas>
  )
}
