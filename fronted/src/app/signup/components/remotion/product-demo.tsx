import React from "react";
import { Sequence, AbsoluteFill } from "remotion";
import { SCENE_DURATION, TRANSITION_DURATION, COLORS } from "./constants";
import { SceneSales } from "./scene-sales";
import { SceneInvoice } from "./scene-invoice";
import { SceneInventory } from "./scene-inventory";
import { SceneReports } from "./scene-reports";

export function ProductDemo() {
  const scenes = [
    { id: "sales", Component: SceneSales },
    { id: "invoice", Component: SceneInvoice },
    { id: "inventory", Component: SceneInventory },
    { id: "reports", Component: SceneReports },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {scenes.map((scene, i) => {
        const startFrame = i * (SCENE_DURATION - TRANSITION_DURATION);
        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={SCENE_DURATION}
            name={scene.id}
          >
            <scene.Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
