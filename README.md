# 🚀 Urban Nook – Git Branching & Deployment Workflow

This document exists **to avoid confusion forever**.
If you are new to this repository, **read this fully before pushing or merging anything**.

---

## 🧠 Core Principle (MOST IMPORTANT)

> **`main` is the ONLY source of truth**

* `pre-prod` is **NOT** a source branch
* `pre-prod` is **ONLY for testing / staging / QA**
* **`pre-prod` must NEVER be merged into `main`** ❌

If this rule is broken → unstable code can reach production.

---

## 🌳 Branch Responsibilities

| Branch      | Purpose                    | Merge Rules                          |
| ----------- | -------------------------- | ------------------------------------ |
| `main`      | Production-ready, stable   | Only via PR from `feature/*`         |
| `pre-prod`  | Staging / QA / testing     | Receives code from `feature/*`       |
| `feature/*` | Actual development work    | Can merge into `pre-prod` and `main` |
| `hotfix/*`  | Emergency production fixes | Direct PR to `main`                  |

---

## ✅ CORRECT DEVELOPMENT FLOW (FOLLOW THIS ONLY)

### 1️⃣ Always start work from `main`

```bash
git checkout main
git pull origin main
git checkout -b feature/<feature-name>
```

Examples:

* `feature/razorpay`
* `feature/auth-refresh`

---

### 2️⃣ Development happens ONLY on feature branch

* Write code
* Commit normally
* Push feature branch

```bash
git push origin feature/<feature-name>
```

---

### 3️⃣ Testing on pre-prod (STAGING)

Once feature is ready for testing:

```bash
git checkout pre-prod
git pull origin pre-prod
git merge feature/<feature-name>
git push origin pre-prod
```

OR (Preferred):

> Raise a PR: `feature/<feature-name>` → `pre-prod`

🔍 QA / Testing happens here
🌐 Deployed on **pre-prod domain**

---

### 4️⃣ VERIFIED? → Raise PR to `main`

⚠️ **THIS IS VERY IMPORTANT**

✅ Raise PR from **the SAME feature branch**

```
feature/<feature-name> → main
```

❌ NEVER DO THIS:

```
pre-prod → main
```

Why?

* `pre-prod` may contain test commits
* rollback commits
* logs / experiments

---

### 5️⃣ Production Deployment

* PR approved
* Merged into `main`
* GitHub Action runs automatically
* Production server is updated

---

## 🚫 STRICTLY FORBIDDEN COMMANDS

```bash
git checkout main
git merge pre-prod   # ❌ NEVER DO THIS
```

If you see this in history → **STOP AND FIX IMMEDIATELY**

---

## 🔐 Branch Protection Rules (MANDATORY)

### `main`

* ✅ Only PR merges allowed
* ✅ At least 1 review required
* ✅ CI must pass
* ❌ No direct push
* ❌ No force push

### `pre-prod`

* ✅ PR preferred
* ⚠️ Direct push allowed only for testing

---

## ⚙️ GitHub Actions (CI/CD) Behavior

* `pre-prod` branch → deploys to **pre-prod environment**
* `main` branch → deploys to **production environment**

⚠️ If EC2 is stopped:

* CI should **skip deployment steps**
* CI must **NOT auto-start EC2**

---

## 🧪 Why This Workflow Exists

✔ Clean production history
✔ Safe testing environment
✔ Easy rollback
✔ No accidental prod breaks
✔ Scales to multiple developers

This is the same workflow used in:

* Fintech
* Payment systems
* Enterprise SaaS

---

## 🧾 TL;DR (Quick Rules)

* ✅ Start from `main`
* ✅ Develop on `feature/*`
* ✅ Test on `pre-prod`
* ✅ Merge **feature → main** after verification

❌ Never merge `pre-prod` into `main`

---

## 📌 If You Are Unsure

Ask before merging.
It is **always cheaper to ask than to rollback production**.

---

🛡️ **This README exists so production never breaks by mistake.**
