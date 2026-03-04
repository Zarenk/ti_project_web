import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

/**
 * Resolves a raw logo path to a full URL, or null if no logo is available.
 */
export function resolveLogoSrc(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^\/+/, "");
  if (BACKEND_BASE_URL) return `${BACKEND_BASE_URL}/${normalized}`;
  return `/${normalized}`;
}

/**
 * Renders the company logo if available, otherwise a generic document
 * placeholder icon using @react-pdf/renderer primitives.
 */
export function CompanyLogo({
  src,
  size = 80,
}: {
  src: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <Image src={src} style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }

  // Generic document icon placeholder
  const iconSize = size;
  const pageW = iconSize * 0.55;
  const pageH = iconSize * 0.7;
  const lineH = 2;
  const lineGap = 5;
  const cornerSize = iconSize * 0.15;

  return (
    <View
      style={{
        width: iconSize,
        height: iconSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Document body */}
      <View
        style={{
          width: pageW,
          height: pageH,
          backgroundColor: "#E5E7EB",
          borderRadius: 3,
          borderWidth: 1,
          borderColor: "#9CA3AF",
          padding: 6,
          paddingTop: cornerSize + 4,
          position: "relative",
        }}
      >
        {/* Folded corner */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: cornerSize,
            height: cornerSize,
            backgroundColor: "#D1D5DB",
            borderBottomLeftRadius: 2,
          }}
        />
        {/* Text lines */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: i === 2 ? "60%" : "90%",
              height: lineH,
              backgroundColor: "#9CA3AF",
              borderRadius: 1,
              marginBottom: lineGap,
            }}
          />
        ))}
      </View>
    </View>
  );
}
