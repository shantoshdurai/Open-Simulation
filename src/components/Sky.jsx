import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Day/night cycle: sun orbits the planet, sky color shifts, stars fade in.
// timeOfDay is 0..1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
export default function Sky({ timeOfDay, climate, planetRadius = 200 }) {
  const sunRef = useRef()
  const starsRef = useRef()
  const skyMatRef = useRef()

  // Sky gradient via large back-faced sphere
  const skyGeo = useMemo(() => new THREE.SphereGeometry(900, 32, 16), [])

  const skyMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#3a6da8') },
        bottomColor: { value: new THREE.Color('#a8c8e8') },
        offset: { value: 100 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    })
    return mat
  }, [])

  // Star field — small points on a far sphere
  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = []
    for (let i = 0; i < 1500; i++) {
      const u = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      const x = r * Math.cos(theta)
      const y = u
      const z = r * Math.sin(theta)
      positions.push(x * 800, y * 800, z * 800)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [])

  const starMat = useMemo(() => new THREE.PointsMaterial({
    color: '#ffffff',
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0
  }), [])

  // Reference colors for sky transitions
  const palettes = useMemo(() => ({
    night:   { top: new THREE.Color('#020310'), bottom: new THREE.Color('#0a0a25') },
    dawn:    { top: new THREE.Color('#3a5a88'), bottom: new THREE.Color('#b87848') },
    day:     { top: new THREE.Color('#3a6da8'), bottom: new THREE.Color('#a8c8e8') },
    dusk:    { top: new THREE.Color('#2a3060'), bottom: new THREE.Color('#a85038') }
  }), [])

  useFrame(() => {
    const t = timeOfDay
    // Sun position — orbits in YZ plane around the planet
    const sunAngle = (t - 0.25) * Math.PI * 2 // 0.25 -> 0 (sunrise = horizon east)
    const sunDist = planetRadius * 4
    const sunX = Math.cos(sunAngle) * sunDist
    const sunY = Math.sin(sunAngle) * sunDist
    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, 0)
    }

    // Pick sky palette based on time
    let top, bottom, starOpacity
    if (t < 0.2 || t > 0.85) {
      top = palettes.night.top; bottom = palettes.night.bottom; starOpacity = 1
    } else if (t < 0.3) {
      const k = (t - 0.2) / 0.1
      top = palettes.night.top.clone().lerp(palettes.dawn.top, k)
      bottom = palettes.night.bottom.clone().lerp(palettes.dawn.bottom, k)
      starOpacity = 1 - k
    } else if (t < 0.4) {
      const k = (t - 0.3) / 0.1
      top = palettes.dawn.top.clone().lerp(palettes.day.top, k)
      bottom = palettes.dawn.bottom.clone().lerp(palettes.day.bottom, k)
      starOpacity = 0
    } else if (t < 0.65) {
      top = palettes.day.top; bottom = palettes.day.bottom; starOpacity = 0
    } else if (t < 0.78) {
      const k = (t - 0.65) / 0.13
      top = palettes.day.top.clone().lerp(palettes.dusk.top, k)
      bottom = palettes.day.bottom.clone().lerp(palettes.dusk.bottom, k)
      starOpacity = 0
    } else {
      const k = (t - 0.78) / 0.07
      top = palettes.dusk.top.clone().lerp(palettes.night.top, k)
      bottom = palettes.dusk.bottom.clone().lerp(palettes.night.bottom, k)
      starOpacity = k
    }

    skyMaterial.uniforms.topColor.value.copy(top)
    skyMaterial.uniforms.bottomColor.value.copy(bottom)
    if (starMat) starMat.opacity = starOpacity
    // Push gradient offset higher at dawn/dusk so warm tone doesn't flood screen
    const isDawnDusk = (t >= 0.2 && t < 0.42) || (t >= 0.64 && t < 0.85)
    skyMaterial.uniforms.offset.value = isDawnDusk ? 200 : 100
  })

  // Sun intensity / color also drives the directional light (passed up via ref pattern)
  // We expose the sun ref via a callback below.
  return (
    <>
      <mesh geometry={skyGeo} material={skyMaterial} renderOrder={-1} />
      <points ref={starsRef} geometry={starGeo} material={starMat} />

      {/* Visible sun disc */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[18, 16, 12]} />
        <meshBasicMaterial color="#fff5b8" />
      </mesh>
    </>
  )
}
