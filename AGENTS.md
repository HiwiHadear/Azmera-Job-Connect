<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Render site branding through the shared BrandLogo component and CDN asset pointers; derive the favicon from the same supplied logo to keep identity consistent.
- CV matching uses a streaming TanStack server route and server-only AI Gateway helpers; CVs and results are not persisted, and terminal provider access blocks are persisted in a service-only table to prevent automatic replay.
