"use client";

import { useCallback } from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadFull } from "tsparticles";

export default function SectionBackground() {
  const init = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0 -z-10 pointer-events-none"
      init={init}
      options={{
        fullScreen: false,
        fpsLimit: 60,
        interactivity: {
          events: {
            onHover: { enable: false },
            onClick: { enable: false },
            resize: true,
          },
        },
        particles: {
          number: {
            value: 25,
            density: { enable: false },
          },
          color: {
            value: ["#bae6fd", "#7dd3fc", "#38bdf8"],
          },
          shape: { type: "circle" },
          opacity: { value: 0.5 },
          size: { value: { min: 1, max: 3 } },
          move: {
            enable: true,
            speed: 1,
            outModes: {
              default: "bounce",
            },
          },
          collisions: { enable: true },
          shadow: {
            enable: true,
            color: "#38bdf8",
            blur: 3,
          },
          links: { enable: false },
        },
        detectRetina: true,
      }}
    />
  );
}