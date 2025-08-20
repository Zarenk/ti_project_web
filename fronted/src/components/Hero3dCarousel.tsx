"use client";

import Image from "next/image";

interface Brand {
  name: string;
  logoSvg?: string;
  logoPng?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  brand: Brand | null;
  category: string;
  images: string[];
  stock: number | null;
}

interface Hero3DCarouselProps {
  products: Product[];
}

export default function Hero3DCarousel({ products }: Hero3DCarouselProps) {
  const images = (products || []).map((p) => p.images?.[0]).filter(Boolean);

  if (images.length === 0) {
    images.push("/placeholder.svg?height=720&width=405&text=Hero+Image");
  }

  const itemCount = images.length;
  const radius = 300; // distance from center for 3D effect

  return (
    <div className="relative w-56 md:w-64 aspect-[9/16] mx-auto [perspective:1000px]">
      <div
        className="absolute inset-0 [transform-style:preserve-3d] animate-[spin_20s_linear_infinite]"
        style={{ '--item-count': itemCount } as any}
      >
        {images.map((src, idx) => (
          <div
            key={idx}
            className="absolute inset-0"
            style={{
              transform: `rotateY(${(idx * 360) / itemCount}deg) translateZ(${radius}px)`,
            }}
          >
            <Image
              src={src as string}
              alt={`Hero image ${idx + 1}`}
              fill
              sizes="(min-width: 768px) 256px, 224px"
              className="object-cover rounded-xl"
              priority={idx === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}