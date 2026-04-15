// Analytic ground sampler — no raycasting.
//
// Root cause of floating: the analytic noise at a placement direction can be
// HIGHER than all surrounding mesh vertices (noise is non-linear between
// vertices). Taking the minimum over 19 samples on two rings ensures we find
// the actual triangle floor, not a noise peak.
//
// For detail=7, R=200: edge angle ≈ 0.044 rad.
// Ring 1 at 0.025 rad = within same triangle.
// Ring 2 at 0.055 rad = beyond triangle edge, into adjacent triangles.

import * as THREE from 'three'

export function buildGroundSampler(sampleHeight, seaLevel, radius) {
  const RING1 = 0.025
  const RING2 = 0.055

  // AVERAGE-based sampler: returns the average of 19 samples.
  //
  // Why average, not min or the raw center:
  //  - Center-only = analytic noise peak between vertices → objects/player float
  //  - Min-only    = lowest nearby vertex → player sinks inside hills
  //  - Average     = reasonable approximation of the face height at this point,
  //                  since mesh faces interpolate linearly between vertices.
  //
  // Both decoration placement AND player/NPC snap use this same function
  // so there is no gap between where you walk and where objects sit.
  function sampleGroundHeight(nx, ny, nz) {
    const d = new THREE.Vector3(nx, ny, nz).normalize()
    const ref = Math.abs(d.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(ref, d).normalize()
    const fwd   = new THREE.Vector3().crossVectors(d, right).normalize()

    let sum = sampleHeight(d.x, d.y, d.z)
    let count = 1

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      sum += sampleAt(d, right, fwd, Math.cos(a) * RING1, Math.sin(a) * RING1, sampleHeight)
      count++
    }

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12
      sum += sampleAt(d, right, fwd, Math.cos(a) * RING2, Math.sin(a) * RING2, sampleHeight)
      count++
    }

    return Math.max(sum / count, seaLevel)
  }

  function getGroundPoint(direction) {
    const d = direction.clone().normalize()
    const h = sampleGroundHeight(d.x, d.y, d.z)
    return d.multiplyScalar(radius + h)
  }

  function getGroundRadius(nx, ny, nz) {
    return radius + sampleGroundHeight(nx, ny, nz)
  }

  return { getGroundPoint, getGroundRadius, sampleGroundHeight }
}

function sampleAt(dir, right, fwd, dr, df, sampleHeight) {
  const v = dir.clone().addScaledVector(right, dr).addScaledVector(fwd, df).normalize()
  return sampleHeight(v.x, v.y, v.z)
}
