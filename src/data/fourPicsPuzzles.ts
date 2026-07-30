import type { FourPicsPuzzle } from "../types/games";

export const fourPicsPuzzles = [
  {
    answer: "ARK",
    reference: "Genesis 6:14",
    explanation: "God instructed Noah to make an ark of gopher wood.",
    extraLetters: ["T", "O", "N", "E"],
    clues: [
      { emoji: "🛶", label: "Wooden vessel", tone: "gold" },
      { emoji: "🌧️", label: "Great rain", tone: "blue" },
      { emoji: "🦁", label: "Animals gathered", tone: "green" },
      { emoji: "🌈", label: "Covenant sign", tone: "purple" },
    ],
  },
  {
    answer: "SHEPHERD",
    reference: "Psalm 23:1–2",
    explanation: "The LORD is my shepherd; I shall not want.",
    extraLetters: ["A", "I", "L", "T"],
    clues: [
      { emoji: "🐑", label: "A flock", tone: "blue" },
      { emoji: "🪄", label: "A staff", tone: "gold" },
      { emoji: "🌿", label: "Green pasture", tone: "green" },
      { emoji: "🧑‍🌾", label: "One who leads", tone: "purple" },
    ],
  },
  {
    answer: "MANNA",
    reference: "Exodus 16:14–15",
    explanation: "God provided bread from heaven for Israel in the wilderness.",
    extraLetters: ["B", "R", "E", "D"],
    clues: [
      { emoji: "🏜️", label: "Wilderness", tone: "gold" },
      { emoji: "❄️", label: "Small flakes", tone: "blue" },
      { emoji: "🧺", label: "Gathered daily", tone: "purple" },
      { emoji: "🍞", label: "Bread from heaven", tone: "green" },
    ],
  },
  {
    answer: "JERICHO",
    reference: "Joshua 6:20",
    explanation: "The wall fell down flat after the people shouted.",
    extraLetters: ["A", "W", "L", "S"],
    clues: [
      { emoji: "🏰", label: "Walled city", tone: "purple" },
      { emoji: "🚶", label: "Seven-day march", tone: "blue" },
      { emoji: "📯", label: "Trumpets", tone: "gold" },
      { emoji: "🧱", label: "Fallen walls", tone: "green" },
    ],
  },
  {
    answer: "DANIEL",
    reference: "Daniel 6:10, 16",
    explanation: "Daniel prayed faithfully and was cast into the lions’ den.",
    extraLetters: ["P", "R", "Y", "S"],
    clues: [
      { emoji: "🦁", label: "Lions", tone: "gold" },
      { emoji: "🕳️", label: "A den", tone: "purple" },
      { emoji: "🪟", label: "Open windows", tone: "blue" },
      { emoji: "🙏", label: "Faithful prayer", tone: "green" },
    ],
  },
  {
    answer: "PETER",
    reference: "Matthew 14:29; 26:74–75",
    explanation: "Peter followed Jesus, walked on water, and later heard the cock crow.",
    extraLetters: ["A", "S", "O", "N"],
    clues: [
      { emoji: "🎣", label: "Fisherman", tone: "blue" },
      { emoji: "🌊", label: "Walked on water", tone: "green" },
      { emoji: "🐓", label: "Cock crowed", tone: "gold" },
      { emoji: "🔑", label: "Keys promised", tone: "purple" },
    ],
  },
  {
    answer: "CROSS",
    reference: "John 19:17–18",
    explanation: "Jesus went forth bearing His cross and was crucified.",
    extraLetters: ["N", "A", "I", "L"],
    clues: [
      { emoji: "✝️", label: "Calvary", tone: "gold" },
      { emoji: "🔨", label: "Nails", tone: "blue" },
      { emoji: "👑", label: "Crown of thorns", tone: "purple" },
      { emoji: "🪦", label: "Empty tomb", tone: "green" },
    ],
  },
  {
    answer: "BETHLEHEM",
    reference: "Luke 2:4–16",
    explanation: "Joseph and Mary went to Bethlehem, where Jesus was born.",
    extraLetters: ["S", "T", "A", "R"],
    clues: [
      { emoji: "⭐", label: "Guiding star", tone: "gold" },
      { emoji: "🛖", label: "Humble shelter", tone: "purple" },
      { emoji: "👶", label: "A child born", tone: "green" },
      { emoji: "🐑", label: "Shepherds came", tone: "blue" },
    ],
  },
  {
    answer: "LAMP",
    reference: "Psalm 119:105",
    explanation: "Thy word is a lamp unto my feet, and a light unto my path.",
    extraLetters: ["T", "H", "Y", "S"],
    clues: [
      { emoji: "🪔", label: "Oil light", tone: "gold" },
      { emoji: "🦶", label: "Feet", tone: "green" },
      { emoji: "🛤️", label: "A path", tone: "blue" },
      { emoji: "📖", label: "God’s word", tone: "purple" },
    ],
  },
  {
    answer: "GOLIATH",
    reference: "1 Samuel 17:49",
    explanation: "David smote Goliath in his forehead with a stone from his sling.",
    extraLetters: ["D", "V", "S", "N"],
    clues: [
      { emoji: "🗿", label: "A giant", tone: "purple" },
      { emoji: "🛡️", label: "Heavy armour", tone: "blue" },
      { emoji: "🪨", label: "A stone", tone: "gold" },
      { emoji: "〰️", label: "A sling", tone: "green" },
    ],
  },
] satisfies readonly FourPicsPuzzle[];
