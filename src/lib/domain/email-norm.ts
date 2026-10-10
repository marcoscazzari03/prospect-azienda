// Stessa regola di public.normalize_email in SQL: nome+tag@dominio = nome@dominio;
// per Gmail i punti non contano e googlemail.com = gmail.com.
export function normalizeEmail(email: string) {
  const [rawLocal = "", rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain.replace("googlemail.com", "gmail.com");
  let local = rawLocal.split("+")[0];
  if (domain === "gmail.com") local = local.replaceAll(".", "");
  return `${local}@${domain}`;
}
