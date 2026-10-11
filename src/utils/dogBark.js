let barkContext

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextConstructor) return null
  barkContext ||= new AudioContextConstructor()
  return barkContext
}

// Call from a user gesture so mobile browsers unlock audio for later suggestions.
export function prepareDogBark() {
  const context = getContext()
  if (!context) return
  if (context.state === 'suspended') context.resume().catch(() => {})

  // A silent buffer primes iOS/Safari audio without playing a sound at walk start.
  const buffer = context.createBuffer(1, 1, context.sampleRate)
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = 0
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
}

function playSingleBark(context, startTime) {
  const duration = 0.19
  const oscillator = context.createOscillator()
  const voiceGain = context.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(205, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(92, startTime + duration)
  voiceGain.gain.setValueAtTime(0.0001, startTime)
  voiceGain.gain.exponentialRampToValueAtTime(0.19, startTime + 0.018)
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(voiceGain)
  voiceGain.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)

  const sampleCount = Math.ceil(context.sampleRate * duration)
  const noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate)
  const samples = noiseBuffer.getChannelData(0)
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount)
  }
  const noise = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const noiseGain = context.createGain()
  noise.buffer = noiseBuffer
  filter.type = 'bandpass'
  filter.frequency.value = 620
  filter.Q.value = 0.8
  noiseGain.gain.setValueAtTime(0.0001, startTime)
  noiseGain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.012)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(context.destination)
  noise.start(startTime)
  noise.stop(startTime + duration)
}

export function playDogBark() {
  const context = getContext()
  if (!context || context.state !== 'running') return
  const now = context.currentTime + 0.015
  playSingleBark(context, now)
  playSingleBark(context, now + 0.27)
}
