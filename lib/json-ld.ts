// Serialize an object for embedding in an inline <script type="application/ld+json">.
// JSON.stringify does NOT escape "<", so a user-controlled field (a listing
// title/description) containing "</script>" would break out of the script
// element — a stored XSS hole. Escaping "<" to its unicode form keeps the JSON
// valid while making "</script>", "<!--", etc. inert. U+2028/U+2029 are also
// escaped: they're valid in JSON but are line terminators in a script context.
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}
