import clsx from 'clsx'

export function Skeleton({ className }) {
  return (
    <div className={clsx('animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg', className)} />
  )
}

export function SkeletonStatCard() {
  return (
    <div className="card p-5 flex items-center gap-4 border-t-4 border-slate-200 dark:border-slate-700">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <tr>
      <td className="table-cell"><div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></td>
      <td className="table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="table-cell"><Skeleton className="h-4 w-16" /></td>
      <td className="table-cell"><div className="space-y-1.5"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-1.5 w-full rounded-full" /></div></td>
      <td className="table-cell"><Skeleton className="h-4 w-20" /></td>
      <td className="table-cell"><div className="flex gap-2"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-4 w-4 rounded" /></div></td>
    </tr>
  )
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {['Entreprise', 'Tier', 'Pays', 'Score', 'Qualité', 'Contact'].map(h => (
                <th key={h} className="table-head-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => <SkeletonTableRow key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  )
}
