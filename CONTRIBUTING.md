# Contributing to Ryu Docs

Thanks for your interest in improving **Ryu Docs**, an open-source component of
[Ryu](https://ryuhq.com).

## License of contributions

Ryu Docs is licensed under **Apache-2.0**. By submitting a contribution you agree that your work is
provided under that same license and that you have the right to submit it. We may ask you to
sign off your commits (`git commit -s`) under the
[Developer Certificate of Origin](https://developercertificate.org/).

## Public contributions

This unit is assembled in Ryu's monorepo, and this public repository is an active contribution
surface. Open issues and pull requests here. A maintainer lands accepted changes in the monorepo
and syncs them back out. A sync may rewrite generated files and the public `main` branch, so do not
base a long-lived fork on a particular sync commit.

Read [STYLE_GUIDE.md](./STYLE_GUIDE.md) before editing. It defines the page types, the audience
split, and how to keep technical terms clear without replacing them with vague synonyms.

## This site is public — internal content does not belong here

Everything under `content/` ships to the live public docs site and into `llms.txt` /
`llms-full.txt`. It is customer-facing documentation, not an internal wiki. Never add:

- **Program/status pages** — extraction or migration programs with wave tables,
  effort estimates, statuses, LoC counts, commit hashes, or dated "current state"
  snapshots.
- **Internal inventories** — crate lists, app/package references, gateway-stage or
  ghost/shadow catalogs, or debugging pages dumping internal endpoints, ports, or
  probe commands.
- **Links to internal artifacts** — pointers into the monorepo's `docs/*.md` (specs,
  audits, QA findings, deploy procedures, decomposition records) or to the closed
  GitHub repo. Those are development-internal.
- **Internal env vars or secrets surfaces** — private environment variables, admin
  emails, affiliate internals, or undocumented internal API routes.

There is no "internal" tag — a page is public by default. If it leaks the development
roadmap or would embarrass the team on the homepage, it does not belong here.

## Development

```bash
bun install
bun test
bun run build
```

## Pull requests

- Keep changes focused — one logical change per PR.
- Add or update tests for any behaviour change.
- Make sure the build, tests, and linters pass before requesting review.
- Explain the motivation and any trade-offs in the description.

## Reporting bugs & security issues

Open a GitHub issue for ordinary bugs. For security vulnerabilities, do **not** open a public
issue — follow [SECURITY.md](./SECURITY.md).
