// Sound stub — beep using Web Audio API
let ctx = null
let gainNode = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function startBuzzer() {
  try {
    const c = getCtx()
    gainNode = c.createGain()
    gainNode.gain.value = 0.1
    gainNode.connect(c.destination)
    const osc = c.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 880
    osc.connect(gainNode)
    osc.start()
    gainNode._osc = osc
  } catch {}
}

export function stopBuzzer() {
  try {
    if (gainNode?._osc) { gainNode._osc.stop(); gainNode.disconnect() }
    gainNode = null
  } catch {}
}
