// ── Constants ─────────────────────────────────────────────────────
const POLLINATIONS_AUTH = 'https://enter.pollinations.ai/authorize';
const CHAT_API          = 'https://gen.pollinations.ai/v1/chat/completions';
const BALANCE_API       = 'https://gen.pollinations.ai/account/balance';
const IMAGE_API         = 'https://gen.pollinations.ai/image/';
const LS_KEY            = 'myol_pollinations_key';

// ── Profanity Filter ──────────────────────────────────────────────
const BLOCKED = [
  'fuck','fucking','fucker','shit','shitting','ass','asshole','bitch','bitches',
  'cunt','bastard','piss','cock','dick','pussy','whore','slut','nigger','nigga',
  'faggot','fag','retard','retarded','damn','crap','porn','sex','nude','naked',
  'kill','rape','racist','nazi','hate'
];
function hasProfanity(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return BLOCKED.filter(w => words.includes(w));
}

// ── Data ──────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'hero_features_cta',
    name: 'Hero + Features',
    desc: 'Classic layout',
    images: { hero_background: 1 },
    sections: ['hero','features','contact','footer']
  },
  {
    key: 'minimal_single_cta',
    name: 'Minimal CTA',
    desc: 'Ultra-focused',
    images: { hero_image: 1 },
    sections: ['minimal_hero','single_cta','footer']
  },
  {
    key: 'testimonial_pricing',
    name: 'Testimonials + Pricing',
    desc: 'Social proof',
    images: { hero_image: 1, testimonial_avatars: 3 },
    sections: ['hero','testimonials','pricing','cta','footer']
  },
  {
    key: 'full_feature_showcase',
    name: 'Full Showcase',
    desc: 'Complete page',
    images: { hero_background: 1, about_image: 1, feature_icons: 3 },
    sections: ['hero','about','features','testimonials','cta','footer']
  },
  {
    key: 'portfolio_grid',
    name: 'Portfolio Grid',
    desc: 'Visual gallery',
    images: { hero_image: 1, portfolio_items: 6 },
    sections: ['hero','portfolio','about','contact','footer']
  },
  {
    key: 'landing_with_timeline',
    name: 'Story Timeline',
    desc: 'Step-by-step',
    images: { hero_background: 1, timeline_steps: 4 },
    sections: ['hero','timeline','benefits','cta','footer']
  }
];

const STYLES = [
  'Glassmorphism','Neo-Brutalism','Minimalist',
  'Gradient Mesh','Dark Mode','Retro 80s','Organic Shapes'
];

const PALETTES = [
  { name: 'Coral & Teal',    colors: ['#FF6B6B','#4ECDC4','#45B7D1'] },
  { name: 'Deep Blue',       colors: ['#2D3561','#C05746','#E7B67C'] },
  { name: 'Dark Electric',   colors: ['#1A1A2E','#0F3460','#E94560'] },
  { name: 'Neon Purple',     colors: ['#F72585','#7209B7','#4361EE'] },
  { name: 'Vivid Pop',       colors: ['#FFBE0B','#FB5607','#FF006E'] },
  { name: 'Cyber Green',     colors: ['#06FFA5','#00D9FF','#A100FF'] }
];

const MODELS = ['flux','zimage','grok-imagine','klein','gptimage'];

// ── State ─────────────────────────────────────────────────────────
let apiKey          = null;
let selTemplate     = TEMPLATES[0];
let selStyle        = STYLES[0];
let selPalette      = PALETTES[0];
let selModel        = 'flux';
let generatedHTML   = null;

// ── DOM ───────────────────────────────────────────────────────────
const authBadge     = document.getElementById('authBadge');
const connectBtn    = document.getElementById('connectBtn');
const connectCard   = document.getElementById('connectCard');
const generateBtn   = document.getElementById('generateBtn');
const generateHint  = document.getElementById('generateHint');
const resultEmpty   = document.getElementById('resultEmpty');
const progressWrap  = document.getElementById('progressWrap');
const progressLabel = document.getElementById('progressLabel');
const progressFill  = document.getElementById('progressFill');
const progressSteps = document.getElementById('progressSteps');
const resultContent = document.getElementById('resultContent');
const resultTitle   = document.getElementById('resultTitle');
const previewFrame  = document.getElementById('previewFrame');
const downloadBtn   = document.getElementById('downloadBtn');
const regenBtn      = document.getElementById('regenBtn');
const enableImages  = document.getElementById('enableImages');
const modelWrap     = document.getElementById('modelWrap');

// ── Auth ──────────────────────────────────────────────────────────
function initAuth() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const fromUrl = hash.get('api_key');
  if (fromUrl) {
    apiKey = fromUrl;
    localStorage.setItem(LS_KEY, apiKey);
    try { history.replaceState(null, '', location.pathname); } catch {}
  } else {
    apiKey = localStorage.getItem(LS_KEY);
  }
  renderAuthState();
}

async function fetchBalance() {
  console.log('[MYOL] fetchBalance called, key:', apiKey ? apiKey.slice(0,8)+'…' : 'null');
  try {
    const res = await fetch(BALANCE_API, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    console.log('[MYOL] balance status:', res.status);
    const label = document.getElementById('balanceLabel');
    if (!label) { console.log('[MYOL] balanceLabel not found'); return; }
    if (res.status === 403) {
      label.innerHTML = '<span style="color:#f59e0b;font-size:0.7rem;cursor:pointer" title="Reconnect to grant balance permission" onclick="connectPollinations()">⚠ reconnect</span>';
      return;
    }
    if (!res.ok) {
      const txt = await res.text();
      console.log('[MYOL] balance non-ok:', res.status, txt);
      label.textContent = `⚠ ${res.status}`;
      return;
    }
    const raw = await res.text();
    console.log('[MYOL] balance raw:', raw);
    const data = JSON.parse(raw);
    const bal  = typeof data === 'number' ? data
      : (data.balance ?? data.pollen ?? data.credits ?? data.amount ?? parseFloat(raw));
    label.textContent = (bal !== null && !isNaN(bal)) ? `🌸 ${Number(bal).toFixed(2)}` : `🌸 ${raw}`;
  } catch (e) { console.log('[MYOL] balance error:', e.message); }
}

function renderAuthState() {
  if (apiKey) {
    authBadge.className = 'auth-badge connected';
    authBadge.innerHTML = '<span class="auth-dot"></span><span class="auth-label">Connected</span><span class="auth-sep">·</span><span id="balanceLabel" class="balance-label">🌸 …</span>';
    fetchBalance();
    connectCard.innerHTML = `
      <div class="card-title"><span class="step-num">1</span> Connect</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:0.8rem;color:#4ade80">✓ Pollinations connected</span>
        <button class="btn-disconnect" id="disconnectBtn">Disconnect</button>
      </div>`;
    document.getElementById('disconnectBtn').addEventListener('click', disconnect);
    updateGenerateBtn();
  } else {
    authBadge.className = 'auth-badge disconnected';
    authBadge.innerHTML = '<span class="auth-dot"></span><span class="auth-label">Not connected</span>';
    connectCard.innerHTML = `
      <div class="card-title"><span class="step-num">1</span> Connect</div>
      <button id="connectBtn" class="btn-connect">🌸 Connect with Pollinations</button>
      <p class="hint">Your Pollinations account pays for generation — <a href="https://pollinations.ai" target="_blank" rel="noopener">free to sign up</a>.</p>`;
    document.getElementById('connectBtn').addEventListener('click', connectPollinations);
    generateBtn.disabled = true;
    generateHint.textContent = 'Connect with Pollinations to start';
  }
}

function connectPollinations() {
  const params = new URLSearchParams({
    redirect_url: location.href,
    permissions:  'balance'
  });
  window.location.href = `${POLLINATIONS_AUTH}?${params}`;
}

function disconnect() {
  apiKey = null;
  localStorage.removeItem(LS_KEY);
  renderAuthState();
}

// ── Form Validation ───────────────────────────────────────────────
function setFieldError(inputId, errId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (msg) {
    input.classList.add('error');
    err.textContent = msg;
    return false;
  }
  input.classList.remove('error');
  err.textContent = '';
  return true;
}

function validateField(inputId, errId, required = false) {
  const val = document.getElementById(inputId).value.trim();
  if (required && !val) return setFieldError(inputId, errId, 'This field is required.');
  if (val) {
    const bad = hasProfanity(val);
    if (bad.length) return setFieldError(inputId, errId, 'Please remove inappropriate language.');
  }
  return setFieldError(inputId, errId, '');
}

function validateEmail(val) {
  return !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function validateAll() {
  const n  = validateField('businessName', 'nameErr', true);
  const t  = validateField('tagline',      'taglineErr');
  const d  = validateField('description',  'descErr');
  const em = document.getElementById('contactEmail').value.trim();
  const ev = validateEmail(em) ? setFieldError('contactEmail','emailErr','') : setFieldError('contactEmail','emailErr','Invalid email address.');
  return n && t && d && ev;
}

function updateGenerateBtn() {
  const name = document.getElementById('businessName').value.trim();
  if (!apiKey) {
    generateBtn.disabled = true;
    generateHint.textContent = 'Connect with Pollinations to start';
  } else if (!name) {
    generateBtn.disabled = true;
    generateHint.textContent = 'Enter a business name to continue';
  } else {
    generateBtn.disabled = false;
    generateHint.textContent = `~${countImages()} image${countImages() !== 1 ? 's' : ''} + HTML will be generated`;
  }
}

function countImages() {
  if (!enableImages.checked) return 0;
  return Object.values(selTemplate.images).reduce((a, b) => a + b, 0);
}

// ── Render UI ─────────────────────────────────────────────────────
function renderTemplates() {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const imgCount = Object.values(t.images).reduce((a, b) => a + b, 0);
    const card = document.createElement('div');
    card.className = 'template-card' + (t.key === selTemplate.key ? ' active' : '');
    card.innerHTML = `<div class="tpl-name">${t.name}</div>
      <div class="tpl-meta">${t.desc} · ${imgCount} img${imgCount !== 1 ? 's' : ''}</div>`;
    card.addEventListener('click', () => {
      selTemplate = t;
      renderTemplates();
      updateGenerateBtn();
    });
    grid.appendChild(card);
  });
}

function renderStyles() {
  const wrap = document.getElementById('stylePills');
  wrap.innerHTML = '';
  STYLES.forEach(s => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (s === selStyle ? ' active' : '');
    pill.textContent = s;
    pill.addEventListener('click', () => { selStyle = s; renderStyles(); });
    wrap.appendChild(pill);
  });
}

function renderPalettes() {
  const wrap = document.getElementById('paletteGrid');
  wrap.innerHTML = '';
  PALETTES.forEach(p => {
    const item = document.createElement('div');
    item.className = 'palette-item' + (p.name === selPalette.name ? ' active' : '');
    const swatches = p.colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join('');
    item.innerHTML = `<div class="palette-swatches">${swatches}</div><span class="palette-name">${p.name}</span>`;
    item.addEventListener('click', () => { selPalette = p; renderPalettes(); });
    wrap.appendChild(item);
  });
}

function renderModels() {
  const wrap = document.getElementById('modelPills');
  wrap.innerHTML = '';
  MODELS.forEach(m => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (m === selModel ? ' active' : '');
    pill.textContent = m;
    pill.addEventListener('click', () => { selModel = m; renderModels(); });
    wrap.appendChild(pill);
  });
}

// ── Progress ──────────────────────────────────────────────────────
let steps = [];

function initProgress(stepList) {
  steps = stepList.map(s => ({ label: s, status: 'pending' }));
  resultEmpty.hidden    = true;
  resultContent.hidden  = true;
  progressWrap.hidden   = false;
  renderProgressSteps();
  setProgressPct(0);
}

function renderProgressSteps() {
  progressSteps.innerHTML = '';
  steps.forEach(s => {
    const el = document.createElement('div');
    el.className = 'progress-step ' + s.status;
    const icon = s.status === 'done' ? '✓' : s.status === 'active' ? '⟳' : '·';
    el.innerHTML = `<span class="ps-icon">${icon}</span><span class="ps-text">${s.label}</span>`;
    progressSteps.appendChild(el);
  });
}

function setStep(idx, status, label) {
  if (idx < steps.length) {
    steps[idx].status = status;
    if (label) steps[idx].label = label;
  }
  renderProgressSteps();
  const done = steps.filter(s => s.status === 'done').length;
  setProgressPct(Math.round((done / steps.length) * 100));
  progressLabel.textContent = steps.find(s => s.status === 'active')?.label || 'Processing…';
}

function setProgressPct(pct) {
  progressFill.style.width = pct + '%';
}

// ── Image Generation ──────────────────────────────────────────────
function getImagePrompt(type, purpose, style, palette) {
  const dominant = palette.colors[0];
  const map = {
    hero_background:  `Abstract modern background for ${purpose}, ${style} aesthetic, ${dominant} dominant color, professional, web design`,
    hero_image:       `Professional hero image for ${purpose}, ${style} style, modern, clean, inspiring`,
    testimonial_avatars: `Professional headshot portrait, friendly person, ${style} aesthetic, high quality`,
    about_image:      `Professional lifestyle photo for ${purpose}, ${style} style, warm, inviting`,
    feature_icons:    `Clean icon illustration for ${purpose}, ${style} style, minimal, colorful`,
    portfolio_items:  `Portfolio showcase image for ${purpose}, ${style} aesthetic, professional`,
    timeline_steps:   `Step illustration for ${purpose} process, ${style} style, clear, professional`
  };
  return map[type] || `Professional image for ${purpose}, ${style} style`;
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchImage(prompt, model) {
  const url = `${IMAGE_API}${encodeURIComponent(prompt)}?model=${model}&width=1200&height=800&nologo=true&private=true&seed=${Math.floor(Math.random()*999999)}&key=${apiKey}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`Image API ${res.status}`);
  const blob = await res.blob();
  return blobToBase64(blob);
}

// ── HTML Generation ───────────────────────────────────────────────
function getTemplateInstructions(key, hasImages) {
  const I = hasImages;
  const map = {
    hero_features_cta: `
1. HERO: Large headline, subheadline, CTA button${I ? ', use BASE64_IMAGE_0 as background' : ', gradient background'}
2. FEATURES: Grid of 3 feature cards with Unicode icons (⚡ ✨ 🚀), titles, descriptions
3. CONTACT: Email signup form with input and submit button
4. FOOTER: Copyright and social links (text only)
IMPORTANT: Unicode emoji only for icons. NO external icon libraries.`,

    minimal_single_cta: `
1. MINIMAL HERO: Centered layout${I ? ', large hero image (BASE64_IMAGE_0)' : ', bold typography'}
2. SINGLE CTA: One prominent call-to-action button
3. FOOTER: Minimal text only`,

    testimonial_pricing: `
1. HERO: Compelling headline${I ? ' with image (BASE64_IMAGE_0)' : ''}
2. TESTIMONIALS: 3 cards${I ? ' with avatars (BASE64_IMAGE_1, BASE64_IMAGE_2, BASE64_IMAGE_3)' : ' with initials in circles'}
3. PRICING: 3 tiers with feature lists (Unicode checkmarks ✓)
4. CTA: Strong call-to-action
5. FOOTER: Links and copyright`,

    full_feature_showcase: `
1. HERO: Full-screen${I ? ' with background (BASE64_IMAGE_0)' : ' gradient'}, headline, subheadline, CTA
2. ABOUT: Two-column layout${I ? ' with image (BASE64_IMAGE_1)' : ''}, describing the business
3. FEATURES: Grid of 6 features${I ? ' (icons: BASE64_IMAGE_2, BASE64_IMAGE_3, BASE64_IMAGE_4)' : ' with Unicode emoji'}
4. TESTIMONIALS: 2-3 customer quotes
5. CTA: Final section with email signup
6. FOOTER: Multi-column footer`,

    portfolio_grid: `
1. HERO: Clean hero${I ? ' with image (BASE64_IMAGE_0)' : ''}
2. PORTFOLIO: Masonry grid of 6 items${I ? ' (BASE64_IMAGE_1 through BASE64_IMAGE_6)' : ''}, CSS hover effects only, NO lightbox libraries
3. ABOUT: Brief bio with skills list
4. CONTACT: Simple form
5. FOOTER: Social links`,

    landing_with_timeline: `
1. HERO: Impactful${I ? ' with background (BASE64_IMAGE_0)' : ' animated gradient'}
2. TIMELINE: 4 steps${I ? ' with images (BASE64_IMAGE_1 through BASE64_IMAGE_4)' : ', numbered circles'}, vertical line connecting them
3. BENEFITS: 3-column cards with Unicode icons
4. CTA: Strong final section
5. FOOTER: Links and social`
  };
  return map[key] || 'Create the sections listed with professional design';
}

async function generateHTML(formData, images) {
  const system = `You are a web developer. Output ONLY HTML code.
RULES:
1. Start with <!DOCTYPE html>, end with </html>
2. Put ALL CSS in <style> tags in <head>
3. Put ALL JavaScript in <script> tags before </body>
4. NO external files, CDN links, or remote resources whatsoever
5. NO explanations, NO markdown, NO code fences
6. If image placeholders are given (BASE64_IMAGE_0, etc.), use them EXACTLY as src attribute values — do NOT add any prefix
7. Use Unicode emoji only for icons (❤️ ⭐ 🚀) — NO icon fonts or libraries
OUTPUT: Just the HTML. Nothing else.`;

  const hasImages = Object.keys(images).length > 0;
  const palette   = formData.palette.colors.join(', ');
  const purpose   = formData.name + (formData.description ? ' — ' + formData.description : '');

  let prompt = `Create a ${formData.template.name} landing page.

BUSINESS DETAILS:
- Name: ${formData.name}
- Tagline: ${formData.tagline || 'not provided'}
- Description: ${formData.description || 'not provided'}
- Contact email: ${formData.email || 'not provided'}

TEMPLATE: ${formData.template.name}
SECTIONS: ${formData.template.sections.join(', ')}
STYLE: ${formData.style}
COLORS: ${palette}

STRUCTURE:
${getTemplateInstructions(formData.template.key, hasImages)}`;

  if (hasImages) {
    prompt += '\n\n⚠️ IMAGES PROVIDED — USE PLACEHOLDERS EXACTLY:\n';
    Object.keys(images).forEach((k, i) => {
      prompt += `- BASE64_IMAGE_${i} (for ${k})\n`;
    });
    prompt += '\nExample: <img src="BASE64_IMAGE_0" alt="description">\nDO NOT add any prefix like data:image/jpeg;base64,';
  }

  prompt += `\n\nGENERAL:
- Fully responsive (mobile-first)
- Modern CSS (flexbox/grid)
- Smooth hover/scroll animations
- Professional typography
- NO external CDN links
- Output ONLY the complete HTML`;

  const res = await fetch(CHAT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai',
      seed:  Math.floor(Math.random() * 999999),
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: 'OUTPUT ONLY RAW HTML CODE. NO EXPLANATIONS. NO MARKDOWN.\n\n' + prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`Text API ${res.status}`);
  const json = await res.json();
  let html = json?.choices?.[0]?.message?.content || '';
  if (!html) throw new Error('Empty response from text API.');

  // Strip markdown fences if any
  html = html.replace(/^```(?:html)?\s*\n?/im, '').replace(/\n?```\s*$/im, '').trim();

  // Replace image placeholders
  Object.values(images).forEach((base64, i) => {
    html = html.replaceAll(`BASE64_IMAGE_${i}`, base64);
  });

  // Basic validation
  if (!/<html/i.test(html) || !/<body/i.test(html)) {
    throw new Error('Generated HTML appears invalid. Try regenerating.');
  }

  return html;
}

// ── Main Generate ─────────────────────────────────────────────────
async function generate() {
  if (!validateAll()) return;

  const formData = {
    name:        document.getElementById('businessName').value.trim(),
    tagline:     document.getElementById('tagline').value.trim(),
    description: document.getElementById('description').value.trim(),
    email:       document.getElementById('contactEmail').value.trim(),
    template:    selTemplate,
    style:       selStyle,
    palette:     selPalette
  };

  const withImages = enableImages.checked;
  const imgEntries = withImages ? Object.entries(selTemplate.images) : [];
  const totalImages = imgEntries.reduce((a, [, c]) => a + c, 0);

  // Build step list
  const stepList = [];
  imgEntries.forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      stepList.push(`Image: ${type.replace(/_/g,' ')} ${count > 1 ? i+1 : ''}`);
    }
  });
  stepList.push('Generating HTML…');
  initProgress(stepList);

  generateBtn.disabled = true;

  try {
    const images   = {};
    let stepIdx    = 0;

    // Generate images
    for (const [type, count] of imgEntries) {
      for (let i = 0; i < count; i++) {
        setStep(stepIdx, 'active');
        const prompt = getImagePrompt(type, formData.name + ' ' + formData.description, formData.style, formData.palette);
        try {
          const base64 = await fetchImage(prompt, selModel);
          images[`${type}_${i}`] = base64;
          setStep(stepIdx, 'done');
        } catch {
          setStep(stepIdx, 'done', `⚠ ${type} (skipped)`);
        }
        stepIdx++;
      }
    }

    // Generate HTML
    setStep(stepIdx, 'active');
    const html = await generateHTML(formData, images);
    setStep(stepIdx, 'done');
    setProgressPct(100);

    generatedHTML = html;
    resultTitle.textContent = formData.name;

    await new Promise(r => setTimeout(r, 400));
    progressWrap.hidden  = true;
    resultContent.hidden = false;
    previewFrame.srcdoc  = html;

  } catch (err) {
    progressLabel.textContent = '⚠ ' + (err.message || 'Generation failed. Try again.');
    setProgressPct(0);
  } finally {
    generateBtn.disabled = false;
    updateGenerateBtn();
  }
}

// ── Download ──────────────────────────────────────────────────────
function download() {
  if (!generatedHTML) return;
  const name = document.getElementById('businessName').value.trim().replace(/\s+/g,'-').toLowerCase() || 'landing-page';
  const blob = new Blob([generatedHTML], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Init ──────────────────────────────────────────────────────────
renderTemplates();
renderStyles();
renderPalettes();
renderModels();
initAuth();

// Live validation + button state
document.getElementById('businessName').addEventListener('input', () => {
  validateField('businessName','nameErr', true);
  updateGenerateBtn();
});
['tagline','description'].forEach(id => {
  document.getElementById(id).addEventListener('blur', () => validateField(id, id.replace(/[a-z]+$/,'')+'Err'));
});
document.getElementById('contactEmail').addEventListener('blur', () => {
  const val = document.getElementById('contactEmail').value.trim();
  validateEmail(val)
    ? setFieldError('contactEmail','emailErr','')
    : setFieldError('contactEmail','emailErr','Invalid email address.');
});
enableImages.addEventListener('change', () => {
  modelWrap.style.opacity = enableImages.checked ? '1' : '0.3';
  updateGenerateBtn();
});

generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', download);
regenBtn.addEventListener('click', generate);
