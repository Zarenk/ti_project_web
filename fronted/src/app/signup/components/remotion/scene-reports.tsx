import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SCENE_DURATION } from "./constants";
import {
  AnimatedText,
  Badge,
  MockCard,
  Counter,
  SceneTransition,
} from "./ui-elements";

// Animated bar chart
function BarChart({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = [
    { label: "Ene", value: 65, color: COLORS.primary },
    { label: "Feb", value: 78, color: COLORS.primary },
    { label: "Mar", value: 52, color: COLORS.primary },
    { label: "Abr", value: 89, color: COLORS.primaryLight },
    { label: "May", value: 95, color: COLORS.primaryLight },
    { label: "Jun", value: 72, color: COLORS.primary },
    { label: "Jul", value: 110, color: COLORS.accent },
  ];

  const maxValue = Math.max(...bars.map((b) => b.value));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, paddingTop: 10 }}>
      {bars.map((bar, i) => {
        const barAnim = spring({
          frame: frame - (delay + i * 5),
          fps,
          config: { damping: 12 },
        });
        const barHeight = interpolate(barAnim, [0, 1], [0, (bar.value / maxValue) * 120]);

        return (
          <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 6 }}>
            <div
              style={{
                width: "100%",
                height: barHeight,
                borderRadius: "6px 6px 0 0",
                backgroundColor: bar.color,
                minHeight: 2,
              }}
            />
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Donut chart
function DonutChart({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 20, mass: 0.8 } });
  const circumference = 2 * Math.PI * 45;

  const segments = [
    { pct: 45, color: COLORS.primary },
    { pct: 25, color: COLORS.accent },
    { pct: 18, color: COLORS.accentWarm },
    { pct: 12, color: "#7c3aed" },
  ];

  let accumulated = 0;

  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      {segments.map((seg, i) => {
        const dashLength = (seg.pct / 100) * circumference * progress;
        const offset = -(accumulated / 100) * circumference * progress;
        accumulated += seg.pct;

        return (
          <circle
            key={i}
            cx={60}
            cy={60}
            r={45}
            fill="none"
            stroke={seg.color}
            strokeWidth={16}
            strokeDasharray={`${dashLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text x={60} y={56} textAnchor="middle" fill={COLORS.text} fontSize={20} fontWeight="bold" fontFamily="system-ui">
        {Math.round(interpolate(progress, [0, 1], [0, 100]))}%
      </text>
      <text x={60} y={72} textAnchor="middle" fill={COLORS.textMuted} fontSize={10} fontFamily="system-ui">
        del mes
      </text>
    </svg>
  );
}

export function SceneReports() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneTransition durationInFrames={SCENE_DURATION}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Badge delay={5} bg={COLORS.primary}>Reportes</Badge>
          <AnimatedText delay={10} fontSize={36}>
            Decisiones basadas en datos
          </AnimatedText>
          <AnimatedText delay={18} fontSize={16} color={COLORS.textMuted} fontWeight="normal">
            +25 reportes descargables, KPIs en tiempo real y dashboard ejecutivo
          </AnimatedText>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Ventas del mes", value: 45280, prefix: "S/. ", suffix: "", color: COLORS.accent },
            { label: "Margen promedio", value: 32, prefix: "", suffix: "%", color: COLORS.primary },
            { label: "Clientes nuevos", value: 18, prefix: "+", suffix: "", color: "#7c3aed" },
          ].map((kpi, i) => (
            <MockCard key={kpi.label} delay={20 + i * 6} style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>{kpi.label}</div>
              <Counter from={0} to={kpi.value} delay={28 + i * 6} prefix={kpi.prefix} suffix={kpi.suffix} fontSize={36} />
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>+12%</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>vs mes anterior</span>
              </div>
            </MockCard>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: "flex", gap: 20 }}>
          <MockCard delay={45} width="65%">
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>
              Ventas por mes (miles S/.)
            </div>
            <BarChart delay={55} />
          </MockCard>

          <MockCard delay={50} width="35%" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
              Meta mensual
            </div>
            <DonutChart delay={60} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              {[
                { label: "Facturas", color: COLORS.primary },
                { label: "Boletas", color: COLORS.accent },
                { label: "NC/ND", color: COLORS.accentWarm },
                { label: "Otros", color: "#7c3aed" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                  <span style={{ color: COLORS.textMuted }}>{item.label}</span>
                </div>
              ))}
            </div>
          </MockCard>
        </div>
      </div>
    </SceneTransition>
  );
}
