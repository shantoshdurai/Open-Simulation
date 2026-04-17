// The world periodically generates events (wolf sighted, storm brewing, baby
// born, festival tonight, trader arrived, good harvest). Each event is planted
// into the head of a nearby NPC, and from there it spreads via conversations.
// This is what makes the village feel connected — news actually propagates.

const EVENT_CATALOG = [
  {
    kind: 'wolf',
    weight: 0.85,
    locationsBy: 'landmark',   // Pick a notable nearby spot as location
    cooldown: 180,              // seconds — how long until another wolf event
    chance: 0.25,               // per roll
    flavor: ['east hills', 'northern ridge', 'dark forest', 'old woods', 'river bend']
  },
  {
    kind: 'storm',
    weight: 0.8,
    cooldown: 240,
    chance: 0.2,
    flavor: ['tonight', 'by morning', 'before dusk']   // put in 'when'
  },
  {
    kind: 'harvest',
    weight: 0.75,
    cooldown: 300,
    chance: 0.3,
    flavor: ['wheat field', 'cabbage rows', 'pumpkin patch', 'corn rows']
  },
  {
    kind: 'baby',
    weight: 0.8,
    cooldown: 400,
    chance: 0.15,
    flavor: ['Ashvale', 'Stonefield', 'Silverleaf', 'Brightwood', 'Riversong', 'Thorn', 'Coppergate']
  },
  {
    kind: 'festival',
    weight: 0.7,
    cooldown: 500,
    chance: 0.12,
    flavor: ['tonight', 'tomorrow night', 'at the full moon']
  },
  {
    kind: 'trader',
    weight: 0.65,
    cooldown: 220,
    chance: 0.18,
    flavor: ['the south coast', 'the mountain pass', 'the eastern road', 'across the dunes']
  },
  {
    kind: 'stranger',
    weight: 0.6,
    cooldown: 260,
    chance: 0.15,
    flavor: ['the north', 'lands beyond the sea', 'the high valley', 'nowhere in particular']
  }
]

export function createEventScheduler() {
  return {
    cooldowns: {},        // kind -> seconds until next allowed
    nextRoll: 30 + Math.random() * 20   // First event 30-50s in
  }
}

// Tick the scheduler. If an event fires, returns it to be planted in an NPC.
// npcs and brains are arrays in parallel (by NPC index).
export function tickEventScheduler(sched, dt, npcs, brains, registry, rng) {
  // Tick cooldowns
  for (const kind in sched.cooldowns) {
    sched.cooldowns[kind] = Math.max(0, sched.cooldowns[kind] - dt)
  }

  sched.nextRoll -= dt
  if (sched.nextRoll > 0) return null
  // Next roll in 45-90 seconds
  sched.nextRoll = 45 + rng() * 45

  // Pick a random eligible event
  const eligible = EVENT_CATALOG.filter(e => !sched.cooldowns[e.kind] || sched.cooldowns[e.kind] <= 0)
  if (eligible.length === 0) return null
  const choice = eligible[Math.floor(rng() * eligible.length)]
  if (rng() > choice.chance) return null
  sched.cooldowns[choice.kind] = choice.cooldown

  // Build fact
  const flavor = choice.flavor[Math.floor(rng() * choice.flavor.length)]
  const fact = { kind: choice.kind, weight: choice.weight, from: -1 }
  if (choice.kind === 'storm' || choice.kind === 'festival') fact.when = flavor
  else if (choice.kind === 'baby') fact.family = flavor
  else fact.location = flavor

  // Plant it in a random NPC (the first witness)
  if (brains.length === 0) return null
  const witnessIdx = Math.floor(rng() * brains.length)
  return { fact, witnessIdx }
}
