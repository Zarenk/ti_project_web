import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SCENE_DURATION } from "./constants";
import {
  AnimatedText,
  Badge,
  MockCard,
  ProgressBar,
  Counter,
  SceneTransition,
} from "./ui-elements";

export function SceneInventory() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneTransition durationInFrames={SCENE_DURATION}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Badge delay={5} bg={COLORS.accentWarm}>Inventario</Badge>
          <AnimatedText delay={10} fontSize={36}>
            Stock en tiempo real
          </AnimatedText>
          <AnimatedText delay={18} fontSize={16} color={COLORS.textMuted} fontWeight="normal">
            Control total de productos, series y transferencias entre tiendas
          </AnimatedText>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Productos", value: 847, prefix: "", color: COLORS.primary },
            { label: "En stock", value: 12450, prefix: "", color: COLORS.accent },
            { label: "Stock bajo", value: 23, prefix: "", color: COLORS.danger },
            { label: "Tiendas", value: 4, prefix: "", color: COLORS.accentWarm },
          ].map((stat, i) => (
            <MockCard key={stat.label} delay={20 + i * 6} style={{ flex: 1, textAlign: "center" as const }}>
              <div style={{ marginBottom: 4 }}>
                <Counter from={0} to={stat.value} delay={30 + i * 6} fontSize={32} />
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{stat.label}</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  progress={stat.value === 23 ? 15 : 75 + i * 5}
                  delay={40 + i * 6}
                  color={stat.color}
                  height={4}
                />
              </div>
            </MockCard>
          ))}
        </div>

        {/* Products table */}
        <MockCard delay={45}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
              Productos con stock bajo
            </span>
            <div
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                backgroundColor: `${COLORS.danger}20`,
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.danger,
              }}
            >
              Alertas activas
            </div>
          </div>

          {/* Header */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 16px",
              fontSize: 11,
              color: COLORS.textMuted,
              textTransform: "uppercase" as const,
              letterSpacing: 1,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ flex: 2 }}>Producto</div>
            <div style={{ flex: 1 }}>SKU</div>
            <div style={{ flex: 1 }}>Stock</div>
            <div style={{ flex: 1 }}>Minimo</div>
            <div style={{ flex: 1 }}>Estado</div>
          </div>

          {[
            { name: "Toner HP 85A", sku: "TNR-HP85A", stock: 3, min: 10, critical: true },
            { name: "Papel Bond A4", sku: "PAP-A4-500", stock: 8, min: 20, critical: true },
            { name: "Mouse Logitech MX", sku: "MOU-LG-MX", stock: 12, min: 15, critical: false },
            { name: "Memoria RAM 8GB", sku: "MEM-DDR4-8", stock: 5, min: 8, critical: true },
          ].map((item, i) => {
            const rowAnim = spring({ frame: frame - (55 + i * 8), fps, config: { damping: 15 } });
            return (
              <div
                key={item.sku}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 16px",
                  alignItems: "center",
                  borderBottom: `1px solid ${COLORS.border}`,
                  opacity: rowAnim,
                  transform: `translateX(${interpolate(rowAnim, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ flex: 2, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{item.name}</div>
                <div style={{ flex: 1, fontSize: 12, color: COLORS.textMuted }}>{item.sku}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: "bold", color: item.critical ? COLORS.danger : COLORS.accentWarm }}>
                  {item.stock}
                </div>
                <div style={{ flex: 1, fontSize: 12, color: COLORS.textMuted }}>{item.min}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: item.critical ? `${COLORS.danger}20` : `${COLORS.accentWarm}20`,
                      color: item.critical ? COLORS.danger : COLORS.accentWarm,
                    }}
                  >
                    {item.critical ? "Critico" : "Bajo"}
                  </div>
                </div>
              </div>
            );
          })}
        </MockCard>
      </div>
    </SceneTransition>
  );
}
