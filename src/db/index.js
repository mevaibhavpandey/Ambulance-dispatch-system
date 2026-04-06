import Dexie from 'dexie'

export const db = new Dexie('AmbuAIDB')

db.version(1).stores({
  hospitals: '++id, name, lat, lng, type, *specializations, capacity, lastFetched',
  emergencies: '++id, type, severity, lat, lng, timestamp, status',
  ambulances: '++id, lat, lng, type, available',
  settings: 'key',
})

// Ambulance types
export const AmbulanceType = {
  ICU: 'ICU',
  BASIC: 'BASIC',
  NEONATAL: 'NEONATAL',
}

// Seed ambulance fleet around Bengaluru
export async function seedAmbulances(centerLat, centerLng) {
  const count = await db.ambulances.count()
  if (count > 0) return

  const fleet = []
  const offsets = [
    [0.012, 0.008], [-0.01, 0.015], [0.018, -0.012],
    [-0.015, -0.009], [0.005, 0.02], [-0.02, 0.005],
    [0.022, 0.014], [-0.008, -0.018], [0.014, -0.02],
  ]
  const types = [AmbulanceType.ICU, AmbulanceType.ICU, AmbulanceType.BASIC, AmbulanceType.BASIC, AmbulanceType.BASIC, AmbulanceType.NEONATAL, AmbulanceType.ICU, AmbulanceType.BASIC, AmbulanceType.BASIC]

  offsets.forEach(([dlat, dlng], i) => {
    fleet.push({
      lat: centerLat + dlat,
      lng: centerLng + dlng,
      type: types[i],
      available: true,
      driverId: `DRV-${String(i + 1).padStart(3, '0')}`,
      vehicleId: `BLR-AMB-${String(i + 1).padStart(2, '0')}`,
    })
  })

  await db.ambulances.bulkAdd(fleet)
}
