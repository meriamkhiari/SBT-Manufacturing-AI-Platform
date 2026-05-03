import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
})

export const fetchTasks   = () => api.get('/tasks').then(r => r.data.tasks)
export const fetchTask    = (id) => api.get(`/tasks/${id}`).then(r => r.data.task)
export const fetchStatus  = () => api.get('/status').then(r => r.data.status)
export const fetchMetrics = () => api.get('/metrics').then(r => r.data.metrics)
export const fetchHealth  = () => api.get('/health').then(r => r.data)
export const fetchSBT     = () => api.get('/sbt').then(r => r.data.sbt)
