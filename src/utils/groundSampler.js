import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// Extend THREE with BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

export function buildGroundSampler(geometry, seaLevel, radius) {
  // Build a BVH tree for the geometry
  geometry.computeBoundsTree()
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  const raycaster = new THREE.Raycaster()
  raycaster.firstHitOnly = true

  const maxDist = radius * 3 // Safe upper bound for planet height

  function getGroundPoint(direction) {
    const dir = direction.clone().normalize()
    // Cast inward toward center from far out
    const startPoint = dir.clone().multiplyScalar(maxDist)
    const inwardDir = dir.clone().negate()

    raycaster.set(startPoint, inwardDir)
    const hits = raycaster.intersectObject(mesh)

    if (hits.length > 0) {
      return hits[0].point
    }
    // Fallback if inside a black hole
    return dir.multiplyScalar(radius + seaLevel)
  }

  function getGroundRadius(nx, ny, nz) {
    const pt = getGroundPoint(new THREE.Vector3(nx, ny, nz))
    return pt.length()
  }

  return { getGroundPoint, getGroundRadius }
}
