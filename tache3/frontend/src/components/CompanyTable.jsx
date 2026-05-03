import { useState } from 'react'
import { ExternalLink, Linkedin, Mail, MapPin, ChevronUp, ChevronDown, Star, Scale, Search, PackageOpen } from 'lucide-react'
import clsx from 'clsx'
import { ScoreBadge, ScoreBar } from './ScoreBar'
import { SkeletonTable } from './Skeleton'
import useStore from '../store/useStore'

/* ── Highlight texte recherché ── */
function Highlight({ text = '', query = '' }) {
  if (!query || !text) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-yellow-900 dark:text-yellow-200 rounded px-0.5 not-italic">{part}</mark>
          : part
      )}
    </>
  )
}

function TierBadge({ tier }) {
  const map = {
    1: ['badge-tier1', 'T1'],
    2: ['badge-tier2', 'T2'],
    3: ['badge-tier3', 'T3'],
  }
  const [cls, label] = map[tier] || ['bg-slate-100 text-slate-500', '?']
  return <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cls)}>{label}</span>
}

/* ── Indicateur de complétude des données ── */
function CompletenessBar({ company }) {
  const fields = [
    { key: 'email',    label: 'Email'    },
    { key: 'phone',    label: 'Tél'      },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'country',  label: 'Pays'     },
    { key: 'website',  label: 'Site'     },
  ]
  const filled = fields.filter(f => company[f.key] && company[f.key] !== '').length
  const pct    = Math.round((filled / fields.length) * 100)
  const color  = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div className="space-y-0.5 min-w-[90px]" title={`${filled}/${fields.length} champs remplis`}>
      <div className="flex justify-between items-center">
        <div className="flex gap-0.5">
          {fields.map(f => (
            <span key={f.key} title={f.label}
              className={`w-1.5 h-1.5 rounded-full ${company[f.key] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">{pct}%</span>
      </div>
      <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CompanyTable({ companies = [], loading, onRowClick, searchQuery = '', lastSessionAt = null }) {
  const [sort, setSort] = useState({ key: 'score_final', dir: 'desc' })

  const favorites     = useStore(s => s.favorites)
  const toggleFav     = useStore(s => s.toggleFavorite)
  const compareList   = useStore(s => s.compareList)
  const toggleCompare = useStore(s => s.toggleCompare)

  const toggleSort = (key) =>
    setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  const SortIcon = ({ col }) => {
    if (sort.key !== col) return (
      <span className="inline-flex flex-col gap-0 opacity-25 ml-0.5">
        <ChevronUp size={9} className="-mb-1" />
        <ChevronDown size={9} />
      </span>
    )
    return sort.dir === 'asc'
      ? <ChevronUp  size={12} className="text-primary-500 ml-0.5" />
      : <ChevronDown size={12} className="text-primary-500 ml-0.5" />
  }

  const sorted = [...companies].sort((a, b) => {
    const va = a[sort.key] ?? -1
    const vb = b[sort.key] ?? -1
    if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sort.dir === 'asc' ? va - vb : vb - va
  })

  if (loading) return <SkeletonTable rows={6} />

  if (!sorted.length) return (
    <div className="card p-10 sm:p-16 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
        {searchQuery
          ? <Search size={32} className="text-slate-400" />
          : <PackageOpen size={32} className="text-slate-400" />
        }
      </div>
      <p className="font-bold text-slate-700 dark:text-slate-300 text-lg">
        {searchQuery ? 'Aucun résultat' : 'Aucune entreprise'}
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs leading-relaxed">
        {searchQuery
          ? `Aucune entreprise ne correspond à "${searchQuery}". Essayez d'autres termes.`
          : 'Lancez le pipeline pour commencer à collecter des données.'}
      </p>
      {!searchQuery && (
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-full">
          <MapPin size={12} /> Sélectionnez un pays sur la Carte puis lancez le pipeline
        </div>
      )}
    </div>
  )

  return (
    <div className="card overflow-hidden">

      {/* ── Vue cartes mobile (xs) ── */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {sorted.map((c, i) => {
          const isFav   = favorites.has(c.name)
          const inCmp   = compareList.some(x => x.name === c.name)
          const cmpFull = compareList.length >= 2 && !inCmp
          return (
            <div
              key={c.name + i}
              className="p-3 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
              onClick={() => onRowClick?.(c)}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Avatar initiales */}
                  <div
                    className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ background: `hsl(${(c.name?.charCodeAt(0) || 65) * 5 % 360}, 55%, 52%)` }}
                  >
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate block">
                      {c.name}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(c.name) }}
                      className="mt-0.5"
                    >
                      <Star
                        size={11}
                        fill={isFav ? 'currentColor' : 'none'}
                        className={isFav ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <TierBadge tier={c.tier} />
                  <button
                    onClick={e => { e.stopPropagation(); if (!cmpFull) toggleCompare(c) }}
                  >
                    <Scale
                      size={13}
                      className={clsx(
                        'transition-colors',
                        inCmp    && 'text-blue-500',
                        !inCmp && !cmpFull && 'text-slate-300 dark:text-slate-600',
                        cmpFull  && 'text-slate-200 dark:text-slate-700 cursor-not-allowed',
                      )}
                    />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">{c.country || '—'}</span>
                <div className="flex items-center gap-2">
                  {c.score_final != null && <ScoreBadge value={c.score_final} />}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {c.email && (
                      <a href={`mailto:${c.email}`} title={c.email}
                         className="text-slate-400 hover:text-primary-600 transition-colors">
                        <Mail size={13} />
                      </a>
                    )}
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank" rel="noreferrer"
                         className="text-slate-400 hover:text-blue-600 transition-colors">
                        <Linkedin size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Table desktop (sm+) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {[
                { key: null,          label: '★'          },
                { key: 'name',        label: 'Entreprise' },
                { key: 'tier',        label: 'Tier'       },
                { key: 'country',     label: 'Pays'       },
                { key: 'score_final', label: 'Score'      },
                { key: null,          label: 'Qualité'    },
                { key: null,          label: 'Contact'    },
                { key: null,          label: '⚖'          },
              ].map(({ key, label }) => (
                <th
                  key={label}
                  className={clsx('table-head-cell whitespace-nowrap', key && 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700')}
                  onClick={key ? () => toggleSort(key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {key && <SortIcon col={key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const isFav    = favorites.has(c.name)
              const inCmp    = compareList.some(x => x.name === c.name)
              const cmpFull  = compareList.length >= 2 && !inCmp
              const isNew    = lastSessionAt && c.created_at && new Date(c.created_at).getTime() > lastSessionAt
              return (
                <tr
                  key={c.name + i}
                  className="table-row-hover cursor-pointer"
                  onClick={() => onRowClick?.(c)}
                >
                  {/* Favori */}
                  <td className="table-cell w-8" onClick={e => { e.stopPropagation(); toggleFav(c.name) }}>
                    <Star
                      size={14}
                      fill={isFav ? 'currentColor' : 'none'}
                      className={isFav
                        ? 'text-yellow-400'
                        : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400 transition-colors'}
                    />
                  </td>

                  {/* Nom */}
                  <td className="table-cell min-w-[160px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[180px]" title={c.name}>
                        <Highlight text={c.name} query={searchQuery} />
                      </span>
                      {isNew && (
                        <span className="shrink-0 text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                      )}
                    </div>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noreferrer"
                         onClick={e => e.stopPropagation()}
                         className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-0.5 truncate max-w-[180px]">
                        <ExternalLink size={9} />
                        {c.website.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}
                      </a>
                    )}
                  </td>

                  {/* Tier */}
                  <td className="table-cell whitespace-nowrap">
                    <TierBadge tier={c.tier} />
                  </td>

                  {/* Pays */}
                  <td className="table-cell whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {c.country || '—'}
                  </td>

                  {/* Score */}
                  <td className="table-cell min-w-[110px]">
                    {c.score_final != null ? (
                      <div className="space-y-1">
                        <ScoreBadge value={c.score_final} />
                        <ScoreBar value={c.score_final} size="sm" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Qualité / Complétude */}
                  <td className="table-cell min-w-[110px]">
                    <CompletenessBar company={c} />
                  </td>

                  {/* Contact */}
                  <td className="table-cell whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {c.email && (
                        <a href={`mailto:${c.email}`} title={c.email}
                           className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                          <Mail size={14} />
                        </a>
                      )}
                      {c.linkedin && (
                        <a href={c.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"
                           className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Linkedin size={14} />
                        </a>
                      )}
                      {!c.email && !c.linkedin && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>

                  {/* Comparer */}
                  <td className="table-cell w-8" onClick={e => { e.stopPropagation(); if (!cmpFull) toggleCompare(c) }}>
                    <Scale
                      size={14}
                      className={clsx(
                        'transition-colors',
                        inCmp    && 'text-blue-500',
                        !inCmp && !cmpFull && 'text-slate-300 dark:text-slate-600 hover:text-blue-400',
                        cmpFull  && 'text-slate-200 dark:text-slate-700 cursor-not-allowed',
                      )}
                      title={inCmp ? 'Retirer de la comparaison' : cmpFull ? 'Comparaison pleine (max 2)' : 'Ajouter à la comparaison'}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
