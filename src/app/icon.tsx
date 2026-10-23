import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo";
import { BRAND_KEY } from "@/lib/config";

// Icona del browser: lo stesso simbolo del logo, per il marchio scelto (BRAND_KEY in src/lib/config.ts).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Avvisto: il simbolo non ha sfondo, quindi su un quadrato chiaro (si vede anche sulle schede scure del browser).
export default function Icon() {
  const mark = <LogoMark className="" size={BRAND_KEY === "avvisto" ? 52 : 64} />;
  return new ImageResponse(
    BRAND_KEY === "avvisto"
      ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#eeefff", borderRadius: 14 }}>{mark}</div>
      : mark,
    { ...size },
  );
}
