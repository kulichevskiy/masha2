import { unified } from "unified"
import rehypeParse from "rehype-parse"
import rehypeSanitize from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import { selectAll, select } from "hast-util-select"
import type { Element, Root, RootContent } from "hast"

// Allow only the semantic tags the legal docs actually need.
// Strip every attribute except href on links, opening cleanly into our own typography.
const sanitizeSchema = {
  tagNames: ["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "br", "hr"],
  attributes: {
    a: ["href"],
  },
  protocols: {
    href: ["http", "https", "mailto", "tel"],
  },
  strip: ["script", "style"],
  clobber: [],
}

export type LegalDoc =
  | { ok: true; html: string }
  | { ok: false; reason: "fetch-failed" | "not-published" | "empty" }

function buildPubUrl(pubId: string): string {
  // Google Docs "Publish to web" generates a separate `2PACX-...` id distinct
  // from the doc's edit id; the published HTML lives at /document/d/e/{id}/pub.
  return `https://docs.google.com/document/d/e/${pubId}/pub`
}

function unwrapGoogleRedirect(href: string): string {
  try {
    const u = new URL(href)
    if (u.hostname === "www.google.com" && u.pathname === "/url") {
      const q = u.searchParams.get("q")
      if (q) return q
    }
  } catch {
    // not a parseable URL — leave it alone
  }
  return href
}

function collectText(node: RootContent | Root): string {
  if (node.type === "text") return node.value
  if ("children" in node) {
    return (node.children as RootContent[]).map(collectText).join("")
  }
  return ""
}

export async function fetchLegalDoc(pubId: string): Promise<LegalDoc> {
  const url = buildPubUrl(pubId)

  let html: string
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { ok: false, reason: "fetch-failed" }
    html = await res.text()
  } catch {
    return { ok: false, reason: "fetch-failed" }
  }

  // Unpublished docs redirect to a viewer/login page that doesn't contain
  // `.doc-content`. Detect explicitly so we can show the right fallback.
  if (!html.includes("doc-content")) {
    return { ok: false, reason: "not-published" }
  }

  const tree = unified().use(rehypeParse, { fragment: false }).parse(html) as Root
  const docContent = select(".doc-content", tree) as Element | null
  if (!docContent) return { ok: false, reason: "not-published" }

  // Drop the first <h1> (Google Docs title) — we render our own page title.
  const firstH1Index = docContent.children.findIndex(
    (n): n is Element => n.type === "element" && n.tagName === "h1",
  )
  if (firstH1Index !== -1) {
    docContent.children.splice(firstH1Index, 1)
  }

  // Convert visually-empty <p> nodes (Google adds them as spacers) to <br>.
  const paragraphs = selectAll("p", docContent) as Element[]
  for (const p of paragraphs) {
    if (collectText(p).trim() === "") {
      p.tagName = "br"
      p.children = []
      p.properties = {}
    }
  }

  // Unwrap Google's `google.com/url?q=...` redirect on every link so href
  // points at the actual destination (and tracking params drop off).
  const links = selectAll("a", docContent) as Element[]
  for (const a of links) {
    const href = a.properties?.href
    if (typeof href === "string") {
      const unwrapped = unwrapGoogleRedirect(href)
      if (unwrapped !== href) a.properties.href = unwrapped
    }
  }

  // Stringify the inner doc body, then re-parse as fragment with sanitize applied
  // — this strips every Google class, inline style, and span wrapper in one pass.
  const innerHtml = unified()
    .use(rehypeStringify)
    .stringify({ type: "root", children: docContent.children } as Root)

  const sanitized = String(
    await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeStringify)
      .process(innerHtml),
  )

  if (sanitized.trim() === "") return { ok: false, reason: "empty" }

  return { ok: true, html: sanitized }
}

// Pub IDs from File → Share → Publish to web → Link in each Google Doc.
// These differ from the doc's edit id; they only exist while the doc is published.
export const LEGAL_DOC_IDS = {
  impressum:
    "2PACX-1vQKqDbG_MkxYkscSf9jpcbVmiK65ok4xYEHAhaTLVc1WdEPetl8e-hj0yWzLgJYu6gCqwZfCegjUFH5",
  datenschutz:
    "2PACX-1vRWv1pS6wTpmwH4wq9OhxfQFqXkYf5JaKWla-Z5otQvKN-jw3IIPbXMbRUuqf4W2LZIviROwWRVxvyh",
} as const
