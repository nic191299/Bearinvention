export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sid = localStorage.getItem("bear_session");
  if (!sid) {
    sid = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("bear_session", sid);
  }
  return sid;
}
