import React from 'react'
import { useApp } from '../AppContext'

const SPEEDS = [
  { value: 1,  label: '1×',  hint: 'Real-time' },
  { value: 5,  label: '5×',  hint: 'Fast' },
  { value: 10, label: '10×', hint: 'Default' },
  { value: 50, label: '50×', hint: 'Turbo' },
]

export default function SpeedControl() {
  const { state, set } = useApp()
  const { speedMultiplier } = state

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(200,0,24,0.15)',
      borderRadius: 8,
      padding: '10px 12px',
    }}>
      <div style={{
        fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10,
        color: '#cc0018', letterSpacing: 2, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>⚡</span> SIMULATION SPEED
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {SPEEDS.map(s => {
          const active = speedMultiplier === s.value
          return (
            <button
              key={s.value}
              onClick={() => set({ speedMultiplier: s.value })}
              title={s.hint}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 6,
                border: `1.5px solid ${active ? '#cc0018' : 'rgba(200,0,24,0.2)'}`,
                background: active
                  ? 'linear-gradient(135deg, #cc0018, #990012)'
                  : 'white',
                color: active ? 'white' : '#cc0018',
                fontFamily: 'Rajdhani',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active ? '0 2px 8px rgba(204,0,24,0.3)' : 'none',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 6, fontFamily: 'Share Tech Mono', fontSize: 9, color: '#8a6068', textAlign: 'center' }}>
        Ambulance animation speed · Currently&nbsp;
        <span style={{ color: '#cc0018', fontWeight: 700 }}>
          {SPEEDS.find(s => s.value === speedMultiplier)?.hint ?? `${speedMultiplier}×`}
        </span>
      </div>
    </div>
  )
}
