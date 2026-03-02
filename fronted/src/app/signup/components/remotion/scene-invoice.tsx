import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SCENE_DURATION } from "./constants";
import {
  AnimatedText,
  Badge,
  MockCard,
  ProgressBar,
  SceneTransition,
} from "./ui-elements";

export function SceneInvoice() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progress animation for SUNAT
  const sunatProgress = spring({ frame: frame - 70, fps, config: { damping: 30, mass: 1 } });
  const sunatDone = frame > 100;

  return (
    <SceneTransition durationInFrames={SCENE_DURATION}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Badge delay={5} bg="#7c3aed">SUNAT</Badge>
          <AnimatedText delay={10} fontSize={36}>
            Factura electronica al instante
          </AnimatedText>
          <AnimatedText delay={18} fontSize={16} color={COLORS.textMuted} fontWeight="normal">
            Genera comprobantes y envialos a SUNAT automaticamente
          </AnimatedText>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {/* Invoice preview */}
          <MockCard delay={25} width="55%">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: COLORS.text }}>FACTURA</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>F001-00042</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>RUC: 20600123456</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>Mi Empresa SAC</div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 16 }} />

            {/* Client */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>CLIENTE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>TechSolutions Peru SAC</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>RUC: 20512345678</div>
            </div>

            {/* Items */}
            {["Laptop HP ProBook 450 x2", "Mouse Logitech MX x5", "Cable HDMI 2m x10"].map((item, i) => {
              const itemAnim = spring({ frame: frame - (35 + i * 6), fps, config: { damping: 15 } });
              return (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: 13,
                    color: COLORS.text,
                    opacity: itemAnim,
                    transform: `translateX(${interpolate(itemAnim, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <span>{item}</span>
                  <span style={{ color: COLORS.textMuted }}>
                    S/. {["7,000", "1,250", "450"][i]}
                  </span>
                </div>
              );
            })}

            {/* Totals */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>Subtotal: S/. 7,373.00</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>IGV 18%: S/. 1,327.00</div>
              <div style={{ fontSize: 18, fontWeight: "bold", color: COLORS.accent }}>Total: S/. 8,700.00</div>
            </div>
          </MockCard>

          {/* SUNAT status */}
          <div style={{ width: "45%", display: "flex", flexDirection: "column", gap: 16 }}>
            <MockCard delay={40}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>
                Envio a SUNAT
              </div>
              <ProgressBar progress={sunatDone ? 100 : 0} delay={70} color="#7c3aed" height={6} />
              <div style={{ marginTop: 8, fontSize: 12, color: sunatDone ? COLORS.success : COLORS.textMuted }}>
                {sunatDone ? "Aceptada por SUNAT" : "Enviando..."}
              </div>
            </MockCard>

            <MockCard delay={50}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
                Comprobantes hoy
              </div>
              {[
                { type: "Facturas", count: "12", color: COLORS.primary },
                { type: "Boletas", count: "28", color: COLORS.accent },
                { type: "NC/ND", count: "3", color: COLORS.accentWarm },
              ].map((item, i) => {
                const barAnim = spring({ frame: frame - (60 + i * 8), fps, config: { damping: 14 } });
                return (
                  <div key={item.type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                    <span style={{ fontSize: 13, color: COLORS.textMuted, flex: 1 }}>{item.type}</span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: COLORS.text,
                        opacity: barAnim,
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </MockCard>

            {/* Success checkmark */}
            {sunatDone && (() => {
              const checkAnim = spring({ frame: frame - 105, fps, config: { damping: 10 } });
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 10,
                    backgroundColor: `${COLORS.success}15`,
                    border: `1px solid ${COLORS.success}40`,
                    transform: `scale(${interpolate(checkAnim, [0, 1], [0.8, 1])})`,
                    opacity: checkAnim,
                  }}
                >
                  <span style={{ fontSize: 18, color: COLORS.success }}>&#10003;</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.success }}>
                    Factura enviada exitosamente
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </SceneTransition>
  );
}
