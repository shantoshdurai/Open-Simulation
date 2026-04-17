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
  scatterVillageProps,
  scatterFarms,
  scatterWildlife,
  scatterLandmarks,
  scatterOutposts
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
  const farms    = useMemo(() => scatterFarms(planet, villages), [planet, villages])
  const wildlife = useMemo(() => scatterWildlife(planet), [planet])
  const landmarks = useMemo(() => scatterLandmarks(planet, villages), [planet, villages])
  const outposts  = useMemo(() => scatterOutposts(planet, villages, landmarks), [planet, villages, landmarks])

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

      <CropField crops={farms.crops} />
      <PenField pens={farms.pens} />
      <AnimalField animals={farms.animals} />
      <WildlifeField wildlife={wildlife} />
      <LandmarkField landmarks={landmarks} />
      <OutpostField outposts={outposts} />

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

// ── Crops (wheat, corn, pumpkin, cabbage, dates, cassava) ─────────────────
function CropField({ crops }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  const byType = useMemo(() => {
    const m = {}
    crops.forEach(c => { (m[c.type] ||= []).push(c) })
    return m
  }, [crops])

  return (
    <group>
      {Object.entries(byType).map(([type, items]) => (
        <CropInstances key={type} type={type} items={items} worldUp={worldUp} />
      ))}
    </group>
  )
}

function CropInstances({ type, items, worldUp }) {
  const canopyRef = useRef()
  const stemRef = useRef()

  const { canopyGeo, canopyColor, stemGeo, stemColor } = useMemo(() => {
    switch (type) {
      case 'wheat':
        return {
          canopyGeo: new THREE.ConeGeometry(0.18, 0.55, 4).translate(0, 0.85, 0),
          canopyColor: '#d9b962',
          stemGeo: new THREE.CylinderGeometry(0.03, 0.03, 0.7, 3).translate(0, 0.35, 0),
          stemColor: '#7a8a3a'
        }
      case 'corn':
        return {
          canopyGeo: new THREE.CylinderGeometry(0.12, 0.1, 0.45, 5).translate(0, 1.0, 0),
          canopyColor: '#f0c040',
          stemGeo: new THREE.CylinderGeometry(0.05, 0.05, 1.1, 4).translate(0, 0.55, 0),
          stemColor: '#3a7a3a'
        }
      case 'pumpkin':
        return {
          canopyGeo: new THREE.SphereGeometry(0.35, 7, 5).translate(0, 0.3, 0),
          canopyColor: '#e07020',
          stemGeo: new THREE.CylinderGeometry(0.04, 0.05, 0.12, 4).translate(0, 0.55, 0),
          stemColor: '#3a5a2a'
        }
      case 'cabbage':
        return {
          canopyGeo: new THREE.SphereGeometry(0.3, 6, 4).translate(0, 0.2, 0),
          canopyColor: '#6aaa4a',
          stemGeo: null, stemColor: null
        }
      case 'dates':
        return {
          canopyGeo: new THREE.SphereGeometry(0.7, 6, 4).translate(0, 2.5, 0),
          canopyColor: '#5a9a3a',
          stemGeo: new THREE.CylinderGeometry(0.12, 0.16, 2.5, 5).translate(0, 1.25, 0),
          stemColor: '#7a5a30'
        }
      case 'cassava':
        return {
          canopyGeo: new THREE.ConeGeometry(0.5, 0.9, 5).translate(0, 0.9, 0),
          canopyColor: '#4a8a3a',
          stemGeo: new THREE.CylinderGeometry(0.05, 0.07, 0.8, 4).translate(0, 0.4, 0),
          stemColor: '#6a4520'
        }
      default:
        return {
          canopyGeo: new THREE.SphereGeometry(0.25, 6, 4).translate(0, 0.3, 0),
          canopyColor: '#5a9a4a',
          stemGeo: null, stemColor: null
        }
    }
  }, [type])

  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: canopyColor, flatShading: true }), [canopyColor])
  const stemMat = useMemo(() => stemColor ? new THREE.MeshStandardMaterial({ color: stemColor, flatShading: true }) : null, [stemColor])

  useEffect(() => {
    if (!canopyRef.current || items.length === 0) return
    const dummy = new THREE.Object3D()
    items.forEach((c, i) => {
      const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, c.normal)
      const yawQ = new THREE.Quaternion().setFromAxisAngle(c.normal, c.rotY || 0)
      dummy.position.copy(c.position)
      dummy.quaternion.copy(yawQ).multiply(upQ)
      dummy.scale.setScalar(c.scale || 1)
      dummy.updateMatrix()
      canopyRef.current.setMatrixAt(i, dummy.matrix)
      if (stemRef.current) stemRef.current.setMatrixAt(i, dummy.matrix)
    })
    canopyRef.current.instanceMatrix.needsUpdate = true
    if (stemRef.current) stemRef.current.instanceMatrix.needsUpdate = true
  }, [items, worldUp])

  if (items.length === 0) return null
  return (
    <>
      <instancedMesh ref={canopyRef} args={[canopyGeo, canopyMat, items.length]} castShadow frustumCulled={false} />
      {stemGeo && stemMat && (
        <instancedMesh ref={stemRef} args={[stemGeo, stemMat, items.length]} castShadow frustumCulled={false} />
      )}
    </>
  )
}

// ── Animal pens: small fenced rectangles ─────────────────────────────────
function PenField({ pens }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {pens.map((p, i) => {
        const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, p.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(p.normal, p.rotY)
        const q = yawQ.clone().multiply(upQ)
        return (
          <group key={i} position={p.position} quaternion={q} scale={p.scale}>
            <Pen />
          </group>
        )
      })}
    </group>
  )
}

function Pen() {
  const posts = []
  for (let x = -3; x <= 3; x += 1.5) {
    posts.push([x, 0, -2])
    posts.push([x, 0, 2])
  }
  for (let z = -2 + 1.5; z < 2; z += 1.5) {
    posts.push([-3, 0, z])
    posts.push([3, 0, z])
  }
  return (
    <group>
      {posts.map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.45, z]}>
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          <meshStandardMaterial color="#5a3515" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.6, -2]}><boxGeometry args={[6.1, 0.06, 0.05]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
      <mesh position={[0, 0.6, 2]}><boxGeometry args={[6.1, 0.06, 0.05]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
      <mesh position={[0, 0.3, -2]}><boxGeometry args={[6.1, 0.06, 0.05]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
      <mesh position={[0, 0.3, 2]}><boxGeometry args={[6.1, 0.06, 0.05]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
      <mesh position={[-3, 0.6, 0]}><boxGeometry args={[0.05, 0.06, 4.1]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
      <mesh position={[3, 0.6, 0]}><boxGeometry args={[0.05, 0.06, 4.1]} /><meshStandardMaterial color="#6a4520" flatShading /></mesh>
    </group>
  )
}

// ── Animals (farm + wild) ────────────────────────────────────────────────
function AnimalField({ animals }) { return <AnimalGroup animals={animals} /> }
function WildlifeField({ wildlife }) { return <AnimalGroup animals={wildlife} wander /> }

function AnimalGroup({ animals, wander = false }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {animals.map((a, i) => {
        const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, a.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(a.normal, a.rotY)
        const q = yawQ.clone().multiply(upQ)
        return (
          <group key={i} position={a.position} quaternion={q}>
            <AnimalMesh type={a.type} phase={a.phase} wander={wander} />
          </group>
        )
      })}
    </group>
  )
}

function AnimalMesh({ type, phase = 0, wander = false }) {
  const groupRef = useRef()
  useFrame((rs) => {
    if (!groupRef.current) return
    const t = rs.clock.elapsedTime + phase
    groupRef.current.position.y = Math.abs(Math.sin(t * 1.2)) * 0.03
    if (wander) groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3
  })

  const body = ANIMAL_PRESETS[type] || ANIMAL_PRESETS.sheep
  return (
    <group ref={groupRef}>
      <mesh position={[0, body.legLen + body.bodyH / 2, 0]} castShadow>
        <boxGeometry args={[body.bodyL, body.bodyH, body.bodyW]} />
        <meshStandardMaterial color={body.color} flatShading />
      </mesh>
      {body.hasHead && (
        <mesh position={[body.bodyL / 2 + body.headSize * 0.5, body.legLen + body.bodyH * 0.75, 0]} castShadow>
          <boxGeometry args={[body.headSize, body.headSize, body.headSize]} />
          <meshStandardMaterial color={body.headColor || body.color} flatShading />
        </mesh>
      )}
      {body.legLen > 0 && [
        [ body.bodyL * 0.35,  body.bodyW * 0.35],
        [ body.bodyL * 0.35, -body.bodyW * 0.35],
        [-body.bodyL * 0.35,  body.bodyW * 0.35],
        [-body.bodyL * 0.35, -body.bodyW * 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, body.legLen / 2, z]} castShadow>
          <boxGeometry args={[body.legW, body.legLen, body.legW]} />
          <meshStandardMaterial color={body.legColor || body.color} flatShading />
        </mesh>
      ))}
      {body.hasTail && (
        <mesh position={[-body.bodyL / 2 - 0.05, body.legLen + body.bodyH * 0.6, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.08]} />
          <meshStandardMaterial color={body.color} flatShading />
        </mesh>
      )}
      {body.horns === 'antlers' && (
        <>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.5, body.legLen + body.bodyH + body.headSize * 0.5, body.headSize * 0.3]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.04, 0.35, 0.04]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.5, body.legLen + body.bodyH + body.headSize * 0.5, -body.headSize * 0.3]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.04, 0.35, 0.04]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
        </>
      )}
      {body.horns === 'cow' && (
        <>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.5, body.legLen + body.bodyH + body.headSize * 0.4, body.headSize * 0.35]} rotation={[0, 0, 0.5]}>
            <coneGeometry args={[0.06, 0.22, 4]} />
            <meshStandardMaterial color="#f0e8c0" flatShading />
          </mesh>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.5, body.legLen + body.bodyH + body.headSize * 0.4, -body.headSize * 0.35]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.06, 0.22, 4]} />
            <meshStandardMaterial color="#f0e8c0" flatShading />
          </mesh>
        </>
      )}
      {type === 'chicken' && (
        <>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.5 + 0.08, body.legLen + body.bodyH * 0.8, 0]}>
            <coneGeometry args={[0.04, 0.1, 4]} />
            <meshStandardMaterial color="#e8a030" flatShading />
          </mesh>
          <mesh position={[body.bodyL / 2 + body.headSize * 0.2, body.legLen + body.bodyH + body.headSize * 0.4, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.05]} />
            <meshStandardMaterial color="#d03030" flatShading />
          </mesh>
        </>
      )}
    </group>
  )
}

const ANIMAL_PRESETS = {
  sheep:    { bodyL: 1.1, bodyW: 0.55, bodyH: 0.55, legLen: 0.4, legW: 0.1, color: '#efe8dc', headColor: '#3a2a1a', legColor: '#3a2a1a', headSize: 0.28, hasHead: true, hasTail: true },
  cow:      { bodyL: 1.5, bodyW: 0.7, bodyH: 0.75, legLen: 0.55, legW: 0.12, color: '#f0e4d0', headColor: '#2a1a0a', legColor: '#3a2a1a', headSize: 0.34, hasHead: true, hasTail: true, horns: 'cow' },
  pig:      { bodyL: 1.0, bodyW: 0.5, bodyH: 0.5, legLen: 0.3, legW: 0.1, color: '#e8b0a0', headSize: 0.3, hasHead: true, hasTail: true },
  goat:     { bodyL: 1.0, bodyW: 0.45, bodyH: 0.5, legLen: 0.45, legW: 0.09, color: '#d0c0a0', headColor: '#b0a080', headSize: 0.26, hasHead: true, hasTail: true, horns: 'antlers' },
  reindeer: { bodyL: 1.3, bodyW: 0.55, bodyH: 0.7, legLen: 0.6, legW: 0.1, color: '#9a7a5a', headColor: '#7a5a3a', headSize: 0.32, hasHead: true, hasTail: true, horns: 'antlers' },
  chicken:  { bodyL: 0.35, bodyW: 0.28, bodyH: 0.3, legLen: 0.18, legW: 0.05, color: '#f8f0e0', headColor: '#f8f0e0', legColor: '#e8a030', headSize: 0.18, hasHead: true, hasTail: false },
  deer:     { bodyL: 1.2, bodyW: 0.5, bodyH: 0.65, legLen: 0.6, legW: 0.08, color: '#b28a5a', headColor: '#a07a48', headSize: 0.3, hasHead: true, hasTail: true, horns: 'antlers' },
  rabbit:   { bodyL: 0.4, bodyW: 0.25, bodyH: 0.3, legLen: 0.1, legW: 0.06, color: '#d8d0c0', headSize: 0.2, hasHead: true, hasTail: true },
  fox:      { bodyL: 0.7, bodyW: 0.28, bodyH: 0.32, legLen: 0.22, legW: 0.06, color: '#c66a30', headColor: '#c66a30', legColor: '#3a2010', headSize: 0.22, hasHead: true, hasTail: true },
  monkey:   { bodyL: 0.55, bodyW: 0.3, bodyH: 0.4, legLen: 0.3, legW: 0.07, color: '#7a5a3a', headSize: 0.24, hasHead: true, hasTail: true },
  tapir:    { bodyL: 1.1, bodyW: 0.5, bodyH: 0.55, legLen: 0.4, legW: 0.1, color: '#3a2a2a', headSize: 0.26, hasHead: true, hasTail: true },
  camel:    { bodyL: 1.5, bodyW: 0.55, bodyH: 0.9, legLen: 0.85, legW: 0.11, color: '#d8b078', headSize: 0.32, hasHead: true, hasTail: true }
}

// ── Landmarks ────────────────────────────────────────────────────────────
function LandmarkField({ landmarks }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {landmarks.map((lm, i) => {
        const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, lm.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(lm.normal, lm.rotY)
        const q = yawQ.clone().multiply(upQ)
        return (
          <group key={i} position={lm.position} quaternion={q}>
            {lm.type === 'eiffel'     && <LandmarkEiffel />}
            {lm.type === 'lighthouse' && <LandmarkLighthouse />}
            {lm.type === 'pyramid'    && <LandmarkPyramid />}
            {lm.type === 'statue'     && <LandmarkStatue />}
            {lm.type === 'colosseum'  && <LandmarkColosseum />}
            {lm.type === 'pagoda'     && <LandmarkPagoda />}
            {lm.type === 'windmill'   && <LandmarkWindmill />}
          </group>
        )
      })}
    </group>
  )
}

function LandmarkEiffel() {
  const color = '#5a4a3a'
  return (
    <group>
      {[[ 1, 1], [-1, 1], [ 1,-1], [-1,-1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 1.5, 3.5, z * 1.5]} rotation={[0, 0, x > 0 ? -0.2 : 0.2]} castShadow>
          <boxGeometry args={[0.4, 7, 0.4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 7, 0]} castShadow><boxGeometry args={[3, 0.3, 3]} /><meshStandardMaterial color={color} flatShading /></mesh>
      {[[ 1, 1], [-1, 1], [ 1,-1], [-1,-1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.9, 10, z * 0.9]} castShadow>
          <boxGeometry args={[0.3, 6, 0.3]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 13, 0]} castShadow><boxGeometry args={[2, 0.3, 2]} /><meshStandardMaterial color={color} flatShading /></mesh>
      <mesh position={[0, 17, 0]} castShadow><boxGeometry args={[1.2, 8, 1.2]} /><meshStandardMaterial color={color} flatShading /></mesh>
      <mesh position={[0, 23, 0]} castShadow><coneGeometry args={[0.35, 3, 4]} /><meshStandardMaterial color={color} flatShading /></mesh>
      <mesh position={[0, 25, 0]}>
        <sphereGeometry args={[0.25, 6, 5]} />
        <meshStandardMaterial color="#ffe088" emissive="#ffaa44" emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

function LandmarkLighthouse() {
  return (
    <group>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[2.2, 2.6, 2.5, 10]} /><meshStandardMaterial color="#c8c0b0" flatShading /></mesh>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[0, 3 + i * 2, 0]} castShadow>
          <cylinderGeometry args={[1.2 - i * 0.05, 1.3 - i * 0.05, 2, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#e8e0d0' : '#c02828'} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 13.5, 0]} castShadow><cylinderGeometry args={[1.4, 1.4, 0.3, 10]} /><meshStandardMaterial color="#3a3a3a" flatShading /></mesh>
      <mesh position={[0, 14.4, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 1.4, 8]} />
        <meshStandardMaterial color="#ffe088" emissive="#ffcc44" emissiveIntensity={1.4} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 15.5, 0]} castShadow><coneGeometry args={[1.0, 1.2, 8]} /><meshStandardMaterial color="#8a2a2a" flatShading /></mesh>
    </group>
  )
}

function LandmarkPyramid() {
  return (
    <group>
      <mesh position={[0, 6, 0]} castShadow receiveShadow><coneGeometry args={[10, 12, 4]} /><meshStandardMaterial color="#d6b472" flatShading /></mesh>
      <mesh position={[0, 1.5, 7.3]}><boxGeometry args={[1.2, 2.5, 0.3]} /><meshStandardMaterial color="#1a1208" flatShading /></mesh>
    </group>
  )
}

function LandmarkStatue() {
  return (
    <group>
      <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[3, 2.5, 3]} /><meshStandardMaterial color="#888078" flatShading /></mesh>
      <mesh position={[-0.4, 4.5, 0]} castShadow><boxGeometry args={[0.5, 4, 0.5]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      <mesh position={[0.4, 4.5, 0]} castShadow><boxGeometry args={[0.5, 4, 0.5]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      <mesh position={[0, 8, 0]} castShadow><boxGeometry args={[1.6, 3, 0.9]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      <mesh position={[0, 10.2, 0]} castShadow><boxGeometry args={[0.8, 1, 0.8]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      <mesh position={[0.6, 9.5, 0]} rotation={[0, 0, -0.9]} castShadow><boxGeometry args={[0.35, 2.8, 0.35]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      <mesh position={[2.2, 11.0, 0]}><coneGeometry args={[0.25, 0.8, 5]} /><meshStandardMaterial color="#ffd060" emissive="#ffaa20" emissiveIntensity={1.4} /></mesh>
      {[-0.3, 0, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 11, 0]}><coneGeometry args={[0.1, 0.5, 4]} /><meshStandardMaterial color="#68a898" flatShading /></mesh>
      ))}
    </group>
  )
}

function LandmarkColosseum() {
  const archCount = 16
  const radius = 6
  return (
    <group>
      {Array.from({ length: archCount }).map((_, i) => {
        const a = (i / archCount) * Math.PI * 2
        const x = Math.cos(a) * radius
        const z = Math.sin(a) * radius
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -a, 0]}>
            <mesh position={[0, 2, 0]} castShadow><boxGeometry args={[1.4, 4, 1.2]} /><meshStandardMaterial color="#d0c0a8" flatShading /></mesh>
            <mesh position={[0, 5, 0]} castShadow><boxGeometry args={[1.4, 2, 1.2]} /><meshStandardMaterial color="#c8b898" flatShading /></mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[4.5, 4.5, 1, 16]} /><meshStandardMaterial color="#b8a888" flatShading /></mesh>
    </group>
  )
}

function LandmarkPagoda() {
  return (
    <group>
      {[0, 1, 2, 3].map(i => {
        const size = 3.5 - i * 0.5
        return (
          <group key={i} position={[0, 1 + i * 2.2, 0]}>
            <mesh castShadow><boxGeometry args={[size, 1.6, size]} /><meshStandardMaterial color="#d02020" flatShading /></mesh>
            <mesh position={[0, 1.2, 0]} castShadow><coneGeometry args={[size * 0.85, 0.7, 4]} /><meshStandardMaterial color="#2a1a0a" flatShading /></mesh>
          </group>
        )
      })}
      <mesh position={[0, 10.5, 0]}><coneGeometry args={[0.25, 1.2, 4]} /><meshStandardMaterial color="#e8a030" /></mesh>
    </group>
  )
}

function LandmarkWindmill() {
  const bladesRef = useRef()
  useFrame((rs) => {
    if (bladesRef.current) bladesRef.current.rotation.z = rs.clock.elapsedTime * 0.6
  })
  return (
    <group>
      <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[1.2, 1.8, 6, 8]} /><meshStandardMaterial color="#e8d8b0" flatShading /></mesh>
      <mesh position={[0, 6.5, 0]} castShadow><coneGeometry args={[1.5, 1.5, 8]} /><meshStandardMaterial color="#5a3515" flatShading /></mesh>
      <group ref={bladesRef} position={[0, 5.2, 1.5]}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]} castShadow>
            <boxGeometry args={[0.2, 4.5, 0.1]} />
            <meshStandardMaterial color="#f0e8d8" flatShading />
          </mesh>
        ))}
        <mesh><sphereGeometry args={[0.25, 6, 5]} /><meshStandardMaterial color="#3a2a1a" flatShading /></mesh>
      </group>
      <mesh position={[0, 1.2, 1.75]}><boxGeometry args={[0.9, 2, 0.1]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
    </group>
  )
}

// ── Wilderness Outposts ─────────────────────────────────────────────────
// Small human/natural markers scattered FAR from villages so empty stretches
// of the planet feel lived-in. Each type is a compact low-poly prop.
function OutpostField({ outposts }) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  return (
    <group>
      {outposts.map((o, i) => {
        const upQ = new THREE.Quaternion().setFromUnitVectors(worldUp, o.normal)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(o.normal, o.rotY)
        const q = yawQ.clone().multiply(upQ)
        return (
          <group key={i} position={o.position} quaternion={q}>
            {o.type === 'shrine'         && <OutpostShrine />}
            {o.type === 'ruin'           && <OutpostRuin />}
            {o.type === 'campfire'       && <OutpostCampfire />}
            {o.type === 'standingStones' && <OutpostStandingStones />}
            {o.type === 'loneCabin'      && <OutpostLoneCabin />}
            {o.type === 'oldWell'        && <OutpostOldWell />}
            {o.type === 'signpost'       && <OutpostSignpost />}
          </group>
        )
      })}
    </group>
  )
}

function OutpostShrine() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[2.4, 0.4, 2.4]} /><meshStandardMaterial color="#8a7a68" flatShading /></mesh>
      {[[ 0.9, 0.9], [-0.9, 0.9], [ 0.9,-0.9], [-0.9,-0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 2, 6]} />
          <meshStandardMaterial color="#6a2828" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.45, 0]} castShadow><boxGeometry args={[2.4, 0.22, 2.4]} /><meshStandardMaterial color="#c02828" flatShading /></mesh>
      <mesh position={[0, 2.95, 0]} castShadow><coneGeometry args={[1.6, 0.9, 4]} /><meshStandardMaterial color="#8a2020" flatShading /></mesh>
      <mesh position={[0, 1.4, 0]}><sphereGeometry args={[0.25, 6, 5]} /><meshStandardMaterial color="#ffe088" emissive="#ffaa44" emissiveIntensity={0.9} /></mesh>
    </group>
  )
}

function OutpostRuin() {
  return (
    <group>
      {[[-1.2, 0, 0.8, 1.6], [1.2, 0, -0.4, 1.1], [-0.4, 0, -1.2, 0.7], [0.6, 0, 1.3, 0.9]].map(([x, _, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} rotation={[0, Math.random() * 0.3 - 0.15, (i % 2) * 0.1]} castShadow>
          <boxGeometry args={[0.6, h, 0.5]} />
          <meshStandardMaterial color="#b0a898" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[3.2, 0.3, 3.2]} /><meshStandardMaterial color="#8a8272" flatShading /></mesh>
      <mesh position={[1.4, 0.5, 1.3]} rotation={[0.3, 0.4, 0.1]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.5]} />
        <meshStandardMaterial color="#a09888" flatShading />
      </mesh>
    </group>
  )
}

function OutpostCampfire() {
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7]} castShadow>
            <sphereGeometry args={[0.18, 5, 4]} />
            <meshStandardMaterial color="#6a6a6a" flatShading />
          </mesh>
        )
      })}
      <mesh position={[-0.4, 0.35, 0]} rotation={[0, 0, 0.6]} castShadow><cylinderGeometry args={[0.08, 0.08, 1.2, 5]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0.4, 0.35, 0]} rotation={[0, 0, -0.6]} castShadow><cylinderGeometry args={[0.08, 0.08, 1.2, 5]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0, 0.3, -0.4]} rotation={[0.6, 0, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 1.2, 5]} /><meshStandardMaterial color="#3a2510" flatShading /></mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.35, 0.7, 6]} />
        <meshStandardMaterial color="#ff7033" emissive="#ff5500" emissiveIntensity={1.8} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

function OutpostStandingStones() {
  const positions = [[0, 0], [1.8, 0.3], [-1.6, 0.6], [0.8, 1.8], [-0.9, -1.7], [1.5, -1.4], [-1.7, 1.5]]
  return (
    <group>
      {positions.map(([x, z], i) => {
        const h = 2.5 + (i % 3) * 0.8
        return (
          <mesh key={i} position={[x, h / 2, z]} rotation={[0, i * 0.7, (i % 2) * 0.08]} castShadow>
            <boxGeometry args={[0.7, h, 0.5]} />
            <meshStandardMaterial color="#7a7268" flatShading />
          </mesh>
        )
      })}
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[2.4, 2.4, 0.1, 16]} /><meshStandardMaterial color="#6a6258" flatShading /></mesh>
    </group>
  )
}

function OutpostLoneCabin() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[3.2, 2.2, 2.6]} /><meshStandardMaterial color="#8a6240" flatShading /></mesh>
      <mesh position={[0, 2.7, 0]} castShadow><coneGeometry args={[2.4, 1.4, 4]} rotation={[0, Math.PI / 4, 0]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0, 1.0, 1.31]}><boxGeometry args={[0.7, 1.4, 0.05]} /><meshStandardMaterial color="#3a2510" flatShading /></mesh>
      <mesh position={[-1.0, 1.4, 1.31]}><boxGeometry args={[0.5, 0.5, 0.05]} /><meshStandardMaterial color="#ffdd88" emissive="#ffaa33" emissiveIntensity={0.6} /></mesh>
      <mesh position={[1.0, 1.4, 1.31]}><boxGeometry args={[0.5, 0.5, 0.05]} /><meshStandardMaterial color="#ffdd88" emissive="#ffaa33" emissiveIntensity={0.6} /></mesh>
      <mesh position={[0.8, 2.8, 0]} castShadow><boxGeometry args={[0.35, 1.2, 0.35]} /><meshStandardMaterial color="#3a3a3a" flatShading /></mesh>
    </group>
  )
}

function OutpostOldWell() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.9, 1.0, 1.2, 10]} /><meshStandardMaterial color="#8a8272" flatShading /></mesh>
      <mesh position={[0, 1.25, 0]}><cylinderGeometry args={[0.75, 0.75, 0.1, 10]} /><meshStandardMaterial color="#1a2a3a" /></mesh>
      <mesh position={[-1.0, 1.8, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 2.4, 5]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[1.0, 1.8, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 2.4, 5]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0, 3.0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 2.0, 5]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0, 3.4, 0]} castShadow><coneGeometry args={[1.4, 0.8, 4]} rotation={[0, Math.PI / 4, 0]} /><meshStandardMaterial color="#6a4028" flatShading /></mesh>
      <mesh position={[0.2, 2.2, 0]} castShadow><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#5a3a20" flatShading /></mesh>
    </group>
  )
}

function OutpostSignpost() {
  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 2.6, 6]} /><meshStandardMaterial color="#4a2f15" flatShading /></mesh>
      <mesh position={[0.6, 2.0, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.1, 0.35, 0.08]} />
        <meshStandardMaterial color="#8a6240" flatShading />
      </mesh>
      <mesh position={[-0.6, 1.6, 0]} rotation={[0, Math.PI, 0]} castShadow>
        <boxGeometry args={[1.1, 0.3, 0.08]} />
        <meshStandardMaterial color="#7a5430" flatShading />
      </mesh>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.45, 0.45, 0.08, 8]} /><meshStandardMaterial color="#6a6258" flatShading /></mesh>
    </group>
  )
}
