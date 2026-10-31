# Portfolio UI Kit

An interactive recreation of Maria Chevskaya's public portfolio + booking page, plus a sketch of the (Russian-language) admin shell.

## What's here

- `index.html` — click-thru prototype. Default view is the home masonry; click **BOOK** to open the booking page; click the small user icon in the footer to see the login card; click **Войти** to see the admin shell with a photos table.
- `TopNav.jsx` — centered Bebas Neue wordmark + lowercase Inter tagline.
- `FloatingBookButton.jsx` — fixed bottom-right black CTA with poster shadow.
- `MasonryGrid.jsx` — 3-column grid with row-span cadence, grayscale, slow hover scale.
- `Footer.jsx` — dimmed wordmark + 3 lucide icons + copyright.
- `BookPage.jsx` — the original tight-column booking page, kept for the prototype; the current booking design is `../../preview/booking-rows.html` (photographed tier rows and the booking dialog).
- `LoginCard.jsx` — shadcn Card with Russian labels, email + password inputs, Google button.
- `AdminShell.jsx` — photographer CMS: upload dropzone + sortable photos table.

## Components not shown
Auth callbacks, password reset, error boundary — these exist in the codebase but aren't UI-interesting for the kit. Left out on purpose.
