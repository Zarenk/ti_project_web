"use client";

import { useState, useCallback } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Play, Pause, Monitor, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ProductDemo } from "./remotion/product-demo";
import {
  VIDEO_FPS,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  TOTAL_DURATION,
} from "./remotion/constants";

export default function VideoDemo() {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const playerRef = useCallback((ref: PlayerRef | null) => {
    if (!ref) return;
    ref.addEventListener("play", () => setPlaying(true));
    ref.addEventListener("pause", () => setPlaying(false));
    ref.addEventListener("ended", () => {
      setPlaying(false);
    });
  }, []);

  const handlePlayClick = () => {
    setStarted(true);
    setPlaying(true);
  };

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-12 space-y-4" animateClass="animate-fade-in-up">
          <div className="inline-flex px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
            <p className="text-sm font-medium text-primary flex items-center gap-1.5">
              <Monitor size={14} />
              Demo del producto
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance">
            Mira como funciona en 2 minutos
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Desde crear una venta hasta generar tu factura electronica SUNAT, todo conectado.
          </p>
        </ScrollReveal>

        <ScrollReveal animateClass="animate-fade-in-up" delay={0.1}>
          <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl max-w-4xl mx-auto">
            {!started ? (
              /* Thumbnail state before playing */
              <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 relative">
                {/* Mock browser chrome */}
                <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3 bg-black/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="flex-1 h-5 rounded bg-white/5 mx-8" />
                </div>

                {/* Mock dashboard preview */}
                <div className="absolute inset-0 mt-10 p-8 opacity-20">
                  <div className="flex gap-4 h-full">
                    <div className="w-16 bg-white/5 rounded-lg" />
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <div className="flex-1 h-20 bg-white/5 rounded-lg" />
                        <div className="flex-1 h-20 bg-white/5 rounded-lg" />
                        <div className="flex-1 h-20 bg-white/5 rounded-lg" />
                      </div>
                      <div className="flex-1 bg-white/5 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Play button */}
                <div className="relative z-10">
                  <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/20 animate-ping" />
                  <div className="absolute inset-0 -m-8 rounded-full border border-primary/10 animate-[ping_2s_ease-in-out_infinite]" />
                  <button
                    onClick={handlePlayClick}
                    className="relative z-10 w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer"
                    aria-label="Reproducir demo"
                  >
                    <Play size={32} className="ml-1" fill="currentColor" />
                  </button>
                </div>
                <p className="relative z-10 text-sm text-white/50 font-medium">
                  Click para ver la demo interactiva
                </p>
              </div>
            ) : (
              /* Remotion Player */
              <div className="aspect-video relative bg-slate-900">
                <Player
                  ref={playerRef}
                  component={ProductDemo}
                  durationInFrames={TOTAL_DURATION}
                  fps={VIDEO_FPS}
                  compositionWidth={VIDEO_WIDTH}
                  compositionHeight={VIDEO_HEIGHT}
                  autoPlay
                  loop
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  controls={false}
                />

                {/* Custom minimal controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition cursor-pointer"
                    >
                      {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" fill="white" />}
                    </button>
                    <span className="text-xs text-white/60 font-medium">
                      Demo interactiva — Factura Cloud
                    </span>
                  </div>
                  <button
                    onClick={() => { setStarted(false); setPlaying(false); }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition cursor-pointer"
                    title="Reiniciar"
                  >
                    <RotateCcw size={14} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8" animateClass="animate-fade-in-up" delay={0.2}>
          <Button variant="outline" size="lg" className="font-semibold cursor-pointer" asChild>
            <a href="#signup-form">
              Crear cuenta gratis
              <ArrowRight size={16} className="ml-2" />
            </a>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
