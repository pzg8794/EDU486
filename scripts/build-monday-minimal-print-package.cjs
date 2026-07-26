#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
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

const SOUVENIR_OUTPUT = path.join(
  REQUIRED_OUTPUT_DIR,
  "01-OUR-FIELD-FRIDAY-EVIDENCE-SOUVENIR-PRINT-2-COPIES-COLOR-LETTER-LANDSCAPE.pdf",
);

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
  fs.mkdirSync(REQUIRED_OUTPUT_DIR, { recursive: true });
  await buildSouvenir();
  console.log(`Built the required souvenir in ${REQUIRED_OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
