import { db } from '../db'
import { inferSpecializations, inferHospitalType, scoreHospital } from '../utils/geo'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes (was 6hrs - reduce so fresh data loads)

// Multiple Overpass API mirrors for redundancy
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

// Overpass QL query — hospitals, clinics, health centres in the area
function buildOverpassQuery(lat, lng, radiusM = 30000) {
  return `
[out:json][timeout:60];
(
  node["amenity"="hospital"](around:${radiusM},${lat},${lng});
  way["amenity"="hospital"](around:${radiusM},${lat},${lng});
  relation["amenity"="hospital"](around:${radiusM},${lat},${lng});
  node["healthcare"="hospital"](around:${radiusM},${lat},${lng});
  way["healthcare"="hospital"](around:${radiusM},${lat},${lng});
  node["amenity"="clinic"]["healthcare"](around:${radiusM},${lat},${lng});
  way["amenity"="clinic"]["healthcare"](around:${radiusM},${lat},${lng});
  node["healthcare"="clinic"](around:${radiusM},${lat},${lng});
  way["healthcare"="clinic"](around:${radiusM},${lat},${lng});
);
out center tags;
`
}

async function fetchFromOverpass(query, mirrorUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(mirrorUrl, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

function parseOverpassElements(elements) {
  return elements
    .map(el => {
      const elLat = el.lat ?? el.center?.lat
      const elLng = el.lon ?? el.center?.lon
      if (!elLat || !elLng) return null
      const tags = el.tags || {}
      const name = tags.name || tags['name:en'] || tags['name:kn'] || null
      if (!name) return null

      return {
        osmId: String(el.id),
        name,
        lat: elLat,
        lng: elLng,
        type: inferHospitalType(tags),
        specializations: inferSpecializations(tags),
        capacity: tags['capacity:beds']
          ? parseInt(tags['capacity:beds'])
          : Math.floor(Math.random() * 40 + 60),
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || null,
        beds: tags['capacity:beds'] ? parseInt(tags['capacity:beds']) : null,
        emergency: tags.emergency === 'yes' || tags['emergency'] === 'yes',
        openingHours: tags['opening_hours'] || null,
        lastFetched: Date.now(),
        tags,
      }
    })
    .filter(Boolean)
    .filter((h, i, arr) => arr.findIndex(x => x.name === h.name) === i) // dedupe by name
}

export async function fetchHospitals(lat, lng, onLog) {
  // Check cache — but force refresh if it's old
  const cached = await db.hospitals.toArray()
  if (cached.length > 0) {
    const age = Date.now() - (cached[0].lastFetched || 0)
    if (age < CACHE_TTL_MS) {
      onLog?.(`Hospital data loaded from cache (${cached.length} facilities)`, 'success')
      return cached
    } else {
      onLog?.('Cache expired — refreshing hospital data...', 'info')
      await db.hospitals.clear()
    }
  }

  onLog?.('Fetching live hospital data from OpenStreetMap...', 'info')
  const query = buildOverpassQuery(lat, lng)

  // Try each mirror until one works
  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    const mirror = OVERPASS_MIRRORS[i]
    try {
      onLog?.(`Trying Overpass mirror ${i + 1}/${OVERPASS_MIRRORS.length}...`, 'info')
      const data = await fetchFromOverpass(query, mirror)
      const elements = data.elements || []

      const hospitals = parseOverpassElements(elements)
      if (hospitals.length === 0) throw new Error('No hospitals returned from this mirror')

      // Cache results
      await db.hospitals.clear()
      await db.hospitals.bulkAdd(hospitals)

      onLog?.(`✓ Fetched ${hospitals.length} hospitals from OpenStreetMap`, 'success')
      return hospitals

    } catch (err) {
      onLog?.(`Mirror ${i + 1} failed: ${err.message}`, 'warn')
      if (i === OVERPASS_MIRRORS.length - 1) {
        // All mirrors failed — use extended fallback
        onLog?.('All Overpass mirrors failed — using extended Bengaluru hospital database', 'warn')
        const fallback = await db.hospitals.toArray()
        if (fallback.length > 0) {
          onLog?.(`Using ${fallback.length} cached hospitals`, 'info')
          return fallback
        }
        const seeded = seedFallbackHospitals()
        await db.hospitals.clear()
        await db.hospitals.bulkAdd(seeded)
        onLog?.(`Seeded ${seeded.length} known Bengaluru hospitals`, 'warn')
        return seeded
      }
    }
  }
}

// Rank hospitals (no hard limit — return all scored)
export function rankHospitals(hospitals, emergencyType, userLat, userLng, limit = 999) {
  return hospitals
    .map(h => scoreHospital(h, emergencyType, userLat, userLng))
    .filter(h => h.distKm <= 50) // within 50km
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Extended fallback — 30 well-known Bengaluru hospitals
function seedFallbackHospitals() {
  return [
    { name: 'Manipal Hospital Whitefield',       lat: 12.9698, lng: 77.7499, type: 'private',    specializations: ['cardiac', 'neurological', 'trauma', 'general'],  capacity: 88, emergency: true },
    { name: 'Victoria Government Hospital',       lat: 12.9785, lng: 77.5740, type: 'government', specializations: ['trauma', 'general', 'neurological'],              capacity: 95, emergency: true },
    { name: 'Sakra World Hospital',               lat: 12.9279, lng: 77.6271, type: 'private',    specializations: ['neurological', 'cardiac', 'general'],             capacity: 76, emergency: true },
    { name: 'Apollo Hospital Bannerghatta',        lat: 12.8906, lng: 77.5978, type: 'private',    specializations: ['cardiac', 'trauma', 'general'],                   capacity: 81, emergency: true },
    { name: 'Bowring & Lady Curzon Hospital',     lat: 12.9803, lng: 77.6081, type: 'government', specializations: ['general', 'trauma'],                               capacity: 90, emergency: true },
    { name: 'Fortis Hospital Cunningham Road',    lat: 12.9822, lng: 77.6060, type: 'private',    specializations: ['cardiac', 'neurological'],                         capacity: 79, emergency: true },
    { name: 'NIMHANS',                            lat: 12.9407, lng: 77.5939, type: 'government', specializations: ['neurological', 'general'],                         capacity: 85, emergency: false },
    { name: "St. John's Medical College",         lat: 12.9359, lng: 77.6229, type: 'private',    specializations: ['trauma', 'cardiac', 'general'],                   capacity: 88, emergency: true },
    { name: 'MS Ramaiah Memorial Hospital',       lat: 13.0186, lng: 77.5530, type: 'private',    specializations: ['cardiac', 'neurological', 'trauma', 'general'],  capacity: 82, emergency: true },
    { name: 'Sparsh Hospital',                    lat: 12.9763, lng: 77.6003, type: 'private',    specializations: ['trauma', 'general'],                               capacity: 72, emergency: true },
    { name: 'Columbia Asia Hospital Hebbal',      lat: 13.0358, lng: 77.5939, type: 'private',    specializations: ['cardiac', 'general'],                             capacity: 70, emergency: true },
    { name: 'Narayana Health City',               lat: 12.8955, lng: 77.6023, type: 'private',    specializations: ['cardiac', 'neurological', 'general'],             capacity: 95, emergency: true },
    { name: 'Jayadeva Institute of Cardiology',   lat: 12.9237, lng: 77.5951, type: 'government', specializations: ['cardiac'],                                         capacity: 80, emergency: true },
    { name: 'Kidwai Memorial Cancer Institute',   lat: 12.9360, lng: 77.5941, type: 'government', specializations: ['oncological', 'general'],                         capacity: 85, emergency: false },
    { name: 'Manipal Hospital Old Airport Road',  lat: 12.9607, lng: 77.6469, type: 'private',    specializations: ['cardiac', 'trauma', 'general'],                   capacity: 78, emergency: true },
    { name: 'BGS Gleneagles Global Hospital',     lat: 12.8578, lng: 77.5393, type: 'private',    specializations: ['cardiac', 'neurological', 'general'],             capacity: 75, emergency: true },
    { name: 'HCG Cancer Centre',                  lat: 13.0026, lng: 77.5849, type: 'private',    specializations: ['oncological', 'general'],                         capacity: 65, emergency: false },
    { name: 'Fortis Hospital Rajajinagar',        lat: 12.9896, lng: 77.5542, type: 'private',    specializations: ['cardiac', 'neurological', 'trauma'],              capacity: 77, emergency: true },
    { name: 'Aster CMI Hospital',                 lat: 13.0563, lng: 77.5929, type: 'private',    specializations: ['cardiac', 'neurological', 'general'],             capacity: 80, emergency: true },
    { name: 'Apollo Hospital Jayanagar',           lat: 12.9254, lng: 77.5842, type: 'private',    specializations: ['cardiac', 'general'],                             capacity: 70, emergency: true },
    { name: 'Sagar Hospital',                     lat: 12.9115, lng: 77.5703, type: 'private',    specializations: ['cardiac', 'trauma', 'general'],                   capacity: 73, emergency: true },
    { name: 'KMC Hospital Manipal',               lat: 12.9782, lng: 77.5948, type: 'private',    specializations: ['general', 'trauma'],                               capacity: 68, emergency: true },
    { name: 'Suguna Hospital',                    lat: 13.0115, lng: 77.5713, type: 'private',    specializations: ['general'],                                         capacity: 60, emergency: true },
    { name: 'Ramaiah Hospitals',                  lat: 13.0199, lng: 77.5528, type: 'private',    specializations: ['cardiac', 'general'],                             capacity: 75, emergency: true },
    { name: 'KIMS Hospital Bangalore',            lat: 12.9812, lng: 77.5901, type: 'private',    specializations: ['cardiac', 'trauma', 'general'],                   capacity: 72, emergency: true },
    { name: 'Vydehi Institute of Medical Sciences',lat: 12.9752, lng: 77.7168, type: 'private',   specializations: ['general', 'trauma'],                               capacity: 70, emergency: true },
    { name: 'Rajarajeshwari Medical College',     lat: 12.8777, lng: 77.4996, type: 'private',    specializations: ['general'],                                         capacity: 65, emergency: false },
    { name: 'ESIC Hospital Indiranagar',          lat: 12.9814, lng: 77.6340, type: 'government', specializations: ['general', 'trauma'],                               capacity: 80, emergency: true },
    { name: 'District Hospital Yelahanka',        lat: 13.1002, lng: 77.5963, type: 'government', specializations: ['general'],                                         capacity: 70, emergency: true },
    { name: 'Vani Vilas Hospital',                lat: 12.9733, lng: 77.5664, type: 'government', specializations: ['general', 'paediatric'],                           capacity: 85, emergency: true },
  ].map((h, i) => ({
    ...h,
    id: i + 1,
    osmId: `fallback-${i + 1}`,
    lastFetched: Date.now(),
  }))
}
