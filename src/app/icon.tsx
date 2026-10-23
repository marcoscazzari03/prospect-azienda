import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo";

// Icona del browser: lo stesso simbolo del logo, per il marchio scelto (BRAND_KEY in src/lib/config.ts).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<LogoMark className="" size={64} />, { ...size });
}
