import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm'

// Main model and a smaller backup for phones that struggle with the main one
export const MODELS = {
  main: { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B (about 1 GB)' },
  small: { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 0.5B (about 400 MB)' },
}

let enginePromise = null
let ready = false

// Checks whether this browser and device can run the language model at all
export async function checkWebGPU() {
  if (!('gpu' in navigator)) {
    return { ok: false, reason: 'This browser does not support WebGPU. Try a recent version of Chrome.' }
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    return { ok: false, reason: 'WebGPU is available, but no compatible GPU was found on this device.' }
  }
  return { ok: true }
}

export function isLLMReady() {
  return ready
}

// Downloads (first time) or loads from cache (after that) the chosen model
export function loadLLM(modelId = MODELS.main.id, onProgress) {
  if (!enginePromise) {
    const worker = new Worker(new URL('./llm.worker.js', import.meta.url), { type: 'module' })
    enginePromise = CreateWebWorkerMLCEngine(worker, modelId, {
      // WebLLM reports progress as a number from 0 to 1 plus a status message
      initProgressCallback: (report) => onProgress?.(report),
    })
      .then((engine) => {
        ready = true
        return engine
      })
      .catch((error) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

// Builds the pet's personality so every line sounds like the same dog
function systemPrompt(pet) {
  return [
    `You are ${pet.name}, a cheerful ${pet.breed} puppy in a game that gets your owner outside.`,
    'Speak in first person as the dog.',
    'Reply with ONE short playful sentence, under 15 words.',
    'No emojis, no hashtags, no quotation marks.',
  ].join(' ')
}

// Asks the pet to react to a situation. Returns null if the model is not loaded yet,
// so the app can fall back to a written line instead of waiting
export async function petSay(pet, situation) {
  if (!ready) return null
  const engine = await enginePromise
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt(pet) },
      { role: 'user', content: situation },
    ],
    temperature: 0.9,
    max_tokens: 40,
  })
  return reply.choices[0].message.content.trim().replace(/^"|"$/g, '')
}
