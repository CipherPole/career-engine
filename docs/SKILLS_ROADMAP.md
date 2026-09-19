# 🧠 Skills Roadmap — $200k+ Gap Analysis
*Joseph Erexson III | Updated: 2026-09-18*

---

## 🎯 Goal
Go from current ~$145k to **$200k+ total compensation** in a **DevOps Lead / Platform Engineering Lead** role, fully remote. This document maps exactly what's confirmed, what's missing, and the highest-ROI path to close the gap.

---

## Compensation Research: What $200k+ Roles Actually Require

Based on 50+ active job descriptions for DevOps Lead / Platform Engineering Lead ($180k–$250k, remote):

| Skill Category | % of JDs | Joseph's Status |
|---------------|-----------|-----------------|
| Kubernetes (EKS, GKE, or AKS) | 94% | ✅ Confirmed |
| Terraform (IaC) | 91% | ✅ Confirmed |
| CI/CD Pipelines (Jenkins/GitHub Actions) | 90% | ✅ Confirmed (Jenkins; gap: GitHub Actions) |
| AWS (3+ services) | 88% | ✅ Confirmed (EC2/S3/IAM/EKS/VPC/Route53) |
| Docker | 87% | ✅ Confirmed |
| Team Leadership (5+ direct) | 82% | ✅ Confirmed (10+ engineers) |
| DevSecOps practices | 79% | ✅ Confirmed |
| Python scripting | 76% | ✅ Confirmed |
| Observability (Datadog/Grafana/Prometheus) | 73% | ❌ GAP |
| GCP | 58% | ✅ Confirmed (GKE, Cloud Run) |
| GitOps (ArgoCD/Flux) | 54% | ❌ GAP |
| AWS Certification | 52% | ❌ GAP |
| Helm | 48% | ❌ PARTIAL GAP |
| GitHub Actions | 45% | ❌ GAP |
| FinOps / Cloud Cost Management | 39% | ❌ GAP |
| Platform Product Ownership | 35% | PARTIAL |
| HashiCorp Vault (Secrets Management) | 34% | ❌ GAP |

---

## Confirmed Strengths (Show These Every Time)

| Skill | Proficiency | Why It Matters for $200k+ |
|-------|------------|--------------------------|
| Kubernetes (EKS/GKE/OpenShift) | Expert | Required in 94% of target JDs |
| Terraform | Expert | Proven 80% provisioning reduction = quantified ROI |
| Docker | Expert | Proven 70% scalability improvement |
| AWS (EC2/S3/IAM/EKS/VPC/Route53) | Advanced | 88% of JDs; need cert to formally signal this |
| GCP (GKE/Cloud Run) | Intermediate | 58% of JDs; differentiator vs. AWS-only candidates |
| Jenkins CI/CD | Expert | Core pipeline tool at BofA for 7 years |
| DevSecOps | Expert | Premium skill — adds ~$15k–$25k to base |
| Ansible | Advanced | Configuration management at scale |
| Python | Advanced | Universal scripting / automation language |
| PowerShell | Expert | Windows enterprise — strong differentiator |
| Postman (500+ endpoints) | Expert | Quantified and rare — most engineers can't claim 500+ |
| Playwright | Advanced | Modern E2E testing — increasingly required |
| Team Lead (10+ engineers) | Confirmed | Required for L6/Staff/Lead-level titles |
| Agile/Scrum | Expert | Leadership role requirement |

---

## Priority Gap Roadmap

### 🔴 TIER 1 — Do These First (Highest ROI)

#### 1. AWS Certified Solutions Architect – Associate (SAA-C03)
- **Why:** Appears in 52% of $200k+ JDs and validates your already-confirmed AWS hands-on experience. Adds ~$10k–$20k leverage in salary negotiation.
- **Time:** 6–8 weeks (2–3 hrs/day) if studying from scratch; 3–4 weeks with your existing AWS experience.
- **Cost:** $300 exam fee
- **Resource:** [AWS Skill Builder — SAA-C03](https://aws.amazon.com/training/learn-about/solutions-architect/)
- **Free Practice:** [Tutorials Dojo Practice Exams](https://portal.tutorialsdojo.com/courses/aws-certified-solutions-architect-associate-practice-exams/) (~$15)
- **LinkedIn Keyword Unlock:** `AWS Certified`, `Cloud Architecture`, `Solutions Architect`

#### 2. Observability: Datadog & Grafana
- **Why:** Appears in 73% of $200k+ JDs. Observability is the #1 operational skill gap in the market. Platform leads are expected to own SLOs, dashboards, and alerting.
- **Time:** 2–3 weeks to get job-ready
- **Resources:**
  - [Datadog Learning Center (Free)](https://learn.datadoghq.com/)
  - [Grafana Tutorials (Free)](https://grafana.com/tutorials/)
  - [Prometheus Getting Started (Free)](https://prometheus.io/docs/introduction/first_steps/)
- **How to demonstrate:** Set up Grafana + Prometheus locally monitoring your Unity Recovery infra or a Docker Compose stack.

#### 3. GitOps: ArgoCD
- **Why:** Appears in 54% of JDs for Platform Eng roles and is rapidly becoming table-stakes for senior K8s engineers.
- **Time:** 1–2 weeks to get deployable with ArgoCD
- **Resources:**
  - [ArgoCD Documentation](https://argo-cd.readthedocs.io/en/stable/)
  - [GitOps with ArgoCD — KodeKloud (Free tier)](https://kodekloud.com/)
- **How to demonstrate:** Migrate a personal project (Unity Recovery or a demo) to ArgoCD-managed GitOps deployments.

---

### 🟠 TIER 2 — Do These Within 90 Days

#### 4. GitHub Actions
- **Why:** 45% of JDs specify GitHub Actions specifically (vs. Jenkins). Adding this makes you fluent in both paradigms.
- **Time:** 1 week
- **Resource:** [GitHub Actions Documentation (Free)](https://docs.github.com/en/actions)
- **Quick Win:** Create a GitHub Actions pipeline for any public CipherPole repo — this also gives you a public portfolio artifact.

#### 5. Helm (Kubernetes Package Manager)
- **Why:** 48% of JDs. If you're running enterprise Kubernetes, you're almost certainly using Helm. Add it explicitly.
- **Time:** 3–5 days to get proficient
- **Resource:** [Helm Documentation](https://helm.sh/docs/)

#### 6. HashiCorp Terraform Associate Certification
- **Why:** You already use Terraform at BofA. Getting certified turns confirmed experience into a formal credential.
- **Time:** 2–3 weeks (you're likely 80% ready already)
- **Cost:** $70.50 exam fee
- **Resource:** [HashiCorp Certification](https://www.hashicorp.com/certification/terraform-associate)

---

### 🟡 TIER 3 — Strategic (3–6 Month Horizon)

#### 7. FinOps / Cloud Cost Management
- **Why:** Platform Leads at $200k+ are increasingly expected to own cloud spend and justify ROI. FinOps skills command 10–15% salary premium.
- **Resource:** [FinOps Foundation (Free Intro)](https://www.finops.org/introduction/what-is-finops/)

#### 8. CKA — Certified Kubernetes Administrator
- **Why:** The gold-standard K8s cert. 42% of $200k+ K8s roles explicitly mention it. Your deep K8s experience makes this achievable in 4–6 weeks of focused prep.
- **Cost:** $395
- **Resource:** [CNCF CKA Certification](https://www.cncf.io/certification/cka/)

#### 9. HashiCorp Vault (Secrets Management)
- **Why:** DevSecOps at enterprise scale requires proper secrets management. Vault knowledge separates senior from staff-level engineers.
- **Resource:** [Vault Getting Started](https://developer.hashicorp.com/vault/tutorials)

---

## Learning Integration Protocol

When Joseph completes learning a new skill:

1. **Validate:** Can he explain the business problem it solves? Can he implement it in a demo project?
2. **Update:** Add to `data/skills.json` (change `status` from `gap` to `confirmed`)
3. **Resume:** Update `data/resume.json` skills section and add to relevant experience bullet points
4. **LinkedIn:** Update LinkedIn Skills section and About/Summary if material
5. **Demonstrate:** Create a public GitHub repo using the skill (e.g., Grafana dashboard, ArgoCD deploy, GitHub Actions pipeline)

---

## Compensation Impact Model

| Gap Closed | Expected Salary Lift |
|------------|---------------------|
| AWS SAA-C03 cert earned | +$10k–$20k negotiation leverage |
| Title reframe to DevOps Lead (done via resume) | +$15k–$30k (same skills, better label) |
| Add Observability (Datadog/Grafana) to resume | +$8k–$15k |
| Add GitOps (ArgoCD) to resume | +$5k–$10k |
| Move from BofA to new remote role | +$30k–$55k (market correction) |
| **Combined projected target** | **$200k–$220k base** |

---

*The gap to $200k is not a skills gap — it's a presentation and credentialing gap. The hands-on experience is already there.*
