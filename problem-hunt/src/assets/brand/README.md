# Scout logo

Original ProblemHunt artwork approved in the October 2, 2026 logo workshop (round 7).
The sage fox wears square glasses and runs beside the wordmark. No question box,
swallowing sequence, or external brand artwork is included.

`scout-run.svg` contains 16 horizontal 116 × 64 vector frames (1856 × 64 total).
`brand-logo.tsx` imports it through Vite for a content-hashed asset URL. CSS uses
`object-fit: cover`, `object-position`, and `steps(16, jump-none)` to play a 280ms
stride. `overflow: hidden` is essential to keep adjacent frames invisible.
Reduced-motion users see the first frame. The full lockup's image is decorative;
the enclosing navigation link provides the accessible homepage label.

Keep the image's 116:64 aspect ratio when resizing. Typical size is 65.25 × 36px;
the narrowest header uses 43.5 × 24px. There is no extra flex gap before the name.
