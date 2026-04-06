// Haversine formula — distance in km
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) { return deg * (Math.PI / 180) }

// Average ambulance speed in city: ~30 km/h
export function etaMinutes(distKm, speedKmh = 30) {
  return Math.round((distKm / speedKmh) * 60)
}

// Extract specialization from OSM tags
export function inferSpecializations(tags = {}) {
  const specs = new Set(['general'])
  const text = JSON.stringify(tags).toLowerCase()
  if (text.includes('cardiac') || text.includes('heart') || text.includes('cardio')) specs.add('cardiac')
  if (text.includes('trauma') || text.includes('accident') || text.includes('emergency')) specs.add('trauma')
  if (text.includes('neuro') || text.includes('brain') || text.includes('stroke')) specs.add('neurological')
  if (text.includes('cancer') || text.includes('oncol')) specs.add('oncological')
  if (text.includes('child') || text.includes('pediatr') || text.includes('paediatr')) specs.add('paediatric')
  if (tags.healthcare === 'hospital' || tags.amenity === 'hospital') specs.add('trauma')
  if (tags.name) {
    const name = tags.name.toLowerCase()
    if (name.includes('heart') || name.includes('cardiac')) specs.add('cardiac')
    if (name.includes('neuro')) specs.add('neurological')
    if (name.includes('child') || name.includes('kiddie') || name.includes('maternity')) specs.add('paediatric')
    if (name.includes('cancer') || name.includes('oncol')) specs.add('oncological')
    if (name.includes('government') || name.includes('govt') || name.includes('district') ||
        name.includes('taluk') || name.includes('municipal') || name.includes('esic') ||
        name.includes('railway') || name.includes('army') || name.includes('victoria') ||
        name.includes('nimhans') || name.includes('bowring')) {
      // tag as government below
    }
  }
  return Array.from(specs)
}

export function inferHospitalType(tags = {}) {
  const text = (JSON.stringify(tags) + (tags.name || '')).toLowerCase()
  const govKeywords = ['government', 'govt', 'district', 'taluk', 'municipal', 'esic',
    'railway', 'army', 'victoria', 'nimhans', 'bowring', 'public', 'state', 'national',
    'primary health', 'phc', 'chc', 'esi', 'kendriya', 'central']
  return govKeywords.some(k => text.includes(k)) ? 'government' : 'private'
}

// Score a hospital for a given emergency
export function scoreHospital(hospital, emergencyType, userLat, userLng) {
  const dist = haversine(userLat, userLng, hospital.lat, hospital.lng)
  const travelTime = etaMinutes(dist)

  // Specialization match score 0-1
  const specs = hospital.specializations || ['general']
  const emLower = (emergencyType || '').toLowerCase()
  const specMap = {
    cardiac: ['cardiac'],
    neurological: ['neurological'],
    trauma: ['trauma'],
    toxicological: ['general', 'trauma'],
    respiratory: ['general'],
    general: ['general'],
  }
  const wantedSpecs = specMap[emLower] || ['general']
  const specMatch = wantedSpecs.some(s => specs.includes(s)) ? 1.0 : 0.2

  // Capacity score 0-1 (normalize 50-100 range)
  const cap = (hospital.capacity || 70) / 100

  // Lower travel time = better; normalize: 1 - travelTime/60 (max 60 min)
  const travelScore = Math.max(0, 1 - travelTime / 60)

  const score = 0.5 * travelScore + 0.3 * specMatch + 0.2 * cap

  return {
    ...hospital,
    distKm: Math.round(dist * 10) / 10,
    etaMin: travelTime,
    score: Math.round(score * 100),
  }
}

export function formatETA(min) {
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

export function timestamp() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false })
}

// Linear interpolation between two lat/lng points
export function lerpLatLng(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  }
}
