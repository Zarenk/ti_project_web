import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SCENE_DURATION } from "./constants";
import {
  AnimatedText,
  Badge,
  MockCard,
  TableRow,
  SceneTransition,
} from "./ui-elements";

export function SceneSales() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated "total" that appears
  const totalAnim = spring({ frame: frame - 60, fps, config: { damping: 14 } });
  const totalValue = Math.round(interpolate(totalAnim, [0, 1], [0, 1250]));

  return (
    <SceneTransition durationInFrames={SCENE_DURATION}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Badge delay={5} bg={COLORS.accent}>Ventas</Badge>
            <AnimatedText delay={10} fontSize={36}>
              Crea una venta en segundos
            </AnimatedText>
          </div>
        </div>

        {/* Mock sales form */}
        <div style={{ display: "flex", gap: 20 }}>
          {/* Left: Product list */}
          <MockCard delay={20} width="60%">
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                Productos seleccionados
              </span>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>3 items</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <TableRow delay={30} cells={["Laptop HP ProBook 450", "2", "S/. 3,500.00"]} highlight />
              <TableRow delay={38} cells={["Mouse Logitech MX", "5", "S/. 250.00"]} />
              <TableRow delay={46} cells={["Cable HDMI 2m", "10", "S/. 45.00"]} />
            </div>

            {/* Total */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: `1px solid ${COLORS.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>Total (inc. IGV 18%)</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: COLORS.accent,
                  fontVariantNumeric: "tabular-nums",
                  opacity: totalAnim,
                }}
              >
                S/. {totalValue.toLocaleString()}.00
              </span>
            </div>
          </MockCard>

          {/* Right: Payment */}
          <MockCard delay={35} width="40%">
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 16, display: "block" }}>
              Metodo de pago
            </span>

            {/* Payment methods */}
            {["Efectivo", "Tarjeta", "Yape / Plin"].map((method, i) => {
              const selected = i === 0;
              const methodAnim = spring({ frame: frame - (45 + i * 8), fps, config: { damping: 14 } });
              return (
                <div
                  key={method}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    marginBottom: 8,
                    borderRadius: 10,
                    border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
                    backgroundColor: selected ? `${COLORS.primary}15` : "transparent",
                    opacity: methodAnim,
                    transform: `translateY(${interpolate(methodAnim, [0, 1], [15, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: COLORS.text }}>{method}</span>
                </div>
              );
            })}

            {/* Submit button animation */}
            {(() => {
              const btnAnim = spring({ frame: frame - 80, fps, config: { damping: 12 } });
              return (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 20px",
                    borderRadius: 12,
                    backgroundColor: COLORS.primary,
                    textAlign: "center" as const,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    transform: `scale(${interpolate(btnAnim, [0, 1], [0.9, 1])})`,
                    opacity: btnAnim,
                  }}
                >
                  Registrar Venta
                </div>
              );
            })()}
          </MockCard>
        </div>
      </div>
    </SceneTransition>
  );
}
