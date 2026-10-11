export const DAILY_QUESTS = [
  { id: 'apples', type: 'Daily', title: 'Pickle picnic', copy: 'Find me 3 red apples.', target: 'apples', goal: 3, mark: '3 APPLE' },
  { id: 'redBull', type: 'Daily', title: 'A fizzy surprise', copy: 'Find me a can of Red Bull.', target: 'redBull', goal: 1, mark: 'CAN' },
  { id: 'flower', type: 'Daily', title: 'A flower for Pickle', copy: 'Find a bright flower on your walk.', target: 'flower', goal: 1, mark: 'FLOWER' },
  { id: 'water', type: 'Daily', title: 'Thirsty pup', copy: 'Find a bottle or fountain of water.', target: 'water', goal: 1, mark: 'WATER' },
  { id: 'dog', type: 'Daily', title: 'New furry friend', copy: 'Spot another dog out and about.', target: 'dog', goal: 1, mark: 'DOG' },
  { id: 'coffee', type: 'Daily', title: 'Cafe stroll', copy: 'Find a takeaway coffee cup.', target: 'coffee', goal: 1, mark: 'CAFE' },
  { id: 'tree', type: 'Daily', title: 'A shady stop', copy: 'Find a leafy tree to rest under.', target: 'tree', goal: 1, mark: 'TREE' },
  { id: 'redBull2', type: 'Daily', title: 'Fizzy find', copy: 'Spot a Red Bull can on your outing.', target: 'redBull', goal: 1, mark: 'CAN' },
  { id: 'apples2', type: 'Daily', title: 'Apple hunt', copy: 'Find a red apple for our picnic.', target: 'apples', goal: 1, mark: 'APPLE' },
  { id: 'parkTreat', type: 'Daily', title: 'Park treat', copy: 'Find a ball in a grassy park.', target: 'parkBall', goal: 1, mark: 'PARK' },
  { id: 'bridgeSnap', type: 'Daily', title: 'Bridge spotter', copy: 'Find a bridge along your walk.', target: 'bridge', goal: 1, mark: 'BRIDGE' },
  { id: 'cloudWatcher', type: 'Daily', title: 'Cloud watcher', copy: 'Find a patch of clouds in the sky.', target: 'clouds', goal: 1, mark: 'SKY' },
  { id: 'birdBuddy', type: 'Daily', title: 'Bird buddy', copy: 'Spot a bird while you are out walking.', target: 'bird', goal: 1, mark: 'BIRD' },
  { id: 'streetArtScout', type: 'Daily', title: 'Colourful corner', copy: 'Find a mural or piece of street art.', target: 'streetArt', goal: 1, mark: 'ART' },
  { id: 'catSpotter', type: 'Daily', title: 'Curious cat', copy: 'Spot a cat out and about.', target: 'cat', goal: 1, mark: 'CAT' },
  { id: 'signFinder', type: 'Daily', title: 'Sign finder', copy: 'Find a street sign on your walk.', target: 'sign', goal: 1, mark: 'SIGN' },
  { id: 'scooterScout', type: 'Daily', title: 'Scooter scout', copy: 'Spot a bicycle or scooter along the way.', target: 'scooter', goal: 1, mark: 'RIDE' },
  { id: 'photoBooth', type: 'Daily', category: 'Activity', activity: true, requiresOutside: false, countsOutsideDay: false, title: 'Photo booth memories', copy: 'Find a photo booth and take a silly selfie.', target: 'photoBooth', goal: 1, mark: 'SELFIE' },
  { id: 'swimTime', type: 'Daily', category: 'Activity', activity: true, title: 'Make a splash', copy: 'Go for a swim, then take a photo by the water.', target: 'swimming', goal: 1, mark: 'SWIM' },
  { id: 'cycleRide', type: 'Daily', category: 'Activity', activity: true, title: 'Pedal adventure', copy: 'Go for a cycle. Stop somewhere safe and take a photo with your bike.', target: 'cycling', goal: 1, mark: 'CYCLE' },
  { id: 'picnicBreak', type: 'Daily', category: 'Activity', activity: true, title: 'Picnic break', copy: 'Take a little picnic break outside and snap a photo of your spot.', target: 'picnic', goal: 1, mark: 'PICNIC' },
  { id: 'danceBreak', type: 'Daily', category: 'Activity', activity: true, title: 'Dance break', copy: 'Do a little dance outside and take a photo to remember it.', target: 'dancing', goal: 1, mark: 'DANCE' },
]

export const CITY_QUESTS = [
  { id: 'bridge', type: 'Explore', category: 'Common', preference: 'active', title: 'Bridge sniffari', copy: 'Explore a familiar bridge in your city.', target: 'bridge', goal: 1, mark: 'BRIDGE' },
  { id: 'parkBall', type: 'Explore', category: 'Popular', preference: 'relaxing', title: 'Park playtime', copy: 'Visit a popular city park and play catch!', target: 'parkBall', goal: 1, mark: 'PARK' },
  { id: 'museum', type: 'Explore', category: 'Local', preference: 'culture', title: 'Culture walk', copy: 'Visit a local museum in your city.', target: 'museum', goal: 1, mark: 'MUSEUM' },
  { id: 'randomLandmark', type: 'Explore', category: 'Random', preference: 'culture', title: 'Random city stroll', copy: 'Discover a public landmark in your city.', target: 'landmark', goal: 1, mark: 'SURPRISE' },
  { id: 'bridgeLocal', type: 'Explore', category: 'Local', preference: 'active', title: 'Local bridge walk', copy: 'Explore a local bridge in your city.', target: 'bridge', goal: 1, mark: 'BRIDGE' },
  { id: 'parkCommon', type: 'Explore', category: 'Common', preference: 'relaxing', title: 'Neighborhood green', copy: 'Find a neighborhood park in your city.', target: 'parkBall', goal: 1, mark: 'PARK' },
  { id: 'museumPopular', type: 'Explore', category: 'Popular', preference: 'culture', title: 'Popular culture stop', copy: 'Visit a popular museum in your city.', target: 'museum', goal: 1, mark: 'MUSEUM' },
  { id: 'randomPark', type: 'Explore', category: 'Random', preference: 'relaxing', title: 'Surprise park stop', copy: 'Pick a random public park in your city.', target: 'parkBall', goal: 1, mark: 'SURPRISE' },
  { id: 'randomBridge', type: 'Explore', category: 'Random', preference: 'active', title: 'Surprise crossing', copy: 'Choose a random bridge in your city.', target: 'bridge', goal: 1, mark: 'SURPRISE' },
  { id: 'localMuseum', type: 'Explore', category: 'Local', preference: 'culture', title: 'Local history stop', copy: 'Find a local museum in your city.', target: 'museum', goal: 1, mark: 'MUSEUM' },
  { id: 'popularLandmark', type: 'Explore', category: 'Popular', preference: 'culture', title: 'City landmark', copy: 'Explore a well-known landmark in your city.', target: 'landmark', goal: 1, mark: 'LANDMARK' },
  { id: 'commonMuseum', type: 'Explore', category: 'Common', preference: 'culture', title: 'Museum day', copy: 'Visit a museum in your city.', target: 'museum', goal: 1, mark: 'MUSEUM' },
  { id: 'randomMuseum', type: 'Explore', category: 'Random', preference: 'culture', title: 'Mystery museum', copy: 'Choose a random museum in your city.', target: 'museum', goal: 1, mark: 'SURPRISE' },
]

const questPools = { daily: DAILY_QUESTS, city: CITY_QUESTS }

export function chooseQuests(section, completed = {}, excludeIds = [], poolOverride = null) {
  const excluded = new Set(excludeIds)
  const available = (poolOverride || questPools[section] || []).filter((quest) => !completed[quest.id] && !excluded.has(quest.id))
  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
    }
    return items
  }
  let options = available
  if (section === 'city') {
    const rankPlaces = (items) => shuffle(items).sort((a, b) => (b.placePopularity || 0) - (a.placePopularity || 0))
    const selected = []
    const excludedQuests = (poolOverride || questPools.city).filter((quest) => excluded.has(quest.id))
    let commercialCount = excludedQuests.filter((quest) => quest.preference === 'commercial').length
    const pools = {
      outdoor: rankPlaces(available.filter((quest) => quest.preference === 'active' || quest.preference === 'relaxing')),
      commercial: shuffle(available.filter((quest) => quest.preference === 'commercial')),
      other: shuffle(available.filter((quest) => !['active', 'relaxing', 'commercial'].includes(quest.preference))),
    }
    const weights = { outdoor: 5, commercial: 1, other: 0.25 }
    while (selected.length < 3 && Object.values(pools).some((pool) => pool.length)) {
      const usable = Object.keys(pools).filter((key) => pools[key].length && (key !== 'commercial' || commercialCount < 1))
      if (!usable.length) break
      const totalWeight = usable.reduce((total, key) => total + weights[key], 0)
      let roll = Math.random() * totalWeight
      let group = usable[0]
      for (const key of usable) {
        roll -= weights[key]
        if (roll < 0) { group = key; break }
      }
      const selectedQuest = pools[group].shift()
      selected.push(selectedQuest)
      if (group === 'commercial') commercialCount += 1
    }
    options = selected
  } else {
    options = shuffle(available)
    if (section === 'daily') {
      const alreadyHasActivity = (poolOverride || questPools.daily).some((quest) => excluded.has(quest.id) && quest.activity)
      const activity = available.filter((quest) => quest.activity)
      const finds = available.filter((quest) => !quest.activity)
      options = []
      if (!alreadyHasActivity && activity.length) options.push(...shuffle(activity).slice(0, 1))
      options.push(...shuffle(finds).slice(0, 3 - options.length))
      options.push(...shuffle(activity.filter((quest) => !options.includes(quest))).slice(0, 3 - options.length))
      options = shuffle(options)
    }
  }
  return options.slice(0, 3)
}

export function fillQuestList(section, current = [], completed = {}, poolOverride = null) {
  const poolIds = poolOverride ? new Set(poolOverride.map((quest) => quest.id)) : null
  const currentPool = poolOverride ? new Map(poolOverride.map((quest) => [quest.id, quest])) : null
  const candidates = current
    .filter((quest) => !completed[quest.id] && (!poolIds || poolIds.has(quest.id)))
    .map((quest) => currentPool?.get(quest.id) || quest)
  let kept = section === 'city'
    ? candidates.filter((quest, index) => quest.preference !== 'commercial' || candidates.slice(0, index).every((previous) => previous.preference !== 'commercial')).slice(0, 3)
    : candidates.slice(0, 3)
  if (section === 'daily' && !kept.some((quest) => quest.activity)) {
    const pool = poolOverride || questPools.daily
    const activity = pool.filter((quest) => quest.activity && !completed[quest.id] && !kept.some((item) => item.id === quest.id))
    if (activity.length) kept = [...kept.slice(0, 2), activity[Math.floor(Math.random() * activity.length)]]
  }
  return [...kept, ...chooseQuests(section, completed, kept.map((quest) => quest.id), poolOverride)].slice(0, 3)
}
