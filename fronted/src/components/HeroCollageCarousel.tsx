"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

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

interface HeroCollageCarouselProps {
  products: Product[];
}

export default function HeroCollageCarousel({ products }: HeroCollageCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const items = (products || []).filter((p) => p.images?.[0]);

  if (items.length === 0) {
    items.push({
      id: 0,
      name: "Placeholder",
      description: "",
      price: 0,
      brand: null,
      category: "",
      images: ["/placeholder.svg?height=256&width=256&text=Hero+Image"],
      stock: null,
    });
  }

  const positions = [
    "top-0 left-0 rotate-[-3deg]",
    "top-4 right-0 rotate-[4deg]",
    "bottom-0 left-4 rotate-[2deg]",
    "bottom-4 right-4 rotate-[-2deg]",
  ];

  return (
    <div className="relative grid place-items-center w-56 md:w-64 aspect-square mx-auto">
      {items.map((product, idx) => (
        <motion.div
          key={idx}
          className={`absolute w-32 h-32 md:w-40 md:h-40 cursor-pointer rounded-lg overflow-hidden ${positions[idx % positions.length]}`}
          animate={{ scale: selectedIndex === idx ? 1.05 : 1, zIndex: selectedIndex === idx ? 10 : idx }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          onClick={() => setSelectedIndex(idx)}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 160px, 128px"
            className="object-cover rounded-lg"
            priority={idx === 0}
          />
          {selectedIndex === idx && (
            <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center text-center">
              <span className="text-sm md:text-base">{product.name}</span>
              <span className="text-xs md:text-sm">${product.price}</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}