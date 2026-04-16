import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createPlanet,
  updatePlanetSeasonColors,
  scatterDecorations,
  generateVillages,
  generateRoads,
  scatterGrass,
  scatterVillageProps
} from '../utils/planet.js'

// SCALE REFERENCE (world units, player = 1.8 units tall)
// Tree:   ~8 units  |  Pine: ~10  |  Palm: ~10
// House:  ~5.5      |  Shop: ~6   |  Tower: ~11  |  Market: ~4.5
// Rock:   ~2        |  Bush: ~1.8 |  Lamp: ~3.5
// Cart:   ~1.8      |  Barrel: 1.2

export default function Planet({ config, season, onReady, children }) {
  // Planet geometry is built once per world config — NOT per season.
  // Season only changes vertex colors, handled separately below.
  const planet = useMemo(() => createPlanet({
    radius: 200,
    detail: 7,
    seed: 1337,
    amplitude: 18 + config.worldSize * 12,
    waterLevel: config.waterLevel,
    season
  }), [config.worldSize, config.waterLevel])

  // Live season color update — no geometry rebuild, no player respawn.
  useEffect(() => {
    updatePlanetSeasonColors(planet, season)
  }, [planet, season])

  const decor    = useMemo(() => scatterDecorations(planet), [planet])
  const villages = useMemo(() => generateVillages(planet, 9), [planet])
  const { segments: roadSegs, lamps } = useMemo(() => generateRoads(planet, villages), [planet, villages])
  const grass    = useMemo(() => scatterGrass(planet, villages), [planet, villages])
  const props    = useMemo(() => scatterVillageProps(villages, planet), [villages, planet])

  useEffect(() => { onReady?.() }, [planet, decor, villages])

  return (
    <group>
      <mesh geometry={planet.geometry} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>

      <Ocean planet={planet} />

      <DecorationField items={decor.trees}     kind="tree" />
      <DecorationField items={decor.pines}     kind="pine" />
      <DecorationField items={decor.palms}     kind="palm" />
      <DecorationField items={decor.rocks}     kind="rock" />
      <DecorationField items={decor.bushes}    kind="bush" />
      <DecorationField items={decor.flowers}   kind="flower" season={season} />
      <DecorationField items={decor.cacti}     kind="cactus" />
      <DecorationField items={decor.mushrooms} kind="mushroom" />

      <GrassField blades={grass} season={season} />

      <RoadNetwork segments={roadSegs} />
      <StreetLamps items={lamps} />

      {villages.map((v, i) => <Village key={i} village={v} />)}
      <PropField props={props} />

      {children?.(planet, villages)}
    </group>
  )
}

// Each KIND_DEF builds geometry with base at y=0 so position = exact ground point.
const KIND_DEFS = {
  tree: {
    canopy: () => new THREE.SphereGeometry(2.2, 7, 5).translate(0, 6.4, 0),
    canopyColor: '#3a6b2c',
    trunk: () => new THREE.CylinderGeometry(0.35, 0.5, 5.2, 7).translate(0, 2.6, 0),
    trunkColor: '#4a2f15',
  },
  pine: {
    canopy: () => {
      const g1 = new THREE.ConeGeometry(2.0, 3.5, 7).translate(0, 3.5, 0)
      const g2 = new THREE.ConeGeometry(1.5, 2.8, 7).translate(0, 5.8, 0)
      const g3 = new THREE.ConeGeometry(1.0, 2.0, 7).translate(0, 7.6, 0)
      return mergeBufferGeometries([g1, g2, g3])
    },
    canopyColor: '#2d5a22',
    trunk: () => new THREE.CylinderGeometry(0.28, 0.38, 2.8, 7).translate(0, 1.4, 0),
    trunkColor: '#3a2515',
  },
  palm: {
    canopy: () => new THREE.SphereGeometry(2.0, 6, 4).translate(0, 8.0, 0),
    canopyColor: '#5a9a3a',
    trunk: () => new THREE.CylinderGeometry(0.22, 0.32, 7.5, 7).translate(0, 3.75, 0),
    trunkColor: '#7a5a30',
  },
  rock: {
    canopy: () => new THREE.DodecahedronGeometry(1.2, 0).translate(0, 1.0, 0),
    canopyColor: '#7a7068',
  },
  bush: {
    canopy: () => new THREE.SphereGeometry(1.0, 6, 4).translate(0, 0.8, 0),
    canopyColor: '#4a7a3a',
  },
  flower: {
    canopy: () => {
      const stem = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5).translate(0, 0.35, 0)
      const bloom = new THREE.SphereGeometry(0.28, 6, 4).translate(0, 0.85, 0)
      return mergeBufferGeometries([stem, bloom])
    },
    canopyColor: '#ff8fbf',
  },
  cactus: {
    canopy: () => new THREE.CylinderGeometry(0.35, 0.45, 2.8, 7).translate(0, 1.4, 0),
    canopyColor: '#3a6a3a',
  },
  mushroom: {
    canopy: () => {
      const stem = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 6).translate(0, 0.25, 0)
      const cap  = new THREE.SphereGeometry(0.45, 7, 5).translate(0, 0.6, 0)
      return mergeBufferGeometries([stem, cap])
    },
    canopyColor: '#b04545',
  },
}

function mergeBufferGeometries(geos) {
  const positions = []
  const indices = []
  let offset = 0
  for (const g of geos) {
    const p = g.attributes.position.array
    for (let i = 0; i < p.length; i++) positions.push(p[i])
    if (g.index) {
      for (let i = 0; i < g.index.array.length; i++) indices.push(g.index.array[i] + offset)
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) indices.push(i + offset)
    }
    offset += g.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setIndex(indices)
  out.computeVertexNormals()
  return out
}

function DecorationField({ items, kind, season = 1 }) {
  const canopyRef = useRef()
  const trunkRef  = useRef()
  const def = KIND_DEFS[kind]

  const canopyColor = useMemo(() => {
    if (kind !== 'flower') return def.canopyColor
    if (season < 1) return '#ff8fbf'
    if (season < 2) return '#ffe45a'
    if (season < 3) return '#e8743a'
    return '#dddde8'
  }, [kind, season, def.canopyColor])

  const canopyGeo = useMemo(() => def.canopy(), [kind])
  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: canopyColor, flatShading: true,
    emissive: kind === 'flower' ? canopyColor : '#000',
    emissiveIntensity: kind === 'flower' ? 0.15 : 0
  }), [canopyColor, kind])

  const trunkGeo = useMemo(() => def.trunk?.() ?? null, [kind])
  const trunkMat = useMemo(() => def.trunk
    ? new THREE.MeshStandardMaterial({ color: def.trunkColor, flatShading: true })
    : null, [kind])

  useEffect(() => {
    if (!canopyRef.current || !canopyGeo || items.length === 0) return
    const dummy = new THREE.Object3D()
    const worldUp = new THREE.Vector3(0, 1, 0)
    items.forEach((item, i) => {
      const upQ  = new THREE.Quaternion().setFromUnitVectors(worldUp, item.normal)
      const yawQ = new THREE.Quaternion().setFromAxisAngle(item.normal, item.rotY || 0)
      dummy.position.copy(item.position)
      dummy.quaternion.copy(yawQ).multiply(upQ)
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      canopyRef.current.setMatrixAt(i, dummy.matrix)
    })
    canopyRef.current.instanceMatrix.needsUpdate = true

    if (trunkRef.current && trunkGeo) {
      items.forEach((item, i) => {
        const upQ  = new THREE.Quaternion().setFromUnitVectors(worldUp, item.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(item.normal, item.rotY || 0)
        dummy.position.copy(item.position)
        dummy.quaternion.copy(yawQ).multiply(upQ)
        dummy.scale.setScalar(item.scale)
        dummy.updateMatrix()
        trunkRef.current.setMatrixAt(i, dummy.matrix)
      })
      trunkRef.current.instanceMatrix.needsUpdate = true
    }
  }, [items, kind, canopyGeo, trunkGeo])

  if (items.length === 0) return null
  return (
    <>
      <instancedMesh ref={canopyRef} args={[canopyGeo, canopyMat, items.length]} castShadow receiveShadow frustumCulled={false} />
      {trunkGeo && <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, items.length]} castShadow frustumCulled={false} />}
    </>
  )
}

// Instanced grass blades — simple thin pyramids pointing up
function GrassField({ blades, season }) {
  const meshRef = useRef()

  const { geo, mat } = useMemo(() => {
    const g = new THREE.ConeGeometry(0.08, 0.8, 3).translate(0, 0.4, 0)
    const color = season < 1 ? '#7ac450' : season < 2 ? '#5a9a38' : season < 3 ? '#b58a3a' : '#dde8e8'
    const m = new THREE.MeshStandardMaterial({ color, flatShading: true })
    return { geo: g, mat: m }
  }, [season])

  useEffect(() => {
    if (!meshRef.current || blades.length === 0) return
    const dummy = new THREE.Object3D()
    const worldUp = new THREE.Vector3(0, 1, 0)
    blades.forEach((b, i) => {
      const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, b.normal)
      const yawQ = new THREE.Quaternion().setFromAxisAngle(b.normal, b.rotY)
      dummy.position.copy(b.position)
      dummy.quaternion.copy(yawQ).multiply(upQ)
      dummy.scale.setScalar(b.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [blades])

  if (blades.length === 0) return null
  return <instancedMesh ref={meshRef} args={[geo, mat, blades.length]} frustumCulled={false} />
}

// Roads rendered as a series of flat box segments between consecutive path points
function RoadNetwork({ segments }) {
  const geo = useMemo(() => {
    if (segments.length === 0) return null
    // Build one merged BufferGeometry of all road quads
    const positions = []
    const indices = []
    const worldUp = new THREE.Vector3(0, 1, 0)
    let vertexCount = 0

    segments.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i]
        const b = path[i + 1]
        const dir = b.point.clone().sub(a.point)
        const up = a.normal.clone()
        const right = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(1.2)
        const lift = up.clone().multiplyScalar(0.05)

        const p1 = a.point.clone().add(right).add(lift)
        const p2 = a.point.clone().sub(right).add(lift)
        const p3 = b.point.clone().sub(right).add(lift)
        const p4 = b.point.clone().add(right).add(lift)

        positions.push(p1.x, p1.y, p1.z)
        positions.push(p2.x, p2.y, p2.z)
        positions.push(p3.x, p3.y, p3.z)
        positions.push(p4.x, p4.y, p4.z)

        indices.push(vertexCount, vertexCount + 1, vertexCount + 2)
        indices.push(vertexCount, vertexCount + 2, vertexCount + 3)
        vertexCount += 4
      }
    })

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [segments])

  if (!geo) return null
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#3a2f25" flatShading roughness={0.95} />
    </mesh>
  )
}

// Slow swirling transparent meshes to simulate low-poly waves
function Ocean({ planet }) {
  const water1 = useRef()
  const water2 = useRef()
  useFrame((rs) => {
    const t = rs.clock.elapsedTime
    if (water1.current) {
      water1.current.rotation.y = t * 0.02
      water1.current.rotation.x = t * 0.01
    }
    if (water2.current) {
      water2.current.rotation.y = -t * 0.015
      water2.current.rotation.z = t * 0.01
    }
  })
  return (
    <group>
      <mesh ref={water1} frustumCulled={false}>
        <icosahedronGeometry args={[planet.waterRadius, 6]} />
        <meshStandardMaterial color="#226699" transparent opacity={0.65} roughness={0.1} metalness={0.1} flatShading />
      </mesh>
      <mesh ref={water2} scale={1.002} frustumCulled={false}>
        <icosahedronGeometry args={[planet.waterRadius, 6]} />
        <meshStandardMaterial color="#1f4f7a" transparent opacity={0.55} roughness={0.1} metalness={0.2} flatShading />
      </mesh>
    </group>
  )
}

// Street lamps with emissive glow on top (no real point lights)
function StreetLamps({ items }) {
  const poleRef = useRef()
  const bulbRef = useRef()

  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6).translate(0, 1.6, 0), [])
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2a', flatShading: true }), [])
  const bulbGeo = useMemo(() => new THREE.SphereGeometry(0.28, 7, 5).translate(0, 3.3, 0), [])
  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffd888',
    emissive: '#ffb044',
    emissiveIntensity: 1.4,
    flatShading: true
  }), [])

  useEffect(() => {
    if (!poleRef.current || items.length === 0) return
    const dummy = new THREE.Object3D()
    const worldUp = new THREE.Vector3(0, 1, 0)
    items.forEach((item, i) => {
      const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, item.normal)
      dummy.position.copy(item.point)
      dummy.quaternion.copy(upQ)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      poleRef.current.setMatrixAt(i, dummy.matrix)
      bulbRef.current.setMatrixAt(i, dummy.matrix)
    })
    poleRef.current.instanceMatrix.needsUpdate = true
    bulbRef.current.instanceMatrix.needsUpdate = true
  }, [items])

  if (items.length === 0) return null
  return (
    <>
      <instancedMesh ref={poleRef} args={[poleGeo, poleMat, items.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={bulbRef} args={[bulbGeo, bulbMat, items.length]} frustumCulled={false} />
    </>
  )
}

// Static props: many types — barrel, cart, bench, well, fence, lantern, crate, flowerbox
function PropField({ props }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {props.map((p, i) => {
        const upQ  = new THREE.Quaternion().setFromUnitVectors(worldUp, p.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(p.normal, p.rotY)
        return (
          <group key={i} position={p.position} quaternion={yawQ.clone().multiply(upQ)} scale={p.scale}>
            {p.type === 'barrel'    && <PropBarrel />}
            {p.type === 'cart'      && <PropCart />}
            {p.type === 'bench'     && <PropBench />}
            {p.type === 'well'      && <PropWell />}
            {p.type === 'fence'     && <PropFence />}
            {p.type === 'lantern'   && <PropLantern />}
            {p.type === 'crate'     && <PropCrate />}
            {p.type === 'flowerbox' && <PropFlowerbox />}
          </group>
        )
      })}
    </group>
  )
}

function PropBarrel() {
  return (
    <>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.35, 1.1, 8]} />
        <meshStandardMaterial color="#6a4525" flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.07, 8]} />
        <meshStandardMaterial color="#3a2010" flatShading />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.07, 8]} />
        <meshStandardMaterial color="#3a2010" flatShading />
      </mesh>
    </>
  )
}

function PropCart() {
  return (
    <>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 0.9]} />
        <meshStandardMaterial color="#7a4a20" flatShading />
      </mesh>
      {[[ 0.55, 0.5], [-0.55, 0.5], [0.55, -0.5], [-0.55, -0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.09, 8]} />
          <meshStandardMaterial color="#3a2010" flatShading />
        </mesh>
      ))}
      <mesh position={[1.1, 0.85, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.8, 0.07, 0.07]} />
        <meshStandardMaterial color="#5a3010" flatShading />
      </mesh>
    </>
  )
}

function PropBench() {
  return (
    <>
      {/* Seat */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial color="#8a5a28" flatShading />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.9, -0.22]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.8, 0.45, 0.1]} />
        <meshStandardMaterial color="#7a4a20" flatShading />
      </mesh>
      {/* Legs */}
      {[[-0.7, 0.3], [0.7, 0.3], [-0.7, -0.3], [0.7, -0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.27, z]}>
          <boxGeometry args={[0.1, 0.55, 0.1]} />
          <meshStandardMaterial color="#5a3010" flatShading />
        </mesh>
      ))}
    </>
  )
}

function PropWell() {
  return (
    <>
      {/* Stone ring */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.0, 1.1, 10, 1, true]} />
        <meshStandardMaterial color="#8a7a60" flatShading side={2} />
      </mesh>
      {/* Top ring */}
      <mesh position={[0, 1.12, 0]}>
        <torusGeometry args={[0.9, 0.1, 6, 12]} />
        <meshStandardMaterial color="#6a5a44" flatShading />
      </mesh>
      {/* Roof supports */}
      {[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.8, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.5, 5]} />
          <meshStandardMaterial color="#5a3a18" flatShading />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0, 2.7, 0]}>
        <coneGeometry args={[1.3, 0.8, 4]} />
        <meshStandardMaterial color="#7a3a20" flatShading />
      </mesh>
      {/* Rope drum */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 1.4, 6]} />
        <meshStandardMaterial color="#5a3a18" flatShading />
      </mesh>
      {/* Water bucket */}
      <mesh position={[0.5, 1.2, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.35, 7]} />
        <meshStandardMaterial color="#4a3010" flatShading />
      </mesh>
    </>
  )
}

function PropFence() {
  return (
    <>
      {/* Two horizontal rails */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.07]} />
        <meshStandardMaterial color="#6a4520" flatShading />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.07]} />
        <meshStandardMaterial color="#6a4520" flatShading />
      </mesh>
      {/* Posts */}
      {[-0.65, 0, 0.65].map((x, i) => (
        <mesh key={i} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.1, 0.9, 0.1]} />
          <meshStandardMaterial color="#5a3515" flatShading />
        </mesh>
      ))}
    </>
  )
}

function PropLantern() {
  return (
    <>
      {/* Pole */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#2a2a2a" flatShading />
      </mesh>
      {/* Arm */}
      <mesh position={[0.3, 2.3, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#2a2a2a" flatShading />
      </mesh>
      {/* Lantern cage */}
      <mesh position={[0.6, 2.15, 0]}>
        <boxGeometry args={[0.28, 0.35, 0.28]} />
        <meshStandardMaterial color="#444" flatShading wireframe />
      </mesh>
      {/* Glowing bulb */}
      <mesh position={[0.6, 2.15, 0]}>
        <sphereGeometry args={[0.14, 6, 5]} />
        <meshStandardMaterial color="#ffd888" emissive="#ffaa22" emissiveIntensity={1.8} flatShading />
      </mesh>
    </>
  )
}

function PropCrate() {
  return (
    <mesh position={[0, 0.35, 0]} castShadow>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      <meshStandardMaterial color="#7a5a2a" flatShading />
    </mesh>
  )
}

function PropFlowerbox() {
  return (
    <>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.0, 0.4, 0.35]} />
        <meshStandardMaterial color="#6a3a1a" flatShading />
      </mesh>
      {[[-0.35, 0], [0, 0], [0.35, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]}>
          <sphereGeometry args={[0.18, 6, 5]} />
          <meshStandardMaterial
            color={['#e03060', '#ffe040', '#e060a0'][i]}
            emissive={['#801030', '#806010', '#803060'][i]}
            emissiveIntensity={0.3}
            flatShading
          />
        </mesh>
      ))}
    </>
  )
}

// Village with diverse building types: house, shop, tower, market
function Village({ village }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {village.houses.map((h, i) => {
        const upQ  = new THREE.Quaternion().setFromUnitVectors(worldUp, h.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(h.normal, h.rotY)
        const q = yawQ.clone().multiply(upQ)

        if (h.type === 'tower') return <Tower key={i} pos={h.position} quat={q} scale={h.scale} wallColor={h.wallColor} roofColor={h.roofColor} />
        if (h.type === 'shop') return <Shop key={i} pos={h.position} quat={q} scale={h.scale} wallColor={h.wallColor} roofColor={h.roofColor} />
        if (h.type === 'market') return <Market key={i} pos={h.position} quat={q} scale={h.scale} wallColor={h.wallColor} />
        return <House key={i} pos={h.position} quat={q} scale={h.scale} wallColor={h.wallColor} roofColor={h.roofColor} />
      })}
    </group>
  )
}

function House({ pos, quat, scale, wallColor, roofColor }) {
  return (
    <group position={pos} quaternion={quat} scale={scale}>
      <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.0, 3.5, 4.2]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.8, 2.2, 4]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>
      <mesh position={[0, 1.1, 2.12]}>
        <boxGeometry args={[1.0, 2.0, 0.1]} />
        <meshStandardMaterial color="#4a2f15" flatShading />
      </mesh>
      <mesh position={[1.4, 2.2, 2.12]}>
        <boxGeometry args={[0.9, 0.9, 0.08]} />
        <meshStandardMaterial color="#ffd888" emissive="#ffaa44" emissiveIntensity={0.8} flatShading />
      </mesh>
      <mesh position={[-1.4, 2.2, 2.12]}>
        <boxGeometry args={[0.9, 0.9, 0.08]} />
        <meshStandardMaterial color="#ffd888" emissive="#ffaa44" emissiveIntensity={0.8} flatShading />
      </mesh>
      <mesh position={[0, 4.95, 1.5]} castShadow>
        <boxGeometry args={[0.5, 1.0, 0.5]} />
        <meshStandardMaterial color="#555" flatShading />
      </mesh>
    </group>
  )
}

function Shop({ pos, quat, scale, wallColor, roofColor }) {
  return (
    <group position={pos} quaternion={quat} scale={scale}>
      {/* Wider, shorter building */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.5, 3.2, 4.5]} />
        <meshStandardMaterial color="#d8c08a" flatShading />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[7.0, 0.2, 5.0]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 2.6, 2.4]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[5.5, 0.08, 1.2]} />
        <meshStandardMaterial color="#c03030" flatShading />
      </mesh>
      {/* Big shop window */}
      <mesh position={[0, 1.7, 2.28]}>
        <boxGeometry args={[4.0, 1.8, 0.1]} />
        <meshStandardMaterial color="#ffe8a0" emissive="#ffcc60" emissiveIntensity={1.0} flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[2.2, 1.1, 2.28]}>
        <boxGeometry args={[1.0, 2.2, 0.1]} />
        <meshStandardMaterial color="#4a2f15" flatShading />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 3.8, 2.4]} castShadow>
        <boxGeometry args={[3.0, 0.7, 0.1]} />
        <meshStandardMaterial color="#6a3010" flatShading />
      </mesh>
    </group>
  )
}

function Tower({ pos, quat, scale, wallColor, roofColor }) {
  return (
    <group position={pos} quaternion={quat} scale={scale}>
      {/* Tall stone base */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 7.0, 3.5]} />
        <meshStandardMaterial color="#989080" flatShading />
      </mesh>
      {/* Upper section */}
      <mesh position={[0, 8.0, 0]} castShadow>
        <boxGeometry args={[2.8, 2.0, 2.8]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      {/* Conical roof */}
      <mesh position={[0, 10.2, 0]} castShadow>
        <coneGeometry args={[2.2, 2.5, 6]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>
      {/* Windows on base */}
      {[2.5, 5.0].map(y => (
        <mesh key={y} position={[0, y, 1.76]}>
          <boxGeometry args={[0.5, 0.9, 0.1]} />
          <meshStandardMaterial color="#ffd888" emissive="#ffaa44" emissiveIntensity={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Market({ pos, quat, scale, wallColor }) {
  return (
    <group position={pos} quaternion={quat} scale={scale}>
      {/* Low stone base */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[3.5, 0.3, 2.5]} />
        <meshStandardMaterial color="#9a8a70" flatShading />
      </mesh>
      {/* 4 support poles */}
      {[[-1.5, -1.0], [1.5, -1.0], [-1.5, 1.0], [1.5, 1.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.8, z]}>
          <cylinderGeometry args={[0.1, 0.1, 3.0, 6]} />
          <meshStandardMaterial color="#6a4520" flatShading />
        </mesh>
      ))}
      {/* Cloth canopy */}
      <mesh position={[0, 3.4, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.8, 0.1, 2.8]} />
        <meshStandardMaterial color="#c85050" flatShading />
      </mesh>
      {/* Display table */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[3.0, 0.15, 1.8]} />
        <meshStandardMaterial color="#7a5525" flatShading />
      </mesh>
      {/* Fruit/goods on table */}
      <mesh position={[-0.9, 1.45, 0]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <meshStandardMaterial color="#e04030" flatShading />
      </mesh>
      <mesh position={[-0.3, 1.45, 0.2]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <meshStandardMaterial color="#e0c030" flatShading />
      </mesh>
      <mesh position={[0.6, 1.45, -0.1]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <meshStandardMaterial color="#6a6a40" flatShading />
      </mesh>
      <mesh position={[1.1, 1.45, 0.3]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <meshStandardMaterial color="#d04a20" flatShading />
      </mesh>
    </group>
  )
}
