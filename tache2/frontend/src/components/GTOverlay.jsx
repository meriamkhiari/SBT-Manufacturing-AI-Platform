/* Ground-truth bounding-box overlay (YOLO OBB). Reads `annotations`,
   each having { bbox: {x,y,w,h}, class_name, class_id }, all normalized 0..1.
   Renders on top of an <img>; uses an SVG with viewBox 0..1 for crispness. */
const CLASS_COLORS = {
  0: { stroke: '#e11d48', fill: 'rgba(225,29,72,.15)'  }, // boites_liees       — rose
  1: { stroke: '#d97706', fill: 'rgba(217,119,6,.15)'  }, // logo_illisible     — amber
  2: { stroke: '#2563eb', fill: 'rgba(37,99,235,.15)'  }, // peinture_irregulière — blue
  3: { stroke: '#059669', fill: 'rgba(5,150,105,.15)'  }, // trou_obstrue       — emerald
}

export default function GTOverlay({ annotations = [], showLabels = true, compact = false }) {
  if (!annotations.length) return null
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      {annotations.map((a, i) => {
        const c = CLASS_COLORS[a.class_id] || CLASS_COLORS[0]
        const { x = 0, y = 0, w = 0, h = 0 } = a.bbox || {}
        if (w <= 0 || h <= 0) return null
        const sw = compact ? 0.004 : 0.0025
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={c.fill} stroke={c.stroke}
                  strokeWidth={sw} vectorEffect="non-scaling-stroke" rx="0.005" />
            {showLabels && !compact && (
              <g>
                <rect x={x} y={Math.max(0, y - 0.04)} width={Math.min(0.18, w + 0.04)} height="0.035"
                      fill={c.stroke} rx="0.004" />
                <text x={x + 0.005} y={Math.max(0.022, y - 0.012)}
                      fill="white" fontSize="0.022" fontFamily="Inter,sans-serif" fontWeight="700">
                  {(a.class_name || '').replace(/_/g, ' ').slice(0, 14)}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
