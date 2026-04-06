import React from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../AppContext'

const phaseLabels = {
  enroute_patient: 'En route to patient',
  pickup: 'Loading patient',
  enroute_hospital: 'Transporting to hospital',
  delivered: 'Patient delivered',
}

export default function AmbulanceStatus() {
  const { state } = useApp()
  const { selectedAmbulance, sosPhase, ambPhase, leg1Route, leg2Route, selectedHospital } = state

  if (sosPhase === 'idle') {
    return (
      <div>
        <div className="panel-title">◈ AMBULANCE STATUS</div>
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          No active dispatch.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel-title">◈ AMBULANCE STATUS</div>

      {selectedAmbulance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-3 p-2 rounded"
          style={{ border: '0.5px solid var(--red)', background: 'rgba(255,34,51,0.08)' }}
        >
          <div className="font-bold text-sm" style={{ color: 'var(--red)' }}>
            {selectedAmbulance.vehicleId}
          </div>
          <div className="font-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {selectedAmbulance.type} Unit · {selectedAmbulance.driverId}
          </div>
        </motion.div>
      )}

      <div className="font-mono mb-1" style={{ fontSize: 10, color: 'var(--cyan)' }}>
        STATUS: {phaseLabels[ambPhase] || 'Dispatched'}
      </div>

      {leg1Route && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Leg 1: {leg1Route.distanceKm} km · ~{leg1Route.etaMin} min (to patient)
        </div>
      )}
      {leg2Route && selectedHospital && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Leg 2: {leg2Route.distanceKm} km · ~{leg2Route.etaMin} min → {selectedHospital.name}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 rounded" style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="rounded"
          style={{ height: '100%', background: 'var(--cyan)' }}
          animate={{
            width: ambPhase === 'enroute_patient' ? '30%'
              : ambPhase === 'pickup' ? '50%'
              : ambPhase === 'enroute_hospital' ? '80%'
              : '100%'
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex justify-between font-mono mt-1" style={{ fontSize: 9, color: 'var(--text-dim)' }}>
        <span>DISPATCH</span><span>PICKUP</span><span>HOSPITAL</span>
      </div>
    </div>
  )
}
