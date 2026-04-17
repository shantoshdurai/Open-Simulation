// Local NPC "brain": needs, facts, dialogue templates, event reactions.
// No API calls. Conversations are assembled from templates based on shared
// context and the facts each NPC is currently carrying, so village life feels
// reactive and connected (rumors, news, warnings spread person-to-person).

// ── Needs ────────────────────────────────────────────────────────────────
// Each need is 0..1. Higher = more satisfied. They decay over sim time.
// When one drops below its threshold, it biases behavior selection.
export function createNeeds(rng) {
  return {
    hunger:  0.6 + rng() * 0.3,
    energy:  0.7 + rng() * 0.25,
    social:  0.3 + rng() * 0.4,
    purpose: 0.5 + rng() * 0.4
  }
}

// Decay rates per second of real time. Tuned so a day (4 min) moves needs a
// noticeable amount without starving anyone.
const DECAY = {
  hunger:  1 / 360,  // fully hungry after 6 min
  energy:  1 / 480,  // tired after 8 min
  social:  1 / 300,  // lonely after 5 min
  purpose: 1 / 420
}

export function tickNeeds(needs, dt) {
  needs.hunger  = Math.max(0, needs.hunger  - DECAY.hunger  * dt)
  needs.energy  = Math.max(0, needs.energy  - DECAY.energy  * dt)
  needs.social  = Math.max(0, needs.social  - DECAY.social  * dt)
  needs.purpose = Math.max(0, needs.purpose - DECAY.purpose * dt)
}

// Which action most wants to happen? Returns { action, urgency }.
export function topNeed(needs) {
  const list = [
    { action: 'eat',     urgency: 1 - needs.hunger,  threshold: 0.55 },
    { action: 'sleep',   urgency: 1 - needs.energy,  threshold: 0.6  },
    { action: 'socialize', urgency: 1 - needs.social,  threshold: 0.55 },
    { action: 'work',    urgency: 1 - needs.purpose, threshold: 0.5  }
  ]
  list.sort((a, b) => b.urgency - a.urgency)
  const top = list[0]
  if (top.urgency < top.threshold) return null
  return top
}

// ── Facts (the chain-reaction engine) ────────────────────────────────────
// A fact is a piece of info that NPCs carry and share. Examples:
//   { kind:'wolf',      location:'east hills', weight:0.9, age:0, from:3 }
//   { kind:'harvest',   location:'wheat field', weight:0.7, age:0, from:5 }
//   { kind:'baby',      family:'Ashvale',      weight:0.8, age:0, from:1 }
//   { kind:'storm',     when:'tonight',        weight:0.85, age:0, from:world }
// Each NPC carries up to MAX_FACTS. New facts push out the lowest-weight old.
const MAX_FACTS = 5

export function addFact(npcBrain, fact) {
  // Dedup: same kind + location/family/when => keep the higher weight
  const sameKind = npcBrain.facts.find(f =>
    f.kind === fact.kind &&
    f.location === fact.location &&
    f.family === fact.family &&
    f.when === fact.when
  )
  if (sameKind) {
    if (fact.weight > sameKind.weight) {
      sameKind.weight = fact.weight
      sameKind.age = 0
      sameKind.from = fact.from
    }
    return false
  }
  if (npcBrain.facts.length >= MAX_FACTS) {
    // Evict lowest weight
    let minIdx = 0
    for (let i = 1; i < npcBrain.facts.length; i++) {
      if (npcBrain.facts[i].weight < npcBrain.facts[minIdx].weight) minIdx = i
    }
    if (npcBrain.facts[minIdx].weight >= fact.weight) return false
    npcBrain.facts.splice(minIdx, 1)
  }
  npcBrain.facts.push({ ...fact, age: 0 })
  return true
}

// Fact weights decay over sim time — old news is less interesting to share.
export function tickFacts(npcBrain, dt) {
  for (let i = npcBrain.facts.length - 1; i >= 0; i--) {
    const f = npcBrain.facts[i]
    f.age += dt
    f.weight -= dt * 0.003  // Decay ~0.18/minute
    if (f.weight <= 0.1) npcBrain.facts.splice(i, 1)
  }
}

// When A meets B: A shares their most interesting NEW fact; B absorbs it at
// reduced weight (hearsay is less certain than first-hand). Returns the fact
// shared (for dialogue), or null if nothing notable to say.
export function exchangeFacts(brainA, brainB) {
  // A's facts sorted by interest (weight, and novelty to B)
  const candidates = brainA.facts
    .map(f => {
      const bHas = brainB.facts.find(bf =>
        bf.kind === f.kind && bf.location === f.location &&
        bf.family === f.family && bf.when === f.when
      )
      const novelty = bHas ? Math.max(0, f.weight - bHas.weight) : f.weight
      return { fact: f, interest: f.weight * 0.3 + novelty * 0.7 }
    })
    .filter(c => c.interest > 0.15)
    .sort((a, b) => b.interest - a.interest)

  if (candidates.length === 0) return null
  const shared = candidates[0].fact
  // B absorbs at 80% weight (hearsay)
  addFact(brainB, { ...shared, weight: shared.weight * 0.8, from: shared.from })
  return shared
}

// ── Dialogue templates ───────────────────────────────────────────────────
// Picking a template is based on: shared fact (if any), job match, mood,
// time of day. Two-speaker structure: speaker 0 opens, speaker 1 replies.

const FACT_DIALOGUES = {
  wolf: [
    (f) => [
      { s: 0, t: `Did you hear? A wolf was seen near ${f.location}.` },
      { s: 1, t: `That's the second sighting this week. I'll keep the flock close.` },
      { s: 0, t: `Stay safe out there.` }
    ],
    (f) => [
      { s: 0, t: `Word is a wolf was prowling by ${f.location} yesterday.` },
      { s: 1, t: `I heard the same. Best we warn the children.` }
    ]
  ],
  harvest: [
    (f) => [
      { s: 0, t: `The ${f.location} came in early this year — a good haul.` },
      { s: 1, t: `Thank the rains. We'll have plenty for the winter stores.` },
      { s: 0, t: `And maybe enough to trade.` }
    ],
    (f) => [
      { s: 0, t: `Have you seen the ${f.location}? Bursting with crop.` },
      { s: 1, t: `A blessing. I'll bring the children to help bring it in.` }
    ]
  ],
  storm: [
    (f) => [
      { s: 0, t: `Clouds are gathering — a storm by ${f.when}, I reckon.` },
      { s: 1, t: `I'll bring the washing in and tell my neighbor.` }
    ],
    (f) => [
      { s: 0, t: `My knees ache. There's weather coming ${f.when}.` },
      { s: 1, t: `Your knees are never wrong. I'll batten the shutters.` }
    ]
  ],
  baby: [
    (f) => [
      { s: 0, t: `Did you hear the ${f.family} family had a baby?` },
      { s: 1, t: `Oh wonderful — I'll bring them soup tomorrow.` },
      { s: 0, t: `They'll love that.` }
    ],
    (f) => [
      { s: 0, t: `A new little one in the ${f.family} house!` },
      { s: 1, t: `The village grows. Good news in hard times.` }
    ]
  ],
  festival: [
    (f) => [
      { s: 0, t: `The festival is ${f.when} — are you going?` },
      { s: 1, t: `Wouldn't miss it. I've been baking all week.` },
      { s: 0, t: `Save me a slice!` }
    ]
  ],
  trader: [
    (f) => [
      { s: 0, t: `A trader arrived from ${f.location}. Strange goods.` },
      { s: 1, t: `I'll have a look before they move on.` }
    ]
  ],
  stranger: [
    (f) => [
      { s: 0, t: `A stranger walked through the village today.` },
      { s: 1, t: `From where? Did they say?` },
      { s: 0, t: `${f.location}, they reckoned. Just passing.` }
    ]
  ]
}

// Fallback conversations when no shared fact — flavored by context.
const SMALL_TALK = {
  morning: [
    [{s:0, t:'Early start today?'}, {s:1, t:'Always. The land does not wait.'}, {s:0, t:'A good day for it.'}],
    [{s:0, t:'The sun came up sweet this morning.'}, {s:1, t:'Makes the bones feel young again.'}]
  ],
  midday: [
    [{s:0, t:'Quick break?'}, {s:1, t:'Just a moment. The sun is fierce today.'}, {s:0, t:'Take water in the shade.'}],
    [{s:0, t:'How goes the work?'}, {s:1, t:'Steady. These hands know the rhythm.'}]
  ],
  evening: [
    [{s:0, t:'Another day done.'}, {s:1, t:'I can feel it in my shoulders.'}, {s:0, t:'Rest well tonight.'}],
    [{s:0, t:'Will you join us at the well tonight?'}, {s:1, t:'If the children let me. I will try.'}]
  ],
  night: [
    [{s:0, t:'Late to be out.'}, {s:1, t:'Could not sleep. Head full of thoughts.'}, {s:0, t:'The stars listen well.'}]
  ],
  work_match: [
    [{s:0, t:'Saw your rows today — straight as a rule.'}, {s:1, t:'Years of practice. You are not so bad yourself.'}],
    [{s:0, t:'Trade you a tip for a tip?'}, {s:1, t:'Always.'}]
  ],
  mood_lonely: [
    [{s:0, t:'You have been quiet lately.'}, {s:1, t:'The house feels big some days.'}, {s:0, t:'Come sit by the fire tonight.'}]
  ],
  mood_happy: [
    [{s:0, t:'You look like you won a bet.'}, {s:1, t:'Just a good morning. That is enough some days.'}]
  ]
}

function timeBand(timeOfDay) {
  const h = (timeOfDay || 0.5) * 24
  if (h < 6)  return 'night'
  if (h < 11) return 'morning'
  if (h < 16) return 'midday'
  if (h < 20) return 'evening'
  return 'night'
}

// Build a conversation between two NPCs using shared facts + context.
// Returns { lines: [{speaker, text}], topic: string }
export function composeConversation(npcA, brainA, npcB, brainB, timeOfDay) {
  // Step 1: A picks a fact to share (also plants it in B's head)
  const shared = exchangeFacts(brainA, brainB)

  if (shared && FACT_DIALOGUES[shared.kind]) {
    const templates = FACT_DIALOGUES[shared.kind]
    const tpl = templates[Math.floor(Math.random() * templates.length)]
    const lines = tpl(shared).map(l => ({ speaker: l.s, text: l.t }))
    return { lines, topic: shared.kind }
  }

  // Step 2: No fact — small talk based on time/job/mood
  let bucket = timeBand(timeOfDay)
  if (npcA.job === npcB.job && Math.random() < 0.4) bucket = 'work_match'
  if (npcA.mood === 'lonely' || npcB.mood === 'lonely') bucket = 'mood_lonely'
  else if (npcA.mood === 'hopeful' || npcA.mood === 'inspired') {
    if (Math.random() < 0.4) bucket = 'mood_happy'
  }
  const pool = SMALL_TALK[bucket] || SMALL_TALK.midday
  const tpl = pool[Math.floor(Math.random() * pool.length)]
  return { lines: tpl.map(l => ({ speaker: l.s, text: l.t })), topic: bucket }
}

// After a conversation ends, bump social needs for both parties.
export function applyConversationEffects(brainA, brainB, topic) {
  brainA.needs.social = Math.min(1, brainA.needs.social + 0.3)
  brainB.needs.social = Math.min(1, brainB.needs.social + 0.3)
  // Sharing good news boosts purpose; sharing scary news drains it slightly
  if (topic === 'wolf' || topic === 'storm') {
    brainA.needs.purpose = Math.max(0, brainA.needs.purpose - 0.05)
    brainB.needs.purpose = Math.max(0, brainB.needs.purpose - 0.05)
  } else if (topic === 'baby' || topic === 'harvest' || topic === 'festival') {
    brainA.needs.purpose = Math.min(1, brainA.needs.purpose + 0.1)
    brainB.needs.purpose = Math.min(1, brainB.needs.purpose + 0.1)
  }
}

// ── Brain factory ────────────────────────────────────────────────────────
export function createBrain(rng) {
  return {
    needs: createNeeds(rng),
    facts: [],      // Things this NPC currently knows
    lastSpokeWith: new Map()  // npcId -> time (to avoid rechatting instantly)
  }
}
