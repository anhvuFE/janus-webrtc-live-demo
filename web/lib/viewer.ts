// A stable-ish per-tab viewer identity used to stamp the forensic watermark,
// so a leaked screen-capture is traceable to a session. Demo only — a real
// deployment would use the authenticated user id.

export function viewerTag(): string {
  if (typeof window === "undefined") return "viewer";
  try {
    const KEY = "viewer-tag";
    let tag = sessionStorage.getItem(KEY);
    if (!tag) {
      tag = `viewer-${Math.floor(1000 + Math.random() * 9000)}`;
      sessionStorage.setItem(KEY, tag);
    }
    return tag;
  } catch {
    return "viewer";
  }
}
