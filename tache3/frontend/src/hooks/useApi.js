import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'

const api = axios.create({ baseURL: '/api' })

// ── Generic fetchers ──────────────────────────────────────────────────────────

export const fetcher = (url) => api.get(url).then(r => r.data)

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => fetcher('/stats'), refetchInterval: 30_000, staleTime: 10_000 })
}

// ── Companies ─────────────────────────────────────────────────────────────────

export function useCompanies(params = {}) {
  const query = new URLSearchParams()
  if (params.tier)      query.set('tier',      params.tier)
  if (params.country)   query.set('country',   params.country)
  if (params.min_score) query.set('min_score', params.min_score)
  if (params.limit)     query.set('limit',     params.limit)
  if (params.offset)    query.set('offset',    params.offset)

  return useQuery({
    queryKey: ['companies', params],
    queryFn:  () => fetcher(`/companies?${query}`),
    staleTime: 10_000,
  })
}

// ── Countries ─────────────────────────────────────────────────────────────────

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn:  () => fetcher('/countries').then(d => d.countries || []),
    staleTime: 60_000,
  })
}

// ── Graph data ────────────────────────────────────────────────────────────────

export function useGraphData() {
  return useQuery({
    queryKey: ['graph'],
    queryFn:  () => fetcher('/graph-data'),
    staleTime: 15_000,
  })
}

// ── Marketing results ─────────────────────────────────────────────────────────

export function useMarketingResults() {
  return useQuery({
    queryKey: ['marketing'],
    queryFn:  () => fetcher('/marketing-results'),
    staleTime: 20_000,
  })
}

// ── Delete pending / error ────────────────────────────────────────────────────

export function useDeleteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status) =>
      api.delete('/delete-status', { data: { status } }).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.deleted} entrées "${data.status}" supprimées`)
      qc.invalidateQueries(['stats'])
      qc.invalidateQueries(['companies'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression')
    },
  })
}

// ── Run agent ─────────────────────────────────────────────────────────────────

export function useRunAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agent, params }) =>
      api.post(`/run/${agent}`, params).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.agent} lancé`)
      setTimeout(() => qc.invalidateQueries(), 3000)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur de lancement')
    },
  })
}

export function useRunAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params) => api.post('/run-all', params).then(r => r.data),
    onSuccess: () => {
      toast.success('Pipeline complet lancé')
      setTimeout(() => qc.invalidateQueries(), 5000)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur pipeline')
    },
  })
}

export function useScoreAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params) => api.post('/score-all', params).then(r => r.data),
    onSuccess: () => {
      toast.success('Scoring lancé')
      setTimeout(() => qc.invalidateQueries(['companies']), 8000)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur scoring')
    },
  })
}

// ── SSE status stream ─────────────────────────────────────────────────────────

export function useStatusStream() {
  const setAgentStatus = useStore(s => s.setAgentStatus)
  const qc             = useQueryClient()
  const esRef          = useRef(null)
  const prevRunning    = useRef(false)

  useEffect(() => {
    const es = new EventSource('/api/stream/status')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const status    = JSON.parse(e.data)
        setAgentStatus(status)
        // Invalide uniquement quand un agent vient de terminer (transition running → stopped)
        const isRunning = Object.values(status).some(s => s?.running)
        if (prevRunning.current && !isRunning) {
          qc.invalidateQueries(['stats'])
          qc.invalidateQueries(['companies'])
        }
        prevRunning.current = isRunning
      } catch (_) {}
    }

    es.onerror = () => {
      es.close()
      setTimeout(() => {
        if (esRef.current === es) esRef.current = null
      }, 5000)
    }

    return () => { es.close(); esRef.current = null }
  }, [])
}
