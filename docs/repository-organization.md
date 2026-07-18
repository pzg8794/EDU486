# EDU486 Repository Organization

This repository uses a reviewed-public/local-source split. GitHub contains original course work, Piter-approved transcripts, selected evidence images, and authored exports. Copyrighted course downloads, unrelated personal records, and unreviewed source material remain on the local machine.

## Public, Tracked Structure

| Path | Purpose |
| --- | --- |
| `assignments/` | Original Markdown drafts, plans, data tables, and source-authored SVG files |
| `docs/` | Course scope, deadlines, provenance, indexes, and repository guidance |
| `public-artifacts/` | Public-safe generated visuals |
| `public-submissions/` | Authored submission exports that are safe to publish |
| `transcripts/` | Public transcript index, original automatic text, and complete clean Markdown versions |

## Private, Local-Only Structure

Everything under `_local-course-materials/` is ignored by Git and must not be force-added.

| Path | Purpose |
| --- | --- |
| `announcements/` | Blackboard announcements, emails, and downloaded web captures |
| `assignment-source-exports/` | Local editable or source exports used to create public submissions |
| `camp/` | Camp templates, photographs, team evidence, and protected email attachments |
| `course-documents/` | Syllabus and other whole-course documents |
| `modules/module-1/` | Protected Module 1 readings and course files |
| `modules/module-2/` | Protected Module 2 readings and course files |
| `receipts/` | Submission receipts and portal confirmations |
| `submission-exports/` | Local Blackboard/Drive-ready exports |
| `temporary-rendering/` | Intermediate image and document renderings |
| `_local-course-materials/transcripts/raw/` | Local source copies; approved public copies receive stable names under tracked `transcripts/raw/` |

The local-only directory includes its own ignored README and duplicate inventory for machine-local navigation.

## Placement Rules

1. Put downloaded readings, screenshots, class photographs, source transcripts, receipts, and unreviewed exports under `_local-course-materials/`.
2. Put only reviewed, approved work in tracked folders. Piter has approved EDU486 course transcripts for publication.
3. Do not use `git add -f` to bypass the boundary.
4. Keep authored public exports in `public-submissions/`; a byte-identical local submission copy may remain in `submission-exports/` intentionally.
5. Update [the source map](source-map.md) when a local or protected source informs public work.

## Synchronization Definition

Local and remote repositories are identical when:

- local `HEAD` and `origin/main` resolve to the same commit;
- the ahead/behind count is `0 0`;
- the tracked worktree is clean; and
- no unreviewed or unrelated personal file is exposed for commit.

Ignored files under `_local-course-materials/` are intentionally local and do not make the Git repositories different. Approved transcripts and evidence are copied into tracked folders deliberately; ignored source copies should not be force-added.

## Pre-Push Check

```sh
git fetch origin --prune
git status --short --branch
git diff --check
git rev-list --left-right --count HEAD...origin/main
```

Review the staged file list before every commit. Do not delete local or remote source material unless the owner explicitly approves deletion.
