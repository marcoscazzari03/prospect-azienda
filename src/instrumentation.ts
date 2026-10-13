import type { Instrumentation } from "next";

// Errori del server (pagine, route, server action, proxy) -> monitoraggio.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  const { reportError } = await import("@/lib/server/monitoring");
  await reportError(context.routeType, err, `${request.method} ${context.routePath}`, digest);
};
