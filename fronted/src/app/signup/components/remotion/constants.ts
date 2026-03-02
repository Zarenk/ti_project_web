// Video composition settings
export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;

// Duration in frames (30fps)
export const SCENE_DURATION = 150; // 5 seconds per scene
export const TRANSITION_DURATION = 20; // ~0.66s overlap

// Total: 4 scenes * 5s = 20s, minus overlaps
export const TOTAL_DURATION = SCENE_DURATION * 4 - TRANSITION_DURATION * 3;

// Colors (matching the app primary theme)
export const COLORS = {
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  primaryDark: "#1d4ed8",
  bg: "#0f172a",
  bgCard: "#1e293b",
  bgCardLight: "#334155",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  accent: "#10b981",
  accentWarm: "#f59e0b",
  border: "#334155",
  success: "#22c55e",
  danger: "#ef4444",
};
