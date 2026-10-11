import { pipeline } from '@huggingface/transformers'
import { INTERACTIONS, BACKGROUND_LABELS, MIN_SCORE } from './interactions.js'

// CLIP compares a photo against plain-text labels, so no training is needed
const MODEL_ID = 'Xenova/clip-vit-base-patch32'

// Several labels per side make the indoor/outdoor decision more reliable than a single label each
const OUTDOOR_LABELS = [
  'an outdoor street',
  'an outdoor park with grass',
  'the outside of a building',
  'a beach or the sea',
  'trees and sky',
]

const INDOOR_LABELS = [
  'an indoor room',
  'a kitchen',
  'a bedroom',
  'an office with a desk',
  'a wall inside a house',
]

const LOOK_LABELS = [
  'a park with green grass and trees',
  'a city street with buildings and cars',
  'a fountain spraying water',
  'a lake or river',
  'flowers in a garden',
  'a dog-friendly outdoor trail',
  'a hiking trail or walking track',
  'a scenic lookout with a view',
  'a botanical garden with plants and paths',
  'a beach',
  'a sunny sky with clouds',
]

const QUEST_LABELS = {
  apples: ['a red apple', 'a can of Red Bull', 'a city bridge', 'a public park with a ball', 'a museum building', 'an unrelated outdoor scene'],
  redBull: ['a can of Red Bull', 'red apples', 'a city bridge', 'a public park with a ball', 'a museum building', 'an unrelated outdoor scene'],
  bridge: ['a city bridge', 'red apples', 'a can of Red Bull', 'a public park with a ball', 'a museum building', 'an unrelated outdoor scene'],
  parkBall: ['a public park with a ball', 'red apples', 'a can of Red Bull', 'a city bridge', 'a museum building', 'an unrelated outdoor scene'],
  museum: ['a museum building', 'red apples', 'a can of Red Bull', 'a city bridge', 'a public park with a ball', 'an unrelated outdoor scene'],
  landmark: ['a public city landmark', 'red apples', 'a can of Red Bull', 'a city bridge', 'a public park with a ball', 'an unrelated outdoor scene'],
  flower: ['a bright flower', 'a red apple', 'a can of Red Bull', 'a dog', 'an unrelated outdoor scene'],
  water: ['a bottle or fountain of water', 'a red apple', 'a can of Red Bull', 'a flower', 'an unrelated outdoor scene'],
  dog: ['another dog outdoors', 'a red apple', 'a can of Red Bull', 'a city bridge', 'an unrelated outdoor scene'],
  coffee: ['a takeaway coffee cup', 'a can of Red Bull', 'a red apple', 'a flower', 'an unrelated outdoor scene'],
  tree: ['a leafy tree', 'a red apple', 'a city bridge', 'a museum building', 'an unrelated outdoor scene'],
  beach: ['a beach by the ocean', 'a city park with grass', 'a city bridge', 'a restaurant', 'an unrelated outdoor scene'],
  park: ['a public park with grass and trees', 'a beach by the ocean', 'a city bridge', 'a museum building', 'an unrelated outdoor scene'],
  hike: ['a hiking trail or walking track', 'a public park with grass and trees', 'a city bridge', 'an unrelated outdoor scene'],
  viewpoint: ['a scenic lookout with a view', 'a mountain summit or observation point', 'a city park', 'an unrelated outdoor scene'],
  cafe: ['a cafe or coffee shop', 'a restaurant', 'a supermarket', 'a city park', 'an unrelated outdoor scene'],
  restaurant: ['a restaurant or dining place', 'a cafe', 'a supermarket', 'a city beach', 'an unrelated outdoor scene'],
  store: ['a supermarket or retail shop', 'a cafe', 'a restaurant', 'a museum building', 'an unrelated outdoor scene'],
  clouds: ['clouds visible in the sky', 'a red apple', 'a flower', 'a city bridge', 'an unrelated outdoor scene'],
  bird: ['a bird outdoors', 'a dog outdoors', 'a cat outdoors', 'a flower', 'an unrelated outdoor scene'],
  streetArt: ['a mural or street art on a city wall', 'a street sign', 'a city bridge', 'a flower', 'an unrelated outdoor scene'],
  cat: ['a cat outdoors', 'a dog outdoors', 'a bird outdoors', 'a red apple', 'an unrelated outdoor scene'],
  sign: ['a street sign outdoors', 'a mural or street art', 'a city bridge', 'a red apple', 'an unrelated outdoor scene'],
  scooter: ['a bicycle or scooter outdoors', 'a car on a city street', 'a city bridge', 'a dog outdoors', 'an unrelated outdoor scene'],
  photoBooth: ['a person posing inside a photo booth', 'a photo booth with a curtain and camera', 'a person taking a selfie', 'an unrelated indoor scene'],
  swimming: ['a person swimming in a pool', 'a swimmer in open water', 'a person at a swimming pool after a swim', 'an unrelated scene'],
  cycling: ['a person riding a bicycle outdoors', 'a person posing with a bicycle and helmet', 'a parked bicycle outdoors', 'an unrelated outdoor scene'],
  picnic: ['a picnic setup on a blanket outdoors', 'food and a picnic blanket in a park', 'a person having a picnic outside', 'an unrelated outdoor scene'],
  dancing: ['a person dancing outdoors', 'a person doing a dance pose in a park', 'a person standing still outdoors', 'an unrelated outdoor scene'],
}

// Keep one shared copy of the model so it only loads once
let classifierPromise = null

export function loadClip(onProgress) {
  if (!classifierPromise) {
    classifierPromise = pipeline('zero-shot-image-classification', MODEL_ID, {
      progress_callback: (event) => {
        // Transformers.js reports progress per file; pass along the download ones
        if (event.status === 'progress' && onProgress) {
          onProgress({ file: event.file, percent: Math.round(event.progress) })
        }
      },
    }).catch((error) => {
      // If loading fails, forget the failed attempt so the next tap can retry
      classifierPromise = null
      throw error
    })
  }
  return classifierPromise
}

// Takes an image (data URL) and decides whether it was taken outside
export async function checkOutdoors(image, onProgress) {
  const classifier = await loadClip(onProgress)
  const results = await classifier(image, [...OUTDOOR_LABELS, ...INDOOR_LABELS], {
    hypothesis_template: 'a photo of {}',
  })

  // Add up the scores on each side and compare the totals
  let outdoorScore = 0
  let indoorScore = 0
  for (const { label, score } of results) {
    if (OUTDOOR_LABELS.includes(label)) outdoorScore += score
    else indoorScore += score
  }

  return {
    outdoors: outdoorScore > indoorScore,
    confidence: Math.max(outdoorScore, indoorScore),
    topLabel: results[0].label,
  }
}

// Pick the most likely thing in an outdoor snapshot for the pet to react to.
export async function inspectScene(image, onProgress) {
  const classifier = await loadClip(onProgress)
  const results = await classifier(image, LOOK_LABELS, {
    hypothesis_template: 'a photo of {}',
  })
  return results[0]?.label ?? 'the outdoors'
}

// Compare one quest target with other quest targets so photos can be checked locally.
export async function checkQuestPhoto(image, target, onProgress) {
  const classifier = await loadClip(onProgress)
  const labels = QUEST_LABELS[target]
  if (!labels) throw new Error(`Unknown quest target: ${target}`)
  const results = await classifier(image, labels, { hypothesis_template: 'a photo of {}' })
  return { matched: results[0]?.label === labels[0], label: results[0]?.label }
}

// CLIP centre-crops every image to a square, which would cut the top and bottom off a portrait
// photo or a tall strip. Letterboxing keeps the whole region in view.
const SQUARE_SIZE = 336

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read the camera photo.'))
    image.src = src
  })
}

function squareOf(image, left = 0, width = image.width) {
  const canvas = document.createElement('canvas')
  canvas.width = SQUARE_SIZE
  canvas.height = SQUARE_SIZE
  const context = canvas.getContext('2d')
  context.fillStyle = '#808080'
  context.fillRect(0, 0, SQUARE_SIZE, SQUARE_SIZE)
  const scale = Math.min(SQUARE_SIZE / width, SQUARE_SIZE / image.height)
  const drawWidth = width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, left, 0, width, image.height, (SQUARE_SIZE - drawWidth) / 2, (SQUARE_SIZE - drawHeight) / 2, drawWidth, drawHeight)
  return canvas.toDataURL('image/jpeg', 0.9)
}

// Every wording CLIP compares against: each interaction's label plus its extra labels,
// then the background scenery. item is null for background.
const LOOK_WORDINGS = [
  ...INTERACTIONS.flatMap((item) => [item.label, ...(item.labels || [])].map((label) => ({ label, item }))),
  ...BACKGROUND_LABELS.map((label) => ({ label, item: null })),
]
const LOOK_LABELS_ALL = LOOK_WORDINGS.map((wording) => wording.label)

// Extra wordings for one object share CLIP's score between them, so add them back together.
// Otherwise giving an object more wordings would make it harder to reach MIN_SCORE.
function scoreFor(results, interaction) {
  return results.reduce((total, { label, score }) => {
    const wording = LOOK_WORDINGS.find((item) => item.label === label)
    return wording?.item === interaction ? total + score : total
  }, 0)
}

// Left edges of three overlapping strips, each 45% of the photo wide
const STRIPS = [0, 0.275, 0.55]
const STRIP_WIDTH = 0.45

// Finds which object from the interactions list is in the photo, and roughly where it is.
// Returns null when nothing on the list is there, so the dog can just sniff around instead.
// x runs from 0 (left edge of the photo) to 1 (right edge).
export async function findInteraction(image, onProgress) {
  const classifier = await loadClip(onProgress)
  const photo = await loadImage(image)
  const options = { hypothesis_template: 'a photo of {}' }

  // The single best wording decides the object, the same as before extra wordings existed
  const results = await classifier(squareOf(photo), LOOK_LABELS_ALL, options)
  const interaction = LOOK_WORDINGS.find((wording) => wording.label === results[0]?.label)?.item
  if (!interaction) return null
  const score = scoreFor(results, interaction)
  if (score < MIN_SCORE) return null

  // CLIP only says what is in a photo, not where. Scoring each strip for the same object gives a
  // rough left / middle / right position, which is all the dog needs to know which way to walk.
  const strips = STRIPS.map((left) => squareOf(photo, photo.width * left, photo.width * STRIP_WIDTH))
  const stripResults = await classifier(strips, LOOK_LABELS_ALL, options)
  const scores = stripResults.map((stripResult) => scoreFor(stripResult, interaction))
  const best = scores.indexOf(Math.max(...scores))

  return { interaction, score, x: STRIPS[best] + STRIP_WIDTH / 2 }
}
