// Placeholder 2D dog drawn in SVG. It will be swapped for an animated 3D model (three.js) later,
// but the moods and the props stay the same, so the rest of the app won't need to change.

// Golden Retriever: warm golden coat with pale cream feathering on the chest, ears and tail
const FUR = '#F0C27B'
const FUR_LIGHT = '#F8D9A3'
const FUR_DEEP = '#D9A45B'
const FEATHER = '#FDF0D5'
const INK = '#1F2B23'

// Seen from behind, facing the wall, head drooping and tail hanging limp
function SulkingDog() {
  return (
    <g className="pet-breathe">
      {/* A low tail is the clearest sign a retriever is unhappy. Cream plume, golden core */}
      <path d="M116 130 C150 140 162 160 152 182" stroke={FEATHER} strokeWidth="17" fill="none" strokeLinecap="round" />
      <path d="M116 130 C150 140 162 160 152 182" stroke={FUR_DEEP} strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* Body, broad and slumped */}
      <ellipse cx="100" cy="150" rx="50" ry="34" fill={FUR} />
      {/* Head sitting low so it reads as drooping */}
      <circle cx="100" cy="96" r="38" fill={FUR} />
      {/* Floppy ears, drawn over the head so their outer surface faces us */}
      <ellipse cx="68" cy="104" rx="15" ry="29" transform="rotate(-10 68 104)" fill={FUR_DEEP} />
      <ellipse cx="132" cy="104" rx="15" ry="29" transform="rotate(10 132 104)" fill={FUR_DEEP} />
      {/* Soft feathering across the back */}
      <path d="M68 152 Q78 143 90 148" stroke={FUR_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.45" />
      <path d="M132 152 Q122 143 110 148" stroke={FUR_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.45" />
      {/* Back paws peeking out */}
      <ellipse cx="72" cy="180" rx="13" ry="7" fill={FEATHER} />
      <ellipse cx="128" cy="180" rx="13" ry="7" fill={FEATHER} />
    </g>
  )
}

// Facing the viewer, hopping, plume tail wagging
function HappyDog({ action }) {
  return (
    <g className="pet-hop">
      {/* Tail behind the body: cream plume over a golden core, wagging from its base */}
      <g className="pet-wag">
        <path d="M138 140 C164 130 174 102 156 94" stroke={FEATHER} strokeWidth="19" fill="none" strokeLinecap="round" />
        <path d="M138 140 C164 130 174 102 156 94" stroke={FUR} strokeWidth="10" fill="none" strokeLinecap="round" />
      </g>
      {/* Body and the big feathered chest */}
      <ellipse cx="100" cy="144" rx="47" ry="35" fill={FUR} />
      <ellipse cx="100" cy="152" rx="29" ry="24" fill={FEATHER} />
      {/* Front paws */}
      <ellipse cx="82" cy="176" rx="12" ry="7" fill={FEATHER} />
      <ellipse cx="118" cy="176" rx="12" ry="7" fill={FEATHER} />

      {/* Head group tilts now and then, like a curious dog */}
      <g className="pet-tilt" data-dog-head>
        <circle cx="100" cy="86" r="40" fill={FUR} />
        {/* Long floppy ears framing the face */}
        <ellipse cx="62" cy="94" rx="15" ry="31" transform="rotate(-12 62 94)" fill={FUR_DEEP} />
        <ellipse cx="138" cy="94" rx="15" ry="31" transform="rotate(12 138 94)" fill={FUR_DEEP} />
        {/* Lighter fur on the forehead */}
        <path d="M82 58 Q100 50 118 58" stroke={FUR_LIGHT} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.4" />
        {/* Broad soft muzzle */}
        <ellipse cx="100" cy="103" rx="28" ry="19" fill={FEATHER} />
        {/* Cheeks */}
        <ellipse cx="76" cy="98" rx="6" ry="4" fill="#F5A3A3" opacity="0.5" />
        <ellipse cx="124" cy="98" rx="6" ry="4" fill="#F5A3A3" opacity="0.5" />
        {/* Pale brows, the detail that makes a retriever look friendly */}
        <ellipse cx="83" cy="70" rx="4" ry="2.5" fill={FUR_LIGHT} />
        <ellipse cx="117" cy="70" rx="4" ry="2.5" fill={FUR_LIGHT} />
        {/* Eyes with little highlights */}
        <circle cx="84" cy="82" r="6" fill={INK} />
        <circle cx="116" cy="82" r="6" fill={INK} />
        <circle cx="86" cy="80" r="2" fill="#fff" />
        <circle cx="118" cy="80" r="2" fill="#fff" />
        {/* Nose, mouth, tongue */}
        <ellipse cx="100" cy="96" rx="7" ry="5" fill={INK} />
        <path d="M91 104 Q100 112 109 104" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path className={action === 'drinking' ? 'pet-tongue pet-lick' : 'pet-tongue'} d="M96 108 Q100 118 104 108 Z" fill="#F07C7C" />
        {/* Fetch: a tennis ball held in the mouth, inside the head so it moves with it */}
        {action === 'fetch' && (
          <g aria-hidden="true">
            <circle cx="100" cy="112" r="10" fill="#D7E84A" />
            <path d="M91 108 Q100 114 109 108 M91 117 Q100 111 109 117" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}
      </g>
    </g>
  )
}

function SunbathingDog() {
  return (
    <g className="pet-sunbathe-pose">
      <path d="M135 145 C163 144 171 131 159 124" stroke={FEATHER} strokeWidth="17" fill="none" strokeLinecap="round" />
      <path d="M135 145 C163 144 171 131 159 124" stroke={FUR} strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="103" cy="150" rx="51" ry="27" fill={FUR} />
      <ellipse cx="70" cy="168" rx="17" ry="7" fill={FEATHER} />
      <ellipse cx="118" cy="169" rx="17" ry="7" fill={FEATHER} />
      <circle cx="61" cy="132" r="29" fill={FUR} />
      <ellipse cx="44" cy="137" rx="12" ry="21" transform="rotate(-20 44 137)" fill={FUR_DEEP} />
      <ellipse cx="78" cy="137" rx="12" ry="21" transform="rotate(20 78 137)" fill={FUR_DEEP} />
      <ellipse cx="61" cy="144" rx="19" ry="13" fill={FEATHER} />
      <circle cx="53" cy="131" r="3.5" fill={INK} />
      <circle cx="69" cy="131" r="3.5" fill={INK} />
      <ellipse cx="61" cy="140" rx="5" ry="3.5" fill={INK} />
      <path d="M55 147 Q61 151 67 147" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M91 137 Q104 128 118 139" stroke={FEATHER} strokeWidth="7" fill="none" strokeLinecap="round" opacity=".85" />
    </g>
  )
}

// Interaction actions (see ai/interactions.js) that reuse a pose the dog already has
const POSE_ALIASES = { drink: 'drinking', sit: 'sitting', chase: 'running' }

// Read out by screen readers in place of the animation
const POSE_WORDS = {
  idle: 'exploring', walk: 'trotting around', running: 'running', sitting: 'sitting', drinking: 'drinking',
  sunbathing: 'sunbathing', splash: 'splashing', roll: 'rolling in the grass', sniff: 'sniffing around',
  smell: 'smelling the flowers', play: 'play-bowing', stare: 'staring, amazed', beg: 'begging for a treat',
  bark: 'barking', peek: 'peeking over the edge', greet: 'wagging hello', climb: 'hopping up',
  search: 'searching for crumbs', jump: 'jumping', fetch: 'fetching the ball',
}

// Small effects drawn around the dog for the actions that need more than a body movement
function ActionEffects({ pose }) {
  if (pose === 'splash') {
    return (
      <g className="pet-fx-drops" aria-hidden="true">
        <ellipse cx="100" cy="184" rx="44" ry="6" fill="#7FC8DE" opacity="0.7" />
        <circle cx="58" cy="166" r="4" fill="#7FC8DE" />
        <circle cx="146" cy="160" r="5" fill="#7FC8DE" />
        <circle cx="70" cy="146" r="3" fill="#A8E5EF" />
        <circle cx="134" cy="140" r="3.5" fill="#A8E5EF" />
      </g>
    )
  }
  if (pose === 'bark') {
    return (
      <g className="pet-fx-bark" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" aria-hidden="true">
        {/* Sound lines at mouth height on both sides, just outside the ears */}
        <path d="M160 98 Q167 108 160 118" />
        <path d="M171 92 Q181 108 171 124" />
        <path d="M40 98 Q33 108 40 118" />
        <path d="M29 92 Q19 108 29 124" />
      </g>
    )
  }
  if (pose === 'greet') {
    return (
      <g className="pet-fx-hearts" fill="#F07C7C" aria-hidden="true">
        <path d="M52 40 c0-5 7-5 7 0 c0-5 7-5 7 0 c0 5-7 8-7 11 c0-3-7-6-7-11 Z" />
        <path d="M136 30 c0-4 5.5-4 5.5 0 c0-4 5.5-4 5.5 0 c0 4-5.5 6.5-5.5 9 c0-2.5-5.5-5-5.5-9 Z" />
      </g>
    )
  }
  if (pose === 'sniff' || pose === 'smell' || pose === 'search') {
    return (
      <g className="pet-fx-puff" fill="#FFFFFF" opacity="0.85" aria-hidden="true">
        <circle cx="80" cy="128" r="4" />
        <circle cx="120" cy="128" r="4" />
        <circle cx="72" cy="120" r="2.5" />
        <circle cx="128" cy="120" r="2.5" />
      </g>
    )
  }
  return null
}

export default function Pet({ mood = 'sulking', name, action = 'idle', className = 'h-64 w-64' }) {
  const pose = POSE_ALIASES[action] || action
  const label = mood === 'back'
    ? `${name} is facing away from you`
    : mood === 'sulking' ? `${name} is sulking, facing the wall` : `${name} is ${POSE_WORDS[pose] || 'exploring'}`
  const animatedMood = mood === 'sulking' ? 'sulking' : `action-${pose}`
  const facingViewer = mood !== 'sulking' && mood !== 'back'
  return (
    <svg viewBox="0 0 200 200" className={`pet-scene pet-${animatedMood} ${className} drop-shadow-sm`} role="img" aria-label={label}>
      {/* Soft ground shadow keeps the dog looking planted on the floor */}
      <ellipse cx="100" cy="186" rx="56" ry="7" fill={INK} opacity="0.12" />
      {!facingViewer ? <SulkingDog /> : pose === 'sunbathing' ? <SunbathingDog /> : <HappyDog action={pose} />}
      {facingViewer && <ActionEffects pose={pose} />}
      {facingViewer && pose === 'drinking' && (
        <g className="pet-water-bowl" aria-hidden="true">
          <ellipse cx="100" cy="177" rx="25" ry="7" fill="#63B8D0" />
          <path d="M76 174 Q100 194 124 174 L120 185 Q100 195 80 185 Z" fill="#348FA9" />
          <ellipse cx="100" cy="175" rx="21" ry="5" fill="#A8E5EF" />
          <path d="M91 168 Q88 162 92 158 M102 168 Q99 161 103 157 M111 169 Q108 164 112 160" stroke="#73D1DF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
