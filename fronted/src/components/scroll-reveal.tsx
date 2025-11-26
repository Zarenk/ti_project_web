"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  animateClass?: string;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  animateClass = "animate-fade-in-up",
  once = true,
  threshold = 0.2,
  rootMargin = "0px",
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof window === "undefined" || isVisible) return;

    const element = ref.current;
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once && element) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin, isVisible]);

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      className={clsx(className, isVisible && animateClass)}
    >
      {children}
    </div>
  );
}
