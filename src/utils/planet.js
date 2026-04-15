import * as THREE from 'three'
import { createNoise } from './noise.js'
import { buildGroundSampler } from './groundSampler.js'

// Scale reference (everything in world units):
//   Planet radius  = 200
//   Player height  = 1.8  (our "1.8 meters")
//   Tree height    = 7-12 (4-6x player ✓)
//   House height   = 6-9  (3-5x player ✓)
//   Rock height    = 1-3
//   Bush height    = 1-2

const BIOMES = {
  OCEAN:    'ocean',
  BEACH:    'beach',
  DESERT:   'desert',
  MEADOW:   'meadow',
  FOREST:   'forest',
  JUNGLE:   'jungle',
  TUNDRA:   'tundra',
  MOUNTAIN: 'mountain',
  SNOW:     'snow'
}

const BIOME_COLORS = {
  beach:    { spring: '#e8d8a8', summer: '#e8d8a8', autumn: '#d8c898', winter: '#d8d0b8' },
  desert:   { spring: '#dcb572', summer: '#e3c07a', autumn: '#d8a560', winter: '#c8a878' },
  meadow:   { spring: '#8fc26b', summer: '#6ea84a', autumn: '#c89a4a', winter: '#dde4e6' },
  forest:   { spring: '#5a8f3e', summer: '#3f6b2c', autumn: '#a85e2a', winter: '#e8eef0' },
  jungle:   { spring: '#3a7a3a', summer: '#2f6628', autumn: '#5a7530', winter: '#6e8a5a' },
  tundra:   { spring: '#9aac88', summer: '#8a9a78', autumn: '#a89878', winter: '#dde4e6' },
  mountain: { spring: '#7a6a52', summer: '#7a6a52', autumn: '#8a7050', winter: '#bcc4cc' },
  snow:     { spring: '#eef2f5', summer: '#eef2f5', autumn: '#e8ecf0', winter: '#f8fbff' }
}

function lerpColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t)
}

function biomeColor(biome, seasonT) {
  if (biome === BIOMES.OCEAN) return new THREE.Color('#2a5d8f')
  const palette = BIOME_COLORS[biome]
  if (!palette) return new THREE.Color('#888888')
  const seasons = ['spring', 'summer', 'autumn', 'winter']
  const idx = Math.floor(seasonT) % 4
  const next = (idx + 1) % 4
  const t = seasonT - Math.floor(seasonT)
  return lerpColor(palette[seasons[idx]], palette[seasons[next]], t)
}

// Update vertex colors in an existing planet geometry for a new season value.
// This avoids rebuilding the entire planet (and re-spawning the player) on
// every season slider change.
export function updatePlanetSeasonColors(planet, season) {
  const geo = planet.geometry
  const colorAttr = geo.attributes.color
  if (!colorAttr) return
  const pos = geo.attributes.position
  const tmpC = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x*x + y*y + z*z)
    const nx = x / len, ny = y / len, nz = z / len
    const biome = planet.sampleBiome(nx, ny, nz)
    const baseColor = biomeColor(biome, season)
    tmpC.copy(baseColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04)
    colorAttr.setXYZ(i, tmpC.r, tmpC.g, tmpC.b)
  }
  colorAttr.needsUpdate = true
}

export function createPlanet({
  radius = 200,
  detail = 8,
  seed = 1337,
  amplitude = 18,
  waterLevel = 0.5,
  season = 1
} = {}) {
  const noise = createNoise(seed)
  const moistNoise = createNoise(seed + 991)
  const tempNoise = createNoise(seed + 7331)

  const ridged = (x, y, z, octaves = 5) => {
    let amp = 1, freq = 1, sum = 0, norm = 0
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(noise.noise3(x * freq, y * freq, z * freq))
      sum += amp * n * n
      norm += amp
      amp *= 0.5
      freq *= 2.05
    }
    return (sum / norm) * 2 - 1
  }

  const sampleHeight = (nx, ny, nz) => {
    const continent = noise.fbm(nx * 0.7, ny * 0.7, nz * 0.7, 4, 2.0, 0.55)
    const mountainMask = Math.max(0, continent + 0.05)
    const mountains = ridged(nx * 1.6, ny * 1.6, nz * 1.6, 5) * mountainMask
    const hills = noise.fbm(nx * 2.8, ny * 2.8, nz * 2.8, 4, 2.0, 0.5) * 0.35
    const detailN = noise.fbm(nx * 7, ny * 7, nz * 7, 3, 2.0, 0.5) * 0.06
    let h = continent * 0.6 + mountains * 0.4 + hills * 0.2 + detailN
    if (h > 0) h = Math.pow(h, 0.9)
    else h = h * 0.5
    return h * amplitude
  }

  const seaLevel = (waterLevel - 0.5) * amplitude * 0.5

  const sampleAltitude = (nx, ny, nz) => Math.max(sampleHeight(nx, ny, nz), seaLevel)

  // surfaceRadius: distance from center to the walkable surface at direction.
  // Initially defined here as a placeholder — REBOUND below to use the shared
  // groundSampler so player/NPCs/decorations all agree on "where is ground".
  let surfaceRadius = (nx, ny, nz) => radius + sampleAltitude(nx, ny, nz)

  const isLand = (nx, ny, nz) => sampleHeight(nx, ny, nz) > seaLevel

  const sampleBiome = (nx, ny, nz) => {
    const h = sampleHeight(nx, ny, nz)
    if (h <= seaLevel) return BIOMES.OCEAN
    const altNorm = (h - seaLevel) / (amplitude - seaLevel)
    const lat = Math.abs(ny)
    const moisture = (moistNoise.fbm(nx * 1.5, ny * 1.5, nz * 1.5, 3) + 1) * 0.5
    const temperature = 1 - lat - altNorm * 0.5 + (tempNoise.fbm(nx * 0.8, ny * 0.8, nz * 0.8, 2) * 0.15)
    if (altNorm > 0.78) return BIOMES.SNOW
    if (altNorm > 0.5)  return BIOMES.MOUNTAIN
    if (altNorm < 0.06) return BIOMES.BEACH
    if (lat > 0.78)     return BIOMES.SNOW
    if (lat > 0.6)      return BIOMES.TUNDRA
    if (temperature > 0.6 && moisture > 0.55) return BIOMES.JUNGLE
    if (temperature > 0.55 && moisture < 0.35) return BIOMES.DESERT
    if (moisture > 0.5) return BIOMES.FOREST
    return BIOMES.MEADOW
  }

  // Build mesh
  const geo = new THREE.IcosahedronGeometry(radius, detail)
  const pos = geo.attributes.position
  const colors = []
  const tmpC = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x*x + y*y + z*z)
    const nx = x / len, ny = y / len, nz = z / len
    const h = sampleHeight(nx, ny, nz)
    const isWater = h <= seaLevel
    const r = radius + (isWater ? seaLevel : h)
    pos.setXYZ(i, nx * r, ny * r, nz * r)
    const biome = sampleBiome(nx, ny, nz)
    const baseColor = biomeColor(biome, season)
    tmpC.copy(baseColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04)
    colors.push(tmpC.r, tmpC.g, tmpC.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  // Shared ground sampler — THE source of truth for ground height.
  // Used by decorations at placement time AND by player/NPCs per-frame snap.
  const groundSampler = buildGroundSampler(sampleHeight, seaLevel, radius)
  // Rebind surfaceRadius to use the same sampler as decorations — no more gap.
  surfaceRadius = groundSampler.getGroundRadius

  return {
    radius,
    seaLevel,
    waterRadius: radius + seaLevel,
    amplitude,
    geometry: geo,
    groundSampler,
    sampleHeight,
    sampleAltitude,
    sampleBiome,
    surfaceRadius,
    isLand,
    BIOMES
  }
}

// Scatter decorations. Uses raycast sampler at spawn so they sit exactly on mesh.
export function scatterDecorations(planet, seed = 42) {
  const groups = { trees: [], pines: [], palms: [], rocks: [], flowers: [], bushes: [], cacti: [], mushrooms: [] }

  let s = seed
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }

  const TARGET = 900
  let attempts = 0
  let placed = 0

  while (placed < TARGET && attempts < TARGET * 5) {
    attempts++
    const u = rand() * 2 - 1
    const theta = rand() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    const dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))

    if (!planet.isLand(dir.x, dir.y, dir.z)) continue
    const biome = planet.sampleBiome(dir.x, dir.y, dir.z)
    if (biome === planet.BIOMES.OCEAN || biome === planet.BIOMES.SNOW) continue

    // Exact mesh surface point via raycast
    const groundPoint = planet.groundSampler.getGroundPoint(dir)
    const item = {
      position: groundPoint,  // base sits exactly on mesh
      normal: dir.clone(),
      scale: 0.85 + rand() * 0.65,
      rotY: rand() * Math.PI * 2
    }

    let key = null
    switch (biome) {
      case planet.BIOMES.FOREST:
        key = rand() < 0.55 ? 'pines' : rand() < 0.4 ? 'trees' : rand() < 0.5 ? 'bushes' : 'mushrooms'
        break
      case planet.BIOMES.JUNGLE:
        key = rand() < 0.5 ? 'trees' : rand() < 0.4 ? 'palms' : 'bushes'
        break
      case planet.BIOMES.MEADOW:
        key = rand() < 0.55 ? 'flowers' : rand() < 0.5 ? 'bushes' : 'trees'
        break
      case planet.BIOMES.DESERT:
        key = rand() < 0.6 ? 'cacti' : 'rocks'
        break
      case planet.BIOMES.TUNDRA:
        key = rand() < 0.5 ? 'rocks' : 'pines'
        break
      case planet.BIOMES.MOUNTAIN:
        key = rand() < 0.7 ? 'rocks' : 'pines'
        break
      case planet.BIOMES.BEACH:
        key = rand() < 0.4 ? 'palms' : rand() < 0.5 ? 'rocks' : null
        break
    }
    if (key) { groups[key].push(item); placed++ }
  }
  return groups
}

// Generate a road network connecting villages with great-circle paths.
// Returns { segments: [[p1, p2, p3, ...], ...], lamps: [{pos, normal}, ...] }
export function generateRoads(planet, villages) {
  const segments = []
  const lamps = []

  if (villages.length < 2) return { segments, lamps }

  // Connect each village to its 2 nearest neighbours (creates a sparse network)
  const connections = new Set()
  villages.forEach((v, i) => {
    const dists = villages
      .map((other, j) => ({ j, d: i === j ? Infinity : v.center.distanceTo(other.center) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
    dists.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      connections.add(key)
    })
  })

  connections.forEach(key => {
    const [i, j] = key.split('-').map(Number)
    const a = villages[i].center.clone().normalize()
    const b = villages[j].center.clone().normalize()

    const angle = a.angleTo(b)
    if (angle < 0.001) return
    const steps = Math.max(8, Math.ceil(angle / 0.015))
    const path = []

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      // Slerp (spherical linear interpolation) between a and b
      const sinAngle = Math.sin(angle)
      const w1 = Math.sin((1 - t) * angle) / sinAngle
      const w2 = Math.sin(t * angle) / sinAngle
      const dir = new THREE.Vector3()
        .addScaledVector(a, w1)
        .addScaledVector(b, w2)
        .normalize()
      if (!planet.isLand(dir.x, dir.y, dir.z)) continue
      const point = planet.groundSampler.getGroundPoint(dir)
      path.push({ point, normal: dir.clone() })
    }

    if (path.length >= 4) {
      segments.push(path)
      // Drop lamps every ~20 units along the path
      let distSinceLamp = 0
      for (let p = 1; p < path.length; p++) {
        distSinceLamp += path[p].point.distanceTo(path[p - 1].point)
        if (distSinceLamp > 20) {
          lamps.push(path[p])
          distSinceLamp = 0
        }
      }
    }
  })

  return { segments, lamps }
}

// Village generation with properly spaced houses placed on exact mesh surface.
export function generateVillages(planet, count = 4, seed = 99) {
  let s = seed
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const villages = []
  let tries = 0

  while (villages.length < count && tries < 200) {
    tries++
    const u = rand() * 2 - 1
    const theta = rand() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    const centerDir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
    if (!planet.isLand(centerDir.x, centerDir.y, centerDir.z)) continue
    const biome = planet.sampleBiome(centerDir.x, centerDir.y, centerDir.z)
    if (biome === planet.BIOMES.MOUNTAIN || biome === planet.BIOMES.SNOW || biome === planet.BIOMES.OCEAN) continue
    if (Math.abs(centerDir.y) > 0.7) continue

    const up = centerDir.clone()
    const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, up).normalize()
    const fwd = new THREE.Vector3().crossVectors(up, right).normalize()

    const houses = []
    const houseCount = 6 + Math.floor(rand() * 6)
    const spacing = 9   // world units — house footprint is ~5 wide so 9 gives clearance
    const placements = []

    for (let i = 0; i < houseCount * 4 && placements.length < houseCount; i++) {
      const gx = (Math.floor(rand() * 5) - 2) * spacing + (rand() - 0.5) * 2
      const gz = (Math.floor(rand() * 5) - 2) * spacing + (rand() - 0.5) * 2
      let ok = true
      for (const p of placements) {
        if ((p.x - gx) ** 2 + (p.z - gz) ** 2 < (spacing * 0.8) ** 2) { ok = false; break }
      }
      if (!ok) continue
      placements.push({ x: gx, z: gz })
    }

    for (const p of placements) {
      const offset = right.clone().multiplyScalar(p.x).addScaledVector(fwd, p.z)
      const houseDir = up.clone().multiplyScalar(planet.radius).add(offset).normalize()
      if (!planet.isLand(houseDir.x, houseDir.y, houseDir.z)) continue
      const houseBiome = planet.sampleBiome(houseDir.x, houseDir.y, houseDir.z)
      if (houseBiome === planet.BIOMES.MOUNTAIN || houseBiome === planet.BIOMES.SNOW) continue

      // Exact mesh surface
      const groundPoint = planet.groundSampler.getGroundPoint(houseDir)
      // Building type distribution: 5% tower, 15% shop, 10% market, 70% house
      const r = rand()
      let type = 'house'
      if (r < 0.05) type = 'tower'
      else if (r < 0.20) type = 'shop'
      else if (r < 0.30) type = 'market'
      houses.push({
        position: groundPoint,
        normal: houseDir.clone(),
        rotY: rand() * Math.PI * 2,
        scale: 0.95 + rand() * 0.2,
        type,
        roofColor: ['#a04030', '#8a4020', '#6a3520', '#7a4530', '#552530'][Math.floor(rand() * 5)],
        wallColor: ['#e8d8b0', '#d8c8a0', '#e0d4a8', '#d4c09a', '#eadcb0'][Math.floor(rand() * 5)]
      })
    }

    if (houses.length >= 4) villages.push({ center: centerDir, biome, houses })
  }
  return villages
}

// Grass blade patches near villages and in meadow biome
export function scatterGrass(planet, villages, seed = 77) {
  const blades = []
  let s = seed
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }

  // Around each village, ~300 blades
  villages.forEach(village => {
    const up = village.center.clone().normalize()
    const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, up).normalize()
    const fwd = new THREE.Vector3().crossVectors(up, right).normalize()

    for (let i = 0; i < 300; i++) {
      const angle = rand() * Math.PI * 2
      const dist = rand() * 35
      const offset = right.clone().multiplyScalar(Math.cos(angle) * dist)
        .addScaledVector(fwd, Math.sin(angle) * dist)
      const dir = up.clone().multiplyScalar(planet.radius).add(offset).normalize()
      if (!planet.isLand(dir.x, dir.y, dir.z)) continue
      const point = planet.groundSampler.getGroundPoint(dir)
      blades.push({
        position: point,
        normal: dir.clone(),
        scale: 0.6 + rand() * 0.8,
        rotY: rand() * Math.PI * 2
      })
    }
  })
  return blades
}

// Scatter static carts and barrels inside villages (lived-in feel)
export function scatterVillageProps(villages, seed = 88) {
  const props = []
  let s = seed
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }

  villages.forEach(village => {
    // 3-6 props per village, placed near random houses
    const count = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < count; i++) {
      if (village.houses.length === 0) continue
      const house = village.houses[Math.floor(rand() * village.houses.length)]
      // Place next to the house along its local tangent
      const up = house.normal.clone()
      const ref = Math.abs(up.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const right = new THREE.Vector3().crossVectors(ref, up).normalize()
      const fwd = new THREE.Vector3().crossVectors(up, right).normalize()
      const angle = rand() * Math.PI * 2
      const offset = right.clone().multiplyScalar(Math.cos(angle) * 4)
        .addScaledVector(fwd, Math.sin(angle) * 4)
      const pos = house.position.clone().add(offset)

      props.push({
        position: pos,
        normal: up,
        rotY: rand() * Math.PI * 2,
        scale: 0.9 + rand() * 0.3,
        type: rand() < 0.5 ? 'barrel' : 'cart'
      })
    }
  })
  return props
}
