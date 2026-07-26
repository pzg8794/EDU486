#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { PDFDocument, PDFName, rgb } = require("pdf-lib");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(
  ROOT,
  "_local-course-materials",
  "print-packages",
  "2026-07-24-invisible-invaders-print-package-v7",
  "02-MONDAY-JULY-27",
);
const OUTPUT_DIR = path.join(
  ROOT,
  "_local-course-materials",
  "print-packages",
  "2026-07-27-monday-minimal",
  "01-PRINT-ONLY-IF-MISSING",
);
const REQUIRED_OUTPUT_DIR = path.join(
  ROOT,
  "_local-course-materials",
  "print-packages",
  "2026-07-27-monday-minimal",
  "00-PRINT-THIS",
);
const FIELD_RECORD_SOURCE = path.join(
  ROOT,
  "_local-course-materials",
  "camp-media",
  "camp-day-1",
  "share-ready",
  "Invisible-Invaders-Field-Friday-Scientific-Record.pptx",
);

const AGENDA_SOURCE = path.join(
  SOURCE_DIR,
  "P2-MONDAY-02-Visual-Agenda-1copy-COLOR-11x17.pdf",
);
const MODEL_SOURCE = path.join(
  SOURCE_DIR,
  "P2-MONDAY-03-Source-To-Body-Model-12copies-COLOR-11x17.pdf",
);
const AGENDA_OUTPUT = path.join(
  OUTPUT_DIR,
  "01-MONDAY-VISUAL-AGENDA-1-COPY-COLOR-11x17.pdf",
);
const MODEL_OUTPUT = path.join(
  OUTPUT_DIR,
  "02-MONDAY-SHARED-MODEL-1-COPY-COLOR-11x17.pdf",
);
const SOUVENIR_OUTPUT = path.join(
  REQUIRED_OUTPUT_DIR,
  "01-OUR-FIELD-FRIDAY-EVIDENCE-SOUVENIR-PRINT-2-COPIES-COLOR-LETTER-LANDSCAPE.pdf",
);

function assertTabloidLandscape(page, label) {
  const width = page.getWidth();
  const height = page.getHeight();
  if (width !== 1224 || height !== 792) {
    throw new Error(`${label} is ${width} x ${height}, not 11 x 17 landscape.`);
  }
}

async function buildAgenda() {
  const pageWidth = 5100;
  const pageHeight = 3300;
  const cards = [
    ["1", "PREVIEW", "9:15", "See the plan; choose a route", "#2F7EAA", "#E3F1F8"],
    ["2", "REMEMBER + TELL", "9:20", "Use photos and souvenir", "#3F9968", "#E5F4EA"],
    ["3", "IMPOSSIBLE CUT", "9:32", "Compare size and tool limits", "#C94D52", "#FBE8E9"],
    ["4", "ESCAPE THE WIND", "9:47", "Model moving air", "#7850A1", "#F0E9F7"],
    ["5", "WATCH + WONDER", "10:00", "Choose a video; save questions", "#E9B936", "#FFF4CF"],
    ["6", "BREAK", "10:10", "Snack, move, sit, or reset", "#2F7EAA", "#E3F1F8"],
    ["7", "CONSENSUS MODEL", "10:20", "Before, during, and after", "#3F9968", "#E5F4EA"],
    ["8", "FISH LAB", "10:45", "Observe; document; prepare", "#C94D52", "#FBE8E9"],
    ["9", "CLOSE + SHARE", "11:15", "Keep, question, or change", "#7850A1", "#F0E9F7"],
  ];
  const cardWidth = 1540;
  const cardHeight = 475;
  const cardGapX = 110;
  const cardGapY = 55;
  const cardStartX = 130;
  const cardStartY = 1110;
  const cardSvg = cards
    .map(([number, title, time, description, color, fill], index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = cardStartX + column * (cardWidth + cardGapX);
      const y = cardStartY + row * (cardHeight + cardGapY);
      return `
  <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="28" fill="${fill}" stroke="${color}" stroke-width="9"/>
  <circle cx="${x + 135}" cy="${y + 135}" r="86" fill="${color}"/>
  <text x="${x + 135}" y="${y + 167}" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="700">${number}</text>
  <text x="${x + 255}" y="${y + 112}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${title.length > 14 ? 48 : 57}" font-weight="700">${title}</text>
  <text x="${x + 255}" y="${y + 190}" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${time}</text>
  <text x="${x + 85}" y="${y + 340}" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="42">${escapeXml(description)}</text>`;
    })
    .join("");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">
  <rect width="${pageWidth}" height="${pageHeight}" fill="#FFFFFF"/>
  <rect width="${pageWidth}" height="80" fill="#D9670B"/>
  <text x="130" y="255" fill="#D9670B" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">MONDAY | GOTTA-HAVE 2: WATER TRANSPORTS MATERIALS</text>
  <text x="130" y="430" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="700">HOW SMALL? HOW DOES IT MOVE?</text>
  <text x="130" y="535" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="50">Invisible Invaders | Group 2 | July 27, 2026</text>
  <rect x="130" y="650" width="4840" height="365" rx="28" fill="#FFF3E8" stroke="#D9670B" stroke-width="9"/>
  <text x="2550" y="790" text-anchor="middle" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="63" font-weight="700">How small can plastic pieces get, how can air or water carry them,</text>
  <text x="2550" y="885" text-anchor="middle" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="63" font-weight="700">and what do we still not know?</text>
  ${cardSvg}
  <rect x="130" y="2765" width="4840" height="365" rx="28" fill="#F0E9F7" stroke="#7850A1" stroke-width="9"/>
  <text x="2550" y="2890" text-anchor="middle" fill="#7850A1" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="700">CHOOSE A ROUTE</text>
  <text x="2550" y="2992" text-anchor="middle" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="47">Talk | Point | Draw | Move a piece | Photograph | Partner | Seated/quiet | Pass and return</text>
  <text x="2550" y="3075" text-anchor="middle" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="38">The response route can change. The evidence goal stays the same.</text>
</svg>`;
  const agendaPng = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
  const document = await PDFDocument.create();
  const page = document.addPage([1224, 792]);
  const image = await document.embedPng(agendaPng);
  page.drawImage(image, { x: 0, y: 0, width: 1224, height: 792 });
  document.setTitle("Monday Visual Agenda");
  document.setSubject("Invisible Invaders shared camp visual");
  document.setAuthor("Piter Garcia and Aastha");
  document.setCreator("OpenAI Codex under Piter Garcia's supervision");
  document.setProducer("pdf-lib");
  fs.writeFileSync(AGENDA_OUTPUT, await document.save());
}

async function buildSharedModel() {
  const source = await PDFDocument.load(fs.readFileSync(MODEL_SOURCE));
  const output = await PDFDocument.create();
  const [page] = await output.copyPages(source, [0]);
  assertTabloidLandscape(page, "Monday shared model");
  page.node.delete(PDFName.of("Annots"));
  output.addPage(page);
  output.setTitle("Monday Shared Source-To-Body Model");
  output.setSubject("Invisible Invaders shared camp model");
  output.setAuthor("Piter Garcia and Aastha");
  output.setCreator("OpenAI Codex under Piter Garcia's supervision");
  output.setProducer("pdf-lib");
  fs.writeFileSync(MODEL_OUTPUT, await output.save());
}

function getEmbeddedImage(mediaName) {
  return execFileSync("unzip", [
    "-p",
    FIELD_RECORD_SOURCE,
    `ppt/media/${mediaName}`,
  ]);
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function buildSouvenir() {
  const pageWidth = 3300;
  const pageHeight = 2550;
  const siteOne = await sharp(getEmbeddedImage("image8.jpeg"))
    .resize(1450, 900, { fit: "cover", position: "centre" })
    .jpeg({ quality: 94 })
    .toBuffer();
  const siteTwo = await sharp(getEmbeddedImage("image.jpeg"))
    .resize(1450, 900, { fit: "cover", position: "centre" })
    .jpeg({ quality: 94 })
    .toBuffer();

  const siteOneUri = `data:image/jpeg;base64,${siteOne.toString("base64")}`;
  const siteTwoUri = `data:image/jpeg;base64,${siteTwo.toString("base64")}`;

  const title = escapeXml("OUR FIELD FRIDAY EVIDENCE");
  const subtitle = escapeXml(
    "Invisible Invaders | Group 2 | Charlotte Beach | July 24, 2026",
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">
  <rect width="${pageWidth}" height="${pageHeight}" fill="#F8FBFD"/>
  <rect width="${pageWidth}" height="330" fill="#16364F"/>
  <rect x="0" y="330" width="${pageWidth}" height="18" fill="#F1C64A"/>
  <text x="150" y="170" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="700" letter-spacing="1">${title}</text>
  <text x="150" y="262" fill="#D9EDF5" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="500">${subtitle}</text>

  <rect x="130" y="420" width="1490" height="1080" rx="28" fill="#FFFFFF" stroke="#D9E3E8" stroke-width="8"/>
  <clipPath id="clip1"><rect x="150" y="440" width="1450" height="900" rx="18"/></clipPath>
  <image href="${siteOneUri}" x="150" y="440" width="1450" height="900" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip1)"/>
  <rect x="150" y="440" width="350" height="92" rx="16" fill="#3F9968"/>
  <text x="190" y="505" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700">SITE 1</text>
  <text x="180" y="1408" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">Fence-side sand</text>
  <text x="180" y="1465" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="30">Approx. camera GPS: 43.258663, -77.604728</text>

  <rect x="1680" y="420" width="1490" height="1080" rx="28" fill="#FFFFFF" stroke="#D9E3E8" stroke-width="8"/>
  <clipPath id="clip2"><rect x="1700" y="440" width="1450" height="900" rx="18"/></clipPath>
  <image href="${siteTwoUri}" x="1700" y="440" width="1450" height="900" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip2)"/>
  <rect x="1700" y="440" width="350" height="92" rx="16" fill="#267EAA"/>
  <text x="1740" y="505" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700">SITE 2</text>
  <text x="1730" y="1408" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">Damp shoreline sand</text>
  <text x="1730" y="1465" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="30">Approx. camera GPS: 43.258728, -77.603942</text>

  <rect x="130" y="1570" width="3040" height="330" rx="28" fill="#DDEFF5"/>
  <text x="190" y="1665" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">WE CHOSE TWO PLACES TO COMPARE.</text>
  <text x="190" y="1745" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="43">We wondered whether water and nearby human activity could change what we find.</text>
  <text x="190" y="1835" fill="#A33F44" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700">Our samples are evidence to investigate, not proof of where plastic came from.</text>

  <text x="130" y="2000" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">OUR FIELD MOVES</text>
  <rect x="130" y="2040" width="700" height="150" rx="24" fill="#C94D52"/>
  <rect x="910" y="2040" width="700" height="150" rx="24" fill="#3F9968"/>
  <rect x="1690" y="2040" width="700" height="150" rx="24" fill="#E9B936"/>
  <rect x="2470" y="2040" width="700" height="150" rx="24" fill="#267EAA"/>
  <text x="480" y="2135" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">1  CHOOSE</text>
  <text x="1260" y="2135" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">2  FRAME</text>
  <text x="2040" y="2135" text-anchor="middle" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">3  COLLECT</text>
  <text x="2820" y="2135" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">4  RECORD</text>

  <rect x="130" y="2250" width="3040" height="190" rx="24" fill="#FFFFFF" stroke="#D9E3E8" stroke-width="6"/>
  <text x="180" y="2325" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="700">OUR EVIDENCE:</text>
  <text x="510" y="2325" fill="#16364F" font-family="Arial, Helvetica, sans-serif" font-size="35">two separate, traceable sand samples.</text>
  <text x="180" y="2392" fill="#A33F44" font-family="Arial, Helvetica, sans-serif" font-size="33" font-weight="700">OUR LIMIT:</text>
  <text x="445" y="2392" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="33">we have not confirmed which particles are plastic or where they came from.</text>

  <text x="130" y="2500" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="27">Share it your way: point to a photo, read one line, tell the story, ask a partner, or pass and return.</text>
  <text x="3170" y="2500" text-anchor="end" fill="#516471" font-family="Arial, Helvetica, sans-serif" font-size="24">GPS = median phone-camera location near each site, not a surveyed flag point.</text>
</svg>`;

  const souvenirPng = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
  const document = await PDFDocument.create();
  const page = document.addPage([792, 612]);
  const image = await document.embedPng(souvenirPng);
  page.drawImage(image, { x: 0, y: 0, width: 792, height: 612 });
  document.setTitle("Our Field Friday Evidence - Invisible Invaders Group 2");
  document.setSubject("Monday recap souvenir for the two Group 2 scholars");
  document.setAuthor("Piter Garcia and Aastha");
  document.setCreator("OpenAI Codex under Piter Garcia's supervision");
  document.setProducer("pdf-lib and sharp");
  fs.writeFileSync(SOUVENIR_OUTPUT, await document.save());
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(REQUIRED_OUTPUT_DIR, { recursive: true });
  await buildSouvenir();
  await buildAgenda();
  await buildSharedModel();
  console.log(`Built the required souvenir in ${REQUIRED_OUTPUT_DIR}`);
  console.log(`Built two backup-only Monday pages in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
