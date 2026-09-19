/* ============================================================
   RESUME-PARSER.JS — Client-Side Resume Extraction & Analyzer
   Extracts text from PDF, DOCX, TXT, MD files client-side.
   Analyzes contact, role, skills, experience, and identifies gaps.
   ============================================================ */

'use strict';

// Master Technical & Professional Skills Taxonomy
export const SKILL_TAXONOMY = [
  // Cloud & Platforms
  'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud Platform', 'Azure', 'Microsoft Azure',
  'OpenShift', 'Heroku', 'DigitalOcean', 'Cloudflare', 'Vercel', 'Netlify',
  
  // Containers & Orchestration
  'Kubernetes', 'K8s', 'Docker', 'Docker Compose', 'Helm', 'ArgoCD', 'Podman', 'Containerd',

  // Infrastructure as Code & Automation
  'Terraform', 'Ansible', 'CloudFormation', 'Pulumi', 'Packer', 'Vagrant', 'Chef', 'Puppet',

  // CI/CD & DevSecOps
  'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Bitbucket Pipelines',
  'Bamboo', 'Travis CI', 'XLRelease', 'Trivy', 'SonarQube', 'Snyk', 'Vault', 'HashiCorp Vault',

  // Monitoring, Observability & Reliability
  'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Dynatrace', 'Splunk', 'ELK Stack',
  'Elasticsearch', 'Logstash', 'Kibana', 'OpenTelemetry', 'Jaeger', 'CloudWatch',

  // Programming & Scripting
  'Python', 'Go', 'Golang', 'JavaScript', 'TypeScript', 'Node.js', 'Java', 'C#', '.NET',
  'C++', 'Rust', 'Ruby', 'PHP', 'Bash', 'PowerShell', 'Shell', 'SQL',

  // Web & Frameworks
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Express', 'Django', 'FastAPI',
  'Flask', 'Spring Boot', 'GraphQL', 'REST API', 'Microservices', 'HTML5', 'CSS3', 'Tailwind',

  // Databases & Storage
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Oracle',
  'SQLite', 'Kafka', 'RabbitMQ', 'S3',

  // QA, Testing & Security
  'Playwright', 'Cypress', 'Selenium', 'Postman', 'qTest', 'Jest', 'PyTest', 'JUnit',
  'DevSecOps', 'IAM', 'OAuth', 'OIDC', 'SAML', 'TLS', 'Zero Trust', 'Cybersecurity',

  // Networking & Systems
  'Linux', 'Ubuntu', 'RHEL', 'CentOS', 'Debian', 'Windows Server', 'Active Directory',
  'TCP/IP', 'DNS', 'DHCP', 'BGP', 'VPN', 'Firewall', 'Cisco',

  // Practices & Methodologies
  'Agile', 'Scrum', 'Kanban', 'SDLC', 'ITIL', 'Site Reliability Engineering', 'SRE', 'DevOps'
];

/**
 * Parses any uploaded resume File (PDF, DOCX, TXT, MD).
 * @param {File} file
 * @returns {Promise<{text: string, fileName: string, fileType: string}>}
 */
export async function extractTextFromFile(file) {
  const fileName = file.name || 'resume';
  const ext = fileName.split('.').pop().toLowerCase();

  let text = '';

  if (ext === 'txt' || ext === 'md' || ext === 'rtf') {
    text = await readAsPlainText(file);
  } else if (ext === 'pdf') {
    text = await extractPdfText(file);
  } else if (ext === 'docx') {
    text = await extractDocxText(file);
  } else {
    // Fallback attempt text read
    try {
      text = await readAsPlainText(file);
    } catch {
      throw new Error(`Unsupported file format .${ext}. Please use PDF, DOCX, TXT, or MD.`);
    }
  }

  const cleaned = cleanExtractedText(text);
  if (!cleaned || cleaned.trim().length < 30) {
    throw new Error('Unable to extract readable text from this file. The file may be image-only (scanned), empty, or password-protected.');
  }

  return {
    text: cleaned,
    fileName,
    fileType: ext,
  };
}

/**
 * Plain text reader
 */
function readAsPlainText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(new Error('Failed reading text file.'));
    reader.readAsText(file);
  });
}

/**
 * Client-Side PDF text extractor with two layers:
 * Layer 1: pdfjs-dist via CDN if accessible
 * Layer 2: In-browser binary stream scanner & text operator parser
 */
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();

  // Try pdfjs-dist from CDN if network allows
  if (typeof window !== 'undefined') {
    try {
      if (!window.pdfjsLib) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }

      if (window.pdfjsLib) {
        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tokenized = await page.getTextContent();
          const pageText = tokenized.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        if (fullText.trim().length > 40) {
          return fullText;
        }
      }
    } catch (e) {
      console.warn('PDF.js CDN load/extract skipped or failed, using native stream scanner:', e);
    }
  }

  // Native PDF text stream parser fallback
  return parsePdfNativeFallback(arrayBuffer);
}

/**
 * Native PDF parser fallback: finds Flate streams, decompresses and extracts text tokens
 */
async function parsePdfNativeFallback(arrayBuffer) {
  const uint8 = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder('latin1');
  const rawString = textDecoder.decode(uint8);

  const extractedChunks = [];

  // Look for text within raw string patterns (BT ... ET)
  const btRegex = /BT[\s\S]*?ET/g;
  let match;
  while ((match = btRegex.exec(rawString)) !== null) {
    const block = match[0];
    // Extract Tj and TJ strings
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      extractedChunks.push(unescapePdfString(tjMatch[1]));
    }

    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const strRegex = /\((.*?)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        extractedChunks.push(unescapePdfString(strMatch[1]));
      }
    }
  }

  // If text was found via uncompressed BT blocks
  let result = extractedChunks.join(' ').trim();
  if (result.length > 50) {
    return result;
  }

  // Attempt Deflate decompression on FlateDecode streams
  try {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let streamMatch;
    const decompressedTokens = [];

    while ((streamMatch = streamRegex.exec(rawString)) !== null) {
      const streamStartIndex = streamMatch.index + streamMatch[0].indexOf('\n') + 1;
      const streamEndIndex = streamMatch.index + streamMatch[0].lastIndexOf('endstream');
      const streamBytes = uint8.slice(streamStartIndex, streamEndIndex);

      if (streamBytes.length > 10 && typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(streamBytes);
          writer.close();
          const response = new Response(ds.readable);
          const decompressedBuffer = await response.arrayBuffer();
          const decompressedText = new TextDecoder('utf-8').decode(decompressedBuffer);

          const innerTjRegex = /\((.*?)\)\s*Tj/g;
          let m2;
          while ((m2 = innerTjRegex.exec(decompressedText)) !== null) {
            decompressedTokens.push(unescapePdfString(m2[1]));
          }
          const innerArrRegex = /\[(.*?)\]\s*TJ/g;
          while ((m2 = innerArrRegex.exec(decompressedText)) !== null) {
            const inner = m2[1];
            const strRegex = /\((.*?)\)/g;
            let strMatch;
            while ((strMatch = strRegex.exec(inner)) !== null) {
              decompressedTokens.push(unescapePdfString(strMatch[1]));
            }
          }
        } catch {}
      }
    }

    if (decompressedTokens.length > 0) {
      result = decompressedTokens.join(' ').trim();
    }
  } catch (e) {
    console.warn('Native stream decompression encountered error:', e);
  }

  // Last-ditch ASCII word regex filter
  if (!result || result.length < 50) {
    const wordMatches = rawString.match(/[a-zA-Z0-9.,@:\-\/]{3,}/g) || [];
    const filterGarbage = wordMatches.filter(w => !w.startsWith('Obj') && !w.startsWith('xref') && !w.startsWith('stream'));
    if (filterGarbage.length > 30) {
      result = filterGarbage.join(' ');
    }
  }

  return result;
}

function unescapePdfString(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Extracts text from DOCX (Word XML structure)
 */
async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // DOCX is a ZIP file. Search for word/document.xml entry.
  const latin = new TextDecoder('latin1').decode(uint8);
  const xmlMarker = 'word/document.xml';
  const markerIdx = latin.indexOf(xmlMarker);

  if (markerIdx === -1) {
    throw new Error('Invalid DOCX structure: word/document.xml not found.');
  }

  // Look for XML <w:t> tags directly
  const xmlTagRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
  let matches = [];
  let m;
  while ((m = xmlTagRegex.exec(latin)) !== null) {
    matches.push(m[1]);
  }

  if (matches.length > 20) {
    return matches.join(' ');
  }

  // Fallback: search for printable text sequences
  const textStrings = latin.match(/[A-Za-z0-9\s.,@:\-\/]{4,}/g) || [];
  return textStrings.filter(s => !s.includes('schemas.openxmlformats') && !s.includes('xmlns')).join(' ');
}

/**
 * Helper to dynamically load external script once
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function cleanExtractedText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Analyzes parsed resume text and extracts structured profile data + missing item diagnostics.
 * @param {string} resumeText
 * @param {string} [fileName]
 * @returns {Object} Extracted profile payload and diagnostics
 */
export function analyzeResumeText(resumeText, fileName = '') {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = resumeText;

  // 1. Contact & Identity Extraction
  // Email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = fullText.match(emailRegex);
  const email = emailMatch ? emailMatch[0].toLowerCase() : '';

  // Phone
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = fullText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // Name extraction heuristics
  let name = '';
  // Check first 5 non-empty lines for probable name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].replace(/[|•,]/g, ' ').trim();
    if (
      !line.includes('@') &&
      !line.includes('http') &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('phone') &&
      !line.toLowerCase().includes('page') &&
      line.length >= 3 &&
      line.length <= 40 &&
      /^[A-Za-z\s.'-]+$/.test(line)
    ) {
      name = line;
      break;
    }
  }
  if (!name && fileName) {
    const cleaned = fileName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ').replace(/resume|cv/gi, '').trim();
    if (cleaned.length >= 3 && cleaned.length <= 35) {
      name = cleaned;
    }
  }
  if (!name) name = '';

  // Links
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-]+)/i;
  const linkedinMatch = fullText.match(linkedinRegex);
  const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '';

  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-]+)/i;
  const githubMatch = fullText.match(githubRegex);
  const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '';

  // Location heuristic
  const locationRegex = /(?:Location|Address|📍)?\s*([A-Za-z\s]+,\s*[A-Z]{2}(?:\s*\d{5})?)/i;
  const locationMatch = fullText.match(locationRegex);
  const location = locationMatch ? locationMatch[1].trim() : '';

  // 2. Job Title & Seniority Heuristics
  const titlePatterns = [
    /Senior\s+DevOps\s+(?:Engineer|Lead|Architect)/i,
    /DevOps\s+(?:Engineer|Lead|Architect|Specialist)/i,
    /DevSecOps\s+(?:Engineer|Lead|Architect)/i,
    /Platform\s+(?:Engineer|Lead|Architect)/i,
    /Cloud\s+(?:Engineer|Architect|Specialist)/i,
    /Site\s+Reliability\s+Engineer/i,
    /SRE/i,
    /Software\s+Engineering\s+Lead/i,
    /Senior\s+Software\s+Engineer/i,
    /Full\s+Stack\s+(?:Developer|Engineer)/i,
    /Backend\s+(?:Developer|Engineer)/i,
    /Frontend\s+(?:Developer|Engineer)/i,
    /QA\s+(?:Automation\s+)?(?:Lead|Engineer)/i,
    /Infrastructure\s+(?:Engineer|Lead)/i,
    /Systems?\s+(?:Engineer|Administrator)/i,
    /Network\s+Engineer/i,
    /Security\s+Engineer/i,
    /Solutions?\s+Architect/i,
    /Engineering\s+Manager/i,
    /Technical\s+Lead/i
  ];

  let detectedTitle = '';
  for (const pattern of titlePatterns) {
    const m = fullText.match(pattern);
    if (m) {
      detectedTitle = m[0].trim();
      break;
    }
  }
  if (!detectedTitle) {
    detectedTitle = 'Software & DevOps Engineer';
  }

  // 3. Technical Skills Extraction
  const matchedSkills = [];
  const seenSkill = new Set();
  SKILL_TAXONOMY.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9#+])${escaped}([^a-zA-Z0-9#+]|$)`, 'i');
    if (regex.test(fullText)) {
      const canonical = skill;
      if (!seenSkill.has(canonical.toLowerCase())) {
        seenSkill.add(canonical.toLowerCase());
        matchedSkills.push(canonical);
      }
    }
  });

  // 4. Summary / Bio extraction
  let summary = '';
  const summaryHeaderRegex = /(?:Professional\s+Summary|Executive\s+Summary|Summary|About\s+Me|Profile|Objective)[:\s]*\n?([\s\S]*?)(?=\n\s*(?:Skills|Experience|Work\s+History|Employment|Education|Certifications|Projects|\n\n\n))/i;
  const summaryMatch = fullText.match(summaryHeaderRegex);
  if (summaryMatch && summaryMatch[1].trim().length > 30) {
    summary = summaryMatch[1].trim().replace(/\s+/g, ' ').slice(0, 500);
  } else {
    for (let i = 2; i < Math.min(lines.length, 12); i++) {
      if (lines[i].length > 80 && !lines[i].includes('•') && !lines[i].includes('@')) {
        summary = lines[i].slice(0, 400);
        break;
      }
    }
  }

  // 5. Experience Extraction
  const experience = extractExperienceEntries(lines, fullText, detectedTitle, matchedSkills);

  // 6. Education Extraction
  const education = extractEducationEntries(fullText);

  // 7. Certifications Extraction
  const certifications = extractCertifications(fullText);

  // 8. Gap & Missing Fields Diagnostic
  const missingFields = [];
  const recommendedItems = [];

  if (!name) missingFields.push({ field: 'name', label: 'Full Name', reason: 'Could not auto-detect your name from resume header.' });
  if (!email) missingFields.push({ field: 'email', label: 'Email Address', reason: 'An email is required to activate and protect your personal account.' });
  
  if (!phone) recommendedItems.push({ field: 'phone', label: 'Phone Number', tip: 'Recommended for recruiter contact and ATS parsing.' });
  if (!linkedin) recommendedItems.push({ field: 'linkedin', label: 'LinkedIn Profile URL', tip: 'Essential for recruiter visibility and ATS benchmark.' });
  if (!github) recommendedItems.push({ field: 'github', label: 'GitHub Profile URL', tip: 'Demonstrates proof of code and technical depth.' });
  
  if (matchedSkills.length < 5) {
    recommendedItems.push({ field: 'skills', label: 'Technical Skills', tip: 'Less than 5 key skills detected. Adding core tools boosts your ATS score.' });
  }

  // Calculate ATS Readiness Score
  const baseScore = Math.min(70, Math.round((matchedSkills.length / 15) * 60));
  const contactBonus = (email ? 10 : 0) + (phone ? 5 : 0) + (linkedin ? 10 : 0) + (github ? 5 : 0);
  const expBonus = experience.length > 0 ? 10 : 0;
  const initialAtsScore = Math.min(95, Math.max(35, baseScore + contactBonus + expBonus));

  // Construct standard profile object
  const profile = {
    meta: {
      lastUpdated: new Date().toISOString().slice(0, 10),
      targetTitle: detectedTitle,
      targetComp: 175000,
      currentComp: 125000,
      atsScore: initialAtsScore,
      parsedFileName: fileName,
    },
    contact: {
      name: name || '',
      email: email || '',
      phone: phone || '',
      location: location || 'Remote / United States',
      linkedin: linkedin || '',
      github: github || '',
    },
    summary: summary || `Experienced ${detectedTitle} with proven background in building scalable software systems and automated workflows.`,
    leadership: {
      teamSize: experience[0]?.teamSize || '1–5 Engineers',
      scale: 'Individual Contributor / Lead',
    },
    experience: experience,
    skills: matchedSkills,
    certifications: certifications,
    education: education,
    accomplishments: [
      `Streamlined development and infrastructure operations utilizing ${matchedSkills.slice(0, 4).join(', ') || 'modern engineering automation'}.`,
      'Improved release cycle predictability, system reliability, and delivery velocity.'
    ]
  };

  return {
    profile,
    missingFields,
    recommendedItems,
    diagnostics: {
      skillCount: matchedSkills.length,
      initialAtsScore,
      hasContact: !!(email && (phone || linkedin)),
      detectedTitle,
    }
  };
}

function extractExperienceEntries(lines, fullText, fallbackTitle, matchedSkills) {
  const entries = [];
  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*\d{4}\s*[-–—to]+\s*(?:Present|Current|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*\d{4})/i;

  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (dateRegex.test(line) && line.length < 100) {
      if (currentEntry) entries.push(currentEntry);
      
      const prevLine = i > 0 ? lines[i - 1] : '';
      const titleGuess = prevLine && prevLine.length < 60 && !prevLine.includes('•') ? prevLine : fallbackTitle;
      
      currentEntry = {
        id: `exp-${entries.length + 1}`,
        title: titleGuess,
        company: line.split(/[-–—|]/)[0].trim() || 'Enterprise Organization',
        duration: line.match(dateRegex)?.[0] || '2020 – Present',
        teamSize: '1–10 Engineers',
        highlights: []
      };
    } else if (currentEntry && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      const cleanBullet = line.replace(/^[•\-*]\s*/, '').trim();
      if (cleanBullet.length > 15) {
        currentEntry.highlights.push(cleanBullet);
      }
    }
  }
  if (currentEntry) entries.push(currentEntry);

  if (entries.length === 0) {
    entries.push({
      id: 'exp-1',
      title: fallbackTitle,
      company: 'Current Organization',
      duration: 'Present',
      teamSize: 'Cross-Functional Squad',
      highlights: matchedSkills.length > 0 
        ? [`Spearheaded technical solutions and automation leveraging ${matchedSkills.slice(0, 5).join(', ')}.`]
        : ['Designed, developed, and deployed high-reliability software services.']
    });
  }

  return entries.slice(0, 5);
}

function extractEducationEntries(fullText) {
  const education = [];
  const degreeRegex = /(?:Bachelor|Master|B\.S\.|M\.S\.|Associate|B\.A\.|Ph\.D\.|Degree)[^.\n]{5,60}/gi;
  const matches = fullText.match(degreeRegex) || [];
  
  matches.forEach(m => {
    education.push({
      degree: m.trim(),
      institution: 'University / Accredited Institution',
      year: 'Graduated'
    });
  });

  if (education.length === 0) {
    education.push({
      degree: 'B.S. in Computer Science / Related Field',
      institution: 'Accredited University',
      year: 'Completed'
    });
  }

  return education.slice(0, 3);
}

function extractCertifications(fullText) {
  const certs = [];
  const certKeywords = [
    'AWS Certified', 'Solutions Architect', 'Cloud Practitioner', 'Kubernetes Administrator',
    'CKA', 'CKAD', 'CKS', 'Azure Certified', 'GCP Certified', 'CISSP', 'CompTIA', 'Security+',
    'Network+', 'Terraform Associate', 'Certified Scrum Master', 'CSM', 'PMP'
  ];

  certKeywords.forEach(ck => {
    if (new RegExp(`\\b${ck}\\b`, 'i').test(fullText)) {
      certs.push(ck);
    }
  });

  return certs;
}
