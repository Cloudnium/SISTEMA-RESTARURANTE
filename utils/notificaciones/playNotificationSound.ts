// utils/notificaciones/playNotificationSound.ts
// Beep generado con Web Audio API — no requiere ningún archivo de audio externo.
// Envuelto en try/catch porque algunos navegadores bloquean el audio si no hubo
// interacción previa del usuario; en ese caso simplemente no suena, sin romper nada.
export function playNotificationSound() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const beep = (freq: number, inicio: number, duracion: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + inicio + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracion);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);
    };

    beep(880, 0, 0.35);
    beep(1046, 0.42, 0.35);

    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* silencio si el navegador bloquea el audio */
  }
}