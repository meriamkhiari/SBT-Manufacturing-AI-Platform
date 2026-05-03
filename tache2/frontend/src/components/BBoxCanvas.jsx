import React, { useEffect, useRef } from 'react'

const COLORS = {
  high:   { stroke: '#e11d48', fill: 'rgba(225,29,72,0.18)'  }, // rose-600
  medium: { stroke: '#d97706', fill: 'rgba(217,119,6,0.18)'  }, // amber-600
  low:    { stroke: '#059669', fill: 'rgba(5,150,105,0.18)'  }, // emerald-600
}

export default function BBoxCanvas({ detections = [], visible = {high:true,medium:true,low:true}, flashIdx }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const parent = svg.parentElement
    const W = parent.clientWidth || 400
    const H = parent.clientHeight || 400
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('width', W)
    svg.setAttribute('height', H)
    svg.innerHTML = ''

    detections.forEach((d, i) => {
      if (!visible[d.severity]) return
      const bb = d.bbox
      if (!bb || bb.w <= 0 || bb.h <= 0) return
      const c = COLORS[d.severity] || COLORS.low
      const px = Math.max(0, bb.x * W)
      const py = Math.max(0, bb.y * H)
      const pw = Math.min(bb.w * W, W - px)
      const ph = Math.min(bb.h * H, H - py)
      if (pw < 2 || ph < 2) return

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('data-idx', i)

      const mkRect = (fill, stroke, sw) => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        r.setAttribute('x', px); r.setAttribute('y', py)
        r.setAttribute('width', pw); r.setAttribute('height', ph)
        r.setAttribute('fill', fill); r.setAttribute('stroke', stroke)
        r.setAttribute('stroke-width', sw); r.setAttribute('rx', '3')
        return r
      }
      g.appendChild(mkRect(c.fill, 'none', 0))
      g.appendChild(mkRect('none', c.stroke, 2))

      const cs = Math.min(10, pw * 0.22, ph * 0.22)
      ;[[px,py+cs,px,py,px+cs,py],[px+pw-cs,py,px+pw,py,px+pw,py+cs],
        [px,py+ph-cs,px,py+ph,px+cs,py+ph],[px+pw-cs,py+ph,px+pw,py+ph,px+pw,py+ph-cs]
      ].forEach(([x1,y1,x2,y2,x3,y3]) => {
        const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
        pl.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`)
        pl.setAttribute('fill','none'); pl.setAttribute('stroke',c.stroke); pl.setAttribute('stroke-width','2.5')
        g.appendChild(pl)
      })

      const label = `${i+1} ${(d.class_name||'').replace(/_/g,' ').slice(0,16)}`
      const lh = 15, ly = py >= lh + 2 ? py - 2 : py + ph + lh
      const lw = Math.max(label.length * 6 + 12, 30)
      const lbg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      lbg.setAttribute('x', px); lbg.setAttribute('y', ly - lh + 2)
      lbg.setAttribute('width', lw); lbg.setAttribute('height', lh)
      lbg.setAttribute('fill', c.stroke); lbg.setAttribute('rx', '3')
      const lt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      lt.setAttribute('x', px + 5); lt.setAttribute('y', ly)
      lt.setAttribute('fill','#fff'); lt.setAttribute('font-size','10')
      lt.setAttribute('font-family','Inter,system-ui,sans-serif'); lt.setAttribute('font-weight','700')
      lt.textContent = label
      g.appendChild(lbg); g.appendChild(lt)
      svg.appendChild(g)
    })
  }, [detections, visible])

  useEffect(() => {
    if (flashIdx == null || !svgRef.current) return
    const g = svgRef.current.querySelector(`g[data-idx="${flashIdx}"]`)
    if (!g) return
    g.style.filter = 'brightness(2.5) drop-shadow(0 0 5px white)'
    setTimeout(() => { g.style.filter = '' }, 700)
  }, [flashIdx])

  return (
    <svg ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', borderRadius: 8 }}
    />
  )
}

