/* ============================================================
   JOB-RESEARCH-ENGINE.JS — Job Description Analysis, Company
   Research Links & Fit Scorecard (pure functions, no DOM)
   ============================================================ */

'use strict';

// ── Tech & Role Vocabulary ────────────────────────────────────
const TECH_TERMS = [
  ['Kubernetes', /\b(kubernetes|k8s)\b/],
  ['Docker', /\bdocker\b/],
  ['OpenShift', /\bopenshift\b/],
  ['Helm', /\bhelm\b/],
  ['Terraform', /\bterraform\b/],
  ['Ansible', /\bansible\b/],
  ['Pulumi', /\bpulumi\b/],
  ['CloudFormation', /\bcloudformation\b/],
  ['Chef / Puppet', /\b(chef|puppet)\b/],
  ['AWS', /\b(aws|amazon web services)\b/],
  ['Azure', /\bazure\b/],
  ['GCP', /\b(gcp|google cloud)\b/],
  ['EKS', /\beks\b/],
  ['Lambda / Serverless', /\b(lambda|serverless)\b/],
  ['Jenkins', /\bjenkins\b/],
  ['GitHub Actions', /\bgithub actions\b/],
  ['GitLab CI', /\bgitlab\b/],
  ['ArgoCD / GitOps', /\b(argo ?cd|gitops|flux)\b/],
  ['CI/CD', /(\bci\/cd\b|\bci-cd\b|\bcontinuous (integration|delivery|deployment)\b)/],
  ['Python', /\bpython\b/],
  ['Go', /\b(golang|go lang)\b/],
  ['Bash / Shell', /\b(bash|shell scripting|powershell)\b/],
  ['Java', /\bjava\b(?!script)/],
  ['JavaScript / TypeScript', /\b(javascript|typescript|node\.?js)\b/],
  ['Linux', /\b(linux|rhel|unix)\b/],
  ['Prometheus', /\bprometheus\b/],
  ['Grafana', /\bgrafana\b/],
  ['Datadog', /\bdatadog\b/],
  ['Splunk', /\bsplunk\b/],
  ['ELK / OpenSearch', /\b(elk|elasticsearch|opensearch|kibana)\b/],
  ['Observability', /\b(observability|monitoring|opentelemetry)\b/],
  ['SRE', /\b(sre|site reliability)\b/],
  ['Incident Response', /\b(incident|on-call|oncall|pagerduty)\b/],
  ['DevSecOps', /\b(devsecops|security scanning|sast|dast|vulnerability)\b/],
  ['Vault / Secrets', /\b(vault|secrets management)\b/],
  ['IAM', /\biam\b/],
  ['Networking', /\b(networking|vpc|dns|load balanc\w*|tcp\/ip)\b/],
  ['SQL / Databases', /\b(sql|postgres\w*|mysql|databases?)\b/],
  ['Kafka', /\bkafka\b/],
  ['Microservices', /\bmicroservices?\b/],
  ['Test Automation / QA', /\b(test automation|qa|selenium|cypress|playwright)\b/],
  ['Agile / Scrum', /\b(agile|scrum|kanban)\b/],
  ['Leadership / Mentoring', /\b(mentor\w*|lead(ing)? (a )?team|people manage\w*|leadership)\b/],
];

// Alias tokens used to match a JD term against the user's own skill names.
const SKILL_ALIASES = {
  'Kubernetes': ['kubernetes', 'k8s', 'eks', 'gke', 'aks', 'openshift'],
  'Chef / Puppet': ['chef', 'puppet'],
  'AWS': ['aws', 'ec2', 's3', 'eks', 'route53', 'lambda'],
  'Azure': ['azure'],
  'GCP': ['gcp', 'gke', 'cloud run', 'google cloud'],
  'Lambda / Serverless': ['lambda', 'serverless', 'cloud run'],
  'ArgoCD / GitOps': ['argo', 'gitops', 'flux'],
  'CI/CD': ['ci/cd', 'jenkins', 'github actions', 'gitlab', 'bitbucket pipelines', 'xlrelease', 'pipeline'],
  'Go': ['golang'],
  'Bash / Shell': ['bash', 'shell', 'powershell'],
  'JavaScript / TypeScript': ['javascript', 'typescript', 'node'],
  'Linux': ['linux', 'rhel', 'unix'],
  'ELK / OpenSearch': ['elk', 'elastic', 'opensearch', 'kibana'],
  'Observability': ['observability', 'monitoring', 'prometheus', 'grafana', 'datadog', 'splunk'],
  'SRE': ['sre', 'site reliability'],
  'Incident Response': ['incident', 'on-call', 'pagerduty'],
  'DevSecOps': ['devsecops', 'security', 'sast', 'vulnerab'],
  'Vault / Secrets': ['vault', 'secrets'],
  'Networking': ['network', 'vpc', 'dns', 'route53'],
  'SQL / Databases': ['sql', 'postgres', 'mysql', 'database'],
  'Test Automation / QA': ['qa', 'test automation', 'selenium', 'cypress', 'playwright', 'testing'],
  'Agile / Scrum': ['agile', 'scrum', 'kanban'],
  'Leadership / Mentoring': ['lead', 'mentor', 'manage'],
};

// ── Job Description Signals ───────────────────────────────────
const GREEN_FLAGS = [
  [/\b(career (growth|development|path)|growth opportunit\w*|promotion)/i, 'Mentions career growth or promotion paths'],
  [/\b(mentor\w*|coaching)\b/i, 'Mentorship or coaching culture'],
  [/\b(learning (budget|stipend)|training budget|education (assistance|reimbursement)|tuition|certification (reimbursement|support))/i, 'Learning / certification budget'],
  [/\$\s?\d{2,3}(,\d{3}|k)\s*(-|–|—|to)\s*\$?\s?\d{2,3}(,\d{3}|k)/i, 'Publishes a salary range (pay transparency)'],
  [/\b(remote[- ]first|fully remote|100% remote)/i, 'Remote-first'],
  [/\b(work[- ]life balance|flexible (hours|schedule)|4[- ]day (work )?week)/i, 'Explicit work-life balance / flexibility'],
  [/\b(401\(?k\)? match\w*|matching contributions?)/i, '401(k) match'],
  [/\b(parental leave|paid family leave)/i, 'Paid parental leave'],
  [/\b(equity|stock options|rsus?)\b/i, 'Equity / stock compensation'],
  [/\b(blameless|psychological safety|inclusive)\b/i, 'Healthy engineering culture language (blameless, inclusive)'],
];

const RED_FLAGS = [
  [/\b(fast[- ]paced|high[- ]pressure|work under pressure)/i, '"Fast-paced / high-pressure" — ask what a normal week looks like'],
  [/\bwear (many|multiple) hats/i, '"Wear many hats" — role scope may be unclear or understaffed'],
  [/\b(rock ?star|ninja|guru|superstar)\b/i, 'Buzzword titles (rockstar / ninja) — can signal unrealistic expectations'],
  [/\b(like a family|we('| a)re a family)/i, '"We are a family" — can blur boundaries around hours'],
  [/(24\/7|available (at all times|nights and weekends)|after[- ]hours)/i, 'Always-on availability expected — clarify on-call rotation and pay'],
  [/\bother duties as assigned/i, '"Other duties as assigned" — confirm what the core role really is'],
  [/\bcompetitive (salary|pay|compensation)/i, '"Competitive salary" with no range — ask for the band early'],
  [/\b(self[- ]starter|minimal (supervision|guidance))/i, '"Self-starter / minimal supervision" — ask about onboarding and mentorship'],
  [/\bunlimited pto\b/i, 'Unlimited PTO — ask how much time people actually take'],
  [/\b(contract[- ]to[- ]hire|temporary|1099)\b/i, 'Contract / temporary arrangement — confirm conversion terms and benefits'],
];

// ── Scorecard Criteria ────────────────────────────────────────
export const CRITERIA = [
  { key: 'interest',   label: 'I would enjoy the day-to-day work', weight: 20, hint: 'Does the actual work excite you, not just the title?' },
  { key: 'growth',     label: 'Room to grow',                       weight: 20, hint: 'Promotion path, bigger scope, new skills, mentorship' },
  { key: 'skills',     label: 'Skills fit',                         weight: 15, hint: 'Pre-filled from the job description match — adjust if needed' },
  { key: 'culture',    label: 'Culture & values',                   weight: 15, hint: 'What employee reviews say about how people are treated' },
  { key: 'wlb',        label: 'Work-life balance',                  weight: 10, hint: 'Hours, on-call load, burnout signals in reviews' },
  { key: 'comp',       label: 'Compensation & benefits',            weight: 10, hint: 'Compared to your target and market data' },
  { key: 'leadership', label: 'Leadership & management',            weight: 5,  hint: 'Reviews of managers and executive direction' },
  { key: 'stability',  label: 'Company stability',                  weight: 5,  hint: 'Layoffs, funding, revenue trend, recent news' },
];

const INTERVIEW_QUESTIONS = {
  interest:   ['What does a typical week look like for this role?', 'What would I own in my first 90 days?'],
  growth:     ['How have people in this role grown or been promoted in the last two years?', 'Is there a training, conference, or certification budget?'],
  skills:     ['Which skills from the posting matter most on day one, and which can be learned on the job?'],
  culture:    ['How does the team handle disagreements or production incidents?', 'What do you like most about working here, and what would you change?'],
  wlb:        ['How is on-call structured and compensated?', 'How often does the team work evenings or weekends?'],
  comp:       ['What is the salary band for this role?', 'How are raises and bonuses decided?'],
  leadership: ['How often do you have 1:1s with your manager, and how is feedback given?', 'How has leadership communicated during recent changes?'],
  stability:  ['How has the team changed in size over the past year?', 'What are the biggest company priorities for the next 12 months?'],
};

// ── Helpers ───────────────────────────────────────────────────
function enc(value) {
  return encodeURIComponent(String(value || '').trim());
}

/** Collect lowercase skill names from resume + skills data, split into confirmed and still-learning. */
export function collectUserSkills(resumeData, skillsData) {
  const confirmed = new Set();
  const learning = new Set();

  const resumeSkills = resumeData?.skills;
  if (Array.isArray(resumeSkills)) {
    resumeSkills.forEach(s => confirmed.add(String(s?.name || s).toLowerCase()));
  } else if (resumeSkills && typeof resumeSkills === 'object') {
    Object.values(resumeSkills).flat().forEach(s => confirmed.add(String(s?.name || s).toLowerCase()));
  }

  (skillsData?.categories || []).forEach(cat => {
    (cat.skills || []).forEach(s => {
      const name = String(s.name || '').toLowerCase();
      if (!name) return;
      if (s.status === 'gap') learning.add(name);
      else confirmed.add(name);
    });
  });

  learning.forEach(s => { if (confirmed.has(s)) learning.delete(s); });
  return { confirmed: [...confirmed], learning: [...learning] };
}

function skillMatches(term, regex, userSkills) {
  const aliases = SKILL_ALIASES[term] || [term.toLowerCase()];
  return userSkills.some(skill => aliases.some(a => skill.includes(a)) || regex.test(skill));
}

// ── Job Description Analysis ──────────────────────────────────
export function analyzeJobDescription(description, userSkills) {
  const text = String(description || '');
  const lower = text.toLowerCase();
  const confirmed = userSkills?.confirmed || [];
  const learning = userSkills?.learning || [];

  const matched = [];
  const developing = [];
  const missing = [];
  const found = TECH_TERMS.filter(([, re]) => re.test(lower));
  found.forEach(([label, re]) => {
    if (skillMatches(label, re, confirmed)) matched.push(label);
    else if (skillMatches(label, re, learning)) developing.push(label);
    else missing.push(label);
  });

  const skillsScore = found.length >= 3
    ? Math.round(((matched.length + developing.length * 0.5) / found.length) * 100)
    : null;

  const salaryMatch = text.match(/\$\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?[kK]?\s*(?:-|–|—|to)\s*\$?\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?[kK]?(?:\s*(?:per|\/|a)\s*(?:year|yr|hour|hr))?/);
  const yearsMatch = lower.match(/(\d{1,2})\+?\s*(?:-\s*\d{1,2}\s*)?years?(?:\s+of)?(?:\s+[\w/-]+){0,4}\s+experience/);

  let workMode = '';
  if (/\bhybrid\b/.test(lower)) workMode = 'Hybrid';
  else if (/\b(remote|work from home)\b/.test(lower)) workMode = 'Remote';
  else if (/\b(on[- ]site|onsite|in[- ]office)\b/.test(lower)) workMode = 'On-site';

  let seniority = '';
  if (/\b(principal|distinguished)\b/.test(lower)) seniority = 'Principal';
  else if (/\bstaff\b/.test(lower)) seniority = 'Staff';
  else if (/\b(director|head of)\b/.test(lower)) seniority = 'Director';
  else if (/\bmanager\b/.test(lower)) seniority = 'Manager';
  else if (/\blead\b/.test(lower)) seniority = 'Lead';
  else if (/\b(senior|sr\.)/.test(lower)) seniority = 'Senior';
  else if (/\b(junior|jr\.|entry[- ]level)/.test(lower)) seniority = 'Junior';

  return {
    hasDescription: text.trim().length > 0,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    matched,
    developing,
    missing,
    skillsScore,
    salary: salaryMatch ? salaryMatch[0].replace(/\s+/g, ' ').trim() : '',
    yearsRequired: yearsMatch ? `${yearsMatch[1]}+ years` : '',
    workMode,
    seniority,
    greenFlags: GREEN_FLAGS.filter(([re]) => re.test(text)).map(([, msg]) => msg),
    redFlags: RED_FLAGS.filter(([re]) => re.test(text)).map(([, msg]) => msg),
  };
}

/** Convert a 0–100 skills score into a 1–5 rating. */
export function skillsScoreToRating(score) {
  if (score === null || score === undefined) return null;
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

// ── Fit Scorecard ─────────────────────────────────────────────
export function computeFitScore(ratings = {}) {
  const totalWeight = CRITERIA.reduce((sum, c) => sum + c.weight, 0);
  let ratedWeight = 0;
  let weighted = 0;
  CRITERIA.forEach(c => {
    const r = Number(ratings[c.key]);
    if (r >= 1 && r <= 5) {
      ratedWeight += c.weight;
      weighted += ((r - 1) / 4) * c.weight;
    }
  });

  const confidence = Math.round((ratedWeight / totalWeight) * 100);
  const score = ratedWeight ? Math.round((weighted / ratedWeight) * 100) : null;

  let verdict = { label: 'Not scored yet', tone: '', advice: 'Rate a few criteria below to get a fit score.' };
  if (score !== null && confidence < 50) {
    verdict = { label: 'Keep researching', tone: 'blue', advice: 'You have rated less than half of what matters. Use the research links to fill the gaps before deciding.' };
  } else if (score !== null && score >= 75) {
    verdict = { label: 'Strong fit — apply', tone: 'green', advice: 'This lines up well with your skills and what you want. Tailor your resume to the matched keywords and apply.' };
  } else if (score !== null && score >= 55) {
    verdict = { label: 'Possible fit — clarify concerns', tone: 'gold', advice: 'Worth applying, but use the screening call to get clear answers on your lower-rated areas.' };
  } else if (score !== null) {
    verdict = { label: 'Likely not a fit', tone: 'red', advice: 'Several things that matter to you rate poorly. Consider passing unless something important changes.' };
  }

  // Unrated or weak areas become interview questions
  const questions = CRITERIA
    .filter(c => !(Number(ratings[c.key]) >= 4))
    .flatMap(c => INTERVIEW_QUESTIONS[c.key].map(q => ({ area: c.label, question: q })));

  return { score, confidence, verdict, questions };
}

// ── Company Research Links ────────────────────────────────────
export function buildResearchLinks(company, title = '') {
  const c = String(company || '').trim();
  if (!c) return [];
  const g = q => `https://www.google.com/search?q=${enc(q)}`;
  const year = new Date().getFullYear();

  return [
    {
      group: '⭐ Employee Reviews',
      links: [
        { id: 'glassdoor', name: 'Glassdoor reviews', url: `https://www.glassdoor.com/Search/results.htm?keyword=${enc(c)}`, tip: 'Overall rating, CEO approval, pros/cons. Sort by most recent.' },
        { id: 'indeed', name: 'Indeed company reviews', url: `https://www.indeed.com/companies/search?q=${enc(c)}`, tip: 'Work-life balance, management, and job security sub-scores.' },
        { id: 'comparably', name: 'Comparably culture scores', url: g(`site:comparably.com ${c}`), tip: 'Culture, leadership, and team ratings.' },
        { id: 'blind', name: 'Blind (anonymous tech employees)', url: `https://www.teamblind.com/search/${enc(c)}`, tip: 'Candid talk about layoffs, managers, and comp.' },
        { id: 'reddit', name: 'Reddit discussions', url: `https://www.reddit.com/search/?q=${enc(`"${c}" working at`)}`, tip: 'Unfiltered employee and candidate experiences.' },
      ],
    },
    {
      group: '📈 Growth & Compensation',
      links: [
        { id: 'levels', name: 'Levels.fyi salaries', url: g(`site:levels.fyi ${c} salaries`), tip: 'Verified total comp by level — check your target band.' },
        { id: 'glassdoor-salary', name: 'Reported salaries for this role', url: g(`glassdoor ${c} ${title} salary`), tip: 'Compare the posted range to what people report.' },
        { id: 'linkedin-people', name: 'People in this role on LinkedIn', url: `https://www.linkedin.com/search/results/people/?keywords=${enc(`${c} ${title}`)}`, tip: 'Check tenure and where people get promoted to — a real growth signal.' },
        { id: 'linkedin-company', name: 'LinkedIn company page', url: `https://www.linkedin.com/search/results/companies/?keywords=${enc(c)}`, tip: 'Headcount trend, recent hires, and leadership.' },
      ],
    },
    {
      group: '🏢 Stability & News',
      links: [
        { id: 'news', name: 'Recent news', url: `https://news.google.com/search?q=${enc(`"${c}"`)}`, tip: 'Funding, acquisitions, leadership changes, lawsuits.' },
        { id: 'layoffs', name: 'Layoff history', url: g(`"${c}" layoffs ${year - 1} OR ${year}`), tip: 'Repeated layoffs are a strong stability warning.' },
        { id: 'crunchbase', name: 'Crunchbase profile', url: `https://www.crunchbase.com/textsearch?q=${enc(c)}`, tip: 'Funding rounds, size, and investors (best for startups).' },
      ],
    },
    {
      group: '🎤 Interview Prep',
      links: [
        { id: 'interviews', name: 'Interview questions & process', url: g(`"${c}" ${title} interview questions glassdoor`), tip: 'What the process looks like and what they ask.' },
        { id: 'engineering-blog', name: 'Engineering blog / tech stack', url: g(`"${c}" engineering blog`), tip: 'Shows how they build and what the team values.' },
      ],
    },
  ];
}

/** A copy-ready prompt the user can paste into an AI assistant for deeper research. */
export function buildResearchPrompt(job, userSkills, profileMeta = {}) {
  const skills = (userSkills?.confirmed || []).slice(0, 30).join(', ') || 'see my resume';
  const lines = [
    'I am evaluating a job before applying. Please research the company and tell me whether it is a good fit for me.',
    '',
    `Company: ${job.company}`,
    `Role: ${job.title}`,
    job.location ? `Location: ${job.location}` : null,
    job.salary ? `Posted compensation: ${job.salary}` : null,
    profileMeta.targetComp ? `My target compensation: $${Math.round(profileMeta.targetComp / 1000)}k` : null,
    profileMeta.workPreference ? `My work preference: ${profileMeta.workPreference}` : null,
    `My skills: ${skills}`,
    '',
    'Please cover:',
    '1. Employee sentiment from Glassdoor, Indeed, Blind, and Reddit — culture, management, work-life balance (cite recent reviews).',
    '2. Growth: promotion paths, learning support, and how long people stay in this role.',
    '3. Stability: layoffs, funding, financial health, and major news in the last 2 years.',
    '4. Compensation compared to market data for this role and level.',
    '5. How well my skills match the job description, and which gaps I should address.',
    '6. Red flags I should ask about in the interview, with specific questions.',
    '7. Your overall recommendation: apply, apply with caution, or pass — and why.',
  ].filter(l => l !== null);
  if (job.description) {
    lines.push('', 'Job description:', '"""', String(job.description).slice(0, 12000), '"""');
  }
  return lines.join('\n');
}