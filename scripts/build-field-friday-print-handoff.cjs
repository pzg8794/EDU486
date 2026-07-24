#!/usr/bin/env node

/**
 * Build the Field Friday print-shop handoff.
 *
 * The SEND-TO-UPS folder contains only PDFs that should be printed. Copy counts
 * are embedded in each PDF so the print shop prints every file exactly once.
 * Source notes and visual-review material stay outside that folder.
 *
 * This script never deletes or overwrites an existing package.
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const lucide = require("lucide");

const repoRoot = path.resolve(__dirname, "..");
const defaultOutput = path.join(
  repoRoot,
  "_local-course-materials",
  "print-packages",
  "2026-07-24-field-friday-print-handoff-v8"
);

const outputRoot = path.resolve(process.argv[2] || defaultOutput);
const sendDir = path.join(outputRoot, "01-SEND-TO-UPS-PRINT-ONLY");
const referenceDir = path.join(
  outputRoot,
  "02-FOR-PITER-AND-AASTHA-REFERENCE-DO-NOT-SEND"
);

if (fs.existsSync(outputRoot)) {
  throw new Error(
    `Refusing to overwrite existing package: ${outputRoot}\n` +
      "Choose a new output path so earlier work remains preserved."
  );
}

fs.mkdirSync(sendDir, { recursive: true });
fs.mkdirSync(referenceDir, { recursive: true });

const COLORS = {
  ink: "#173042",
  muted: "#4B6372",
  paper: "#FFFFFF",
  page: "#F5F8FA",
  line: "#C9D5DC",
  science: "#2166AC",
  scienceSoft: "#E8F2FC",
  evidence: "#23845A",
  evidenceSoft: "#E6F5ED",
  action: "#C44C3E",
  actionSoft: "#FCEAE7",
  access: "#7C3F98",
  accessSoft: "#F3EAF7",
  joy: "#D98300",
  joySoft: "#FFF2CF",
  neutralSoft: "#EDF2F5",
  black: "#111111",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconSvg(name, size = 28, strokeWidth = 2) {
  const icon = lucide[name];
  if (!icon) {
    throw new Error(`Unknown Lucide icon: ${name}`);
  }

  const children = icon
    .map(([tag, attrs]) => {
      const serialized = Object.entries(attrs)
        .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
        .join(" ");
      return `<${tag} ${serialized}></${tag}>`;
    })
    .join("");

  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function iconBadge(name, tone = "science", size = 30) {
  return `<span class="icon-badge ${tone}">${iconSvg(name, size)}</span>`;
}

function sectionTag(label, tone = "science", iconName = null) {
  return `<div class="section-tag ${tone}">${
    iconName ? iconSvg(iconName, 17, 2.2) : ""
  }<span>${escapeHtml(label)}</span></div>`;
}

function lineField(label, width = "100%") {
  return `<div class="line-field" style="width:${width}"><span>${escapeHtml(
    label
  )}</span><i></i></div>`;
}

function writingLines(count = 2) {
  return `<div class="writing-lines">${Array.from(
    { length: count },
    () => "<i></i>"
  ).join("")}</div>`;
}

function checkbox(label) {
  return `<span class="check"><b></b>${escapeHtml(label)}</span>`;
}

function baseStyles(orientation = "portrait") {
  const size =
    orientation === "landscape" ? "11in 8.5in" : "8.5in 11in";

  return `
    @page { size: ${size}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; }
    body {
      color: ${COLORS.ink};
      font-family: Verdana, Arial, sans-serif;
      letter-spacing: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: relative;
      width: ${orientation === "landscape" ? "11in" : "8.5in"};
      height: ${orientation === "landscape" ? "8.5in" : "11in"};
      padding: ${orientation === "landscape" ? "0.48in 0.58in" : "0.48in 0.55in"};
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      background: ${COLORS.paper};
    }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    h1, h2, h3, p { margin: 0; }
    h1 {
      font-size: ${orientation === "landscape" ? "30pt" : "25pt"};
      line-height: 1.12;
      letter-spacing: 0;
    }
    h2 { font-size: 18pt; line-height: 1.18; }
    h3 { font-size: 13pt; line-height: 1.22; }
    p, li { font-size: 11pt; line-height: 1.42; }
    strong { font-weight: 700; }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.1in;
      margin-bottom: 0.12in;
      color: ${COLORS.muted};
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.18in;
    }
    .title-copy { flex: 1; min-width: 0; }
    .subtitle {
      margin-top: 0.1in;
      color: ${COLORS.muted};
      font-size: 11.5pt;
      line-height: 1.38;
    }
    .icon-badge {
      width: 0.62in;
      height: 0.62in;
      flex: 0 0 0.62in;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 2px solid currentColor;
      border-radius: 8px;
      background: white;
    }
    .icon-badge.science { color: ${COLORS.science}; background: ${COLORS.scienceSoft}; }
    .icon-badge.evidence { color: ${COLORS.evidence}; background: ${COLORS.evidenceSoft}; }
    .icon-badge.action { color: ${COLORS.action}; background: ${COLORS.actionSoft}; }
    .icon-badge.access { color: ${COLORS.access}; background: ${COLORS.accessSoft}; }
    .icon-badge.joy { color: ${COLORS.joy}; background: ${COLORS.joySoft}; }
    .section-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.07in;
      padding: 0.055in 0.09in;
      border-left: 0.08in solid currentColor;
      color: ${COLORS.ink};
      font-size: 9pt;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
      background: ${COLORS.neutralSoft};
    }
    .section-tag.science { border-color: ${COLORS.science}; background: ${COLORS.scienceSoft}; }
    .section-tag.evidence { border-color: ${COLORS.evidence}; background: ${COLORS.evidenceSoft}; }
    .section-tag.action { border-color: ${COLORS.action}; background: ${COLORS.actionSoft}; }
    .section-tag.access { border-color: ${COLORS.access}; background: ${COLORS.accessSoft}; }
    .section-tag.joy { border-color: ${COLORS.joy}; background: ${COLORS.joySoft}; }
    .section-tag.stop { border-color: ${COLORS.action}; background: ${COLORS.actionSoft}; }
    .top-rule {
      height: 0.06in;
      margin: 0.18in 0 0.16in;
      background: linear-gradient(90deg,
        ${COLORS.science} 0 24%,
        ${COLORS.evidence} 24% 49%,
        ${COLORS.joy} 49% 74%,
        ${COLORS.action} 74% 100%);
    }
    .footer {
      position: absolute;
      left: 0.55in;
      right: 0.55in;
      bottom: 0.25in;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.08in;
      border-top: 1px solid ${COLORS.line};
      color: ${COLORS.muted};
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .callout {
      padding: 0.14in 0.16in;
      border-left: 0.08in solid ${COLORS.science};
      background: ${COLORS.scienceSoft};
    }
    .callout.evidence { border-color: ${COLORS.evidence}; background: ${COLORS.evidenceSoft}; }
    .callout.action { border-color: ${COLORS.action}; background: ${COLORS.actionSoft}; }
    .callout.access { border-color: ${COLORS.access}; background: ${COLORS.accessSoft}; }
    .callout.joy { border-color: ${COLORS.joy}; background: ${COLORS.joySoft}; }
    .callout p { font-size: 10.5pt; line-height: 1.36; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.16in; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.14in; }
    .stack { display: grid; gap: 0.12in; }
    .panel {
      border: 1.3px solid ${COLORS.line};
      padding: 0.13in 0.15in;
      background: white;
    }
    .panel h3 { margin-bottom: 0.06in; }
    .line-field {
      display: flex;
      align-items: end;
      gap: 0.07in;
      min-height: 0.22in;
      font-size: 9.5pt;
      font-weight: 700;
    }
    .line-field i {
      display: block;
      flex: 1;
      min-width: 0.35in;
      border-bottom: 1.2px solid ${COLORS.ink};
    }
    .writing-lines { display: grid; gap: 0.16in; padding-top: 0.08in; }
    .writing-lines i { display: block; border-bottom: 1px solid ${COLORS.muted}; height: 0.14in; }
    .check-row { display: flex; flex-wrap: wrap; gap: 0.08in 0.16in; }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 0.055in;
      font-size: 9.5pt;
      line-height: 1.2;
    }
    .check b {
      display: inline-block;
      width: 0.14in;
      height: 0.14in;
      flex: 0 0 0.14in;
      border: 1.2px solid ${COLORS.ink};
      background: white;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.14in;
    }
    .step {
      min-height: 1.25in;
      border: 2px solid ${COLORS.line};
      padding: 0.13in;
      display: grid;
      grid-template-columns: 0.44in 1fr;
      gap: 0.11in;
      align-items: start;
    }
    .step .step-icon {
      width: 0.42in;
      height: 0.42in;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      background: ${COLORS.science};
      border-radius: 50%;
    }
    .step strong {
      display: block;
      margin-bottom: 0.03in;
      font-size: 11pt;
      text-transform: uppercase;
    }
    .step p { font-size: 9.8pt; line-height: 1.32; }
    .sequence {
      display: flex;
      align-items: stretch;
      gap: 0.08in;
    }
    .sequence .node {
      flex: 1;
      min-width: 0;
      padding: 0.1in 0.08in;
      display: grid;
      place-items: center;
      border: 1.5px solid ${COLORS.line};
      background: white;
      font-size: 8.8pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
    }
    .sequence .arrow {
      display: grid;
      place-items: center;
      color: ${COLORS.muted};
    }
    .cut-line {
      position: absolute;
      left: 0.28in;
      right: 0.28in;
      top: 5.5in;
      border-top: 1.5px dashed ${COLORS.muted};
    }
    .cut-label {
      position: absolute;
      left: 50%;
      top: 5.39in;
      transform: translateX(-50%);
      padding: 0 0.08in;
      background: white;
      color: ${COLORS.muted};
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
  `;
}

function documentHtml(pages, orientation = "portrait", extraStyles = "") {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>${baseStyles(orientation)}${extraStyles}</style>
    </head>
    <body>${pages.join("")}</body>
  </html>`;
}

function footer(pageLabel, right = "Get Real! Science Camp | Invisible Invaders") {
  return `<div class="footer"><span>${escapeHtml(right)}</span><span>${escapeHtml(
    pageLabel
  )}</span></div>`;
}

async function renderPdf(browser, filePath, pages, orientation, extraStyles = "") {
  const page = await browser.newPage();
  await page.setContent(documentHtml(pages, orientation, extraStyles), {
    waitUntil: "load",
  });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: filePath,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await page.close();
}

function header({
  eyebrow,
  title,
  subtitle,
  icon = "Search",
  tone = "science",
}) {
  return `
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>
    <div class="title-row">
      ${iconBadge(icon, tone, 31)}
      <div class="title-copy">
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </div>
    <div class="top-rule"></div>
  `;
}

function visualSequencePages() {
  const sequenceLabels = [
    "Case",
    "Predict",
    "Look",
    "Magnify",
    "Match",
    "Reflect",
    "Sample",
    "Wonder",
  ];
  const seq = `<div class="sequence">${sequenceLabels
    .map(
      (label, index) =>
        `${index ? `<span class="arrow">${iconSvg("MoveRight", 16)}</span>` : ""}<span class="node">${escapeHtml(
          label
        )}</span>`
    )
    .join("")}</div>`;

  const visualCss = `
    .visual-main { margin-top: 0.2in; }
    .visual-question {
      margin-top: 0.18in;
      padding: 0.2in;
      border-left: 0.1in solid ${COLORS.science};
      background: ${COLORS.scienceSoft};
      font-size: 18pt;
      line-height: 1.3;
      font-weight: 700;
    }
    .visual-big {
      font-size: 24pt;
      line-height: 1.28;
      font-weight: 700;
    }
    .visual-list {
      margin: 0.18in 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.14in;
      list-style: none;
    }
    .visual-list li {
      min-height: 1.25in;
      padding: 0.13in;
      border: 2px solid ${COLORS.line};
      display: grid;
      grid-template-columns: 0.45in 1fr;
      gap: 0.1in;
      align-items: start;
      font-size: 12pt;
      line-height: 1.35;
    }
    .visual-list .mini-icon {
      color: ${COLORS.science};
    }
    .route-grid {
      margin-top: 0.18in;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.12in;
    }
    .route {
      min-height: 1.05in;
      padding: 0.11in;
      border: 2px solid ${COLORS.access};
      background: ${COLORS.accessSoft};
      display: flex;
      align-items: center;
      gap: 0.1in;
      font-size: 11pt;
      font-weight: 700;
    }
    .route svg { flex: 0 0 auto; }
    .model-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.18in;
      margin-top: 0.18in;
    }
    .model-column {
      min-height: 2.35in;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0.16in;
      border: 2px solid ${COLORS.line};
      background: white;
    }
    .model-column svg { color: ${COLORS.science}; margin-bottom: 0.1in; }
    .model-column strong { display: block; font-size: 14pt; line-height: 1.25; }
    .model-column span { margin-top: 0.06in; font-size: 10pt; color: ${COLORS.muted}; }
    .claim-stack {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.14in;
      margin-top: 0.18in;
    }
    .claim {
      min-height: 1.35in;
      padding: 0.15in;
      border-top: 0.08in solid ${COLORS.evidence};
      background: ${COLORS.evidenceSoft};
      font-size: 14pt;
      font-weight: 700;
      line-height: 1.35;
    }
    .monday-flow {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      align-items: center;
      gap: 0.05in;
      margin-top: 0.2in;
    }
    .monday-flow span {
      padding: 0.11in 0.05in;
      text-align: center;
      font-size: 8.8pt;
      font-weight: 700;
      text-transform: uppercase;
      background: ${COLORS.scienceSoft};
      border: 1px solid ${COLORS.science};
    }
  `;

  const pages = [];

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 0",
      title: "Researchers, come investigate!",
      subtitle:
        "We will solve a model sand case, collect real evidence, and save one question for camp.",
      icon: "Users",
      tone: "joy",
    })}
    <div class="visual-main">${seq}</div>
    <div class="visual-question">You do not have to hold the whole lesson in your head. We will show one step at a time.</div>
    <div class="route-grid">
      <div class="route">${iconSvg("MousePointer2", 30)} Point</div>
      <div class="route">${iconSvg("Pencil", 30)} Draw or write</div>
      <div class="route">${iconSvg("MessageCircle", 30)} Speak or dictate</div>
      <div class="route">${iconSvg("Camera", 30)} Photograph</div>
      <div class="route">${iconSvg("Users", 30)} Work with a partner</div>
      <div class="route">${iconSvg("Armchair", 30)} Choose a seated role</div>
      <div class="route">${iconSvg("Hand", 30)} Ask for help</div>
      <div class="route">${iconSvg("Pause", 30)} Pass and rejoin</div>
    </div>
    ${footer("Visual 1 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 1",
      title: "Enter the fictional case",
      subtitle:
        "This story lets us practice evidence matching before we collect real Charlotte Beach sand.",
      icon: "Bird",
      tone: "science",
    })}
    <div class="model-columns">
      <div class="model-column">${iconSvg("Container", 58)}<strong>Durand reference model</strong><span>Prepared model, not beach data</span></div>
      <div class="model-column">${iconSvg("Container", 58)}<strong>Ontario reference model</strong><span>Prepared model, not beach data</span></div>
      <div class="model-column">${iconSvg("ScanSearch", 58)}<strong>Mystery bird clue</strong><span>Built to match one reference</span></div>
    </div>
    <div class="callout action" style="margin-top:0.2in">
      <p><strong>MODEL STORY:</strong> No real injured bird is being reported. A match cannot tell us why an animal needed care.</p>
    </div>
    <div class="visual-question">Which prepared reference model best matches the mystery clue?</div>
    ${footer("Visual 2 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 2",
      title: "Predict",
      subtitle:
        "Make a first idea before gathering more evidence. A prediction is allowed to change.",
      icon: "Lightbulb",
      tone: "joy",
    })}
    <div class="visual-question">Which reference model will have more visible proxy pieces?</div>
    <div class="grid-3" style="margin-top:0.2in">
      <div class="panel" style="min-height:1.35in;display:grid;place-items:center;text-align:center;border-color:${COLORS.science}">
        ${iconSvg("Circle", 36)}<h2>Durand model</h2>
      </div>
      <div class="panel" style="min-height:1.35in;display:grid;place-items:center;text-align:center;border-color:${COLORS.evidence}">
        ${iconSvg("CircleEqual", 36)}<h2>About the same</h2>
      </div>
      <div class="panel" style="min-height:1.35in;display:grid;place-items:center;text-align:center;border-color:${COLORS.action}">
        ${iconSvg("Circle", 36)}<h2>Ontario model</h2>
      </div>
    </div>
    <div class="callout access" style="margin-top:0.22in"><p><strong>Choose a response route:</strong> point, circle, speak, write, draw, tell a partner, or ask us to record your idea.</p></div>
    <div class="callout joy" style="margin-top:0.15in"><p><strong>Good science is not protecting a first guess.</strong> Good science is revising when the evidence gives us a better explanation.</p></div>
    ${footer("Visual 3 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 3",
      title: "Look first",
      subtitle:
        "Use the same method with each prepared reference model.",
      icon: "Eye",
      tone: "evidence",
    })}
    <ul class="visual-list">
      <li><span class="mini-icon">${iconSvg("Tag", 34)}</span><span><strong>Read the label.</strong><br>Keep each model separate.</span></li>
      <li><span class="mini-icon">${iconSvg("Square", 34)}</span><span><strong>Work over a tray.</strong><br>Keep proxy pieces contained.</span></li>
      <li><span class="mini-icon">${iconSvg("Eye", 34)}</span><span><strong>Look without tools.</strong><br>Notice color, shape, and grain size.</span></li>
      <li><span class="mini-icon">${iconSvg("ListOrdered", 34)}</span><span><strong>Count what you see.</strong><br>Record the first-look count.</span></li>
      <li><span class="mini-icon">${iconSvg("FilePenLine", 34)}</span><span><strong>Record a detail.</strong><br>Observation first; meaning later.</span></li>
      <li><span class="mini-icon">${iconSvg("Pause", 34)}</span><span><strong>Pause if needed.</strong><br>Your partner can hold the place.</span></li>
    </ul>
    <div class="visual-question">What might a first look miss?</div>
    ${footer("Visual 4 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 4",
      title: "Magnify and look again",
      subtitle:
        "Changing the tool may change what becomes visible; it does not change the evidence standard.",
      icon: "Microscope",
      tone: "science",
    })}
    <ul class="visual-list">
      <li><span class="mini-icon">${iconSvg("Microscope", 34)}</span><span><strong>Use one magnifier.</strong><br>Move the tool or tray slowly.</span></li>
      <li><span class="mini-icon">${iconSvg("ScanSearch", 34)}</span><span><strong>Search the full sample.</strong><br>Use a repeatable pattern.</span></li>
      <li><span class="mini-icon">${iconSvg("ListRestart", 34)}</span><span><strong>Count again.</strong><br>Record the magnified count.</span></li>
      <li><span class="mini-icon">${iconSvg("GitCompareArrows", 34)}</span><span><strong>Compare counts.</strong><br>What stayed the same?</span></li>
      <li><span class="mini-icon">${iconSvg("MessageSquareText", 34)}</span><span><strong>Name what changed.</strong><br>Use a specific observation.</span></li>
      <li><span class="mini-icon">${iconSvg("RotateCcw", 34)}</span><span><strong>Return every piece.</strong><br>Reset the model over the tray.</span></li>
    </ul>
    <div class="claim-stack">
      <div class="claim">I noticed ...</div>
      <div class="claim">I think this could mean ...</div>
      <div class="claim">We still need to know ...</div>
    </div>
    ${footer("Visual 5 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Steps 5 and 6",
      title: "Match, explain, and revise",
      subtitle:
        "The best match uses more than one feature. The model has limits.",
      icon: "Scale",
      tone: "evidence",
    })}
    <div class="visual-question">Which reference best matches the mystery clue?</div>
    <div class="grid-2" style="margin-top:0.18in">
      <div class="panel" style="min-height:2.25in;border-top:0.08in solid ${COLORS.evidence}">
        <h2>Use two details</h2>
        <p style="margin-top:0.1in">Compare grain color or size, proxy color or shape, first-look count, magnified count, or another repeatable pattern.</p>
        <div class="claim-stack" style="grid-template-columns:1fr;margin-top:0.16in">
          <div class="claim">My claim is ...</div>
          <div class="claim">The evidence is ...</div>
        </div>
      </div>
      <div class="panel" style="min-height:2.25in;border-top:0.08in solid ${COLORS.action}">
        <h2>Name one limit</h2>
        <p style="margin-top:0.1in">The prepared model can support a known match. It cannot measure either beach, trace a real animal, confirm plastic, or prove a health effect.</p>
        <div class="callout action" style="margin-top:0.16in"><p><strong>Revising is evidence of learning.</strong> A changed answer is welcome when the reason is clear.</p></div>
      </div>
    </div>
    <div class="callout access" style="margin-top:0.18in"><p>You may explain by pointing to features, drawing, speaking, writing, using the sentence starters, or asking a partner or scribe to share your evidence.</p></div>
    ${footer("Visual 6 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 7",
      title: "Collect one real sand sample",
      subtitle:
        "Every pair follows the same method so six locations remain traceable and comparable.",
      icon: "Shovel",
      tone: "action",
    })}
    <div class="steps" style="margin-top:0.14in">
      <div class="step" style="border-color:${COLORS.evidence}"><div class="step-icon" style="background:${COLORS.evidence}">${iconSvg("MapPin", 24)}</div><div><strong>1. Choose</strong><p>Go to the assigned safe site.</p></div></div>
      <div class="step" style="border-color:${COLORS.action}"><div class="step-icon" style="background:${COLORS.action}">${iconSvg("Square", 24)}</div><div><strong>2. Frame</strong><p>Place the red square flat.</p></div></div>
      <div class="step" style="border-color:${COLORS.joy}"><div class="step-icon" style="background:${COLORS.joy}">${iconSvg("Shovel", 24)}</div><div><strong>3. Scoop</strong><p>Collect the top 1/2 inch.</p></div></div>
      <div class="step" style="border-color:${COLORS.science}"><div class="step-icon" style="background:${COLORS.science}">${iconSvg("PackageCheck", 24)}</div><div><strong>4. Seal</strong><p>Close the jar before moving.</p></div></div>
      <div class="step" style="border-color:${COLORS.access}"><div class="step-icon" style="background:${COLORS.access}">${iconSvg("Tag", 24)}</div><div><strong>5. Label</strong><p>Pair + site + time.</p></div></div>
      <div class="step" style="border-color:${COLORS.evidence}"><div class="step-icon" style="background:${COLORS.evidence}">${iconSvg("Map", 24)}</div><div><strong>6. Map</strong><p>Draw or mark the site.</p></div></div>
    </div>
    <div class="callout action" style="margin-top:0.2in">
      <p><strong>STOP:</strong> Do not add salt water at the beach. Do not combine samples. Do not call a visible field fragment confirmed plastic.</p>
    </div>
    ${footer("Visual 7 of 8")}
  </section>`);

  pages.push(`<section class="sheet">
    ${header({
      eyebrow: "Field Friday | Step 8",
      title: "Save one question for Monday",
      subtitle:
        "The prepared model had a known answer. The real beach sample does not.",
      icon: "MessageCircleQuestion",
      tone: "joy",
    })}
    <div class="visual-question">What do you notice, think, or still need to know?</div>
    <div class="grid-2" style="margin-top:0.18in">
      <div class="panel" style="min-height:1.7in;border-top:0.08in solid ${COLORS.science}">
        <h2>Possible questions</h2>
        <p style="margin-top:0.08in">What might a first look miss?<br>How could plastic move through connected systems?<br>What evidence could confirm a suspected particle?<br>Where could a fair system change interrupt the pathway?</p>
      </div>
      <div class="panel" style="min-height:1.7in;border-top:0.08in solid ${COLORS.access}">
        <h2>Choose a route</h2>
        <p style="margin-top:0.08in">Write, draw, dictate, photograph your card, tell a partner, place a sticky note, or pass and return later.</p>
      </div>
    </div>
    <div class="monday-flow">
      <span>Sample</span><b>${iconSvg("MoveRight", 18)}</b>
      <span>Add brine</span><b>${iconSvg("MoveRight", 18)}</b>
      <span>Settle</span><b>${iconSvg("MoveRight", 18)}</b>
      <span>Filter</span>
    </div>
    <div class="callout evidence" style="margin-top:0.18in"><p><strong>For Monday:</strong> Every field sample stays sealed, separate, and connected to its own ID, site record, filter, image, and observation.</p></div>
    ${footer("Visual 8 of 8")}
  </section>`);

  return { pages, css: visualCss };
}

function evidenceRecordPage(modelName, placeName, pageNumber) {
  const safeModel = escapeHtml(modelName);
  const safePlace = escapeHtml(placeName);
  return `<section class="sheet evidence-record">
    ${header({
      eyebrow: "Invisible Invaders | Prepared reference model",
      title: `${modelName} evidence record`,
      subtitle: `Practice model only. This is not a measurement of ${placeName}.`,
      icon: "ScanSearch",
      tone: "evidence",
    })}
    <div class="identity-row">
      ${lineField("Name(s)")}
      ${lineField("Rotation")}
      ${lineField("Date")}
    </div>

    <div class="record-section before">
      ${sectionTag("Science | Before you look", "science", "Lightbulb")}
      <h3>Which prepared model do you predict will contain more visible proxy pieces?</h3>
      <div class="check-row">${checkbox("Durand")}${checkbox(
        "Ontario"
      )}${checkbox("About the same")}</div>
      <p class="prompt">What makes you think that?</p>
      ${writingLines(2)}
      <div class="confidence"><strong>Confidence:</strong> ${checkbox(
        "Not yet"
      )}${checkbox("A little")}${checkbox("Mostly")}${checkbox("Very")}</div>
    </div>

    <div class="record-grid">
      <div class="record-section look">
        ${sectionTag("Evidence | First look", "evidence", "Eye")}
        ${lineField("Visible proxy pieces counted")}
        <p class="prompt">I noticed ...</p>
        ${writingLines(3)}
        <div class="feeling"><strong>This step felt:</strong><br>${checkbox(
          "Easy"
        )}${checkbox("Okay")}${checkbox("Tricky")}${checkbox(
          "I need another route"
        )}</div>
      </div>
      <div class="record-section magnify">
        ${sectionTag("Evidence | Magnified look", "evidence", "Microscope")}
        ${lineField("Visible proxy pieces counted")}
        <p class="prompt">What became easier to notice, or what changed?</p>
        ${writingLines(3)}
        <div class="feeling"><strong>This step felt:</strong><br>${checkbox(
          "Easy"
        )}${checkbox("Okay")}${checkbox("Tricky")}${checkbox(
          "I need another route"
        )}</div>
      </div>
    </div>

    <div class="record-section language">
      ${sectionTag("Evidence | Careful claim language", "evidence", "MessageSquareText")}
      ${lineField("I noticed")}
      ${lineField("I think this could mean")}
      ${lineField("We still need to know")}
    </div>

    <div class="record-bottom">
      <div class="callout access"><p><strong>Choose your route:</strong> write, draw, point, dictate, work with a partner, or ask for a scribe.</p></div>
      <div class="callout action"><p><strong>Evidence limit:</strong> This prepared jar helps us practice comparison. A visible piece in a real sample is only <em>suspected</em> plastic until appropriate analysis confirms the material.</p></div>
    </div>
    ${footer(`${safeModel} copy ${pageNumber} of 12`)}
  </section>`;
}

function evidenceRecordStyles() {
  return `
    .evidence-record h1 { font-size: 22pt; }
    .evidence-record .subtitle { font-size: 10.3pt; }
    .identity-row {
      display: grid;
      grid-template-columns: 2.3fr 0.8fr 0.9fr;
      gap: 0.16in;
      margin-bottom: 0.14in;
    }
    .record-section {
      border: 1.2px solid ${COLORS.line};
      padding: 0.12in 0.14in;
    }
    .record-section h3 { margin: 0.09in 0 0.08in; font-size: 10pt; }
    .record-section .prompt { margin-top: 0.08in; font-size: 9.4pt; font-weight: 700; }
    .before { min-height: 1.58in; }
    .before .confidence {
      display: flex;
      gap: 0.1in;
      align-items: center;
      margin-top: 0.1in;
      font-size: 9.2pt;
    }
    .record-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.12in;
      margin-top: 0.12in;
    }
    .record-grid .record-section { min-height: 2.62in; }
    .record-grid .line-field { margin-top: 0.12in; }
    .feeling { margin-top: 0.12in; font-size: 8.8pt; line-height: 1.55; }
    .feeling .check { margin-right: 0.08in; font-size: 8.5pt; }
    .language {
      display: grid;
      grid-template-columns: 1.15fr 1.15fr 1.4fr;
      gap: 0.12in;
      align-items: end;
      margin-top: 0.12in;
      min-height: 0.92in;
    }
    .language .section-tag { grid-column: 1 / -1; justify-self: start; }
    .language .line-field { display: grid; gap: 0.05in; }
    .language .line-field i { min-height: 0.25in; }
    .record-bottom {
      display: grid;
      grid-template-columns: 0.9fr 1.25fr;
      gap: 0.12in;
      margin-top: 0.12in;
    }
    .record-bottom .callout p { font-size: 8.7pt; line-height: 1.35; }
  `;
}

function twoUpPage(cardA, cardB, pageLabel) {
  return `<section class="sheet two-up">
    <div class="half top-half">${cardA}</div>
    <div class="cut-line"></div><div class="cut-label">Cut here</div>
    <div class="half bottom-half">${cardB}</div>
    <div class="tiny-page-label">${escapeHtml(pageLabel)}</div>
  </section>`;
}

function twoUpStyles() {
  return `
    .two-up { padding: 0.28in 0.38in; }
    .two-up .half {
      position: absolute;
      left: 0.42in;
      right: 0.42in;
      height: 4.82in;
      overflow: hidden;
    }
    .two-up .top-half { top: 0.35in; }
    .two-up .bottom-half { top: 5.82in; }
    .card-head {
      display: flex;
      align-items: center;
      gap: 0.12in;
      padding-bottom: 0.09in;
      border-bottom: 0.05in solid ${COLORS.science};
    }
    .card-head h2 { font-size: 17pt; }
    .card-head p { color: ${COLORS.muted}; font-size: 8.8pt; }
    .card-body { margin-top: 0.12in; }
    .card-body p, .card-body li { font-size: 9.4pt; line-height: 1.36; }
    .card-body ol { margin: 0.08in 0 0 0.22in; padding: 0; }
    .card-body li { margin-bottom: 0.035in; }
    .card-bottom { margin-top: 0.1in; }
    .card-bottom .callout p { font-size: 8.5pt; line-height: 1.32; }
    .tiny-page-label {
      position: absolute;
      right: 0.22in;
      bottom: 0.12in;
      color: ${COLORS.muted};
      font-size: 6.5pt;
    }
  `;
}

function missionCard(cardNumber) {
  return `<div class="card mission-card">
    <div class="card-head">
      ${iconBadge("Bird", "science", 27)}
      <div><h2>Investigate the sand</h2><p>Fictional model case | Card ${cardNumber}</p></div>
    </div>
    <div class="card-body">
      <div class="grid-2" style="gap:0.1in">
        <div class="callout action"><p><strong>MODEL STORY:</strong> No real sick bird is being reported. The case cannot show why an animal needed care.</p></div>
        <div class="callout evidence"><p><strong>YOUR QUESTION:</strong> Which prepared reference model best matches the mystery clue?</p></div>
      </div>
      <div class="mission-flow">
        <div>${iconSvg("Lightbulb", 23)}<strong>Predict</strong><span>Make a first idea.</span></div>
        <div>${iconSvg("Eye", 23)}<strong>Look</strong><span>Count what is visible.</span></div>
        <div>${iconSvg("Microscope", 23)}<strong>Magnify</strong><span>Count again.</span></div>
        <div>${iconSvg("Scale", 23)}<strong>Match</strong><span>Use two details.</span></div>
      </div>
      <div class="callout joy card-bottom"><p><strong>Investigators revise.</strong> You do not need a perfect first answer. Change your idea when evidence gives you a better explanation.</p></div>
      <div class="access-strip">${iconSvg(
        "Accessibility",
        19
      )}<span>Point, draw, speak, write, photograph, use a partner or scribe, or pass and rejoin.</span></div>
    </div>
  </div>`;
}

function missionStyles() {
  return `
    .mission-flow {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.08in;
      margin-top: 0.12in;
    }
    .mission-flow > div {
      min-height: 1.05in;
      padding: 0.08in;
      display: grid;
      place-items: center;
      text-align: center;
      border: 1.5px solid ${COLORS.science};
      background: ${COLORS.scienceSoft};
    }
    .mission-flow svg { color: ${COLORS.science}; }
    .mission-flow strong { font-size: 9.5pt; text-transform: uppercase; }
    .mission-flow span { font-size: 7.8pt; line-height: 1.2; }
    .access-strip {
      display: flex;
      align-items: center;
      gap: 0.08in;
      margin-top: 0.1in;
      padding: 0.07in 0.1in;
      color: ${COLORS.access};
      border: 1.5px solid ${COLORS.access};
      font-size: 8pt;
      font-weight: 700;
    }
  `;
}

function reflectionCard(cardNumber) {
  return `<div class="card reflection-card">
    <div class="card-head" style="border-color:${COLORS.evidence}">
      ${iconBadge("RefreshCw", "evidence", 26)}
      <div><h2>Case reflection</h2><p>Use evidence; revision is welcome | Card ${cardNumber}</p></div>
    </div>
    <div class="card-body reflection-body">
      <div class="identity-row-card">${lineField("Name(s)")}${lineField(
        "Rotation"
      )}</div>
      <div class="reflection-grid">
        <div class="reflection-block">
          ${sectionTag("At first", "science", "Lightbulb")}
          ${lineField("I predicted")}
          ${lineField("because")}
        </div>
        <div class="reflection-block">
          ${sectionTag("After investigating", "evidence", "Scale")}
          ${lineField("The best match is")}
          ${lineField("Evidence 1")}
          ${lineField("Evidence 2")}
        </div>
        <div class="reflection-block">
          ${sectionTag("Model limit", "action", "CircleAlert")}
          ${lineField("This model cannot tell us")}
        </div>
        <div class="reflection-block">
          ${sectionTag("I still wonder", "joy", "MessageCircleQuestion")}
          ${writingLines(1)}
        </div>
      </div>
      <div class="access-strip">${iconSvg(
        "Accessibility",
        18
      )}<span>Write, draw, point, dictate, work with a partner, or ask for a scribe.</span></div>
    </div>
  </div>`;
}

function reflectionStyles() {
  return `
    .identity-row-card {
      display: grid;
      grid-template-columns: 2fr 0.8fr;
      gap: 0.14in;
      margin-bottom: 0.1in;
    }
    .reflection-grid {
      display: grid;
      grid-template-columns: 0.9fr 1.2fr;
      gap: 0.1in;
    }
    .reflection-block {
      border: 1px solid ${COLORS.line};
      padding: 0.08in 0.1in;
      min-height: 1.02in;
    }
    .reflection-block .line-field {
      display: grid;
      gap: 0.02in;
      margin-top: 0.06in;
      font-size: 8.2pt;
    }
    .reflection-block .line-field i { min-height: 0.16in; }
    .reflection-block .writing-lines { gap: 0.08in; }
    .reflection-body .access-strip { margin-top: 0.1in; }
  `;
}

function samplingRecordCard(cardNumber) {
  return `<div class="card sampling-card">
    <div class="card-head sampling-head">
      ${iconBadge("MapPin", "evidence", 26)}
      <div><h2>Charlotte Beach sample record</h2><p>Real field sample | Card ${cardNumber}</p></div>
    </div>
    <div class="card-body">
      <div class="sampling-meta">
        ${lineField("Pair")}
        ${lineField("Sample ID")}
        ${lineField("Time")}
      </div>
      ${lineField("Site or nearby landmark")}
      <div class="grid-2" style="gap:0.1in;margin-top:0.1in">
        <div class="sampling-box">
          <strong>Before collecting, I predict:</strong>
          <div class="check-row" style="margin-top:0.06in">${checkbox(
            "No"
          )}${checkbox("A few")}${checkbox("Some")}${checkbox(
            "Many"
          )}</div>
          <span>visible fragments or fibers, because ...</span>
          ${writingLines(1)}
        </div>
        <div class="sampling-box">
          <strong>Draw or mark the collection area:</strong>
          <div class="map-space"></div>
        </div>
      </div>
      ${lineField("Weather or visible conditions")}
      ${lineField("Possible contamination or unusual condition")}
      <div class="sample-checks">${checkbox("Jar sealed")}${checkbox(
        "Jar + lid labels match"
      )}${checkbox("Site recorded")}</div>
      <div class="evidence-limit">Record what you observe. A visible item is <strong>suspected</strong>, not confirmed, plastic.</div>
    </div>
  </div>`;
}

function samplingRecordStyles() {
  return `
    .sampling-head { border-color: ${COLORS.black}; }
    .sampling-card { color: ${COLORS.black}; }
    .sampling-card .icon-badge {
      color: ${COLORS.black};
      border-color: ${COLORS.black};
      background: white;
    }
    .sampling-card .line-field { margin-top: 0.09in; font-size: 8.4pt; }
    .sampling-meta {
      display: grid;
      grid-template-columns: 0.65fr 1fr 0.8fr;
      gap: 0.12in;
    }
    .sampling-box {
      min-height: 1.25in;
      padding: 0.08in 0.1in;
      border: 1.4px solid ${COLORS.black};
      font-size: 8.2pt;
    }
    .sampling-box .check { font-size: 7.8pt; }
    .sampling-box span { display: block; margin-top: 0.05in; font-size: 7.6pt; }
    .map-space { height: 0.72in; margin-top: 0.08in; border: 1px dashed ${COLORS.black}; }
    .sample-checks {
      display: flex;
      gap: 0.18in;
      margin-top: 0.11in;
    }
    .sample-checks .check { font-size: 8pt; }
    .evidence-limit {
      margin-top: 0.1in;
      padding: 0.08in 0.1in;
      border: 1.5px solid ${COLORS.black};
      font-size: 8.1pt;
      font-weight: 700;
    }
  `;
}

function samplingProtocolPage(copyNumber) {
  const steps = [
    ["MapPin", "Choose", "Go to your assigned safe site."],
    ["Square", "Frame", "Place the red square flat on the sand."],
    ["FilePenLine", "Record", "Write the ID, time, landmark, and prediction."],
    ["Shovel", "Scoop", "Use a clean spoon. Collect the top 1/2 inch."],
    ["PackageCheck", "Seal", "Put sand in its own jar. Close it before moving."],
    ["Tag", "Label + map", "Match jar, lid, card, and site. Return to Aastha."],
  ];

  return `<section class="sheet protocol-sheet">
    ${header({
      eyebrow: `Charlotte Beach | Pair protocol ${copyNumber} of 6`,
      title: "Collect a traceable sand sample",
      subtitle:
        "Six pairs use the same method. Every real sample stays separate and connected to one place.",
      icon: "Shovel",
      tone: "action",
    })}
    <div class="protocol-steps">
      ${steps
        .map(
          ([icon, label, copy], index) => `<div class="protocol-step">
            <div class="protocol-number">${index + 1}</div>
            <div class="protocol-icon">${iconSvg(icon, 38)}</div>
            <div><h2>${escapeHtml(label)}</h2><p>${escapeHtml(copy)}</p></div>
          </div>`
        )
        .join("")}
    </div>
    <div class="protocol-bottom">
      <div class="callout action"><p><strong>STOP:</strong> Do not add salt water at the beach. Do not combine samples. Do not call a visible fragment confirmed plastic.</p></div>
      <div class="callout access"><p><strong>Choose a role:</strong> sampler, labeler, mapper, photographer, materials monitor, seated coordinator, or partner support.</p></div>
    </div>
    ${footer(`Pair protocol ${copyNumber} of 6`)}
  </section>`;
}

function samplingProtocolStyles() {
  return `
    .protocol-sheet .subtitle { max-width: 6.7in; }
    .protocol-steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.14in;
    }
    .protocol-step {
      position: relative;
      min-height: 1.6in;
      padding: 0.16in 0.16in 0.14in 0.8in;
      border: 2px solid ${COLORS.line};
      display: grid;
      grid-template-columns: 0.55in 1fr;
      gap: 0.12in;
      align-items: center;
    }
    .protocol-number {
      position: absolute;
      left: 0.14in;
      top: 0.14in;
      width: 0.45in;
      height: 0.45in;
      display: grid;
      place-items: center;
      color: white;
      background: ${COLORS.science};
      border-radius: 50%;
      font-size: 13pt;
      font-weight: 700;
    }
    .protocol-step:nth-child(2) .protocol-number,
    .protocol-step:nth-child(5) .protocol-number { background:${COLORS.action}; }
    .protocol-step:nth-child(3) .protocol-number,
    .protocol-step:nth-child(6) .protocol-number { background:${COLORS.evidence}; }
    .protocol-icon { color: ${COLORS.science}; }
    .protocol-step:nth-child(2) .protocol-icon,
    .protocol-step:nth-child(5) .protocol-icon { color:${COLORS.action}; }
    .protocol-step:nth-child(3) .protocol-icon,
    .protocol-step:nth-child(6) .protocol-icon { color:${COLORS.evidence}; }
    .protocol-step h2 { font-size: 17pt; margin-bottom: 0.05in; }
    .protocol-step p { font-size: 11pt; line-height: 1.36; }
    .protocol-bottom {
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      gap: 0.14in;
      margin-top: 0.16in;
    }
    .protocol-bottom .callout p { font-size: 10pt; }
  `;
}

function labelPage(setNumber) {
  const labels = [
    ["Prepared model", "Durand reference model", "science"],
    ["Prepared model", "Ontario reference model", "evidence"],
    ["Prepared model", "Mystery bird clue", "joy"],
    ["Fictional prop", "Model bird — not a real case", "action"],
    ["Storage bin", "Prepared models only", "science"],
    ["Storage bin", "Sealed field samples only", "evidence"],
    ["Storage bin", "Clean tools", "access"],
    ["Storage bin", "Used tools", "action"],
    ["Field sample", "II-____-____-____-____", "evidence"],
    ["Field sample", "II-____-____-____-____", "evidence"],
    ["Field sample", "II-____-____-____-____", "evidence"],
    ["Field sample", "II-____-____-____-____", "evidence"],
  ];
  return `<section class="sheet label-sheet">
    <div class="label-title"><strong>Invisible Invaders labels</strong><span>Set ${setNumber} of 2 | Cut on dashed lines</span></div>
    <div class="label-grid">
      ${labels
        .map(
          ([small, large, tone]) => `<div class="print-label ${tone}">
            <span>${escapeHtml(small)}</span>
            <strong>${escapeHtml(large)}</strong>
          </div>`
        )
        .join("")}
    </div>
    ${footer(`Label set ${setNumber} of 2`)}
  </section>`;
}

function labelStyles() {
  return `
    .label-sheet { padding: 0.42in 0.48in; }
    .label-title {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.18in;
    }
    .label-title strong { font-size: 18pt; }
    .label-title span { font-size: 8pt; color: ${COLORS.muted}; font-weight: 700; text-transform: uppercase; }
    .label-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-auto-rows: 1.38in;
    }
    .print-label {
      padding: 0.14in 0.17in;
      border-right: 1.5px dashed ${COLORS.muted};
      border-bottom: 1.5px dashed ${COLORS.muted};
      border-left: 0.11in solid ${COLORS.science};
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.07in;
    }
    .print-label:nth-child(2n) { border-right: none; }
    .print-label span {
      color: ${COLORS.muted};
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .print-label strong { font-size: 13pt; line-height: 1.25; }
    .print-label.science { border-left-color:${COLORS.science}; background:${COLORS.scienceSoft}; }
    .print-label.evidence { border-left-color:${COLORS.evidence}; background:${COLORS.evidenceSoft}; }
    .print-label.action { border-left-color:${COLORS.action}; background:${COLORS.actionSoft}; }
    .print-label.access { border-left-color:${COLORS.access}; background:${COLORS.accessSoft}; }
    .print-label.joy { border-left-color:${COLORS.joy}; background:${COLORS.joySoft}; }
  `;
}

function accessBoardPage(copyNumber) {
  const routes = [
    ["MousePointer2", "Point"],
    ["Pencil", "Draw or write"],
    ["MessageCircle", "Speak or dictate"],
    ["Camera", "Photograph"],
    ["Users", "Use a partner"],
    ["Armchair", "Choose a seated role"],
    ["Hand", "Ask for a scribe"],
    ["Pause", "Pass and rejoin"],
  ];
  return `<section class="sheet access-board">
    ${header({
      eyebrow: `Access and evidence board | Copy ${copyNumber} of 2`,
      title: "Choose how you join",
      subtitle:
        "Different routes can show the same careful scientific thinking. You may change routes at any time.",
      icon: "Accessibility",
      tone: "access",
    })}
    <div class="access-route-grid">
      ${routes
        .map(
          ([icon, label]) =>
            `<div class="access-route">${iconSvg(icon, 34)}<strong>${escapeHtml(
              label
            )}</strong></div>`
        )
        .join("")}
    </div>
    <div class="evidence-sentence-grid">
      <div><span>OBSERVATION</span><strong>I noticed ...</strong></div>
      <div><span>POSSIBLE MEANING</span><strong>I think this could mean ...</strong></div>
      <div><span>UNCERTAINTY</span><strong>We still need to know ...</strong></div>
    </div>
    <div class="callout action" style="margin-top:0.18in"><p><strong>Careful language protects people and the science:</strong> prepared model, proxy piece, real field sample, suspected particle, supported, possible, or still unknown.</p></div>
    ${footer(`Access board ${copyNumber} of 2`)}
  </section>`;
}

function accessBoardStyles() {
  return `
    .access-route-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.13in;
    }
    .access-route {
      min-height: 1.25in;
      padding: 0.12in;
      display: grid;
      place-items: center;
      gap: 0.06in;
      text-align: center;
      border: 2px solid ${COLORS.access};
      background: ${COLORS.accessSoft};
      color: ${COLORS.access};
    }
    .access-route strong { color: ${COLORS.ink}; font-size: 11pt; }
    .evidence-sentence-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.13in;
      margin-top: 0.18in;
    }
    .evidence-sentence-grid > div {
      min-height: 1.15in;
      padding: 0.12in;
      border-top: 0.08in solid ${COLORS.evidence};
      background: ${COLORS.evidenceSoft};
    }
    .evidence-sentence-grid span {
      display: block;
      color: ${COLORS.evidence};
      font-size: 8pt;
      font-weight: 700;
      margin-bottom: 0.08in;
    }
    .evidence-sentence-grid strong { font-size: 12pt; line-height: 1.35; }
  `;
}

function facilitatorCuePages() {
  const page1 = `<section class="sheet cue-sheet">
    ${header({
      eyebrow: "Piter + Aastha | Camp-use cue sheet",
      title: "Field Friday: the 40-minute routine",
      subtitle:
        "Use this at the station. It contains the complete sequence, the protected decisions, and the reset steps.",
      icon: "ClipboardCheck",
      tone: "science",
    })}
    <div class="cue-anchor">
      <strong>ANCHOR:</strong> Humans aren't trash cans, but we have plastics in our bodies.<br>
      <strong>FRIDAY QUESTION:</strong> How can plastic move among or collect in sand, water, air, living things, and human systems even when we do not notice it at first?
    </div>
    <div class="cue-table">
      ${[
        ["0–3", "Welcome + access preview", "Show the whole sequence. Offer participation routes."],
        ["3–7", "Fictional case", "Name the story as a model immediately."],
        ["7–10", "Demonstrate once", "Predict → look → magnify → record → reset."],
        ["10–18", "Durand model", "One direction at a time. Record exact observations."],
        ["18–26", "Ontario model", "Repeat the same method. Keep pieces contained."],
        ["26–30", "Match + reflect", "Require two details and one model limit."],
        ["30–34", "Choose sites", "Select six safe, useful comparison locations."],
        ["34–38", "Collect real sand", "Frame → scoop → seal → label → map."],
        ["38–40", "Wonder + close", "Save exact youth questions for Monday."],
      ]
        .map(
          ([time, move, cue]) =>
            `<div class="cue-row"><strong>${time}</strong><b>${move}</b><span>${cue}</span></div>`
        )
        .join("")}
    </div>
    <div class="grid-2" style="margin-top:0.14in">
      <div class="callout science"><p><strong>Piter:</strong> agenda, fictional-case disclosure, demonstration, claim-evidence-limit discussion, and close.</p></div>
      <div class="callout access"><p><strong>Aastha:</strong> materials, timing, proactive support, exact youth language, labels, maps, and reset checks.</p></div>
    </div>
    ${footer("Cue sheet 1 of 2")}
  </section>`;

  const page2 = `<section class="sheet cue-sheet">
    ${header({
      eyebrow: "Piter + Aastha | Camp-use cue sheet",
      title: "Protect these decisions",
      subtitle:
        "When time or energy drops, reduce repetition—not access, evidence limits, or traceability.",
      icon: "ShieldCheck",
      tone: "evidence",
    })}
    <div class="cue-grid-2">
      <div class="panel">
        ${sectionTag("Before campers arrive", "science", "PackageCheck")}
        <ul>
          <li>Pilot two reference models and the matching mystery clue.</li>
          <li>Record the known answer and exact proxy counts.</li>
          <li>Place model materials, field jars, clean tools, and used tools in separate bins.</li>
          <li>Prelabel six pair jars and two backups.</li>
          <li>Confirm safe boundaries, timing, weather, and photo permissions.</li>
        </ul>
      </div>
      <div class="panel">
        ${sectionTag("After each rotation", "evidence", "RotateCcw")}
        <ul>
          <li>Recover and count every prepared proxy piece.</li>
          <li>Reset the known model arrangement.</li>
          <li>Match field jar, lid, card, and map.</li>
          <li>Keep prepared models and real samples separate.</li>
          <li>Save exact youth questions and one access change.</li>
        </ul>
      </div>
      <div class="panel">
        ${sectionTag("Say this clearly", "joy", "MessageSquareText")}
        <p><strong>Case disclosure:</strong> “This is a model story, not a report of a real injured bird.”</p>
        <p><strong>Evidence limit:</strong> “A visible field piece is suspected, not confirmed, plastic.”</p>
        <p><strong>Close:</strong> “The model had a known answer. The beach does not.”</p>
      </div>
      <div class="panel">
        ${sectionTag("Never claim", "action", "CircleAlert")}
        <ul>
          <li>The reference models measure either beach.</li>
          <li>The fictional case explains animal illness.</li>
          <li>A visible field fragment is confirmed plastic.</li>
          <li>One observation proves a source, route, dose, or health effect.</li>
          <li>Young people or families are responsible for systems they do not control.</li>
        </ul>
      </div>
    </div>
    <div class="callout action" style="margin-top:0.14in"><p><strong>Field stop:</strong> No salt water at the beach. Never combine pair samples. Monday processing is per sample: SAMPLE → ADD BRINE → SETTLE → TRANSFER TOP LAYER → FILTER → COVER/DRY → INSPECT.</p></div>
    ${footer("Cue sheet 2 of 2")}
  </section>`;

  return [page1, page2, page1, page2];
}

function facilitatorCueStyles() {
  return `
    .cue-sheet h1 { font-size: 22pt; }
    .cue-sheet .subtitle { font-size: 9.8pt; }
    .cue-anchor {
      padding: 0.13in 0.15in;
      background: ${COLORS.scienceSoft};
      border-left: 0.09in solid ${COLORS.science};
      font-size: 9.5pt;
      line-height: 1.45;
    }
    .cue-table { margin-top: 0.13in; border-top: 1px solid ${COLORS.line}; }
    .cue-row {
      display: grid;
      grid-template-columns: 0.55in 1.85in 1fr;
      gap: 0.12in;
      align-items: center;
      min-height: 0.47in;
      padding: 0.06in 0.09in;
      border-bottom: 1px solid ${COLORS.line};
    }
    .cue-row:nth-child(odd) { background: ${COLORS.page}; }
    .cue-row strong { color: ${COLORS.science}; font-size: 8.5pt; }
    .cue-row b { font-size: 9pt; }
    .cue-row span { font-size: 8.5pt; line-height: 1.3; }
    .cue-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.13in;
    }
    .cue-grid-2 .panel { min-height: 2.6in; }
    .cue-grid-2 p, .cue-grid-2 li { font-size: 8.7pt; line-height: 1.38; }
    .cue-grid-2 ul { margin: 0.1in 0 0 0.18in; padding: 0; }
    .cue-grid-2 li { margin-bottom: 0.055in; }
    .cue-grid-2 .panel > p { margin-top: 0.1in; }
  `;
}

function printInstructionsPage() {
  const rows = [
    ["01", "Visual sequence", "8 color pages", "Letter, landscape, regular paper"],
    ["02", "Durand evidence record", "12 color pages", "Letter, regular paper"],
    ["03", "Ontario evidence record", "12 color pages", "Letter, regular paper"],
    ["04", "Fictional case mission", "6 color sheets / 12 cards", "Letter cardstock, cut in half"],
    ["05", "Case reflection", "6 color sheets / 12 cards", "Letter cardstock, cut in half"],
    ["06", "Sand-sampling record", "4 B&W sheets / 8 cards", "Letter cardstock, cut in half"],
    ["07", "Sand-sampling steps", "6 color pages", "Letter cardstock, do not cut"],
    ["08", "Sample + model labels", "2 color pages", "Letter cardstock, cut on dashed lines"],
    ["09", "Access + evidence board", "2 color pages", "Letter cardstock, do not cut"],
    ["10", "Family note", "15 color pages", "Letter, regular paper"],
    ["11", "Facilitator cue sheet", "4 color pages / 2 sets", "Letter, regular paper"],
  ];

  return `<section class="sheet instructions">
    ${header({
      eyebrow: "Print-shop handoff | Field Friday",
      title: "Print every PDF in this folder once",
      subtitle:
        "The required copy counts are already built into the PDFs. Do not print files from any other folder.",
      icon: "PrinterCheck",
      tone: "action",
    })}
    <div class="instruction-callout">
      <strong>GLOBAL SETTINGS</strong>
      <span>Single-sided • Actual size / 100% • Centered • Do not crop • No binding • Keep files in numbered order</span>
    </div>
    <div class="instruction-table">
      <div class="instruction-row head"><span>#</span><span>File</span><span>Built-in output</span><span>Paper / finishing</span></div>
      ${rows
        .map(
          ([num, name, output, finish]) =>
            `<div class="instruction-row"><strong>${num}</strong><b>${escapeHtml(
              name
            )}</b><span>${escapeHtml(output)}</span><span>${escapeHtml(
              finish
            )}</span></div>`
        )
        .join("")}
    </div>
    <div class="grid-2" style="margin-top:0.14in">
      <div class="callout action"><p><strong>Cutting:</strong> Cut only the files that say CUT in the filename. Keep each cut set together with its source filename.</p></div>
      <div class="callout evidence"><p><strong>Family note:</strong> Borderless is preferred. If unavailable, fit the image within the printable area without cropping.</p></div>
    </div>
    <div class="callout access" style="margin-top:0.12in"><p><strong>Please return:</strong> all printed pages, all cut cards/labels, and this instruction sheet. Do not discard blank-looking backs; every file is intentionally single-sided.</p></div>
    ${footer("UPS instruction sheet")}
  </section>`;
}

function printInstructionsStyles() {
  return `
    .instructions h1 { font-size: 23pt; }
    .instruction-callout {
      display: grid;
      grid-template-columns: 1.25in 1fr;
      align-items: center;
      gap: 0.13in;
      padding: 0.12in 0.14in;
      border: 2px solid ${COLORS.action};
      background: ${COLORS.actionSoft};
      font-size: 9pt;
      line-height: 1.4;
    }
    .instruction-callout strong { color: ${COLORS.action}; font-size: 9pt; }
    .instruction-table { margin-top: 0.14in; border: 1px solid ${COLORS.line}; }
    .instruction-row {
      display: grid;
      grid-template-columns: 0.32in 1.78in 1.55in 1fr;
      gap: 0.1in;
      align-items: center;
      min-height: 0.47in;
      padding: 0.05in 0.08in;
      border-bottom: 1px solid ${COLORS.line};
    }
    .instruction-row:last-child { border-bottom: 0; }
    .instruction-row:nth-child(odd) { background: ${COLORS.page}; }
    .instruction-row.head {
      min-height: 0.32in;
      color: white;
      background: ${COLORS.ink};
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .instruction-row strong { color: ${COLORS.science}; font-size: 8pt; }
    .instruction-row b { font-size: 8pt; line-height: 1.25; }
    .instruction-row span { font-size: 7.7pt; line-height: 1.28; }
    .instructions .callout p { font-size: 8.4pt; }
  `;
}

function familyNotePages(imagePath) {
  const data = fs.readFileSync(imagePath).toString("base64");
  const src = `data:image/png;base64,${data}`;
  return Array.from(
    { length: 15 },
    (_, index) => `<section class="sheet family-note">
      <img src="${src}" alt="Invisible Invaders family note">
      <span class="family-copy">Family copy ${index + 1} of 15</span>
    </section>`
  );
}

function familyNoteStyles() {
  return `
    .family-note { padding: 0; background: white; }
    .family-note img { width: 8.5in; height: 11in; object-fit: contain; display: block; }
    .family-copy {
      position: absolute;
      right: 0.12in;
      bottom: 0.07in;
      padding: 0.025in 0.05in;
      color: white;
      background: rgba(23, 48, 66, 0.82);
      font-size: 6.5pt;
      font-weight: 700;
    }
  `;
}

async function pageCount(filePath) {
  const pdf = await PDFDocument.load(fs.readFileSync(filePath));
  return pdf.getPageCount();
}

async function annotationCount(filePath) {
  const pdf = await PDFDocument.load(fs.readFileSync(filePath));
  let count = 0;
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (annots) count += annots.size();
  }
  return count;
}

async function makeReviewMaster(filePaths, outputPath) {
  const target = await PDFDocument.create();
  for (const filePath of filePaths) {
    const source = await PDFDocument.load(fs.readFileSync(filePath));
    const indices =
      source.getPageCount() === 1
        ? [0]
        : Array.from(new Set([0, Math.min(1, source.getPageCount() - 1)]));
    const copied = await target.copyPages(source, indices);
    copied.forEach((page) => target.addPage(page));
  }
  fs.writeFileSync(outputPath, await target.save());
}

async function main() {
  const browserCandidates = [
    chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(
      process.env.HOME || "",
      "Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell"
    ),
  ];
  const browserExecutable = browserCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );
  if (!browserExecutable) {
    throw new Error("No compatible Chrome or Chromium executable was found.");
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
  });
  const generated = [];

  try {
    const visual = visualSequencePages();
    const visualFile = path.join(
      sendDir,
      "01-FIELD-FRIDAY-VISUAL-SEQUENCE-8pages-COLOR-LETTER-LANDSCAPE.pdf"
    );
    await renderPdf(browser, visualFile, visual.pages, "landscape", visual.css);
    generated.push(visualFile);

    const evidenceCss = evidenceRecordStyles();
    const durandFile = path.join(
      sendDir,
      "02-DURAND-EVIDENCE-RECORD-12copies-COLOR-LETTER.pdf"
    );
    const durandPages = Array.from({ length: 12 }, (_, index) =>
      evidenceRecordPage(
        "Durand model",
        "Durand Eastman Beach",
        index + 1
      )
    );
    await renderPdf(browser, durandFile, durandPages, "portrait", evidenceCss);
    generated.push(durandFile);

    const ontarioFile = path.join(
      sendDir,
      "03-ONTARIO-EVIDENCE-RECORD-12copies-COLOR-LETTER.pdf"
    );
    const ontarioPages = Array.from({ length: 12 }, (_, index) =>
      evidenceRecordPage(
        "Ontario model",
        "Ontario Beach Park",
        index + 1
      )
    );
    await renderPdf(browser, ontarioFile, ontarioPages, "portrait", evidenceCss);
    generated.push(ontarioFile);

    const twoUpCss = twoUpStyles();
    const missionFile = path.join(
      sendDir,
      "04-FICTIONAL-CASE-MISSION-12cards-2up-COLOR-CARDSTOCK-CUT.pdf"
    );
    const missionPages = Array.from({ length: 6 }, (_, index) =>
      twoUpPage(
        missionCard(index * 2 + 1),
        missionCard(index * 2 + 2),
        `Mission sheet ${index + 1} of 6`
      )
    );
    await renderPdf(
      browser,
      missionFile,
      missionPages,
      "portrait",
      twoUpCss + missionStyles()
    );
    generated.push(missionFile);

    const reflectionFile = path.join(
      sendDir,
      "05-CASE-REFLECTION-12cards-2up-COLOR-CARDSTOCK-CUT.pdf"
    );
    const reflectionPages = Array.from({ length: 6 }, (_, index) =>
      twoUpPage(
        reflectionCard(index * 2 + 1),
        reflectionCard(index * 2 + 2),
        `Reflection sheet ${index + 1} of 6`
      )
    );
    await renderPdf(
      browser,
      reflectionFile,
      reflectionPages,
      "portrait",
      twoUpCss + reflectionStyles()
    );
    generated.push(reflectionFile);

    const samplingRecordFile = path.join(
      sendDir,
      "06-SAND-SAMPLING-RECORD-8cards-2up-BW-CARDSTOCK-CUT.pdf"
    );
    const samplingRecordPages = Array.from({ length: 4 }, (_, index) =>
      twoUpPage(
        samplingRecordCard(index * 2 + 1),
        samplingRecordCard(index * 2 + 2),
        `Sampling record sheet ${index + 1} of 4`
      )
    );
    await renderPdf(
      browser,
      samplingRecordFile,
      samplingRecordPages,
      "portrait",
      twoUpCss + samplingRecordStyles()
    );
    generated.push(samplingRecordFile);

    const samplingProtocolFile = path.join(
      sendDir,
      "07-SAND-SAMPLING-STEPS-6copies-COLOR-CARDSTOCK-LETTER.pdf"
    );
    const protocolPages = Array.from({ length: 6 }, (_, index) =>
      samplingProtocolPage(index + 1)
    );
    await renderPdf(
      browser,
      samplingProtocolFile,
      protocolPages,
      "portrait",
      samplingProtocolStyles()
    );
    generated.push(samplingProtocolFile);

    const labelFile = path.join(
      sendDir,
      "08-SAMPLE-AND-MODEL-LABELS-2sets-COLOR-CARDSTOCK-CUT.pdf"
    );
    await renderPdf(
      browser,
      labelFile,
      [labelPage(1), labelPage(2)],
      "portrait",
      labelStyles()
    );
    generated.push(labelFile);

    const accessFile = path.join(
      sendDir,
      "09-ACCESS-AND-EVIDENCE-BOARD-2copies-COLOR-CARDSTOCK-LETTER.pdf"
    );
    await renderPdf(
      browser,
      accessFile,
      [accessBoardPage(1), accessBoardPage(2)],
      "portrait",
      accessBoardStyles()
    );
    generated.push(accessFile);

    const familyNoteImage = path.join(
      repoRoot,
      "_local-course-materials",
      "parent-note-output",
      "Invisible-Invaders-Family-Note-PRINT.png"
    );
    const familyFile = path.join(
      sendDir,
      "10-FAMILY-NOTE-15copies-COLOR-LETTER.pdf"
    );
    await renderPdf(
      browser,
      familyFile,
      familyNotePages(familyNoteImage),
      "portrait",
      familyNoteStyles()
    );
    generated.push(familyFile);

    const cueFile = path.join(
      sendDir,
      "11-FACILITATOR-CUE-SHEET-2sets-COLOR-LETTER.pdf"
    );
    await renderPdf(
      browser,
      cueFile,
      facilitatorCuePages(),
      "portrait",
      facilitatorCueStyles()
    );
    generated.push(cueFile);

    const instructionsFile = path.join(
      sendDir,
      "00-UPS-PRINT-INSTRUCTIONS-PRINT-THIS-FIRST.pdf"
    );
    await renderPdf(
      browser,
      instructionsFile,
      [printInstructionsPage()],
      "portrait",
      printInstructionsStyles()
    );
    generated.unshift(instructionsFile);
  } finally {
    await browser.close();
  }

  const expected = new Map([
    ["00-UPS-PRINT-INSTRUCTIONS-PRINT-THIS-FIRST.pdf", 1],
    ["01-FIELD-FRIDAY-VISUAL-SEQUENCE-8pages-COLOR-LETTER-LANDSCAPE.pdf", 8],
    ["02-DURAND-EVIDENCE-RECORD-12copies-COLOR-LETTER.pdf", 12],
    ["03-ONTARIO-EVIDENCE-RECORD-12copies-COLOR-LETTER.pdf", 12],
    ["04-FICTIONAL-CASE-MISSION-12cards-2up-COLOR-CARDSTOCK-CUT.pdf", 6],
    ["05-CASE-REFLECTION-12cards-2up-COLOR-CARDSTOCK-CUT.pdf", 6],
    ["06-SAND-SAMPLING-RECORD-8cards-2up-BW-CARDSTOCK-CUT.pdf", 4],
    ["07-SAND-SAMPLING-STEPS-6copies-COLOR-CARDSTOCK-LETTER.pdf", 6],
    ["08-SAMPLE-AND-MODEL-LABELS-2sets-COLOR-CARDSTOCK-CUT.pdf", 2],
    ["09-ACCESS-AND-EVIDENCE-BOARD-2copies-COLOR-CARDSTOCK-LETTER.pdf", 2],
    ["10-FAMILY-NOTE-15copies-COLOR-LETTER.pdf", 15],
    ["11-FACILITATOR-CUE-SHEET-2sets-COLOR-LETTER.pdf", 4],
  ]);

  const validation = [];
  for (const filePath of generated) {
    const pages = await pageCount(filePath);
    const annotations = await annotationCount(filePath);
    const name = path.basename(filePath);
    const expectedPages = expected.get(name);
    if (pages !== expectedPages) {
      throw new Error(
        `Page-count mismatch for ${name}: expected ${expectedPages}, got ${pages}`
      );
    }
    if (annotations !== 0) {
      throw new Error(
        `Physical print PDF contains ${annotations} annotation(s): ${name}`
      );
    }
    validation.push({ name, pages, annotations });
  }

  const reviewMaster = path.join(
    referenceDir,
    "01-REVIEW-MASTER-FIRST-TWO-PAGES-OF-EACH-PRINT-FILE.pdf"
  );
  await makeReviewMaster(generated, reviewMaster);

  const printReadme = `FIELD FRIDAY — SEND TO UPS

Send ONLY this folder to the print shop:
01-SEND-TO-UPS-PRINT-ONLY

Tell the print shop:
"Print every PDF in this folder exactly once. The copy counts are already
built into the PDFs. Follow 00-UPS-PRINT-INSTRUCTIONS-PRINT-THIS-FIRST.pdf."

Do not send the reference folder.
Do not send Version 6 or Version 7.
Do not ask the print shop to open links; the physical PDFs contain no links.
`;

  const referenceReadme = `FIELD FRIDAY — FOR PITER AND AASTHA

This folder is for review only. Do not send it to UPS.

The clean print handoff is:
../01-SEND-TO-UPS-PRINT-ONLY

The complete working lesson remains in one authoritative source:
assignments/03-camp-unit-plan/friday-anchoring-phenomenon-routine.md

The 2-page facilitator cue sheet is already included twice in the UPS folder.
It is the camp-use version of the lesson, not a raw lesson-plan template.

The review master contains the first two pages (or the only page) from each
print file so the package can be inspected without opening a ZIP.
`;

  fs.writeFileSync(
    path.join(outputRoot, "00-OPEN-FIRST-PITER.txt"),
    printReadme,
    "utf8"
  );
  fs.writeFileSync(
    path.join(referenceDir, "00-DO-NOT-SEND-TO-UPS.txt"),
    referenceReadme,
    "utf8"
  );
  fs.writeFileSync(
    path.join(referenceDir, "02-VALIDATION.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        outputRoot,
        rule: "Print every PDF in 01-SEND-TO-UPS-PRINT-ONLY exactly once.",
        files: validation,
        totalPrintedPages: validation.reduce((sum, item) => sum + item.pages, 0),
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputRoot,
        sendDir,
        referenceDir,
        files: validation,
        totalPrintedPages: validation.reduce((sum, item) => sum + item.pages, 0),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
