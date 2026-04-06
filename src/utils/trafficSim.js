// ─── Bengaluru Traffic Hotspots (real congestion zones) ───────────────────────
export const BENGALURU_TRAFFIC_ZONES = [
  { id: 'silk-board',    name: 'Silk Board Jn.',        lat: 12.9172, lng: 77.6229, severity: 'severe',   radius: 900  },
  { id: 'marathahalli', name: 'Marathahalli Bridge',    lat: 12.9479, lng: 77.6962, severity: 'high',     radius: 650  },
  { id: 'kr-puram',     name: 'KR Puram Bridge',        lat: 12.9900, lng: 77.6934, severity: 'high',     radius: 550  },
  { id: 'tin-factory',  name: 'Tin Factory Jn.',        lat: 12.9960, lng: 77.6562, severity: 'moderate', radius: 450  },
  { id: 'hebbal',       name: 'Hebbal Flyover',          lat: 13.0353, lng: 77.5972, severity: 'high',     radius: 650  },
  { id: 'mg-road',      name: 'MG Road Corridor',       lat: 12.9752, lng: 77.6227, severity: 'moderate', radius: 500  },
  { id: 'ecity-toll',   name: 'Electronic City Toll',   lat: 12.8450, lng: 77.6601, severity: 'high',     radius: 700  },
  { id: 'bannerghatta', name: 'Bannerghatta Rd Jn.',    lat: 12.8906, lng: 77.5978, severity: 'moderate', radius: 500  },
  { id: 'nagawara',     name: 'Nagawara ORR',           lat: 13.0430, lng: 77.6197, severity: 'moderate', radius: 520  },
  { id: 'whitefield',   name: 'ITPL Whitefield',        lat: 12.9784, lng: 77.7355, severity: 'high',     radius: 600  },
  { id: 'koramangala',  name: 'Koramangala 80ft Rd.',   lat: 12.9340, lng: 77.6264, severity: 'moderate', radius: 400  },
  { id: 'yeshwantpur',  name: 'Yeshwantpur Jn.',        lat: 13.0292, lng: 77.5490, severity: 'moderate', radius: 480  },
  { id: 'hosur-rd',     name: 'Hosur Road Flyover',     lat: 12.9040, lng: 77.6093, severity: 'moderate', radius: 420  },
  { id: 'airport-rd',   name: 'Old Airport Road',       lat: 12.9718, lng: 77.6478, severity: 'low',      radius: 360  },
  { id: 'bellary-rd',   name: 'Bellary Road NH44',      lat: 13.0600, lng: 77.5912, severity: 'low',      radius: 380  },
  { id: 'rajajinagar',  name: 'Rajajinagar Circle',     lat: 12.9928, lng: 77.5547, severity: 'moderate', radius: 420  },
  { id: 'hebbal-orr',   name: 'Hebbal ORR Junction',    lat: 13.0430, lng: 77.5831, severity: 'high',     radius: 500  },
  { id: 'madiwala',     name: 'Madiwala Check-Post',    lat: 12.9246, lng: 77.6199, severity: 'moderate', radius: 400  },
]

// Visual config per severity
export const SEVERITY_CONFIG = {
  severe:   { color: '#cc0000', fill: 'rgba(200,0,0,0.18)',   stroke: 'rgba(200,0,0,0.55)',   label: '🔴 JAM',      delayMin: 12, penalty: 1.20 },
  high:     { color: '#e05500', fill: 'rgba(224,85,0,0.14)',  stroke: 'rgba(224,85,0,0.50)',  label: '🟠 HEAVY',    delayMin:  7, penalty: 0.70 },
  moderate: { color: '#c48800', fill: 'rgba(196,136,0,0.10)', stroke: 'rgba(196,136,0,0.40)', label: '🟡 MODERATE', delayMin:  3, penalty: 0.30 },
  low:      { color: '#4a8800', fill: 'rgba(74,136,0,0.07)',  stroke: 'rgba(74,136,0,0.30)',  label: '🟢 SLOW',     delayMin:  1, penalty: 0.08 },
}

// ─── Haversine distance in metres ─────────────────────────────────────────────
function mDist(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Apply traffic scoring to a single route.
 * Uses a weighted zone-intersection approach:
 *   adjustedTime = baseDuration × (1 + Σpenalty) + Σdelays
 */
export function applyTrafficToRoute(route, zones = BENGALURU_TRAFFIC_ZONES) {
  const coords = route.coordinates // [[lat, lng], ...]

  // Sub-sample coords for performance (max 80 points)
  const step = Math.max(1, Math.floor(coords.length / 80))
  const sample = coords.filter((_, i) => i % step === 0)

  let totalPenalty = 0
  const zonesHit = new Map()

  for (const [lat, lng] of sample) {
    for (const zone of zones) {
      const d = mDist(lat, lng, zone.lat, zone.lng)
      if (d < zone.radius) {
        const cfg = SEVERITY_CONFIG[zone.severity]
        const intensity = 1 - (d / zone.radius) // 0..1, closer = worse
        const prev = zonesHit.get(zone.id)
        if (!prev || prev.intensity < intensity) {
          zonesHit.set(zone.id, { zone, intensity, cfg })
        }
        // Accumulate weighted penalty per sample point
        totalPenalty += (cfg.penalty * intensity) / sample.length
      }
    }
  }

  // Scale penalty to a reasonable multiplier (cap at ×2.5)
  const penaltyRatio = Math.min(totalPenalty * 8, 2.5)
  const trafficDelaySec = Array.from(zonesHit.values())
    .reduce((s, v) => s + v.cfg.delayMin * 60 * v.intensity, 0)
  const adjustedDurationS = route.durationS * (1 + penaltyRatio * 0.45) + trafficDelaySec
  const trafficDelayMin = Math.round(trafficDelaySec / 60)

  return {
    ...route,
    adjustedDurationS,
    trafficDelayMin,
    zonesHit: Array.from(zonesHit.values())
      .sort((a, b) => b.intensity - a.intensity)
      .map(v => ({ ...v.zone, intensity: v.intensity, cfg: v.cfg })),
    penaltyRatio,
  }
}

// Route colour palette for up to 3 alternatives
const ROUTE_COLORS   = ['#1a7a00', '#c46000', '#990012']
const ROUTE_LABELS   = ['OPTIMAL', 'ALTERNATIVE', 'AVOID']
const ROUTE_DASHES   = [null, '10,6', '6,4']      // solid, long-dash, short-dash
const ROUTE_WEIGHTS  = [4.5, 3.5, 2.5]

/**
 * Rank multiple OSRM routes using traffic-adjusted scores.
 * Returns array sorted best→worst with visual and text metadata.
 */
export function rankRoutes(routes, zones = BENGALURU_TRAFFIC_ZONES) {
  if (!routes?.length) return []

  const scored = routes.map(r => applyTrafficToRoute(r, zones))
  scored.sort((a, b) => a.adjustedDurationS - b.adjustedDurationS)

  return scored.map((r, i) => ({
    ...r,
    rank:       i,
    label:      ROUTE_LABELS[i]  ?? `ROUTE ${i + 1}`,
    color:      ROUTE_COLORS[i]  ?? '#555',
    dashArray:  ROUTE_DASHES[i]  ?? '4,4',
    weight:     ROUTE_WEIGHTS[i] ?? 2,
    isOptimal:  i === 0,
    suggestion: buildSuggestion(r, i, scored[0]),
  }))
}

function buildSuggestion(route, rank, best) {
  const timeDiff = Math.round((route.adjustedDurationS - best.adjustedDurationS) / 60)
  const topZone  = route.zonesHit[0]?.name ?? null

  if (rank === 0) {
    if (route.zonesHit.length === 0)
      return `Clear path detected. No congestion on this route.`
    if (route.trafficDelayMin < 3)
      return `Best route with minor delay${topZone ? ` near ${topZone}` : ''}.`
    return `Fastest despite ${route.trafficDelayMin} min delay${topZone ? ` at ${topZone}` : ''}. Pre-alert for clearance.`
  }
  if (route.zonesHit.length === 0)
    return `+${timeDiff} min longer but completely clear — use if ${best.label} worsens.`
  return `+${timeDiff} min slower · ${route.zonesHit.length} traffic zone${route.zonesHit.length > 1 ? 's' : ''}${topZone ? ` incl. ${topZone}` : ''}.`
}

// ─── Dummy ambulance fleet generator ──────────────────────────────────────────
const AMB_TYPES = ['ICU', 'ICU', 'BASIC', 'BASIC', 'BASIC', 'NEONATAL', 'ICU', 'BASIC']
const AMB_OFFSETS = [
  [ 0.012,  0.008], [-0.010,  0.015], [ 0.018, -0.012],
  [-0.015, -0.009], [ 0.005,  0.020], [-0.020,  0.005],
  [ 0.022,  0.014], [-0.008, -0.018],
]

export function generateAmbulanceFleet(centerLat, centerLng) {
  return AMB_OFFSETS.map(([dlat, dlng], i) => ({
    id:        i + 1,
    lat:       centerLat + dlat,
    lng:       centerLng + dlng,
    type:      AMB_TYPES[i],
    available: true,
    driverId:  `DRV-${String(i + 1).padStart(3, '0')}`,
    vehicleId: `BLR-${String(i + 1).padStart(2, '0')}`,
  }))
}
