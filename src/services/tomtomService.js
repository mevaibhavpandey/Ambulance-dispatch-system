const TT_KEY = 'pJ3meWuOYfjQCSQmu0ikEmSHI9C84lie'
const TT_ROUTING = 'https://api.tomtom.com/routing/1/calculateRoute'

export function getTrafficLevel(delayS = 0) {
  if (delayS < 60)  return { level: 'LOW',      color: '#007a3d', bg: 'rgba(0,122,61,0.1)',    label: 'LOW' }
  if (delayS < 300) return { level: 'MODERATE', color: '#c48800', bg: 'rgba(196,136,0,0.1)',  label: 'MODERATE' }
  if (delayS < 600) return { level: 'HIGH',     color: '#e05500', bg: 'rgba(224,85,0,0.1)',   label: 'HIGH' }
  return               { level: 'SEVERE',   color: '#cc0018', bg: 'rgba(204,0,24,0.1)',   label: 'SEVERE' }
}

const ROUTE_COLORS  = ['#1a7a00', '#c46000', '#880010']
const ROUTE_LABELS  = ['OPTIMAL', 'ALTERNATIVE', 'SECONDARY']
const ROUTE_DASHES  = [null, '10,6', '6,4']
const ROUTE_WEIGHTS = [5, 3.5, 2.5]

function parseRoute(r, idx) {
  const s   = r.summary
  const pts = []
  for (const leg of r.legs) for (const p of leg.points) pts.push([p.latitude, p.longitude])
  const delayS = s.trafficDelayInSeconds ?? 0
  return {
    coordinates:    pts,
    distanceKm:     Math.round(s.lengthInMeters / 100) / 10,
    etaMin:         Math.ceil(s.travelTimeInSeconds / 60),
    durationS:      s.travelTimeInSeconds,
    trafficDelayS:  delayS,
    trafficDelayMin:Math.round(delayS / 60),
    traffic:        getTrafficLevel(delayS),
    rank:           idx,
    label:          ROUTE_LABELS[idx] ?? `ROUTE ${idx + 1}`,
    color:          ROUTE_COLORS[idx]  ?? '#555',
    dashArray:      ROUTE_DASHES[idx]  ?? '4,4',
    weight:         ROUTE_WEIGHTS[idx] ?? 2,
    isOptimal:      idx === 0,
    suggestion:     buildSuggestion(s, idx),
  }
}

function buildSuggestion(s, rank) {
  const km  = Math.round(s.lengthInMeters / 100) / 10
  const min = Math.ceil(s.travelTimeInSeconds / 60)
  const del = Math.round((s.trafficDelayInSeconds ?? 0) / 60)
  if (rank === 0) return del === 0 ? `Clear road · ${km} km · No traffic delay` : `Fastest route · ${del} min delay included`
  return `${km} km · ${min} min total · ${del > 0 ? `+${del} min delay` : 'No traffic'}`
}

export async function getTomTomRoutes(fromLat, fromLng, toLat, toLng, maxAlt = 2) {
  const locs   = `${fromLat},${fromLng}:${toLat},${toLng}`
  const params = new URLSearchParams({ key: TT_KEY, routeType: 'fastest', traffic: 'true', travelMode: 'car', maxAlternatives: String(maxAlt) })
  const ctrl   = new AbortController()
  const timer  = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res  = await fetch(`${TT_ROUTING}/${locs}/json?${params}`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`TomTom ${res.status}`)
    const data = await res.json()
    if (!data.routes?.length) throw new Error('No routes')
    return data.routes.map((r, i) => parseRoute(r, i))
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

export async function getFullTomTomRoutes(aLat, aLng, pLat, pLng, hLat, hLng) {
  const [leg1Routes, leg2Routes] = await Promise.all([
    getTomTomRoutes(aLat, aLng, pLat, pLng, 2),
    getTomTomRoutes(pLat, pLng, hLat, hLng, 2),
  ])
  return { leg1Routes, leg2Routes, leg1: leg1Routes[0], leg2: leg2Routes[0] }
}

// Traffic flow tile URL for MapView
export const TT_TRAFFIC_TILE = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TT_KEY}`
