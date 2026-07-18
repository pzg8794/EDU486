# EDU486 Repository Working Agreement

## Repository Boundary

This is a public course portfolio. Track only original, reviewed, public-safe work. Keep copyrighted readings, Blackboard exports, screenshots, class photographs, private transcripts, receipts, and sensitive records under `_local-course-materials/` or outside the repository.

Never force-add an ignored file to Git. Do not delete local or remote materials without explicit approval.

## File Placement

- Use `assignments/` for editable public course work.
- Use `docs/` for scope, provenance, indexes, and workflow guidance.
- Use `public-artifacts/` for safe generated visuals.
- Use `public-submissions/` for safe authored exports.
- Use `_local-course-materials/` for all protected or machine-local inputs and exports.
- Update `docs/source-map.md` when local evidence supports a public artifact.

## Change Discipline

- Preserve existing public links when moving tracked files.
- Prefer non-destructive moves and explicit archive folders over deletion.
- Treat repeated source downloads as provenance until a human approves deduplication.
- Keep local and remote synchronization separate from ignored local-source storage.

## Validation

Before pushing, run:

```sh
git fetch origin --prune
git status --short --branch
git diff --check
git rev-list --left-right --count HEAD...origin/main
```

After pushing, verify that local `HEAD` and `origin/main` have the same commit hash and that the tracked worktree is clean.
