# EDU486 Repository Working Agreement

## Absolute Repository Deletion Prohibition

**Deleting a Git repository is forbidden.** No agent, automation, cleanup task, migration, or synchronization workflow may delete this local repository, its `.git` directory or history, its configured remote, or the remote GitHub repository.

Forbidden actions include `rm -rf` against the repository, deleting or replacing `.git`, `gh repo delete`, a GitHub API repository-delete request, reinitializing over the repository, or removing the remote as a substitute for synchronization. This rule is not waived by a cleanup request, an archive request, duplicate files, repository confusion, or a failed sync.

If work appears to require repository deletion, **stop**. Preserve the repository and use a dated archive folder, branch, tag, or new checkout instead. Only Piter may perform repository deletion manually outside an agent workflow; agents must not execute it.

Read [the repository safety policy](docs/repository-safety.md) before any repository, archive, migration, or synchronization operation.

## Repository Boundary

This is a public course portfolio. Track only original, reviewed, public-safe work. Keep copyrighted readings, Blackboard exports, screenshots, class photographs, private transcripts, receipts, and sensitive records under `_local-course-materials/` or outside the repository.

Never force-add an ignored file to Git. Do not delete local or remote materials without explicit approval. Repository deletion is prohibited even when other file deletion has been approved.

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
./scripts/check-repository-safety.sh
git fetch origin --prune
git status --short --branch
git diff --check
git rev-list --left-right --count HEAD...origin/main
```

After pushing, verify that local `HEAD` and `origin/main` have the same commit hash, the tracked worktree is clean, and `./scripts/check-repository-safety.sh` still passes.
