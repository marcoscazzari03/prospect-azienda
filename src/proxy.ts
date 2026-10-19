import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/url";
import { buildCsp } from "@/lib/csp";

// Rinnova la sessione Supabase, protegge le aree riservate e applica la CSP
// con nonce (nuovo a ogni richiesta) alle pagine dinamiche.
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  let response = next();
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/app") || path.startsWith("/admin"))) {
    const login = request.nextUrl.clone();
    login.pathname = "/accedi";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  // Verifica in due passaggi attiva ma non ancora fatta in questa sessione: prima il codice.
  if (user && (path.startsWith("/app") || path.startsWith("/admin"))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const verify = request.nextUrl.clone();
      verify.pathname = "/accedi/verifica";
      verify.search = `?next=${encodeURIComponent(path)}`;
      return NextResponse.redirect(verify);
    }
  }
  // Area admin: secondo controllo prima di qualsiasi rendering (le pagine
  // verificano comunque da sole con requireAdmin).
  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      const app = request.nextUrl.clone();
      app.pathname = "/app";
      app.search = "";
      return NextResponse.redirect(app);
    }
  }
  // Chi è già dentro e clicca "Accedi" dal sito torna direttamente all'app.
  if (user && (path === "/accedi" || path === "/registrati")) {
    const app = request.nextUrl.clone();
    app.pathname = "/app";
    app.search = "";
    return NextResponse.redirect(app);
  }
  return response;
}

// Allineato a NONCE_PREFIXES in src/lib/csp.ts.
export const config = {
  matcher: ["/(app|admin|accedi|registrati|recupera-password|nuova-password|opposizione)/:path*"],
};
