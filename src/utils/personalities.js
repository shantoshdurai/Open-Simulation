// Procedural personality generator for NPCs.
// Each NPC gets a name, age, job, traits, knowledge, mood,
// a PURPOSE (why they exist in the world), GOALS (what they're actively working toward),
// and FEARS (what they worry about). These drive Gemini conversations and NPC behavior.

const FIRST_NAMES = [
  'Arun', 'Priya', 'Kenji', 'Maya', 'Theo', 'Lyra', 'Otto', 'Sana',
  'Cyril', 'Nia', 'Bram', 'Iris', 'Cassian', 'Vera', 'Lior', 'Tamsin',
  'Soren', 'Jun', 'Anya', 'Eli', 'Mira', 'Rune', 'Zara', 'Kael',
  'Indira', 'Felix', 'Naomi', 'Thora', 'Ravi', 'Lena', 'Idris', 'Yara',
  'Cael', 'Wren', 'Maren', 'Dorian', 'Sable', 'Clio', 'Penn', 'Oryn',
  'Vesper', 'Davi', 'Arlo', 'Saya', 'Cian', 'Nora', 'Remy', 'Leif'
]

const LAST_NAMES = [
  'Ashvale', 'Brightwood', 'Stonefield', 'Ironroot', 'Silverleaf',
  'Marsh', 'Hollow', 'Reed', 'Vance', 'Crow', 'Wren', 'Thorn',
  'Ember', 'Frost', 'Greenshield', 'Riversong', 'Dunehammer',
  'Coppergate', 'Nighthollow', 'Bramblepath', 'Windmere', 'Saltcroft'
]

const TRAITS = [
  'curious', 'stubborn', 'kind', 'sarcastic', 'anxious', 'dreamy',
  'pragmatic', 'mischievous', 'gentle', 'fierce', 'lonely', 'cheerful',
  'philosophical', 'gossipy', 'stoic', 'theatrical', 'paranoid', 'wise',
  'naive', 'lazy', 'ambitious', 'compassionate', 'cynical', 'hopeful'
]

const KNOWLEDGE = [
  'farming', 'medicine', 'old folktales', 'star-reading', 'cooking',
  'weather signs', 'animal lore', 'fishing', 'metalwork', 'weaving',
  'forgotten gods', 'river paths', 'mushroom hunting', 'herbal lore',
  'building', 'songs of the old days', 'children\'s games', 'trade routes'
]

const MOODS = ['content', 'restless', 'hopeful', 'tired', 'curious', 'wary', 'lonely', 'inspired']

// Jobs with their associated PURPOSE, daily GOALS, and FEARS.
// This is what makes each NPC feel alive and different.
const JOB_DATA = {
  farmer: {
    purpose: 'Feed the village and keep the land healthy through every season.',
    goals: [
      'Expand the eastern fields before autumn',
      'Develop a drought-resistant crop variety',
      'Teach young Nia how to read soil conditions',
      'Save enough grain to last two winters',
      'Build a proper irrigation channel from the river'
    ],
    fears: ['drought', 'a bad harvest ruining the village', 'losing the land to floods'],
    dailyRoutine: 'Rises before dawn, tends crops until dusk, trades surplus at market.'
  },
  fisher: {
    purpose: 'Provide fish for the village and understand the rhythms of the water.',
    goals: [
      'Chart the deep fishing spots no one has mapped yet',
      'Build a second fishing boat before spring',
      'Discover what is causing the fish to avoid the south cove',
      'Teach the children to swim and fish safely',
      'Dry and preserve enough fish for winter trade'
    ],
    fears: ['storms capsizing the boat', 'the fish disappearing', 'deep water'],
    dailyRoutine: 'Fishes at dawn and dusk, repairs nets and boats in the afternoon.'
  },
  healer: {
    purpose: 'Keep the village healthy, ease suffering, and preserve medicinal knowledge.',
    goals: [
      'Catalog every healing herb in the region',
      'Find a cure for the persistent winter cough',
      'Convince the village to build a proper herb garden',
      'Train at least one apprentice before growing old',
      'Document remedies before the old knowledge is forgotten'
    ],
    fears: ['a plague the herbs cannot cure', 'running out of medicine in winter', 'losing a patient'],
    dailyRoutine: 'Tends the sick in the morning, gathers herbs midday, prepares remedies at dusk.'
  },
  storyteller: {
    purpose: 'Preserve history and wisdom through stories, and keep the village connected to its past.',
    goals: [
      'Collect the twelve lost songs of the old village',
      'Write down the oral histories before they are forgotten',
      'Organize the midsummer storytelling festival',
      'Find the origin of the strange symbol carved on the old stones',
      'Pass the great tales to the next generation'
    ],
    fears: ['stories dying out', 'being forgotten', 'the old ways being abandoned'],
    dailyRoutine: 'Walks the village in morning collecting news, tells stories by the fire at night.'
  },
  wanderer: {
    purpose: 'Explore beyond the horizon and bring back knowledge, maps, and rare goods.',
    goals: [
      'Map the coastline two villages east',
      'Find the rumored ruins beyond the northern ridge',
      'Establish a trade contact in the far settlement',
      'Discover what lies past the great forest',
      'Return with something extraordinary before the first snow'
    ],
    fears: ['being forgotten while away', 'getting lost somewhere unreachable', 'dying alone'],
    dailyRoutine: 'Leaves early, returns late, rarely stays in one place more than two days.'
  },
  smith: {
    purpose: 'Craft the tools and weapons that the village needs to thrive and survive.',
    goals: [
      'Forge a perfect blade that will last a hundred years',
      'Discover a stronger alloy using local ore',
      'Repair the village gate before the cold season',
      'Take on an apprentice to carry on the craft',
      'Build a proper bellows to increase the forge temperature'
    ],
    fears: ['running out of metal ore', 'the forge fire going out in winter', 'shoddy work causing harm'],
    dailyRoutine: 'Works the forge from mid-morning until evening, inspects tools and weapons daily.'
  },
  weaver: {
    purpose: 'Create cloth and garments that keep people warm, beautiful, and culturally connected.',
    goals: [
      'Complete the ceremonial banner for the winter festival',
      'Develop a new waterproof weave for the fishers',
      'Source rare indigo dye from the traveling merchants',
      'Teach three children the loom before they lose interest',
      'Weave a tapestry that tells the village\'s history'
    ],
    fears: ['running out of good thread', 'the loom breaking', 'patterns being forgotten'],
    dailyRoutine: 'Weaves all day, trades cloth and garments at the market each week.'
  },
  cook: {
    purpose: 'Nourish the community and bring people together through shared meals.',
    goals: [
      'Create a signature dish that becomes a village tradition',
      'Source every spice available from passing traders',
      'Organize a proper harvest feast this autumn',
      'Teach the recipe for grandmother\'s soup to everyone',
      'Preserve enough food to feed twenty people through winter'
    ],
    fears: ['famine', 'poisoning someone by mistake', 'the fire going out mid-cook'],
    dailyRoutine: 'Cooks meals three times a day, visits the market every morning for fresh ingredients.'
  },
  shepherd: {
    purpose: 'Protect the flocks and manage the animals that the village depends on.',
    goals: [
      'Expand the flock to thirty animals before spring',
      'Find the wolf that has been circling the eastern hills',
      'Build a new stone enclosure that can survive storms',
      'Discover better grazing land beyond the ridge',
      'Develop a remedy for the sheep\'s seasonal illness'
    ],
    fears: ['predators taking the flock', 'disease spreading through the animals', 'a harsh winter killing the herd'],
    dailyRoutine: 'Leads the flock out at dawn, returns at dusk, guards them through stormy nights.'
  },
  forager: {
    purpose: 'Find wild food and materials that the village cannot grow or make itself.',
    goals: [
      'Discover a new mushroom grove deeper in the forest',
      'Map every berry patch within a day\'s walk',
      'Find the rare root the healer has been requesting',
      'Stockpile enough wild berries for winter jam',
      'Learn which plants are safe to eat in each season'
    ],
    fears: ['getting lost in the deep forest', 'accidentally eating something poisonous', 'overharvesting and killing off wild patches'],
    dailyRoutine: 'Forages from sunrise to midday, returns to process and sort finds in the afternoon.'
  },
  priest: {
    purpose: 'Serve as the spiritual center of the village — performing rituals, offering counsel, and maintaining peace.',
    goals: [
      'Complete the midsummer blessing ceremony',
      'Counsel the grieving family after the recent loss',
      'Restore the old shrine before the winter solstice',
      'Understand the meaning of the ancient symbols carved nearby',
      'Help the village find hope during difficult times'
    ],
    fears: ['losing the community\'s faith', 'being unable to comfort suffering', 'the old rites being forgotten'],
    dailyRoutine: 'Meditates at dawn, counsels villagers throughout the day, leads evening prayers.'
  },
  merchant: {
    purpose: 'Connect the village to the wider world through trade and commerce.',
    goals: [
      'Establish a regular trade route with the eastern settlements',
      'Negotiate lower prices for iron from the northern suppliers',
      'Build a proper storehouse before the next trading season',
      'Find a rare commodity that only this village can supply',
      'Mentor a young trader to expand the business'
    ],
    fears: ['bandits on the road', 'a trade deal falling through', 'the market drying up'],
    dailyRoutine: 'Counts stock in the morning, trades through the day, plans routes in the evening.'
  },
  hunter: {
    purpose: 'Provide meat and pelts for the village, and protect it from dangerous wildlife.',
    goals: [
      'Track the large boar that has been raiding the crops',
      'Map the animal trails in the northern forest',
      'Prepare enough smoked meat to last the village through winter',
      'Train the new dog pup as a hunting companion',
      'Find the source of the strange tracks found near the village'
    ],
    fears: ['a dangerous animal reaching the village', 'game becoming scarce', 'losing a hunting companion'],
    dailyRoutine: 'Hunts before dawn and at dusk, prepares and trades meat midday, tracks animals afternoon.'
  }
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN(arr, n, rng) {
  const copy = [...arr]
  const out = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const SKIN_TONES  = ['#f4d2a0', '#e8b87a', '#d99560', '#c47a4a', '#9a5a35', '#6b3d20', '#f5deb3', '#dcb892']
const HAIR_COLORS = ['#1a0e08', '#3a1f10', '#5a3520', '#8a5a30', '#c89060', '#d4a060', '#e8c878', '#88909a', '#dcdce0', '#5a3a8a', '#6a2030']
const SHIRT_COLORS = [
  '#e07a5f', '#81b29a', '#f2cc8f', '#d4a373', '#b56576', '#6d597a',
  '#83c5be', '#ffb4a2', '#cdb4db', '#a8dadc', '#ffafcc', '#bde0fe',
  '#a8e6cf', '#ffd3b6', '#ffaaa5', '#dcedc1', '#88d8b0', '#ff8b94',
  '#3a5a8a', '#5a3a3a', '#3a5a3a', '#7a5a3a'
]
const PANTS_COLORS = ['#2a2a2a', '#3a2a1a', '#1a3a5a', '#3a3a3a', '#5a3a2a', '#1a1a2a', '#3a4a3a', '#4a3a4a']
const HAT_COLORS   = ['#3a2a1a', '#5a3a2a', '#1a3a5a', '#5a1a1a', '#3a3a5a']

export function generateNPC(seed) {
  const rng = mulberry32(seed * 9999 + 17)
  const firstName = pick(FIRST_NAMES, rng)
  const lastName  = pick(LAST_NAMES, rng)
  const traits    = pickN(TRAITS, 3, rng)
  const knowledge = pickN(KNOWLEDGE, 2, rng)
  const mood      = pick(MOODS, rng)
  const job       = pick(Object.keys(JOB_DATA), rng)
  const age       = 18 + Math.floor(rng() * 60)

  const jobData   = JOB_DATA[job]
  // Each NPC has 2 active goals (chosen deterministically from the pool)
  const activeGoals = pickN(jobData.goals, 2, rng)
  const activeFear  = pick(jobData.fears, rng)

  // Visual variation
  const skinTone   = pick(SKIN_TONES, rng)
  const hairColor  = pick(HAIR_COLORS, rng)
  const shirtColor = pick(SHIRT_COLORS, rng)
  const pantsColor = pick(PANTS_COLORS, rng)
  const hasHat     = rng() < 0.35
  const hatColor   = hasHat ? pick(HAT_COLORS, rng) : null
  const heightScale = 0.85 + rng() * 0.35
  const bodyWidth   = 0.85 + rng() * 0.35
  const headSize    = 0.9  + rng() * 0.25
  const hairStyle   = Math.floor(rng() * 4)

  return {
    id: `npc_${seed}`,
    seed,
    name: `${firstName} ${lastName}`,
    firstName,
    age,
    job,
    traits,
    knowledge,
    mood,
    memory: [],
    // Purpose & goals — the heart of NPC identity
    purpose: jobData.purpose,
    activeGoals,
    activeFear,
    dailyRoutine: jobData.dailyRoutine,
    appearance: {
      skinTone, hairColor, shirtColor, pantsColor,
      hasHat, hatColor, heightScale, bodyWidth, headSize, hairStyle
    }
  }
}

// Job → work animation type
export const JOB_WORK_TYPES = {
  farmer:      'chop',
  fisher:      'fish',
  healer:      'idle',
  storyteller: 'idle',
  wanderer:    'chop',
  smith:       'build',
  weaver:      'idle',
  cook:        'chop',
  shepherd:    'chop',
  forager:     'chop',
  priest:      'idle',
  merchant:    'idle',
  hunter:      'chop'
}

// Compact system prompt — every token costs credits, keep it tight.
export function buildSystemPrompt(npc, worldContext) {
  return `You are ${npc.name}, a ${npc.age}yo ${npc.job} in a medieval village.
Traits: ${npc.traits.join(', ')}. Mood: ${npc.mood}. Knows: ${npc.knowledge.join(', ')}.
Goal: ${npc.activeGoals[0]}. Fear: ${npc.activeFear}.
Now: ${worldContext.season}, ${worldContext.timeOfDay}, ${worldContext.climate}.
Reply in 1-2 short sentences, in character, no modern language, never mention being AI.`
}
