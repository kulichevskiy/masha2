// Renders HTML produced by the Tiptap editor in tier-row. Authors are limited
// to the admin allowlist, and the Tiptap Link extension validates URL schemes,
// so we render the HTML as-is. If we ever open authoring to untrusted users,
// add a sanitizer (e.g. isomorphic-dompurify) here.
//
// Bullet-list marker is swapped for an em-dash via ::before to match the brand's
// typography (long dashes everywhere, no generic disc bullets).
export function RichText({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={
        'leading-relaxed ' +
        '[&_p]:m-0 [&_p+p]:mt-3 ' +
        '[&_ul]:list-none [&_ul]:pl-0 [&_ul]:mt-2 [&_ul]:space-y-1 ' +
        '[&_ul>li]:relative [&_ul>li]:pl-6 ' +
        "[&_ul>li]:before:content-['—'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-gray-400 " +
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mt-2 [&_ol]:space-y-1 ' +
        '[&_p+ul]:mt-3 [&_p+ol]:mt-3 [&_ul+p]:mt-4 [&_ol+p]:mt-4 ' +
        '[&_strong]:text-black [&_strong]:font-semibold ' +
        '[&_em]:italic ' +
        '[&_a]:underline hover:[&_a]:no-underline ' +
        (className ?? '')
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
