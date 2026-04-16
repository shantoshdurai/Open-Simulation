// Shared NPC registry — imperative spatial queries without React re-renders.
export function createNPCRegistry() {
  const entries = new Map()
  return {
    add(id, entry) { entries.set(id, entry) },
    remove(id) { entries.delete(id) },
    get(id) { return entries.get(id) },
    findNearest(pos, maxDist = 4, excludeId = null) {
      let nearest = null
      let nearestDist = maxDist
      entries.forEach((e, id) => {
        if (id === excludeId) return
        const d = e.getPosition().distanceTo(pos)
        if (d < nearestDist) { nearest = e; nearestDist = d }
      })
      return nearest ? { ...nearest, distance: nearestDist } : null
    },
    // Find all NPCs within maxDist (for group socializing)
    findNearby(pos, maxDist = 10, excludeId = null) {
      const results = []
      entries.forEach((e, id) => {
        if (id === excludeId) return
        const d = e.getPosition().distanceTo(pos)
        if (d < maxDist) results.push({ ...e, distance: d })
      })
      return results.sort((a, b) => a.distance - b.distance)
    },
    all: entries
  }
}
