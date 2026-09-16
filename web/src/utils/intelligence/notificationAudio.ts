/**
 * Web Audio API synthesizer for ARC VISION Security Alert Notifications.
 * Generates a subtle, soft dual-tone chime without external audio assets.
 */

const playedIncidentIds = new Set<string>();
let isMuted = false;

// Initialize mute state from localStorage if present
if (typeof window !== "undefined") {
  isMuted = localStorage.getItem("arc_vision_alert_muted") === "true";
}

export function setAlertAudioMuted(muted: boolean): void {
  isMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("arc_vision_alert_muted", String(muted));
  }
}

export function isAlertAudioMuted(): boolean {
  return isMuted;
}

export function playAlertNotificationSound(incidentId: string, priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"): void {
  if (isMuted) return;
  if (priority !== "CRITICAL" && priority !== "HIGH") return;
  if (playedIncidentIds.has(incidentId)) return;

  playedIncidentIds.add(incidentId);

  // Keep set memory bounded
  if (playedIncidentIds.size > 200) {
    const firstKey = playedIncidentIds.values().next().value;
    if (firstKey) playedIncidentIds.delete(firstKey);
  }

  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Frequency & Gain nodes
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Frequencies: High alert dual tone (880Hz / 1320Hz - A5/E6)
    const baseFreq = priority === "CRITICAL" ? 880 : 660;
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08);

    // Smooth envelope gain decay
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);

    // Clean up AudioContext
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch (err) {
    // Graceful fallback if Web Audio API is restricted by browser autoplay policies
  }
}
