const OSRM = 'https://router.project-osrm.org/route/v1/driving'

function parseRoute(r) {
  return {
    coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceM:   r.distance,
    durationS:   r.duration,
    distanceKm:  Math.round(r.distance / 100) / 10,
    etaMin:      Math.round(r.duration / 60),
  }
}

/** Single route A → B */
export async function getRoute(fromLat, fromLng, toLat, toLng) {
  const url = `${OSRM}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error('OSRM ' + res.status)
  const data = await res.json()
  if (!data.routes?.length) throw new Error('No route')
  return parseRoute(data.routes[0])
}

/** Fetch up to 3 alternative routes A → B */
export async function getAlternativeRoutes(fromLat, fromLng, toLat, toLng) {
  const url = `${OSRM}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=3&steps=false`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('OSRM ' + res.status)
  const data = await res.json()
  if (!data.routes?.length) throw new Error('No routes')
  return data.routes.map(parseRoute)
}

/**
 * Full ambulance routing: depot→patient (leg1) + patient→hospital (leg2)
 * Returns both primary routes AND all alternatives for each leg.
 */
export async function getAmbulanceRoutes(ambLat, ambLng, patLat, patLng, hospLat, hospLng) {
  const [leg1Routes, leg2Routes] = await Promise.all([
    getAlternativeRoutes(ambLat, ambLng, patLat, patLng),
    getAlternativeRoutes(patLat, patLng, hospLat, hospLng),
  ])
  return {
    leg1:       leg1Routes[0],
    leg2:       leg2Routes[0],
    leg1Routes,
    leg2Routes,
  }
}

// Keep old export name for compat
export const getAmbulanceRoute = async (...args) => {
  const r = await getAmbulanceRoutes(...args)
  return { leg1: r.leg1, leg2: r.leg2 }
}
