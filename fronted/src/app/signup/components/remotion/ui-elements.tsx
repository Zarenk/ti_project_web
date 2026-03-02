import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "./constants";

// Animated text that slides in from bottom
export function AnimatedText({
  children,
  delay = 0,
  style,
  fontSize = 32,
  color = COLORS.text,
  fontWeight = "bold" as const,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  fontSize?: number;
  color?: string;
  fontWeight?: "normal" | "bold" | "600";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const translateY = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        transform: `translateY(${translateY}px)`,
        opacity,
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Animated badge / pill
export function Badge({
  children,
  delay = 0,
  bg = COLORS.primary,
}: {
  children: React.ReactNode;
  delay?: number;
  bg?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - delay, fps, config: { damping: 12 } });

  return (
    <div
      style={{
        display: "inline-flex",
        padding: "6px 16px",
        borderRadius: 20,
        backgroundColor: bg,
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        transform: `scale(${scale})`,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

// Mock card that fades/slides in
export function MockCard({
  children,
  delay = 0,
  width = "100%",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  width?: string | number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        padding: 20,
        transform: `translateY(${translateY}px)`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Animated number counter
export function Counter({
  from = 0,
  to,
  delay = 0,
  prefix = "",
  suffix = "",
  fontSize = 48,
}: {
  from?: number;
  to: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 20, mass: 0.5 } });
  const value = Math.round(interpolate(progress, [0, 1], [from, to]));

  return (
    <span
      style={{
        fontSize,
        fontWeight: "bold",
        color: COLORS.text,
        fontFamily: "system-ui, sans-serif",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

// Animated progress bar
export function ProgressBar({
  progress: targetProgress,
  delay = 0,
  color = COLORS.accent,
  height = 8,
}: {
  progress: number;
  delay?: number;
  color?: string;
  height?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const anim = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const width = interpolate(anim, [0, 1], [0, targetProgress]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: height / 2,
        backgroundColor: COLORS.bgCardLight,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

// Mock table row that slides in
export function TableRow({
  cells,
  delay = 0,
  highlight = false,
}: {
  cells: string[];
  delay?: number;
  highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const translateX = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 16px",
        borderRadius: 8,
        backgroundColor: highlight ? `${COLORS.primary}15` : "transparent",
        borderBottom: `1px solid ${COLORS.border}`,
        transform: `translateX(${translateX}px)`,
        opacity,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            fontSize: 13,
            color: i === 0 ? COLORS.text : COLORS.textMuted,
            fontWeight: i === 0 ? 600 : 400,
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

// Scene transition wrapper with fade
export function SceneTransition({
  children,
  durationInFrames,
  style,
}: {
  children: React.ReactNode;
  durationInFrames: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: Math.min(fadeIn, fadeOut),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a2e 50%, ${COLORS.bg} 100%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
