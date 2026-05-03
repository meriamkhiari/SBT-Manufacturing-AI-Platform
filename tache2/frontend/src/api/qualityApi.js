const BASE = ''

export async function analyzeImage(file, context = '') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('context', context)
  const res = await fetch(`${BASE}/api/analyze/`, { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function analyzeSample(filename) {
  const res = await fetch(`${BASE}/api/analyze/sample/${filename}/`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchSamples() {
  const res = await fetch(`${BASE}/api/samples/`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchAgents() {
  const res = await fetch(`${BASE}/api/agents/`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
