import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { motion } from 'framer-motion'

const TIER_COLORS  = { 1: '#22c55e', 2: '#3b82f6', 3: '#f59e0b' }
const SCORE_COLORS = ['#ef4444','#f59e0b','#3b82f6','#22c55e','#8b5cf6']

const RADIAN = Math.PI / 180
function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null
  const r  = innerRadius + (outerRadius - innerRadius) * 0.6
  const x  = cx + r * Math.cos(-midAngle * RADIAN)
  const y  = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

/* ── Répartition par Tier ── */
export function TierPieChart({ companies }) {
  const counts = { 1: 0, 2: 0, 3: 0 }
  companies.forEach(c => { if (c.tier in counts) counts[c.tier]++ })
  const data = [
    { name: 'Tier 1 — Fabricants',     value: counts[1], color: TIER_COLORS[1] },
    { name: 'Tier 2 — Sous-traitants', value: counts[2], color: TIER_COLORS[2] },
    { name: 'Tier 3 — Concurrents',    value: counts[3], color: TIER_COLORS[3] },
  ].filter(d => d.value > 0)

  if (!data.length) return null

  return (
    <ChartCard title="Répartition par Tier">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
            dataKey="value" labelLine={false} label={CustomPieLabel}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip
            formatter={(v, n) => [v + ' entreprises', n]}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <PieLegend data={data} />
    </ChartCard>
  )
}

/* ── Top 8 pays ── */
export function CountryBarChart({ companies }) {
  const counts = {}
  companies.forEach(c => {
    if (c.country) counts[c.country] = (counts[c.country] || 0) + 1
  })
  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({ country: country.slice(0, 10), count }))

  if (!data.length) return null

  return (
    <ChartCard title="Top pays">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="country" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          />
          <Bar dataKey="count" name="Entreprises" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ── Distribution des scores ── */
export function ScoreDistributionChart({ companies }) {
  const buckets = [
    { label: '0–20',  min: 0,  max: 20,  count: 0, color: '#ef4444' },
    { label: '21–40', min: 21, max: 40,  count: 0, color: '#f97316' },
    { label: '41–60', min: 41, max: 60,  count: 0, color: '#f59e0b' },
    { label: '61–80', min: 61, max: 80,  count: 0, color: '#3b82f6' },
    { label: '81–100',min: 81, max: 100, count: 0, color: '#22c55e' },
  ]
  companies.forEach(c => {
    if (c.score_final == null) return
    const b = buckets.find(b => c.score_final >= b.min && c.score_final <= b.max)
    if (b) b.count++
  })

  return (
    <ChartCard title="Distribution des scores">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={buckets} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            formatter={(v) => [v + ' entreprises', 'Nombre']}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ── Conteneur de graphique ── */
function ChartCard({ title, children }) {
  return (
    <motion.div
      className="card p-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">{title}</h3>
      {children}
    </motion.div>
  )
}

function PieLegend({ data }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
          {d.name} ({d.value})
        </div>
      ))}
    </div>
  )
}
