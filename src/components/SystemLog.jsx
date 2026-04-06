import React, { useRef, useEffect } from 'react'
import { useApp } from '../AppContext'

export default function SystemLog() {
  const { state } = useApp()
  const { logs } = state
  const ref = useRef(null)

  return (
    <div>
      <div className="panel-title">◈ SYSTEM LOG</div>
      <div ref={ref} style={{ maxHeight: 120, overflowY: 'auto' }}>
        {logs.length === 0 && (
          <div className="log-line">System initialized.</div>
        )}
        {logs.map((l, i) => (
          <div key={i} className={`log-line ${l.type}`}>
            [{l.ts}] {l.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
