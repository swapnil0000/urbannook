# Copilot instructions

This repo has mandatory architecture rules for all AI suggestions. Read `AGENTS.md` at the repo
root and follow it: check every suggestion against the deploy spec (`DEPLOYMENT_ARCHITECTURE.md`)
and the System Guide (admin repo `urbannook-admin/client/src/content/system-guide.md`). Never suggest
deploys outside Jenkins, secrets outside Infisical, uploads outside `urbannook-assets-storage`, or
prod/staging data mixing. Changes to how the system works must update those docs in the same PR.
