import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo";

// Icona del browser: lo stesso simbolo del logo, su un quadrato chiaro (si vede anche sulle schede scure del browser).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f0fe", borderRadius: 14 }}>
      <LogoMark className="" size={54} />
    </div>,
    { ...size },
  );
}
