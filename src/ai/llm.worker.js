import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// Runs the language model in a background thread so the pet animations stay smooth
const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (message) => handler.onmessage(message)
