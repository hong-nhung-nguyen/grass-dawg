import { useEffect, useState } from 'react'
import { MODELS, checkWebGPU, isLLMReady, loadLLM, petSay } from '../ai/llm.js'

// Developer panel for day 1: confirms WebGPU works on this phone and that the
// language model can load and talk, before anything else gets built on top of it
export default function SystemCheck({ pet, onClose }) {
  const [gpu, setGpu] = useState(null)
  const [modelKey, setModelKey] = useState('gemma')
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(isLLMReady())
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkWebGPU().then(setGpu)
  }, [])

  async function handleLoad() {
    setLoading(true)
    setError('')
    try {
      await loadLLM(MODELS[modelKey].id, setProgress)
      setReady(true)
    } catch (e) {
      console.error(e)
      setError('The model failed to load. Try the smaller model, or check that you have enough free storage.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setOutput('Thinking...')
    const started = performance.now()
    const line = await petSay(pet, 'Your owner just opened the app. Say hello.')
    const seconds = ((performance.now() - started) / 1000).toFixed(1)
    setOutput(`${line}  (${seconds}s)`)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white p-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">System check</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-ink/60 focus-visible:outline-2 focus-visible:outline-grass">
            Close
          </button>
        </div>

        <p className="mb-4">
          WebGPU:{' '}
          {gpu === null ? 'checking...' : gpu.ok ? <span className="font-medium text-grass">supported</span> : <span className="text-red-600">{gpu.reason}</span>}
        </p>

        {!ready && (
          <>
            <label className="mb-2 block text-sm text-ink/70" htmlFor="model">Language model</label>
            <select
              id="model"
              value={modelKey}
              onChange={(e) => setModelKey(e.target.value)}
              disabled={loading}
              className="mb-4 w-full rounded-xl border border-ink/15 px-3 py-2"
            >
              {Object.entries(MODELS).map(([key, model]) => (
                <option key={key} value={key}>{model.label}</option>
              ))}
            </select>
            <button
              onClick={handleLoad}
              disabled={loading || !gpu?.ok}
              className="w-full rounded-2xl bg-grass py-3 font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass"
            >
              {loading ? 'Downloading model...' : 'Download model'}
            </button>
          </>
        )}

        {progress && !ready && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-grass transition-all" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink/60">{progress.text}</p>
          </div>
        )}

        {ready && (
          <button
            onClick={handleTest}
            className="w-full rounded-2xl bg-grass py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass"
          >
            Ask {pet.name} to say hello
          </button>
        )}

        {output && <p className="mt-4 rounded-2xl bg-leaf p-4">{output}</p>}
        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    </div>
  )
}
