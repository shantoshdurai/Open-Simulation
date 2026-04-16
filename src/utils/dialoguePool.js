// Pre-written NPC-to-NPC conversation system.
// Each conversation is an array of lines with speaker index (0 or 1).
// Tagged with filters for contextual selection.

const CONVERSATIONS = {
  work_farming: [
    { lines: [
      { s: 0, t: "These turnips are coming in thick this year." },
      { s: 1, t: "Good soil after the spring rains. My plot's doing well too." },
      { s: 0, t: "Think we'll have enough to trade with the mountain folk?" },
      { s: 1, t: "If we dry some, should last through winter easily." }
    ], jobs: ['farmer', 'forager', 'cook'] },
    { lines: [
      { s: 0, t: "The wheat field needs tending again." },
      { s: 1, t: "I'll help after I finish with the herb garden." },
      { s: 0, t: "Much appreciated. These old bones aren't what they used to be." }
    ], jobs: ['farmer', 'forager', 'healer'] },
    { lines: [
      { s: 0, t: "Have you tried planting near the river bend?" },
      { s: 1, t: "Too muddy there. But the soil by the old oak is perfect." },
      { s: 0, t: "Ah, I hadn't thought of that spot. Good thinking." }
    ], jobs: ['farmer', 'forager'] },
    { lines: [
      { s: 0, t: "The harvest moon is coming soon." },
      { s: 1, t: "Best time to gather the late crops." },
      { s: 0, t: "I remember my grandmother saying the same thing." },
      { s: 1, t: "Some wisdom never gets old." }
    ], jobs: ['farmer', 'forager', 'cook'] },
    { lines: [
      { s: 0, t: "Found beetles on my cabbages this morning." },
      { s: 1, t: "Try scattering ash around the stems. Works every time." },
      { s: 0, t: "I'll give it a go. Thanks for the tip." }
    ], jobs: ['farmer', 'forager'] },
    { lines: [
      { s: 0, t: "The goats got into the vegetable patch again." },
      { s: 1, t: "You need a better fence. I can help you build one." },
      { s: 0, t: "Would you? That'd save the whole autumn crop." },
      { s: 1, t: "What are neighbors for?" }
    ], jobs: ['farmer', 'shepherd', 'smith'] },
    { lines: [
      { s: 0, t: "I'm thinking of clearing the south field next season." },
      { s: 1, t: "That's rocky ground. You'll need help with the stones." },
      { s: 0, t: "Maybe we could make a day of it. Get the whole village." }
    ], jobs: ['farmer', 'forager'] },
    { lines: [
      { s: 0, t: "Rain's been good this month." },
      { s: 1, t: "Almost too good. My cellar's starting to flood." },
      { s: 0, t: "Better than drought though. Remember last summer?" },
      { s: 1, t: "Don't remind me. Lost half the corn." }
    ], jobs: ['farmer', 'forager', 'cook'] },
    { lines: [
      { s: 0, t: "I've been experimenting with new seed varieties." },
      { s: 1, t: "Oh? Where'd you get them?" },
      { s: 0, t: "Traded with a wanderer passing through last week." },
      { s: 1, t: "Let me know how they turn out. I might want some too." }
    ], jobs: ['farmer', 'merchant', 'wanderer'] },
    { lines: [
      { s: 0, t: "The compost heap is ready to spread." },
      { s: 1, t: "Perfect timing. The soil needs it before we plant." },
      { s: 0, t: "Nothing grows without good earth beneath it." }
    ], jobs: ['farmer', 'forager'] },
  ],

  work_fishing: [
    { lines: [
      { s: 0, t: "Caught three big ones this morning near the shallows." },
      { s: 1, t: "The fish are running well this season." },
      { s: 0, t: "Best I've seen in years, honestly." }
    ], jobs: ['fisher', 'cook'] },
    { lines: [
      { s: 0, t: "My net's got a hole in it again." },
      { s: 1, t: "Use the double-knot weave. It holds better against the rocks." },
      { s: 0, t: "You'll have to show me. I always mess up that part." }
    ], jobs: ['fisher', 'weaver'] },
    { lines: [
      { s: 0, t: "The tide was strange today. Very low." },
      { s: 1, t: "Could mean a storm's coming. Best to stay close to shore." },
      { s: 0, t: "Aye, I'll keep that in mind tomorrow." }
    ], jobs: ['fisher'] },
    { lines: [
      { s: 0, t: "Ever fish at night? The lantern fish come out then." },
      { s: 1, t: "Too eerie for me. The water looks like ink after dark." },
      { s: 0, t: "That's when the biggest ones bite though." },
      { s: 1, t: "You're braver than me, I'll say that." }
    ], jobs: ['fisher'] },
    { lines: [
      { s: 0, t: "Smoked fish for dinner again tonight." },
      { s: 1, t: "You should try the herb rub recipe I shared." },
      { s: 0, t: "I did! Family loved it. Even the little ones ate it all." }
    ], jobs: ['fisher', 'cook'] },
    { lines: [
      { s: 0, t: "The old fishing spot by the rocks dried up." },
      { s: 1, t: "Try the cove past the big boulder. Deep water there." },
      { s: 0, t: "Hadn't thought of that. I'll head there tomorrow." }
    ], jobs: ['fisher'] },
    { lines: [
      { s: 0, t: "Do you believe what they say about sea creatures?" },
      { s: 1, t: "The ones in the deep? I've seen strange shadows down there." },
      { s: 0, t: "Maybe some stories have more truth than we think." }
    ], jobs: ['fisher', 'storyteller'] },
    { lines: [
      { s: 0, t: "I need to repair my boat before the rains come." },
      { s: 1, t: "Use pine tar for the seams. Lasts longer than wax." },
      { s: 0, t: "Good advice. I'll gather some this afternoon." }
    ], jobs: ['fisher', 'smith'] },
  ],

  work_crafting: [
    { lines: [
      { s: 0, t: "This blade needs resharpening. The edge is dull." },
      { s: 1, t: "Bring it by the forge tomorrow. I'll fix it up." },
      { s: 0, t: "What would we do without a smith in the village?" }
    ], jobs: ['smith', 'hunter', 'farmer'] },
    { lines: [
      { s: 0, t: "I've been weaving a new pattern. Triangles within circles." },
      { s: 1, t: "Sounds beautiful. Is it for the festival banner?" },
      { s: 0, t: "Maybe. Or maybe just because I like how it looks." }
    ], jobs: ['weaver', 'merchant'] },
    { lines: [
      { s: 0, t: "The forge runs hot today. Good weather for metalwork." },
      { s: 1, t: "Need any charcoal? I've got extra from the kiln." },
      { s: 0, t: "Always. Can never have too much. I'll trade you some nails." }
    ], jobs: ['smith', 'farmer', 'forager'] },
    { lines: [
      { s: 0, t: "Building a new shelf for the shop today." },
      { s: 1, t: "Use oak if you can find it. Pine warps in the damp." },
      { s: 0, t: "Oak it is. There's a fallen one near the east path." }
    ], jobs: ['smith', 'merchant'] },
    { lines: [
      { s: 0, t: "I mended the village gate hinges last night." },
      { s: 1, t: "I noticed it wasn't squeaking anymore. Nice work." },
      { s: 0, t: "Small things, but they matter." }
    ], jobs: ['smith'] },
    { lines: [
      { s: 0, t: "The new wool from the highlands is excellent quality." },
      { s: 1, t: "I can feel the difference. So soft." },
      { s: 0, t: "I'm making blankets for the cold months ahead." },
      { s: 1, t: "Put me down for two. My old ones are threadbare." }
    ], jobs: ['weaver', 'shepherd', 'merchant'] },
    { lines: [
      { s: 0, t: "I forged a new hoe for old Bram yesterday." },
      { s: 1, t: "He needed one. His was practically held together by rust." },
      { s: 0, t: "He tried to pay me in turnips. I accepted." }
    ], jobs: ['smith', 'farmer'] },
    { lines: [
      { s: 0, t: "Have you seen the new dye from the southern traders?" },
      { s: 1, t: "The deep blue one? It's stunning." },
      { s: 0, t: "I'm going to use it on the ceremonial cloth." }
    ], jobs: ['weaver', 'merchant', 'priest'] },
  ],

  general_morning: [
    { lines: [
      { s: 0, t: "Beautiful morning, isn't it?" },
      { s: 1, t: "The mist on the hills looks like a painting." },
      { s: 0, t: "Days like this make me grateful to live here." }
    ], time: 'morning' },
    { lines: [
      { s: 0, t: "Didn't sleep well last night." },
      { s: 1, t: "The wind was howling through the valley." },
      { s: 0, t: "At least the sun's out now. That helps." },
      { s: 1, t: "A warm cup of tea and you'll feel right." }
    ], time: 'morning' },
    { lines: [
      { s: 0, t: "I woke up before dawn today. Couldn't go back to sleep." },
      { s: 1, t: "The early hours are peaceful though." },
      { s: 0, t: "True. Watched the stars fade. It was lovely." }
    ], time: 'morning' },
    { lines: [
      { s: 0, t: "What's on your list for today?" },
      { s: 1, t: "The usual. Work, eat, maybe a walk by the lake." },
      { s: 0, t: "Simple days are the best days." }
    ], time: 'morning' },
    { lines: [
      { s: 0, t: "The birds were singing so loud this morning." },
      { s: 1, t: "Spring does that. Everything waking up." },
      { s: 0, t: "Even the flowers seem to stretch toward the light." }
    ], time: 'morning' },
    { lines: [
      { s: 0, t: "I made extra porridge this morning. Want some?" },
      { s: 1, t: "You don't have to ask twice. I'm famished." },
      { s: 0, t: "Added honey this time. From the meadow hives." }
    ], time: 'morning' },
  ],

  general_evening: [
    { lines: [
      { s: 0, t: "Long day today. My feet ache." },
      { s: 1, t: "Come sit. Rest is earned after a day's work." },
      { s: 0, t: "You're right. Tomorrow will be here soon enough." }
    ], time: 'evening' },
    { lines: [
      { s: 0, t: "Look at those colors in the sky." },
      { s: 1, t: "Sunset gets better every evening somehow." },
      { s: 0, t: "My grandmother used to say red sky means good weather tomorrow." }
    ], time: 'evening' },
    { lines: [
      { s: 0, t: "Stars are already showing. Early tonight." },
      { s: 1, t: "Clear skies. You can almost see the river of stars." },
      { s: 0, t: "I could stare at them all night." },
      { s: 1, t: "Don't fall asleep out here. It gets cold." }
    ], time: 'evening' },
    { lines: [
      { s: 0, t: "Shall we have a fire tonight?" },
      { s: 1, t: "Absolutely. I'll bring some dried herbs to burn." },
      { s: 0, t: "The cedar ones? Those smell wonderful." }
    ], time: 'evening' },
    { lines: [
      { s: 0, t: "Another day done. The village is quiet now." },
      { s: 1, t: "That's what I love about evenings here." },
      { s: 0, t: "Just the sound of crickets and the breeze." }
    ], time: 'evening' },
    { lines: [
      { s: 0, t: "I heard music from your house last night." },
      { s: 1, t: "I was practicing the flute. Sorry if it was too loud." },
      { s: 0, t: "No, it was lovely. Play again tonight?" }
    ], time: 'evening' },
  ],

  general_weather: [
    { lines: [
      { s: 0, t: "Feels like rain's coming." },
      { s: 1, t: "The clouds to the west look heavy." },
      { s: 0, t: "Better bring the laundry in, I suppose." }
    ] },
    { lines: [
      { s: 0, t: "Wind's picking up. Could be a storm." },
      { s: 1, t: "I secured the shutters just in case." },
      { s: 0, t: "Smart. Last time we lost half the roof tiles." }
    ] },
    { lines: [
      { s: 0, t: "Perfect weather for a walk today." },
      { s: 1, t: "Not too hot, not too cold." },
      { s: 0, t: "Goldilocks weather, my mother called it." },
      { s: 1, t: "I like that. Goldilocks weather." }
    ] },
    { lines: [
      { s: 0, t: "The heat today is something else." },
      { s: 1, t: "I've been staying in the shade all afternoon." },
      { s: 0, t: "The well water's still cold at least." }
    ] },
    { lines: [
      { s: 0, t: "Frost on the ground this morning." },
      { s: 1, t: "Winter's not far off now." },
      { s: 0, t: "Time to stack more firewood." },
      { s: 1, t: "I'll help. We should do it before the first snow." }
    ] },
    { lines: [
      { s: 0, t: "The fog's so thick today I nearly walked into a tree." },
      { s: 1, t: "The whole world feels like a dream when it's like this." },
      { s: 0, t: "A very damp dream." }
    ] },
    { lines: [
      { s: 0, t: "Haven't seen rain in weeks." },
      { s: 1, t: "The river's getting low. We should be careful with water." },
      { s: 0, t: "Hopefully the clouds come soon." }
    ] },
    { lines: [
      { s: 0, t: "That thunderstorm last night was incredible." },
      { s: 1, t: "Lightning hit the old pine on the ridge." },
      { s: 0, t: "I saw it from my window. Split it right in half." }
    ] },
  ],

  village_life: [
    { lines: [
      { s: 0, t: "Have you met the new family that moved in?" },
      { s: 1, t: "Not yet. I hear they're from the eastern coast." },
      { s: 0, t: "We should welcome them. Bring some bread maybe." },
      { s: 1, t: "Good idea. Nobody should feel like a stranger here." }
    ] },
    { lines: [
      { s: 0, t: "The village well needs a new bucket." },
      { s: 1, t: "I noticed the rope's fraying too." },
      { s: 0, t: "We should bring it up at the next gathering." }
    ] },
    { lines: [
      { s: 0, t: "Remember when this village was just four houses?" },
      { s: 1, t: "Look at it now. Roads, a market, even a tower." },
      { s: 0, t: "We built something good here." }
    ] },
    { lines: [
      { s: 0, t: "The children were playing in the square all afternoon." },
      { s: 1, t: "That's how it should be. Running, laughing, no worries." },
      { s: 0, t: "Makes me feel like we're doing something right." }
    ] },
    { lines: [
      { s: 0, t: "I'm thinking of expanding my house this summer." },
      { s: 1, t: "Adding a room?" },
      { s: 0, t: "A workshop. Somewhere to tinker when it rains." },
      { s: 1, t: "I'll lend you a hand with the frame." }
    ] },
    { lines: [
      { s: 0, t: "The market was busy today." },
      { s: 1, t: "Traders from two villages over came through." },
      { s: 0, t: "They had spices I haven't seen in ages." },
      { s: 1, t: "I picked up some saffron. Worth every coin." }
    ] },
    { lines: [
      { s: 0, t: "Old Theo's been sitting on his porch all day." },
      { s: 1, t: "He watches the road. Says he's waiting for someone." },
      { s: 0, t: "He's been saying that for years. Bless him." }
    ] },
    { lines: [
      { s: 0, t: "We need to fix the path between the houses." },
      { s: 1, t: "It turns to mud every time it rains." },
      { s: 0, t: "Some flat stones would do the trick." },
      { s: 1, t: "I know where to find good ones by the creek." }
    ] },
    { lines: [
      { s: 0, t: "The community garden is looking wonderful." },
      { s: 1, t: "Everyone's been contributing. Even the little ones help." },
      { s: 0, t: "There's something special about growing food together." }
    ] },
    { lines: [
      { s: 0, t: "Shall we organize a feast next week?" },
      { s: 1, t: "Oh yes! It's been too long since we all sat together." },
      { s: 0, t: "I'll make the stew if you handle the bread." },
      { s: 1, t: "Deal. It's going to be a good night." }
    ] },
  ],

  seasons: [
    { lines: [
      { s: 0, t: "Spring is here. Can you smell the blossoms?" },
      { s: 1, t: "The whole valley is waking up." },
      { s: 0, t: "My favorite time of year. Everything feels possible." }
    ], season: 'Spring' },
    { lines: [
      { s: 0, t: "Summer heat makes everything slow down." },
      { s: 1, t: "Even the animals are hiding in the shade." },
      { s: 0, t: "I don't blame them. My shirt's soaked through." }
    ], season: 'Summer' },
    { lines: [
      { s: 0, t: "The leaves are turning. Look at those reds and golds." },
      { s: 1, t: "Autumn's palette is unmatched." },
      { s: 0, t: "Makes the whole forest look like it's on fire." },
      { s: 1, t: "A beautiful kind of fire." }
    ], season: 'Autumn' },
    { lines: [
      { s: 0, t: "First snow of the season. Always magical." },
      { s: 1, t: "The world gets so quiet when it snows." },
      { s: 0, t: "Like the whole planet is holding its breath." }
    ], season: 'Winter' },
    { lines: [
      { s: 0, t: "The days are getting shorter." },
      { s: 1, t: "I've been lighting candles earlier and earlier." },
      { s: 0, t: "At least it means more time by the fire with stories." }
    ], season: 'Autumn' },
    { lines: [
      { s: 0, t: "When will spring come? I'm tired of the cold." },
      { s: 1, t: "A few more weeks. The days are already getting longer." },
      { s: 0, t: "I'll hold onto that." }
    ], season: 'Winter' },
    { lines: [
      { s: 0, t: "The summer berries are ripe." },
      { s: 1, t: "I've been picking baskets full every morning." },
      { s: 0, t: "Save some for jam. Winter-you will thank summer-you." },
      { s: 1, t: "Wise words. I'll start preserving tomorrow." }
    ], season: 'Summer' },
    { lines: [
      { s: 0, t: "Spring planting starts next week." },
      { s: 1, t: "I've already prepared my seed rows." },
      { s: 0, t: "Always so organized. I haven't even cleaned my tools." }
    ], season: 'Spring' },
  ],

  storytelling: [
    { lines: [
      { s: 0, t: "Have you heard the tale of the wandering star?" },
      { s: 1, t: "The one that fell into the ocean?" },
      { s: 0, t: "That's the one. They say it still glows at the bottom of the sea." },
      { s: 1, t: "I love that story. My father used to tell it." }
    ], jobs: ['storyteller', 'priest'] },
    { lines: [
      { s: 0, t: "Do you believe in the old gods?" },
      { s: 1, t: "I believe in what I can see. The sun, the rain, the earth." },
      { s: 0, t: "Maybe that's all the gods ever were." },
      { s: 1, t: "That's... actually quite profound." }
    ], jobs: ['priest', 'storyteller'] },
    { lines: [
      { s: 0, t: "I found strange markings on the stones by the river." },
      { s: 1, t: "Old script. From before the village was here." },
      { s: 0, t: "What do you think they mean?" },
      { s: 1, t: "Warnings, prayers, or maybe just someone's name. Hard to say." }
    ] },
    { lines: [
      { s: 0, t: "Tell me something I don't know." },
      { s: 1, t: "Did you know bees can see colors we can't?" },
      { s: 0, t: "Really? Like what?" },
      { s: 1, t: "Ultra-violet patterns on flowers. A hidden world right in front of us." }
    ] },
    { lines: [
      { s: 0, t: "My grandmother used to say the mountains were sleeping giants." },
      { s: 1, t: "And one day they'll wake up?" },
      { s: 0, t: "She said they're dreaming. And we live in their dreams." },
      { s: 1, t: "That's either beautiful or terrifying." }
    ], jobs: ['storyteller'] },
    { lines: [
      { s: 0, t: "I've been writing down the old songs before they're forgotten." },
      { s: 1, t: "That's important work. Stories need keepers." },
      { s: 0, t: "Someone has to remember. The words hold power." }
    ], jobs: ['storyteller', 'priest'] },
    { lines: [
      { s: 0, t: "They say there's a cave beyond the ridge that echoes forever." },
      { s: 1, t: "I heard if you shout your name, the mountain answers back." },
      { s: 0, t: "Have you tried it?" },
      { s: 1, t: "No. Some mysteries are better left mysterious." }
    ] },
    { lines: [
      { s: 0, t: "What do you think is beyond the horizon?" },
      { s: 1, t: "More villages. More people with stories to tell." },
      { s: 0, t: "Or maybe dragons." },
      { s: 1, t: "I prefer the people option, thank you." }
    ] },
  ],

  philosophy: [
    { lines: [
      { s: 0, t: "Do you ever wonder what happens after all of this?" },
      { s: 1, t: "All of what? Life?" },
      { s: 0, t: "Everything. The seasons keep cycling. Do we?" },
      { s: 1, t: "I hope so. One life doesn't feel like enough." }
    ], traits: ['philosophical', 'dreamy'] },
    { lines: [
      { s: 0, t: "What makes a good life, do you think?" },
      { s: 1, t: "Honest work. Good friends. A warm fire on cold nights." },
      { s: 0, t: "That's... surprisingly simple." },
      { s: 1, t: "The best things usually are." }
    ], traits: ['philosophical', 'wise'] },
    { lines: [
      { s: 0, t: "Sometimes I feel so small looking at the mountains." },
      { s: 1, t: "We are small. But small things can be important." },
      { s: 0, t: "Like seeds?" },
      { s: 1, t: "Exactly like seeds." }
    ], traits: ['philosophical'] },
    { lines: [
      { s: 0, t: "Why do we keep building things that time will tear down?" },
      { s: 1, t: "Because the building matters more than the lasting." },
      { s: 0, t: "You sound like the priest." },
      { s: 1, t: "The priest sounds like everyone who's ever built something." }
    ], traits: ['philosophical', 'wise'] },
    { lines: [
      { s: 0, t: "The river is never the same twice, but it's always the river." },
      { s: 1, t: "Are you being deep or just watching the water?" },
      { s: 0, t: "Can't it be both?" },
      { s: 1, t: "Fair enough." }
    ], traits: ['philosophical', 'dreamy'] },
    { lines: [
      { s: 0, t: "I wonder if the fish think about us." },
      { s: 1, t: "The fish?" },
      { s: 0, t: "Like we look up at the sky and wonder. Do they look up at us?" },
      { s: 1, t: "You've had too much sun today." }
    ], traits: ['curious', 'dreamy'] },
  ],

  gossip: [
    { lines: [
      { s: 0, t: "Did you see who was at the market yesterday?" },
      { s: 1, t: "That traveler with the red cloak?" },
      { s: 0, t: "Asked a lot of questions about the old ruins." },
      { s: 1, t: "Treasure hunters, probably. They come through every few months." }
    ], traits: ['gossipy', 'curious'] },
    { lines: [
      { s: 0, t: "I heard the baker's been experimenting with new recipes." },
      { s: 1, t: "The rosemary bread? It's incredible." },
      { s: 0, t: "I need to get some before it sells out." }
    ] },
    { lines: [
      { s: 0, t: "Is it true someone saw lights on the mountain?" },
      { s: 1, t: "Just campfires, I think. Travelers passing through." },
      { s: 0, t: "I hope so. The old stories about that mountain..." },
      { s: 1, t: "Are just stories. Nothing to worry about." }
    ] },
    { lines: [
      { s: 0, t: "The healer's been busy lately." },
      { s: 1, t: "Just the usual winter sniffles going around." },
      { s: 0, t: "I should bring her some soup. She takes care of everyone else." }
    ], jobs: ['healer'] },
    { lines: [
      { s: 0, t: "Two traders got in an argument at the market today." },
      { s: 1, t: "Over what?" },
      { s: 0, t: "Price of wool, apparently. Got quite heated." },
      { s: 1, t: "Wool drama. The excitement never ends around here." }
    ] },
    { lines: [
      { s: 0, t: "I think the smith has a crush on the weaver." },
      { s: 1, t: "Oh, everyone knows that. Except maybe the weaver." },
      { s: 0, t: "Should we say something?" },
      { s: 1, t: "Absolutely not. Let it unfold naturally." }
    ] },
    { lines: [
      { s: 0, t: "The merchant's prices have gone up again." },
      { s: 1, t: "Supply and demand, I suppose." },
      { s: 0, t: "More like supply and greed." },
      { s: 1, t: "Shh! He might hear you." }
    ] },
    { lines: [
      { s: 0, t: "Someone left flowers on the memorial stone." },
      { s: 1, t: "Happens every spring. No one knows who does it." },
      { s: 0, t: "It's a kind gesture, whoever it is." }
    ] },
  ],

  trade: [
    { lines: [
      { s: 0, t: "I've got extra leather if you need any." },
      { s: 1, t: "Actually, yes. I'll trade you some dried herbs." },
      { s: 0, t: "Deal. I've been wanting to make a proper stew." }
    ], jobs: ['merchant', 'hunter', 'forager'] },
    { lines: [
      { s: 0, t: "The trading routes have been quiet lately." },
      { s: 1, t: "Fewer caravans passing through this season." },
      { s: 0, t: "Hope it picks up. We need salt and iron." }
    ], jobs: ['merchant', 'wanderer'] },
    { lines: [
      { s: 0, t: "What's the going rate for firewood these days?" },
      { s: 1, t: "Two bundles for a sack of grain." },
      { s: 0, t: "Fair enough. I'll bring some by tomorrow." }
    ] },
    { lines: [
      { s: 0, t: "I'm saving up for a proper set of tools." },
      { s: 1, t: "The smith makes good ones. Worth the price." },
      { s: 0, t: "I know, but I need to trade a lot more fish first." }
    ], jobs: ['fisher', 'smith', 'merchant'] },
    { lines: [
      { s: 0, t: "A wanderer offered me a map of the coast." },
      { s: 1, t: "Worth anything?" },
      { s: 0, t: "Hard to say. Could lead to new trade routes." },
      { s: 1, t: "Or it could be complete nonsense. Wanderers love tall tales." }
    ], jobs: ['merchant', 'wanderer'] },
    { lines: [
      { s: 0, t: "I need someone to help carry goods to the next village." },
      { s: 1, t: "When are you heading out?" },
      { s: 0, t: "Day after tomorrow, at dawn." },
      { s: 1, t: "Count me in. I could use the walk." }
    ], jobs: ['merchant', 'wanderer'] },
  ],

  healing: [
    { lines: [
      { s: 0, t: "My back's been aching since the last harvest." },
      { s: 1, t: "Let me make you a poultice. Willow bark and mint." },
      { s: 0, t: "You always know just what to use." }
    ], jobs: ['healer'] },
    { lines: [
      { s: 0, t: "I've been gathering meadowsweet for the winter stores." },
      { s: 1, t: "Good thinking. Fever season will come." },
      { s: 0, t: "Prevention is better than cure, they say." }
    ], jobs: ['healer', 'forager'] },
    { lines: [
      { s: 0, t: "The children's coughs are clearing up." },
      { s: 1, t: "That elderberry syrup works wonders." },
      { s: 0, t: "Nature provides, if you know where to look." }
    ], jobs: ['healer'] },
    { lines: [
      { s: 0, t: "I cut my hand on the forge yesterday." },
      { s: 1, t: "Show me. I'll clean it and wrap it properly." },
      { s: 0, t: "It's just a scratch, really." },
      { s: 1, t: "Small cuts get infected if you ignore them. Sit down." }
    ], jobs: ['healer', 'smith'] },
    { lines: [
      { s: 0, t: "Do you know a remedy for sleeplessness?" },
      { s: 1, t: "Chamomile tea before bed. And try not to worry so much." },
      { s: 0, t: "Easier said than done." },
      { s: 1, t: "I know. But the tea helps, truly." }
    ], jobs: ['healer'] },
  ],
}

// Flatten all conversations into a single pool with category tags
const ALL_CONVERSATIONS = []
let convId = 0
for (const [category, convos] of Object.entries(CONVERSATIONS)) {
  for (const conv of convos) {
    ALL_CONVERSATIONS.push({
      id: convId++,
      category,
      lines: conv.lines,
      jobs: conv.jobs || null,
      traits: conv.traits || null,
      time: conv.time || null,
      season: conv.season || null,
    })
  }
}

// Track recently used conversations per NPC pair to avoid repetition
const recentlyUsed = new Map() // "npcA_npcB" -> Set of conv IDs

function getPairKey(idA, idB) {
  return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`
}

function getTimeOfDayCategory(timeOfDay) {
  const hour = timeOfDay * 24
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 17 && hour < 22) return 'evening'
  return null
}

export function pickConversation(npcA, npcB, timeOfDay, season) {
  const pairKey = getPairKey(npcA.id, npcB.id)
  const used = recentlyUsed.get(pairKey) || new Set()
  const timeCategory = getTimeOfDayCategory(timeOfDay)

  // Score each conversation for this pair
  const scored = ALL_CONVERSATIONS
    .filter(c => !used.has(c.id))
    .map(conv => {
      let score = 1

      // Job match — big bonus
      if (conv.jobs) {
        const matchA = conv.jobs.includes(npcA.job)
        const matchB = conv.jobs.includes(npcB.job)
        if (matchA && matchB) score += 6
        else if (matchA || matchB) score += 3
      }

      // Trait match
      if (conv.traits) {
        const traitsA = new Set(npcA.traits)
        const traitsB = new Set(npcB.traits)
        for (const t of conv.traits) {
          if (traitsA.has(t) || traitsB.has(t)) score += 2
        }
      }

      // Time of day match
      if (conv.time && conv.time === timeCategory) score += 3
      if (conv.time && conv.time !== timeCategory) score *= 0.3

      // Season match
      if (conv.season && conv.season === season) score += 3
      if (conv.season && conv.season !== season) score *= 0.3

      return { conv, score }
    })
    .filter(s => s.score > 0)

  if (scored.length === 0) {
    // Reset used list and try again
    recentlyUsed.delete(pairKey)
    return pickConversation(npcA, npcB, timeOfDay, season)
  }

  // Weighted random selection
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0)
  let roll = Math.random() * totalScore
  let chosen = scored[0].conv
  for (const { conv, score } of scored) {
    roll -= score
    if (roll <= 0) { chosen = conv; break }
  }

  // Mark as used
  used.add(chosen.id)
  if (used.size > ALL_CONVERSATIONS.length * 0.6) used.clear() // reset when most are used
  recentlyUsed.set(pairKey, used)

  return {
    id: chosen.id,
    lines: chosen.lines.map(l => ({
      speaker: l.s,
      text: l.t
    }))
  }
}

export function getConversationCount() {
  return ALL_CONVERSATIONS.length
}
