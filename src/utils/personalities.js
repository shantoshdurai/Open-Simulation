// Procedural personality generator for NPCs.
// Each NPC gets a name, age, traits, knowledge, mood, and a visual seed.

const FIRST_NAMES = [
  'Arun', 'Priya', 'Kenji', 'Maya', 'Theo', 'Lyra', 'Otto', 'Sana',
  'Cyril', 'Nia', 'Bram', 'Iris', 'Cassian', 'Vera', 'Lior', 'Tamsin',
  'Soren', 'Jun', 'Anya', 'Eli', 'Mira', 'Rune', 'Zara', 'Kael',
  'Indira', 'Felix', 'Naomi', 'Thora', 'Ravi', 'Lena', 'Idris', 'Yara'
]

const LAST_NAMES = [
  'Ashvale', 'Brightwood', 'Stonefield', 'Ironroot', 'Silverleaf',
  'Marsh', 'Hollow', 'Reed', 'Vance', 'Crow', 'Wren', 'Thorn',
  'Ember', 'Frost', 'Greenshield', 'Riversong', 'Dunehammer'
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

const JOBS = [
  'farmer', 'fisher', 'healer', 'storyteller', 'wanderer', 'smith',
  'weaver', 'cook', 'shepherd', 'forager', 'priest', 'merchant', 'hunter'
]

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

const SKIN_TONES = ['#f4d2a0', '#e8b87a', '#d99560', '#c47a4a', '#9a5a35', '#6b3d20', '#f5deb3', '#dcb892']
const HAIR_COLORS = ['#1a0e08', '#3a1f10', '#5a3520', '#8a5a30', '#c89060', '#d4a060', '#e8c878', '#88909a', '#dcdce0', '#5a3a8a', '#6a2030']
const SHIRT_COLORS = [
  '#e07a5f', '#81b29a', '#f2cc8f', '#d4a373', '#b56576', '#6d597a',
  '#83c5be', '#ffb4a2', '#cdb4db', '#a8dadc', '#ffafcc', '#bde0fe',
  '#a8e6cf', '#ffd3b6', '#ffaaa5', '#dcedc1', '#88d8b0', '#ff8b94',
  '#3a5a8a', '#5a3a3a', '#3a5a3a', '#7a5a3a'
]
const PANTS_COLORS = ['#2a2a2a', '#3a2a1a', '#1a3a5a', '#3a3a3a', '#5a3a2a', '#1a1a2a', '#3a4a3a', '#4a3a4a']
const HAT_COLORS = ['#3a2a1a', '#5a3a2a', '#1a3a5a', '#5a1a1a', '#3a3a5a']

export function generateNPC(seed) {
  const rng = mulberry32(seed * 9999 + 17)
  const firstName = pick(FIRST_NAMES, rng)
  const lastName = pick(LAST_NAMES, rng)
  const traits = pickN(TRAITS, 3, rng)
  const knowledge = pickN(KNOWLEDGE, 2, rng)
  const mood = pick(MOODS, rng)
  const job = pick(JOBS, rng)
  const age = 18 + Math.floor(rng() * 60)

  // Visual variation
  const skinTone = pick(SKIN_TONES, rng)
  const hairColor = pick(HAIR_COLORS, rng)
  const shirtColor = pick(SHIRT_COLORS, rng)
  const pantsColor = pick(PANTS_COLORS, rng)
  const hasHat = rng() < 0.35
  const hatColor = hasHat ? pick(HAT_COLORS, rng) : null
  const heightScale = 0.85 + rng() * 0.35  // 0.85x – 1.2x
  const bodyWidth = 0.85 + rng() * 0.35
  const headSize = 0.9 + rng() * 0.25
  const hairStyle = Math.floor(rng() * 4) // 0=none/bald,1=cap,2=tuft,3=long

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
    appearance: {
      skinTone, hairColor, shirtColor, pantsColor,
      hasHat, hatColor, heightScale, bodyWidth, headSize, hairStyle
    }
  }
}

export function buildSystemPrompt(npc, worldContext) {
  return `You are ${npc.name}, a ${npc.age}-year-old ${npc.job} living in a small world.
Personality traits: ${npc.traits.join(', ')}.
You know about: ${npc.knowledge.join(', ')}.
Current mood: ${npc.mood}.

World right now:
- Climate: ${worldContext.climate}
- Season: ${worldContext.season}
- Time: ${worldContext.timeOfDay}

Speak naturally in 1-2 short sentences. Stay fully in character. Never break character. Never mention being an AI.`
}
