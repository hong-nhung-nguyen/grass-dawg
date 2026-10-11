// Fixed list of things the dog can react to. Each entry decides:
//   label   - the text CLIP compares the photo against
//   labels  - optional extra wordings for the same object; any of them counts as a match
//   name    - how the object is called in speech and the diary
//   action  - which animation the dog plays (see ANIMATION_CLIPS)
//   does    - what the dog does, used when asking the language model for a line
//   effects - how the pet's stats change
//   lines   - written fallback lines when the language model isn't loaded
//   discovery - true for landmarks that should be noted in the diary

export const INTERACTIONS = [
  {
    id: 'water_bowl', label: 'a dog water bowl', name: 'water bowl',
    action: 'drink', does: 'drink from it', effects: { energy: 8 },
    lines: ['Slurp slurp! So refreshing.', 'Water break! Best bowl ever.'],
  },
  {
    id: 'water', label: 'a fountain or a pond', name: 'water',
    action: 'splash', does: 'splash in it', effects: { happiness: 8 },
    lines: ['Splash! Can I jump in?', 'Water! My paws want in.'],
  },
  {
    id: 'grass', label: 'green grass on the ground', name: 'grass',
    action: 'roll', does: 'roll around in it', effects: { happiness: 6 },
    lines: ['Grass! Time for a big roll.', 'Wheee, it tickles my back!'],
  },
  {
    id: 'bench', label: 'a park bench', name: 'bench',
    action: 'sit', does: 'sit and rest on it', effects: { energy: 6 },
    lines: ['Quick sit. My paws say thanks.', 'Bench break, then more adventure.'],
  },
  {
    id: 'tree', label: 'a tree', name: 'tree',
    action: 'sniff', does: 'sniff around it', effects: { happiness: 5 },
    lines: ['So many smells on this tree!', 'Sniff sniff... another dog was here.'],
  },
  {
    id: 'dog', label: 'a real dog', name: 'dog',
    action: 'play', does: 'want to play with it', effects: { happiness: 10 },
    lines: ['A new friend! Can we play?', 'Hi buddy! Wanna chase?'],
  },
  {
    id: 'bird', label: 'a bird', name: 'bird',
    action: 'chase', does: 'chase it', effects: { happiness: 7 },
    lines: ['Bird! Come back, I just want to say hi!', 'Feathers! Must. Chase.'],
  },
  {
    id: 'flower', label: 'flowers', name: 'flowers',
    action: 'smell', does: 'smell them', effects: { happiness: 5 },
    lines: ['Ooh, smells sweet. Achoo!', 'Pretty flowers! Smells like spring.'],
  },
  {
    id: 'street_art', label: 'street art or a mural on a wall', name: 'street art',
    action: 'stare', does: 'stare at it, amazed', effects: {}, discovery: true,
    lines: ['Whoa, the wall has colours!', 'Is that painting looking at me?'],
  },
  {
    id: 'cafe', label: 'a cafe or a food stall', name: 'cafe',
    action: 'beg', does: 'beg for a treat', effects: { energy: 8 },
    lines: ['Something smells yummy. Treat please?', 'Snack stop? I promise to be good.'],
  },
  {
    id: 'statue', label: 'a statue', name: 'statue',
    action: 'bark', does: 'bark at it', effects: {}, discovery: true,
    lines: ["Woof! Why won't it move?", 'Hello? You are very still.'],
  },
  {
    id: 'bridge', label: 'a bridge', name: 'bridge',
    action: 'peek', does: 'peek over the edge', effects: {}, discovery: true,
    lines: ["Peeking over... it's so high!", "A bridge! What's on the other side?"],
  },
  {
    id: 'person', label: 'a person standing or walking', name: 'person',
    labels: ['a group of people'],
    action: 'greet', does: 'wag your tail and say hello', effects: { happiness: 8 },
    lines: ['A human! Hi hi hi, pat me please!', 'New friend spotted. Tail wag activated.'],
  },
  {
    id: 'chair', label: 'a chair', name: 'chair',
    labels: ['outdoor cafe chairs'],
    action: 'climb', does: 'hop up onto it', effects: { energy: 5 },
    lines: ['Hop! This is my throne now.', 'Up I go. Nice view from here!'],
  },
  {
    id: 'table', label: 'a table', name: 'table',
    labels: ['a picnic table'],
    action: 'search', does: 'sniff underneath it for crumbs', effects: { energy: 4 },
    lines: ['Any crumbs under here? Checking...', 'Table means snacks. Sniff mission go!'],
  },
  {
    id: 'jumpable', label: 'a low wall or ledge', name: 'jump spot',
    labels: ['stone steps', 'a large rock', 'a fallen log', 'a low box or crate'],
    action: 'jump', does: 'jump up onto it', effects: { happiness: 7, energy: -3 },
    lines: ['Boing! Watch me jump!', 'Up and over! Again, again!'],
  },
  {
    id: 'ball', label: 'a ball', name: 'ball',
    labels: ['a tennis ball'],
    action: 'fetch', does: 'grab it and bring it back', effects: { happiness: 10 },
    lines: ['Ball! I got it, I got it!', 'Fetch time! Throw it again?'],
  },
  {
    id: 'cat', label: 'a cat', name: 'cat',
    action: 'stare', does: 'stare at it, very curious', effects: { happiness: 4 },
    lines: ['A cat! We are not friends yet.', 'Kitty is watching me. I am watching back.'],
  },
  {
    id: 'puddle', label: 'a puddle on the ground', name: 'puddle',
    action: 'splash', does: 'stomp in it', effects: { happiness: 6 },
    lines: ['Puddle! Muddy paws incoming.', 'Splish splosh! Do not tell the bath.'],
  },
  {
    id: 'leaves', label: 'a pile of fallen leaves', name: 'leaves',
    labels: ['autumn leaves on the ground'],
    action: 'roll', does: 'roll around in them', effects: { happiness: 6 },
    lines: ['Crunchy leaves! Best sound ever.', 'Leaf pile! I am going in.'],
  },
  {
    id: 'lamp_post', label: 'a lamp post', name: 'lamp post',
    labels: ['a fire hydrant'],
    action: 'sniff', does: 'sniff it for messages from other dogs', effects: { happiness: 3 },
    lines: ['Pee-mail! Three dogs were here today.', 'Sniff... a poodle walked past. Fancy.'],
  },
  {
    id: 'playground', label: 'a playground', name: 'playground',
    labels: ['a slide and swings'],
    action: 'jump', does: 'bounce around it', effects: { happiness: 8 }, discovery: true,
    lines: ['A playground! Is it for dogs too?', 'Slides! Swings! Everything is fun here!'],
  },
]

// Everyday scenery the dog ignores. Giving CLIP these options stops it from forcing
// a random photo of a road or a car into one of the objects above
export const BACKGROUND_LABELS = [
  'a road with cars',
  'a car',
  'a sidewalk',
  'a tall plain building wall',
  'the sky',
  'a shop window',
  'the ground',
]

// Reaction when nothing on the list is in the photo
export const NOTHING_FOUND = {
  action: 'sniff',
  lines: ['Hmm, nothing interesting here. Keep looking!', 'Sniff... nope. Show me something cool!'],
}

// Reaction when the same object was seen in one of the last few looks
export const REPEAT_LINES = ['We just saw that! Find something new.', "Again? Let's find something different."]

// How many looks before the dog gets restless and wants a side quest.
// Keeping this small stops the camera from becoming the main activity
export const LOOKS_PER_ROUND = 3

// CLIP must be at least this sure before the dog reacts to an object
export const MIN_SCORE = 0.25

// How many recent objects count as a repeat
export const RECENT_MEMORY = 3

// Maps each action to an animation clip in the 3D dog model.
// These are guesses: check the real clip names once the Quaternius dog is loaded and update them.
// Any clip that doesn't exist falls back to 'Idle'
export const ANIMATION_CLIPS = {
  idle: 'Idle',
  drink: 'Eating',
  splash: 'Jump',
  roll: 'Jump',
  sit: 'Idle',
  sniff: 'Idle',
  play: 'Run',
  chase: 'Run',
  smell: 'Idle',
  stare: 'Idle',
  beg: 'Idle',
  bark: 'Attack',
  peek: 'Walk',
  greet: 'Idle',
  climb: 'Jump',
  search: 'Walk',
  jump: 'Jump',
  fetch: 'Run',
}

// Picks one line at random so the dog doesn't repeat itself
export function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)]
}
