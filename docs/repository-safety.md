# Repository Safety: Deletion Is Forbidden

## The Rule

**No agent or automated workflow may delete an EDU486 Git repository.**

This prohibition covers:

- the local repository directory;
- the repository's `.git` directory, refs, objects, reflogs, and history;
- the configured `origin` or other repository remotes;
- the remote GitHub repository;
- a checkout, worktree, or mirror when deletion would remove the only preserved copy; and
- replacement operations that destroy the existing repository and recreate a different repository under the same path or name.

Only Piter may decide to delete a repository manually outside an agent workflow. An agent must not execute repository deletion, even after a cleanup, migration, archive, duplicate-removal, or "start over" request.

## Forbidden Operations

Do not run, call, or approve:

```text
rm -rf <repository>
rm -rf <repository>/.git
gh repo delete ...
DELETE /repos/{owner}/{repo}
git init inside or over an existing repository as a replacement
```

Do not remove `origin`, rewrite all history, erase every branch or tag, or replace the repository with a non-Git folder as a workaround.

## Safe Alternatives

Use one of these non-destructive options:

1. Move superseded files into a dated `archive/` directory.
2. Create a branch or tag before restructuring.
3. Clone into a new path and leave the original repository intact.
4. Rename a working folder only after verifying the repository remains available.
5. Reconcile local and remote changes through fetch, review, merge/rebase, commit, and push.
6. When the correct repository is uncertain, stop and ask Piter instead of deleting either candidate.

## Required Safety Check

Run this before and after repository-level work:

```sh
./scripts/check-repository-safety.sh
```

For synchronization, also run:

```sh
git fetch origin --prune
git status --short --branch
git diff --check
git rev-list --left-right --count HEAD...origin/main
```

The word `--prune` in `git fetch origin --prune` removes stale remote-tracking references only. It does not authorize deleting the repository, remote branches, local branches, files, or history.

## Stop Condition

If a requested action could remove a repository, `.git`, remote history, or the only preserved copy, stop immediately. Report the risk and offer an archive, branch, tag, new path, or ordinary synchronization instead.
