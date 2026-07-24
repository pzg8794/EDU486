#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} = require("pdf-lib");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const PRINT_PACKAGE_PARENT = path.join(
  ROOT,
  "_local-course-materials",
  "print-packages",
);

function nextDefaultOutputRoot() {
  const scanRoots = [
    PRINT_PACKAGE_PARENT,
    path.join(PRINT_PACKAGE_PARENT, "_archive", "preflight-builds"),
    path.join(PRINT_PACKAGE_PARENT, "_archive", "build-sources"),
  ];
  let highestVersion = 0;
  for (const scanRoot of scanRoots) {
    if (!fs.existsSync(scanRoot)) continue;
    for (const name of fs.readdirSync(scanRoot)) {
      const match = name.match(/print-package-v(\d+)/);
      if (match) highestVersion = Math.max(highestVersion, Number(match[1]));
    }
  }
  return path.join(
    PRINT_PACKAGE_PARENT,
    `2026-07-23-invisible-invaders-print-package-v${highestVersion + 1}`,
  );
}

const OUTPUT_ROOT = path.resolve(
  process.argv[2] || nextDefaultOutputRoot(),
);
const OUTPUT_BASENAME = path.basename(OUTPUT_ROOT);
const VERSION_MATCH = OUTPUT_BASENAME.match(/-v(\d+)$/);
const PACKAGE_VERSION = VERSION_MATCH ? `v${VERSION_MATCH[1]}` : "custom";
const PACKAGE_VERSION_LABEL = `2026-07-23-${PACKAGE_VERSION}`;
const BUILD_SOURCE_ROOT = path.join(
  path.dirname(OUTPUT_ROOT),
  "_archive",
  "build-sources",
  OUTPUT_BASENAME,
);

const LETTER = [612, 792];
const LETTER_LANDSCAPE = [792, 612];
const TABLOID_LANDSCAPE = [1224, 792];
const POSTER_LANDSCAPE = [2592, 1728];

const COLORS = {
  ink: rgb(0.07, 0.17, 0.22),
  muted: rgb(0.34, 0.4, 0.43),
  line: rgb(0.78, 0.82, 0.84),
  light: rgb(0.96, 0.97, 0.97),
  science: rgb(0.08, 0.35, 0.67),
  scienceLight: rgb(0.9, 0.95, 1),
  evidence: rgb(0.12, 0.45, 0.22),
  evidenceLight: rgb(0.91, 0.97, 0.92),
  justice: rgb(0.73, 0.25, 0.02),
  justiceLight: rgb(1, 0.94, 0.89),
  access: rgb(0.39, 0.09, 0.55),
  accessLight: rgb(0.96, 0.92, 0.98),
  joy: rgb(0.88, 0.58, 0.02),
  joyLight: rgb(1, 0.97, 0.86),
  earth: rgb(0.19, 0.47, 0.16),
  water: rgb(0.86, 0.4, 0.05),
  living: rgb(0.05, 0.42, 0.67),
  infrastructure: rgb(0.47, 0.2, 0.58),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
};

const DRIVE_LINKS = {
  operations:
    "https://docs.google.com/document/d/1LueJ9NX6MP257ywABKTDu-vVWVYzTwRnNDK8fgJx4e0/edit",
  friday:
    "https://docs.google.com/document/d/16iqraS0TefwyGQdTOlp2s-sQnIWB6DgCOptWtB8vWJ0/edit",
  fridaySlides:
    "https://docs.google.com/presentation/d/1aEEMEWiIwTtmNnP2zNhW21cBl0Aow-OQW-kSC7mMfrk/edit",
  monday:
    "https://docs.google.com/document/d/1jc_dSOKXVhSoSbvfbivXlgfYOxrrJ2L6KwbR7LQZCLc/edit",
  tuesday:
    "https://docs.google.com/document/d/1tT5NOTrNFRus6EqlCQR85Io5Gv71osEyG5aT_rY--II/edit",
  wednesday:
    "https://docs.google.com/document/d/1eyx_nVAkRTAypKS11guif8NgVHcxk7QzX3T52dOBcdg/edit",
  thursday:
    "https://docs.google.com/document/d/14foM1GLckWQlPl06YE0gsyScPV6YVBgM2mTrzc5uNJQ/edit",
  fridayReflection:
    "https://docs.google.com/document/d/1j89Vjd8nAT8gs-rzFO5hIeDuH8_VlnI2HyHImMhgSec/edit",
};

const outputItems = [];

function ensureNewOutputRoot() {
  if (fs.existsSync(OUTPUT_ROOT)) {
    throw new Error(
      `Refusing to overwrite an existing print package: ${OUTPUT_ROOT}`,
    );
  }
  if (fs.existsSync(BUILD_SOURCE_ROOT)) {
    throw new Error(
      `Refusing to overwrite an existing build-source archive: ${BUILD_SOURCE_ROOT}`,
    );
  }
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
}

function dayDir(number, slug) {
  const dir = path.join(OUTPUT_ROOT, `${number}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rel(filePath) {
  return path.relative(OUTPUT_ROOT, filePath);
}

function register(item) {
  outputItems.push(item);
}

function colorToHex(color) {
  const toHex = (n) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`;
}

function wrapLines(text, font, size, maxWidth) {
  const paragraphs = String(text).split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawWrapped(page, text, options) {
  const {
    x,
    top,
    width,
    font,
    size = 11,
    color = COLORS.ink,
    lineHeight = size * 1.25,
    align = "left",
    maxLines = null,
  } = options;
  const pageHeight = page.getHeight();
  let lines = wrapLines(text, font, size, width);
  if (maxLines !== null && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines.length - 1;
    while (
      lines[last].length > 3 &&
      font.widthOfTextAtSize(`${lines[last]}...`, size) > width
    ) {
      lines[last] = lines[last].slice(0, -1);
    }
    lines[last] = `${lines[last]}...`;
  }
  lines.forEach((line, index) => {
    let drawX = x;
    const textWidth = font.widthOfTextAtSize(line, size);
    if (align === "center") drawX = x + (width - textWidth) / 2;
    if (align === "right") drawX = x + width - textWidth;
    page.drawText(line, {
      x: drawX,
      y: pageHeight - top - size - index * lineHeight,
      size,
      font,
      color,
    });
  });
  return top + lines.length * lineHeight;
}

function drawPanel(page, options) {
  const {
    x,
    top,
    width,
    height,
    fill = COLORS.white,
    border = COLORS.line,
    borderWidth = 1,
    radius = 0,
  } = options;
  const y = page.getHeight() - top - height;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth,
    borderRadius: radius,
  });
}

function drawRule(page, x1, top, x2, color = COLORS.line, thickness = 1) {
  const y = page.getHeight() - top;
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    color,
    thickness,
  });
}

function drawCheckbox(page, x, top, size = 11, color = COLORS.ink) {
  page.drawRectangle({
    x,
    y: page.getHeight() - top - size,
    width: size,
    height: size,
    borderColor: color,
    borderWidth: 1.2,
  });
}

function drawResponseChoices(page, fonts, top, width = 540, x = 36) {
  drawPanel(page, {
    x,
    top,
    width,
    height: 45,
    fill: COLORS.accessLight,
    border: COLORS.access,
    borderWidth: 1.2,
  });
  drawWrapped(
    page,
    "ACCESS CHOICE: Talk | Point | Draw | Write | Move a card | Partner | Seated/quiet | Pass and return",
    {
      x: x + 12,
      top: top + 9,
      width: width - 24,
      font: fonts.bold,
      size: 10.5,
      color: COLORS.access,
      lineHeight: 13,
      align: "center",
    },
  );
}

function drawHeader(page, fonts, options) {
  const {
    title,
    subtitle = "",
    accent = COLORS.science,
    label = "INVISIBLE INVADERS",
    pageNumber = null,
    flowTitleSpacing = false,
  } = options;
  const width = page.getWidth();
  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 13,
    width,
    height: 13,
    color: accent,
  });
  drawWrapped(page, label, {
    x: 36,
    top: 27,
    width: width - 72,
    font: fonts.bold,
    size: 9,
    color: accent,
  });
  const titleBottom = drawWrapped(page, title, {
    x: 36,
    top: 43,
    width: width - 72,
    font: fonts.bold,
    size: 22,
    color: COLORS.ink,
    lineHeight: 24,
  });
  let headerBottom = titleBottom;
  if (subtitle) {
    const subtitleTop = flowTitleSpacing
      ? Math.max(72, titleBottom + 5)
      : 72;
    headerBottom = drawWrapped(page, subtitle, {
      x: 36,
      top: subtitleTop,
      width: width - 72,
      font: fonts.regular,
      size: 10.5,
      color: COLORS.muted,
      lineHeight: 13,
    });
  }
  if (pageNumber !== null) {
    page.drawText(String(pageNumber), {
      x: width - 50,
      y: 22,
      size: 9,
      font: fonts.regular,
      color: COLORS.muted,
    });
  }
  return headerBottom;
}

function drawFooter(page, fonts, text) {
  drawRule(page, 36, page.getHeight() - 34, page.getWidth() - 36);
  drawWrapped(page, text, {
    x: 36,
    top: page.getHeight() - 28,
    width: page.getWidth() - 72,
    font: fonts.regular,
    size: 7.5,
    color: COLORS.muted,
    align: "center",
  });
}

async function newPdf(title, subject = "Invisible Invaders camp print artifact") {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("Piter Garcia and Aastha");
  doc.setSubject(subject);
  doc.setCreator("OpenAI Codex under Piter Garcia's supervision");
  doc.setProducer("pdf-lib");
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  return { doc, fonts };
}

async function writePdf(doc, filePath) {
  const bytes = await doc.save();
  fs.writeFileSync(filePath, bytes);
  return bytes;
}

async function repeatPdfBytes(baseBytes, copies) {
  const source = await PDFDocument.load(baseBytes);
  const out = await PDFDocument.create();
  for (let copy = 0; copy < copies; copy += 1) {
    const pages = await out.copyPages(
      source,
      source.getPageIndices(),
    );
    pages.forEach((page) => out.addPage(page));
  }
  return out.save();
}

async function extractRepeatedPages(sourcePath, indices, copies, outputPath) {
  const source = await PDFDocument.load(fs.readFileSync(sourcePath));
  const out = await PDFDocument.create();
  for (let copy = 0; copy < copies; copy += 1) {
    const pages = await out.copyPages(source, indices);
    pages.forEach((page) => out.addPage(page));
  }
  fs.writeFileSync(outputPath, await out.save());
}

async function fitPdfToPage(sourcePath, outputPath, targetSize) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const source = await PDFDocument.load(sourceBytes);
  const out = await PDFDocument.create();
  out.setTitle("Invisible Invaders Field Friday Visual Guide");
  out.setAuthor("Piter Garcia and Aastha");
  out.setSubject("True-size letter landscape print edition");
  out.setCreator("OpenAI Codex under Piter Garcia's supervision");
  out.setProducer("pdf-lib");
  const embeddedPages = await out.embedPdf(
    sourceBytes,
    source.getPageIndices(),
  );
  const [targetWidth, targetHeight] = targetSize;
  const margin = 18;
  for (const embedded of embeddedPages) {
    const page = out.addPage(targetSize);
    const scale = Math.min(
      (targetWidth - margin * 2) / embedded.width,
      (targetHeight - margin * 2) / embedded.height,
    );
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    page.drawPage(embedded, {
      x: (targetWidth - width) / 2,
      y: (targetHeight - height) / 2,
      xScale: scale,
      yScale: scale,
    });
  }
  fs.writeFileSync(outputPath, await out.save());
}

function expectedPageSize(sizeLabel) {
  if (sizeLabel.includes("36 x 24")) return POSTER_LANDSCAPE;
  if (sizeLabel.includes("17 x 11")) return TABLOID_LANDSCAPE;
  if (sizeLabel.startsWith("11 x 8.5")) return LETTER_LANDSCAPE;
  if (sizeLabel.startsWith("8.5 x 11")) return LETTER;
  throw new Error(`Unknown print size label: ${sizeLabel}`);
}

async function validateOutputItems() {
  const results = [];
  for (const item of outputItems) {
    const filePath = path.resolve(OUTPUT_ROOT, item.file);
    const relative = path.relative(OUTPUT_ROOT, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Print artifact escaped the package root: ${item.file}`);
    }
    const doc = await PDFDocument.load(fs.readFileSync(filePath));
    const pages = doc.getPages();
    if (pages.length !== item.sheets) {
      throw new Error(
        `${item.file}: expected ${item.sheets} page(s), found ${pages.length}`,
      );
    }
    const [expectedWidth, expectedHeight] = expectedPageSize(item.size);
    for (const [index, page] of pages.entries()) {
      const { width, height } = page.getSize();
      if (
        Math.abs(width - expectedWidth) > 1 ||
        Math.abs(height - expectedHeight) > 1
      ) {
        throw new Error(
          `${item.file} page ${index + 1}: expected ${expectedWidth} x ${expectedHeight} pt, found ${width} x ${height} pt`,
        );
      }
    }
    results.push({
      file: item.file,
      pages: pages.length,
      widthPoints: expectedWidth,
      heightPoints: expectedHeight,
      status: "PASS",
    });
  }
  fs.writeFileSync(
    path.join(OUTPUT_ROOT, "00-PREFLIGHT-VALIDATION.json"),
    `${JSON.stringify(
      {
        packageVersion: PACKAGE_VERSION_LABEL,
        checkedArtifacts: results.length,
        status: "PASS",
        results,
      },
      null,
      2,
    )}\n`,
  );
}

function gridCell(page, fonts, options) {
  const {
    x,
    top,
    width,
    height,
    title,
    body = "",
    accent = COLORS.science,
    fill = COLORS.white,
    titleSize = 14,
    bodySize = 10.5,
    centered = false,
  } = options;
  drawPanel(page, {
    x,
    top,
    width,
    height,
    fill,
    border: accent,
    borderWidth: 1.5,
  });
  drawWrapped(page, title, {
    x: x + 10,
    top: top + 10,
    width: width - 20,
    font: fonts.bold,
    size: titleSize,
    color: accent,
    lineHeight: titleSize * 1.1,
    align: centered ? "center" : "left",
  });
  if (body) {
    drawWrapped(page, body, {
      x: x + 10,
      top: top + 34,
      width: width - 20,
      font: fonts.regular,
      size: bodySize,
      color: COLORS.ink,
      lineHeight: bodySize * 1.22,
      align: centered ? "center" : "left",
    });
  }
}

async function makeCardGrid(options) {
  const {
    title,
    cards,
    columns = 2,
    rows = 4,
    sets = 1,
    accent = COLORS.science,
    outputPath,
    day,
    priority,
    colorMode = "Full color",
    paper = "80 lb white cover/cardstock",
    finishing = "Single-sided; cut on the printed grid lines",
  } = options;
  const { doc, fonts } = await newPdf(title);
  const margin = 30;
  const headerHeight = 50;
  const gap = 8;
  const cellW = (LETTER[0] - margin * 2 - gap * (columns - 1)) / columns;
  const cellH =
    (LETTER[1] - margin * 2 - headerHeight - gap * (rows - 1)) / rows;
  const perPage = columns * rows;
  const basePages = Math.ceil(cards.length / perPage);
  for (let set = 0; set < sets; set += 1) {
    for (let pageIndex = 0; pageIndex < basePages; pageIndex += 1) {
      const page = doc.addPage(LETTER);
      drawWrapped(page, `${title} | SET ${set + 1}`, {
        x: margin,
        top: 18,
        width: LETTER[0] - margin * 2,
        font: fonts.bold,
        size: 14,
        color: accent,
        align: "center",
      });
      for (let slot = 0; slot < perPage; slot += 1) {
        const card = cards[pageIndex * perPage + slot];
        if (!card) continue;
        const row = Math.floor(slot / columns);
        const col = slot % columns;
        const x = margin + col * (cellW + gap);
        const top = margin + headerHeight + row * (cellH + gap);
        gridCell(page, fonts, {
          x,
          top,
          width: cellW,
          height: cellH,
          title: card.title,
          body: card.body,
          accent: card.accent || accent,
          fill: card.fill || COLORS.white,
          titleSize: card.titleSize || 13,
          bodySize: card.bodySize || 9.5,
          centered: card.centered || false,
        });
      }
      drawFooter(
        page,
        fonts,
        "Use labels, words, and symbols together. A camper may change roles or participation routes.",
      );
    }
  }
  await writePdf(doc, outputPath);
  register({
    priority,
    day,
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: colorMode,
    paper,
    sheets: basePages * sets,
    finishing,
  });
}

async function makeAccessBoard(outputPath) {
  const { doc, fonts } = await newPdf("Reusable Access Choice Board");
  const page = doc.addPage(LETTER);
  drawHeader(page, fonts, {
    title: "Choose How You Participate",
    subtitle: "Every route can show rigorous science. You may change routes at any time.",
    accent: COLORS.access,
    label: "REUSABLE ACCESS BOARD",
  });
  const choices = [
    ["TALK", "Say an idea in your own words."],
    ["POINT", "Point to a card, image, place, or answer."],
    ["DRAW OR WRITE", "Use words, symbols, arrows, or sketches."],
    ["BUILD OR MOVE", "Place a model piece or move evidence."],
    ["PHOTO OR AUDIO", "Record evidence or your explanation."],
    ["PARTNER", "Ask a partner to share with or for you."],
    ["SEATED OR QUIET", "Use a lower-energy or lower-sensory route."],
    ["PASS + RETURN", "Pause now and re-enter when you are ready."],
  ];
  choices.forEach(([title, body], index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    gridCell(page, fonts, {
      x: 36 + col * 274,
      top: 120 + row * 132,
      width: 262,
      height: 116,
      title,
      body,
      accent: COLORS.access,
      fill: index % 2 === 0 ? COLORS.accessLight : COLORS.white,
      titleSize: 16,
      bodySize: 11.5,
    });
  });
  drawPanel(page, {
    x: 36,
    top: 662,
    width: 540,
    height: 74,
    fill: COLORS.joyLight,
    border: COLORS.joy,
    borderWidth: 1.5,
  });
  drawWrapped(
    page,
    "Need another route? Tell, point, or show Piter or Aastha. Breaks, water, movement, and re-entry are part of the plan.",
    {
      x: 52,
      top: 679,
      width: 508,
      font: fonts.bold,
      size: 12,
      color: COLORS.ink,
      lineHeight: 15,
      align: "center",
    },
  );
  const repeated = await repeatPdfBytes(await doc.save(), 3);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P2",
    day: "Reusable",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 3,
    finishing: "Single-sided; do not cut",
  });
}

async function makeGottaHaves(outputPath) {
  const cards = [
    {
      title: "1 | EARTH SYSTEMS",
      body: "Earth systems are interconnected. Plastic particles can cross products, buildings, roads, air, water, soil, organisms, and waste systems.",
      accent: COLORS.earth,
      fill: rgb(0.93, 0.97, 0.92),
    },
    {
      title: "2 | WATER",
      body: "Water transports materials. Rain, runoff, wastewater, rivers, and other flows can move particles.",
      accent: COLORS.water,
      fill: rgb(1, 0.95, 0.9),
    },
    {
      title: "3 | LIVING ORGANISMS",
      body: "Living organisms respond to environmental conditions. Detection shows presence or possible exposure, not automatic harm.",
      accent: COLORS.living,
      fill: rgb(0.91, 0.96, 0.99),
    },
    {
      title: "4 | HUMAN INFRASTRUCTURE",
      body: "Human infrastructure influences natural systems. Design, roads, drains, waste systems, monitoring, and policy can change pathways.",
      accent: COLORS.infrastructure,
      fill: rgb(0.96, 0.92, 0.97),
    },
  ];
  await makeCardGrid({
    title: "Our Four Gotta-Haves",
    cards,
    columns: 1,
    rows: 4,
    sets: 2,
    outputPath,
    day: "Reusable",
    priority: "P2",
    finishing: "Single-sided; cut into four large cards",
  });
}

async function makeFacilitatorBrief(day, outputPath) {
  const { doc, fonts } = await newPdf(`${day.title} Facilitator Brief`);
  for (let copy = 1; copy <= 2; copy += 1) {
    const page1 = doc.addPage(LETTER);
    drawHeader(page1, fonts, {
      title: `${day.title} | Facilitator Brief`,
      subtitle: `${day.date} | COPY ${copy} OF 2 | Piter + Aastha`,
      accent: day.accent,
      label: `INVISIBLE INVADERS | ${day.gottaHave}`,
      pageNumber: 1,
    });
    drawPanel(page1, {
      x: 36,
      top: 103,
      width: 540,
      height: 82,
      fill: day.light,
      border: day.accent,
      borderWidth: 1.5,
    });
    drawWrapped(page1, "CONNECTING QUESTION", {
      x: 50,
      top: 114,
      width: 512,
      font: fonts.bold,
      size: 10,
      color: day.accent,
    });
    drawWrapped(page1, day.question, {
      x: 50,
      top: 133,
      width: 512,
      font: fonts.bold,
      size: 13,
      color: COLORS.ink,
      lineHeight: 16,
      maxLines: 3,
    });
    let top = 200;
    drawWrapped(page1, "TEACH FROM THIS SEQUENCE", {
      x: 36,
      top,
      width: 540,
      font: fonts.bold,
      size: 13,
      color: day.accent,
    });
    top += 24;
    day.sequence.forEach((step, index) => {
      const height = 50;
      drawPanel(page1, {
        x: 36,
        top,
        width: 540,
        height,
        fill: index % 2 === 0 ? COLORS.light : COLORS.white,
        border: COLORS.line,
      });
      drawWrapped(page1, step[0], {
        x: 47,
        top: top + 9,
        width: 58,
        font: fonts.bold,
        size: 10,
        color: day.accent,
      });
      drawWrapped(page1, step[1], {
        x: 110,
        top: top + 8,
        width: 200,
        font: fonts.bold,
        size: 10.5,
        color: COLORS.ink,
        lineHeight: 13,
      });
      drawWrapped(page1, step[2], {
        x: 315,
        top: top + 8,
        width: 248,
        font: fonts.regular,
        size: 9.5,
        color: COLORS.ink,
        lineHeight: 12,
      });
      top += height + 6;
    });
    drawPanel(page1, {
      x: 36,
      top: 650,
      width: 540,
      height: 82,
      fill: COLORS.joyLight,
      border: COLORS.joy,
    });
    drawWrapped(page1, "LAUNCH LANGUAGE", {
      x: 50,
      top: 662,
      width: 512,
      font: fonts.bold,
      size: 10,
      color: COLORS.justice,
    });
    drawWrapped(page1, day.launch, {
      x: 50,
      top: 681,
      width: 512,
      font: fonts.italic,
      size: 11,
      color: COLORS.ink,
      lineHeight: 14,
      maxLines: 3,
    });
    drawFooter(page1, fonts, `Live source: ${day.liveLink}`);

    const page2 = doc.addPage(LETTER);
    drawHeader(page2, fonts, {
      title: `${day.title} | Materials, Access, And Close`,
      subtitle: `${day.date} | COPY ${copy} OF 2`,
      accent: day.accent,
      label: "FACILITATOR BRIEF",
      pageNumber: 2,
    });
    const columns = [
      {
        x: 36,
        title: "MATERIALS",
        items: day.materials,
        accent: COLORS.science,
        fill: COLORS.scienceLight,
      },
      {
        x: 312,
        title: "ACCESS ROUTES",
        items: day.access,
        accent: COLORS.access,
        fill: COLORS.accessLight,
      },
    ];
    columns.forEach((column) => {
      drawPanel(page2, {
        x: column.x,
        top: 105,
        width: 264,
        height: 265,
        fill: column.fill,
        border: column.accent,
      });
      drawWrapped(page2, column.title, {
        x: column.x + 14,
        top: 118,
        width: 236,
        font: fonts.bold,
        size: 12,
        color: column.accent,
      });
      let itemTop = 145;
      column.items.forEach((item) => {
        drawCheckbox(page2, column.x + 15, itemTop + 2, 9, column.accent);
        itemTop = drawWrapped(page2, item, {
          x: column.x + 32,
          top: itemTop,
          width: 218,
          font: fonts.regular,
          size: 9.2,
          color: COLORS.ink,
          lineHeight: 11.3,
        });
        itemTop += 7;
      });
    });
    drawPanel(page2, {
      x: 36,
      top: 388,
      width: 540,
      height: 115,
      fill: COLORS.evidenceLight,
      border: COLORS.evidence,
    });
    drawWrapped(page2, "EVIDENCE AND SAFETY LIMITS", {
      x: 50,
      top: 401,
      width: 512,
      font: fonts.bold,
      size: 12,
      color: COLORS.evidence,
    });
    let limitTop = 427;
    day.limits.forEach((item) => {
      drawWrapped(page2, `- ${item}`, {
        x: 52,
        top: limitTop,
        width: 508,
        font: fonts.regular,
        size: 9.6,
        color: COLORS.ink,
        lineHeight: 12,
      });
      limitTop += 24;
    });
    drawPanel(page2, {
      x: 36,
      top: 520,
      width: 540,
      height: 105,
      fill: COLORS.justiceLight,
      border: COLORS.justice,
    });
    drawWrapped(page2, "AFTER TODAY", {
      x: 50,
      top: 533,
      width: 512,
      font: fonts.bold,
      size: 12,
      color: COLORS.justice,
    });
    let afterTop = 558;
    day.after.forEach((item) => {
      drawCheckbox(page2, 51, afterTop + 2, 9, COLORS.justice);
      afterTop = drawWrapped(page2, item, {
        x: 68,
        top: afterTop,
        width: 490,
        font: fonts.regular,
        size: 9.5,
        color: COLORS.ink,
        lineHeight: 12,
      });
      afterTop += 8;
    });
    drawResponseChoices(page2, fonts, 644);
    drawFooter(
      page2,
      fonts,
      "One spoken direction at a time. Keep the full sequence visible. Preserve youth language and uncertainty.",
    );
  }
  await writePdf(doc, outputPath);
  register({
    priority: day.priority,
    day: day.title,
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Full color",
    paper: "28-32 lb white text",
    sheets: 4,
    finishing: "Single-sided; collate as two 2-page facilitator sets; staple each set",
  });
}

async function makeVisualAgenda(day, outputPath) {
  const { doc, fonts } = await newPdf(`${day.title} Visual Agenda`);
  const page = doc.addPage(TABLOID_LANDSCAPE);
  const width = page.getWidth();
  drawHeader(page, fonts, {
    title: `${day.title} | What We Are Doing`,
    subtitle: `${day.date} | You may change roles, pause, or re-enter.`,
    accent: day.accent,
    label: `VISUAL AGENDA | ${day.gottaHave}`,
  });
  drawPanel(page, {
    x: 42,
    top: 105,
    width: width - 84,
    height: 88,
    fill: day.light,
    border: day.accent,
    borderWidth: 2,
  });
  drawWrapped(page, day.question, {
    x: 64,
    top: 128,
    width: width - 128,
    font: fonts.bold,
    size: 19,
    color: COLORS.ink,
    lineHeight: 23,
    align: "center",
    maxLines: 2,
  });
  const steps = day.agenda;
  const gap = 12;
  const available = width - 84;
  const cellW = (available - gap * (steps.length - 1)) / steps.length;
  steps.forEach((step, index) => {
    const x = 42 + index * (cellW + gap);
    const fill =
      index % 4 === 0
        ? COLORS.scienceLight
        : index % 4 === 1
          ? COLORS.evidenceLight
          : index % 4 === 2
            ? COLORS.justiceLight
            : COLORS.accessLight;
    const accent =
      index % 4 === 0
        ? COLORS.science
        : index % 4 === 1
          ? COLORS.evidence
          : index % 4 === 2
            ? COLORS.justice
            : COLORS.access;
    drawPanel(page, {
      x,
      top: 230,
      width: cellW,
      height: 300,
      fill,
      border: accent,
      borderWidth: 2,
    });
    drawPanel(page, {
      x: x + cellW / 2 - 28,
      top: 248,
      width: 56,
      height: 56,
      fill: accent,
      border: accent,
    });
    drawWrapped(page, String(index + 1), {
      x: x + cellW / 2 - 28,
      top: 258,
      width: 56,
      font: fonts.bold,
      size: 26,
      color: COLORS.white,
      align: "center",
    });
    drawWrapped(page, step.title, {
      x: x + 10,
      top: 326,
      width: cellW - 20,
      font: fonts.bold,
      size: 16,
      color: accent,
      lineHeight: 18,
      align: "center",
      maxLines: 3,
    });
    drawWrapped(page, step.body, {
      x: x + 12,
      top: 398,
      width: cellW - 24,
      font: fonts.regular,
      size: 12,
      color: COLORS.ink,
      lineHeight: 15,
      align: "center",
      maxLines: 6,
    });
  });
  drawPanel(page, {
    x: 42,
    top: 565,
    width: width - 84,
    height: 120,
    fill: COLORS.accessLight,
    border: COLORS.access,
    borderWidth: 2,
  });
  drawWrapped(page, "CHOOSE A ROUTE", {
    x: 62,
    top: 583,
    width: width - 124,
    font: fonts.bold,
    size: 17,
    color: COLORS.access,
    align: "center",
  });
  drawWrapped(
    page,
    "Talk | Point | Draw | Write | Build | Photograph/record | Partner | Seated/quiet | Pass and return",
    {
      x: 62,
      top: 617,
      width: width - 124,
      font: fonts.bold,
      size: 17,
      color: COLORS.ink,
      lineHeight: 21,
      align: "center",
    },
  );
  drawWrapped(
    page,
    "The response route can change. The evidence goal stays the same.",
    {
      x: 62,
      top: 655,
      width: width - 124,
      font: fonts.regular,
      size: 12,
      color: COLORS.muted,
      align: "center",
    },
  );
  drawFooter(page, fonts, `Live lesson: ${day.liveLink}`);
  await writePdf(doc, outputPath);
  register({
    priority: day.priority,
    day: day.title,
    file: rel(outputPath),
    size: "17 x 11 in landscape (tabloid)",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 1,
    finishing: "Single-sided; do not crop, scale, mount, or laminate",
  });
}

async function makeSourceToBodyModel(outputPath) {
  const { doc, fonts } = await newPdf("Monday Source-to-Body Model");
  const page = doc.addPage(TABLOID_LANDSCAPE);
  drawHeader(page, fonts, {
    title: "Build A Source-To-Body Pathway Model",
    subtitle:
      "Use arrows, words, drawings, or moveable cards. Mark what is supported, possible, or unknown.",
    accent: COLORS.water,
    label: "MONDAY | GOTTA-HAVE 2: WATER TRANSPORTS MATERIALS",
  });
  drawWrapped(
    page,
    "How can moving water help plastic reach living organisms and food webs, and what can our evidence not tell us yet?",
    {
      x: 52,
      top: 100,
      width: 1120,
      font: fonts.bold,
      size: 17,
      color: COLORS.ink,
      align: "center",
    },
  );
  const boxes = [
    ["1 | SOURCE", "What material or product contains plastic?", COLORS.science],
    ["2 | RELEASE", "How do smaller pieces or fibers leave it?", COLORS.science],
    ["3 | MOVE", "Air, water, food, soil, or another pathway?", COLORS.water],
    ["4 | ENCOUNTER", "Which organism or person could encounter it?", COLORS.living],
    ["5 | EVIDENCE", "What observation or source supports an arrow?", COLORS.evidence],
    ["6 | UNKNOWN", "What route or effect is not proven yet?", COLORS.evidence],
    ["7 | FAIR ACTION", "Who can reduce the pathway or share responsibility?", COLORS.justice],
  ];
  const margin = 36;
  const gap = 12;
  const cellW = (TABLOID_LANDSCAPE[0] - margin * 2 - gap * 6) / 7;
  boxes.forEach((box, index) => {
    const x = margin + index * (cellW + gap);
    gridCell(page, fonts, {
      x,
      top: 155,
      width: cellW,
      height: 400,
      title: box[0],
      body: box[1],
      accent: box[2],
      fill: COLORS.white,
      titleSize: 13,
      bodySize: 10.5,
      centered: true,
    });
    for (let line = 0; line < 5; line += 1) {
      drawRule(
        page,
        x + 14,
        370 + line * 36,
        x + cellW - 14,
        COLORS.line,
        0.8,
      );
    }
    if (index < boxes.length - 1) {
      drawWrapped(page, "->", {
        x: x + cellW,
        top: 325,
        width: gap,
        font: fonts.bold,
        size: 16,
        color: COLORS.muted,
        align: "center",
      });
    }
  });
  drawPanel(page, {
    x: 36,
    top: 580,
    width: 1152,
    height: 95,
    fill: COLORS.evidenceLight,
    border: COLORS.evidence,
  });
  drawWrapped(
    page,
    "EVIDENCE LIMIT: Finding plastic in a sample shows detection or possible exposure. It does not, by itself, prove the exact route or a health effect.",
    {
      x: 54,
      top: 600,
      width: 1116,
      font: fonts.bold,
      size: 15,
      color: COLORS.evidence,
      lineHeight: 19,
      align: "center",
    },
  );
  drawResponseChoices(page, fonts, 700, 1152, 36);
  const repeated = await repeatPdfBytes(await doc.save(), 12);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P2",
    day: "Monday",
    file: rel(outputPath),
    size: "17 x 11 in landscape (tabloid)",
    color: "Full color",
    paper: "28-32 lb white text",
    sheets: 12,
    finishing: "Single-sided; do not crop or scale",
  });
}

async function makeSandProcessVisual(outputPath) {
  const { doc, fonts } = await newPdf("Sand Investigation Visual Sequence");
  const page = doc.addPage(LETTER_LANDSCAPE);
  drawHeader(page, fonts, {
    title: "Sand Investigation | Follow The Sample ID",
    subtitle: "Process SAMPLE 1-6 and the BLANK separately. Give one spoken direction at a time.",
    accent: COLORS.evidence,
    label: "MONDAY-WEDNESDAY | REUSABLE STATION GUIDE",
  });
  const steps = [
    "MATCH ID",
    "SIEVE",
    "ADD BRINE",
    "MIX",
    "SETTLE",
    "FILTER",
    "COVER + DRY",
    "INSPECT",
    "COMPARE BLANK",
    "CLAIM + LIMIT",
  ];
  const gap = 8;
  const margin = 30;
  const cellW = (LETTER_LANDSCAPE[0] - margin * 2 - gap * 4) / 5;
  steps.forEach((step, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const x = margin + col * (cellW + gap);
    const top = 125 + row * 175;
    gridCell(page, fonts, {
      x,
      top,
      width: cellW,
      height: 150,
      title: `${index + 1}`,
      body: step,
      accent: index < 5 ? COLORS.science : COLORS.evidence,
      fill: index < 5 ? COLORS.scienceLight : COLORS.evidenceLight,
      titleSize: 23,
      bodySize: 12.5,
      centered: true,
    });
  });
  drawPanel(page, {
    x: 30,
    top: 485,
    width: 732,
    height: 62,
    fill: COLORS.justiceLight,
    border: COLORS.justice,
  });
  drawWrapped(
    page,
    "STOP: Do not combine samples. Do not heat saltwater. A visible particle is suspected, not confirmed, plastic.",
    {
      x: 44,
      top: 502,
      width: 704,
      font: fonts.bold,
      size: 12,
      color: COLORS.justice,
      align: "center",
    },
  );
  drawFooter(
    page,
    fonts,
    "Access: mixer, timer, label checker, filter monitor, microscope navigator, recorder, skeptic/checker, seated coordinator.",
  );
  const repeated = await repeatPdfBytes(await doc.save(), 3);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P2",
    day: "Monday-Wednesday",
    file: rel(outputPath),
    size: "11 x 8.5 in landscape",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 3,
    finishing: "Single-sided; do not cut",
  });
}

async function makeSandDataRecord(outputPath) {
  const { doc, fonts } = await newPdf("Sand Investigation Data Record");
  for (let set = 1; set <= 8; set += 1) {
    const page1 = doc.addPage(LETTER);
    drawHeader(page1, fonts, {
      title: "Sand Investigation Data Record | Process",
      subtitle: `SET ${set} OF 8 | Use one set for each sample or blank.`,
      accent: COLORS.evidence,
      label: "MONDAY-TUESDAY | PAGE 1 OF 2",
    });
    drawWrapped(
      page1,
      "Sample ID: __________________  Map/site: ______________________________  Date: __________",
      {
        x: 36,
        top: 105,
        width: 540,
        font: fonts.bold,
        size: 11,
        color: COLORS.ink,
      },
    );
    const fields = [
      "Collection time, weather, depth, pattern, and scoop count",
      "Wet, damp, or dry when sieved",
      "Sieve mesh openings and fraction used",
      "Sand amount processed",
      "Brine batch: salt mass and water volume",
      "Brine volume added",
      "Mixing method and duration",
      "Settling start, stop, and total time",
      "Filter ID, paper type, and rinse volume if used",
      "Possible contamination event or unusual condition",
    ];
    let top = 142;
    fields.forEach((field, index) => {
      drawPanel(page1, {
        x: 36,
        top,
        width: 540,
        height: 51,
        fill: index % 2 ? COLORS.white : COLORS.light,
        border: COLORS.line,
      });
      drawWrapped(page1, field, {
        x: 48,
        top: top + 8,
        width: 205,
        font: fonts.bold,
        size: 9.2,
        color: COLORS.ink,
        lineHeight: 11,
      });
      drawRule(page1, 270, top + 31, 561, COLORS.muted, 0.8);
      top += 56;
    });
    drawResponseChoices(page1, fonts, 710);
    drawFooter(
      page1,
      fonts,
      "Match the written sample ID on the jar, filter, slide, data sheet, and photograph.",
    );

    const page2 = doc.addPage(LETTER);
    drawHeader(page2, fonts, {
      title: "Sand Investigation Data Record | Evidence",
      subtitle: `SET ${set} OF 8 | Compare the BLANK before writing a claim.`,
      accent: COLORS.evidence,
      label: "WEDNESDAY | PAGE 2 OF 2",
    });
    const evidenceFields = [
      ["Actual magnification", 45],
      ["Suspected forms, colors, lengths, and counts", 105],
      ["BLANK observations", 85],
      ["What we observed", 90],
      ["What this evidence suggests", 90],
      ["What we cannot conclude yet", 90],
      ["Model change or new question", 90],
    ];
    let evidenceTop = 110;
    evidenceFields.forEach(([field, height], index) => {
      drawPanel(page2, {
        x: 36,
        top: evidenceTop,
        width: 540,
        height,
        fill: index % 2 ? COLORS.white : COLORS.evidenceLight,
        border: index < 3 ? COLORS.evidence : COLORS.line,
      });
      drawWrapped(page2, field, {
        x: 48,
        top: evidenceTop + 10,
        width: 200,
        font: fonts.bold,
        size: 10,
        color: index < 3 ? COLORS.evidence : COLORS.ink,
      });
      for (let line = 0; line < Math.max(1, Math.floor((height - 28) / 22)); line += 1) {
        drawRule(
          page2,
          255,
          evidenceTop + 28 + line * 22,
          560,
          COLORS.line,
          0.7,
        );
      }
      evidenceTop += height + 8;
    });
    drawFooter(
      page2,
      fonts,
      "Use: observed | suspected | under our method | supported | possible | unknown. Visual observation does not confirm polymer identity.",
    );
  }
  await writePdf(doc, outputPath);
  register({
    priority: "P2",
    day: "Monday-Wednesday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable",
    paper: "24-28 lb white text",
    sheets: 16,
    finishing: "Single-sided; collate as eight 2-page sets; paper clip each set",
  });
}

async function makeClaimSort(outputPath) {
  const cards = [
    {
      title: "KEEP AS EVIDENCE",
      body: "The observation or trusted source directly supports this statement.",
      accent: COLORS.evidence,
      fill: COLORS.evidenceLight,
    },
    {
      title: "POSSIBLE",
      body: "The idea fits some evidence, but the route or effect is not confirmed.",
      accent: COLORS.science,
      fill: COLORS.scienceLight,
    },
    {
      title: "QUESTION",
      body: "We need more evidence before deciding.",
      accent: COLORS.joy,
      fill: COLORS.joyLight,
    },
    {
      title: "TOO STRONG",
      body: "The statement claims more than the evidence can show.",
      accent: COLORS.justice,
      fill: COLORS.justiceLight,
    },
    {
      title: "Plastic was detected in a sample.",
      body: "Sort this claim using the exact source or observation.",
      accent: COLORS.ink,
    },
    {
      title: "Detection proves exactly how it entered.",
      body: "Ask whether the route was measured.",
      accent: COLORS.ink,
    },
    {
      title: "A water or food pathway is possible.",
      body: "Ask what evidence supports the pathway.",
      accent: COLORS.ink,
    },
    {
      title: "Detection proves a person is sick.",
      body: "Ask whether a health effect was measured.",
      accent: COLORS.ink,
    },
    {
      title: "We need more evidence about route and effect.",
      body: "Uncertainty is part of careful science.",
      accent: COLORS.ink,
    },
    {
      title: "Systems can reduce plastic pathways.",
      body: "Identify the actor, action, and evidence.",
      accent: COLORS.ink,
    },
  ];
  await makeCardGrid({
    title: "Monday Claim Sort",
    cards,
    columns: 2,
    rows: 4,
    sets: 4,
    outputPath,
    day: "Monday",
    priority: "P2",
    finishing: "Single-sided; cut on grid lines; keep each 2-page set together",
  });
}

async function makeWheelEvidenceRecord(outputPath) {
  const { doc, fonts } = await newPdf("Tuesday Wheel Evidence Record");
  const page = doc.addPage(LETTER);
  drawHeader(page, fonts, {
    title: "Wheel Evidence Record",
    subtitle:
      "Measure what changed. Separate observation, source-supported information, inference, and uncertainty.",
    accent: COLORS.living,
    label: "TUESDAY | GOTTA-HAVE 3: LIVING ORGANISMS",
  });
  drawWrapped(
    page,
    "Name(s): __________________________  Wheel/lane ID: __________  Role/route: __________________",
    {
      x: 36,
      top: 104,
      width: 540,
      font: fonts.bold,
      size: 10.5,
    },
  );
  const sections = [
    {
      title: "1 | PREDICT",
      prompt: "What might change when the wheel rolls? Why?",
      height: 72,
      accent: COLORS.science,
      fill: COLORS.scienceLight,
    },
    {
      title: "2 | BEFORE",
      prompt: "Temperature: ______  Tread/surface observation: ______________________________",
      height: 65,
      accent: COLORS.evidence,
      fill: COLORS.evidenceLight,
    },
    {
      title: "3 | TRIAL",
      prompt: "Surface: __________  Motion/time/distance: __________________  Role used: __________",
      height: 65,
      accent: COLORS.science,
      fill: COLORS.white,
    },
    {
      title: "4 | AFTER",
      prompt: "Temperature: ______  Tread/surface observation: ______________________________",
      height: 65,
      accent: COLORS.evidence,
      fill: COLORS.evidenceLight,
    },
    {
      title: "5 | SORT THE CLAIM",
      prompt:
        "Observed: ____________________  Source-supported: ____________________  Possible/inferred: ____________________  Unknown: ____________________",
      height: 105,
      accent: COLORS.evidence,
      fill: COLORS.white,
    },
    {
      title: "6 | EXPLAIN + REVISE",
      prompt:
        "Friction/repeated contact can ____________________. Our trial does not prove ____________________. Add or change this model arrow: ____________________.",
      height: 112,
      accent: COLORS.justice,
      fill: COLORS.justiceLight,
    },
  ];
  let top = 140;
  sections.forEach((section) => {
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height: section.height,
      fill: section.fill,
      border: section.accent,
      borderWidth: 1.2,
    });
    drawWrapped(page, section.title, {
      x: 49,
      top: top + 10,
      width: 150,
      font: fonts.bold,
      size: 11,
      color: section.accent,
    });
    drawWrapped(page, section.prompt, {
      x: 49,
      top: top + 32,
      width: 514,
      font: fonts.regular,
      size: 10,
      color: COLORS.ink,
      lineHeight: 14,
    });
    top += section.height + 8;
  });
  drawResponseChoices(page, fonts, 710);
  drawFooter(
    page,
    fonts,
    "SAFETY: Do not sand, scrape, cut, heat, or intentionally create loose tire/plastic dust. Temperature change is not a particle count.",
  );
  const repeated = await repeatPdfBytes(await doc.save(), 12);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P3",
    day: "Tuesday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable; color recommended",
    paper: "24-28 lb white text",
    sheets: 12,
    finishing: "Single-sided; do not cut",
  });
}

async function makeModelRevisionStrips(outputPath) {
  const { doc, fonts } = await newPdf("Tuesday Model Revision Strips");
  const page = doc.addPage(LETTER);
  drawWrapped(page, "TUESDAY MODEL REVISION STRIPS | 2 PER SHEET", {
    x: 36,
    top: 20,
    width: 540,
    font: fonts.bold,
    size: 13,
    color: COLORS.living,
    align: "center",
  });
  for (let card = 0; card < 2; card += 1) {
    const top = 58 + card * 352;
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height: 325,
      fill: card % 2 ? COLORS.white : COLORS.scienceLight,
      border: COLORS.living,
      borderWidth: 1.5,
    });
    drawWrapped(page, "SOURCE -> FRICTION / WEAR -> SMALLER PARTICLES -> POSSIBLE ENCOUNTER", {
      x: 54,
      top: top + 18,
      width: 504,
      font: fonts.bold,
      size: 13,
      color: COLORS.living,
      align: "center",
    });
    const prompts = [
      "Evidence that supports our revision:",
      "What this trial did NOT measure:",
      "Place or system connected to this pathway:",
      "Question about power, protection, or action for Wednesday:",
    ];
    let promptTop = top + 72;
    prompts.forEach((prompt) => {
      drawWrapped(page, prompt, {
        x: 55,
        top: promptTop,
        width: 486,
        font: fonts.bold,
        size: 10,
        color: COLORS.ink,
      });
      drawRule(page, 55, promptTop + 34, 555, COLORS.line, 0.8);
      drawRule(page, 55, promptTop + 55, 555, COLORS.line, 0.8);
      promptTop += 60;
    });
    drawWrapped(
      page,
      "Respond by writing, drawing, pointing, dictating, moving a card, partnering, or passing and returning.",
      {
        x: 55,
        top: top + 292,
        width: 486,
        font: fonts.italic,
        size: 8.5,
        color: COLORS.access,
        align: "center",
      },
    );
  }
  const repeated = await repeatPdfBytes(await doc.save(), 6);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P3",
    day: "Tuesday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable",
    paper: "24-28 lb white text",
    sheets: 6,
    finishing: "Single-sided; cut each sheet in half to make 12 strips",
  });
}

async function makeAdvocacyPlanner(outputPath) {
  const { doc, fonts } = await newPdf("Wednesday Advocacy Planner");
  const page = doc.addPage(LETTER);
  drawHeader(page, fonts, {
    title: "From Evidence To Fair Action",
    subtitle:
      "Choose the future, audience, medium, and role. Do not blame people for choices they cannot control.",
    accent: COLORS.infrastructure,
    label: "WEDNESDAY | GOTTA-HAVE 4: HUMAN INFRASTRUCTURE",
  });
  const fields = [
    ["FUTURE WE WANT", "What should be different?", COLORS.justice, 78],
    ["EVIDENCE", "What observation or source supports this?", COLORS.evidence, 88],
    ["UNCERTAINTY", "What do we still not know?", COLORS.evidence, 75],
    ["POWER + RESPONSIBILITY", "Who can make or support this change?", COLORS.infrastructure, 82],
    ["AUDIENCE", "Who needs to see, hear, or respond?", COLORS.justice, 72],
    ["FAIR REQUEST", "What are we asking them to do, and why is it fair?", COLORS.justice, 90],
  ];
  let top = 112;
  fields.forEach(([title, prompt, accent, height], index) => {
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height,
      fill: index % 2 ? COLORS.white : COLORS.light,
      border: accent,
    });
    drawWrapped(page, title, {
      x: 49,
      top: top + 10,
      width: 150,
      font: fonts.bold,
      size: 10,
      color: accent,
    });
    drawWrapped(page, prompt, {
      x: 200,
      top: top + 10,
      width: 360,
      font: fonts.regular,
      size: 9.5,
      color: COLORS.ink,
    });
    drawRule(page, 49, top + 43, 562, COLORS.line, 0.8);
    if (height > 80) drawRule(page, 49, top + 66, 562, COLORS.line, 0.8);
    top += height + 8;
  });
  drawPanel(page, {
    x: 36,
    top: 632,
    width: 540,
    height: 78,
    fill: COLORS.accessLight,
    border: COLORS.access,
  });
  drawWrapped(page, "CHOOSE A MEDIUM + ROLE", {
    x: 50,
    top: 644,
    width: 512,
    font: fonts.bold,
    size: 10,
    color: COLORS.access,
  });
  drawWrapped(
    page,
    "Art | Model | Poster | Audio | Video | Letter | Live/partner talk | Question collector | Other: __________",
    {
      x: 50,
      top: 665,
      width: 512,
      font: fonts.regular,
      size: 10,
      color: COLORS.ink,
      lineHeight: 13,
    },
  );
  drawFooter(
    page,
    fonts,
    "Check: evidence is visible | uncertainty is honest | responsibility is shared | youth choose their message",
  );
  const repeated = await repeatPdfBytes(await doc.save(), 12);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P3",
    day: "Wednesday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable; color recommended",
    paper: "24-28 lb white text",
    sheets: 12,
    finishing: "Single-sided; do not cut",
  });
}

async function makeNeighborhoodMapPoster(outputPath) {
  const sourcePath = path.join(
    ROOT,
    "public-artifacts",
    "2026-07-16-neighborhood-map-draft.png",
  );
  const rotated = await sharp(sourcePath).rotate(90).png().toBuffer();
  const { doc, fonts } = await newPdf("Community Systems Map Poster");
  const page = doc.addPage(POSTER_LANDSCAPE);
  drawHeader(page, fonts, {
    title: "Our Community Systems Map",
    subtitle:
      "Add evidence, questions, care, protection, burden, decisions, and possible actions. Do not mark private addresses.",
    accent: COLORS.infrastructure,
    label: "WEDNESDAY | 36 x 24 IN POSTER",
  });
  const image = await doc.embedPng(rotated);
  const imageBox = { x: 70, top: 220, width: 1700, height: 1320 };
  page.drawRectangle({
    x: imageBox.x,
    y: page.getHeight() - imageBox.top - imageBox.height,
    width: imageBox.width,
    height: imageBox.height,
    color: COLORS.white,
    borderColor: COLORS.line,
    borderWidth: 4,
  });
  const scale = Math.min(
    (imageBox.width - 28) / image.width,
    (imageBox.height - 28) / image.height,
  );
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  page.drawImage(image, {
    x: imageBox.x + (imageBox.width - drawW) / 2,
    y:
      page.getHeight() -
      imageBox.top -
      imageBox.height +
      (imageBox.height - drawH) / 2,
    width: drawW,
    height: drawH,
  });
  const legendX = 1820;
  const legendW = 700;
  drawPanel(page, {
    x: legendX,
    top: 220,
    width: legendW,
    height: 710,
    fill: COLORS.light,
    border: COLORS.infrastructure,
    borderWidth: 4,
  });
  drawWrapped(page, "LABEL EVERY ADDITION", {
    x: legendX + 35,
    top: 260,
    width: legendW - 70,
    font: fonts.bold,
    size: 34,
    color: COLORS.infrastructure,
    align: "center",
  });
  const labels = [
    ["OBSERVED", COLORS.evidence, "Something we directly noticed or measured."],
    ["SOURCED", COLORS.science, "Information from a named trusted source."],
    ["QUESTION", COLORS.joy, "Something we still need to investigate."],
    ["UNCERTAIN", COLORS.muted, "A possible connection that is not proven."],
    ["POWER / DECISION", COLORS.infrastructure, "Where a person, system, or policy can act."],
    ["CARE / ACTION", COLORS.justice, "Protection or change youth want to see."],
  ];
  let top = 340;
  labels.forEach(([title, accent, body]) => {
    drawPanel(page, {
      x: legendX + 40,
      top,
      width: legendW - 80,
      height: 78,
      fill: COLORS.white,
      border: accent,
      borderWidth: 3,
    });
    drawWrapped(page, title, {
      x: legendX + 60,
      top: top + 14,
      width: 230,
      font: fonts.bold,
      size: 22,
      color: accent,
    });
    drawWrapped(page, body, {
      x: legendX + 285,
      top: top + 12,
      width: legendW - 350,
      font: fonts.regular,
      size: 18,
      color: COLORS.ink,
      lineHeight: 22,
    });
    top += 91;
  });
  drawPanel(page, {
    x: legendX,
    top: 980,
    width: legendW,
    height: 560,
    fill: COLORS.accessLight,
    border: COLORS.access,
    borderWidth: 4,
  });
  drawWrapped(page, "MAP ACCESS", {
    x: legendX + 35,
    top: 1020,
    width: legendW - 70,
    font: fonts.bold,
    size: 32,
    color: COLORS.access,
    align: "center",
  });
  drawWrapped(
    page,
    "Use the floor map, table map, personal paper, verbal description, photo, partner, seated/quiet route, or no-map route.",
    {
      x: legendX + 55,
      top: 1090,
      width: legendW - 110,
      font: fonts.bold,
      size: 24,
      color: COLORS.ink,
      lineHeight: 31,
      align: "center",
    },
  );
  drawWrapped(
    page,
    "A mark is not automatically proof. Do not use ZIP code, appearance, income, race, disability, or family identity as a shortcut for exposure.",
    {
      x: legendX + 55,
      top: 1280,
      width: legendW - 110,
      font: fonts.regular,
      size: 21,
      color: COLORS.justice,
      lineHeight: 28,
      align: "center",
    },
  );
  drawFooter(
    page,
    fonts,
    "Original July 16 team map preserved as the visual base; new labels must distinguish evidence from questions.",
  );
  await writePdf(doc, outputPath);
  register({
    priority: "P3",
    day: "Wednesday",
    file: rel(outputPath),
    size: "36 x 24 in landscape poster",
    color: "Full color",
    paper: "Matte heavyweight poster/bond paper",
    sheets: 1,
    finishing: "Single-sided; actual size; do not crop, mount, laminate, or add bleed",
  });
}

async function makePowerCards(outputPath) {
  const cards = [
    ["PRODUCT DESIGNER", "Can change materials, durability, repair, and shedding."],
    ["MANUFACTURER", "Can change production, handling, packaging, and worker protection."],
    ["STORE / PURCHASER", "Can choose what products are sold or purchased."],
    ["TRANSPORTATION / ROAD", "Can change surfaces, maintenance, runoff capture, and mobility choices."],
    ["BUILDING MANAGER", "Can change cleaning, ventilation, filters, and purchasing."],
    ["WASTE COLLECTOR", "Can change collection, containment, and public information."],
    ["WASTEWATER SYSTEM", "Can monitor, capture, treat, and report particles."],
    ["SCIENTIST / RESEARCHER", "Can test methods, explain limits, and share evidence."],
    ["PUBLIC AGENCY", "Can monitor, regulate, fund, and communicate."],
    ["ELECTED OFFICIAL", "Can shape budgets, laws, and accountability."],
    ["YOUTH", "Can investigate, ask questions, create, organize, and advocate."],
    ["FAMILY / COMMUNITY", "Can share knowledge and act together without carrying all responsibility."],
  ].map(([title, body], index) => ({
    title,
    body,
    accent: index < 6 ? COLORS.infrastructure : COLORS.justice,
    fill: index % 2 ? COLORS.white : COLORS.light,
  }));
  await makeCardGrid({
    title: "Power And Responsibility Cards",
    cards,
    columns: 2,
    rows: 4,
    sets: 2,
    outputPath,
    day: "Wednesday",
    priority: "P3",
    finishing: "Single-sided; cut on grid lines; keep each 2-page set together",
  });
}

async function makeTwoBranchPoster(outputPath) {
  const { doc, fonts } = await newPdf("Thursday Two-Branch Model Base");
  const page = doc.addPage(POSTER_LANDSCAPE);
  drawHeader(page, fonts, {
    title: "One Plastic System | Two Different Pollution Pathways",
    subtitle:
      "Build with cards, arrows, evidence tags, uncertainty, power, and actions. Youth decide the final wording and relationships.",
    accent: COLORS.science,
    label: "THURSDAY | 36 x 24 IN MODEL BASE",
  });
  drawPanel(page, {
    x: 80,
    top: 205,
    width: 2432,
    height: 280,
    fill: COLORS.light,
    border: COLORS.ink,
    borderWidth: 4,
  });
  drawWrapped(page, "SHARED PLASTIC LIFECYCLE", {
    x: 120,
    top: 240,
    width: 2352,
    font: fonts.bold,
    size: 34,
    color: COLORS.ink,
    align: "center",
  });
  const lifecycle = [
    "FOSSIL RESOURCES",
    "PRODUCTION",
    "TRANSPORT",
    "USE",
    "DISPOSAL / REUSE",
  ];
  lifecycle.forEach((label, index) => {
    const x = 140 + index * 472;
    drawPanel(page, {
      x,
      top: 330,
      width: 390,
      height: 95,
      fill: COLORS.white,
      border: COLORS.ink,
      borderWidth: 2.5,
    });
    drawWrapped(page, label, {
      x: x + 18,
      top: 360,
      width: 354,
      font: fonts.bold,
      size: 22,
      color: COLORS.ink,
      align: "center",
    });
    if (index < lifecycle.length - 1) {
      drawWrapped(page, "->", {
        x: x + 396,
        top: 357,
        width: 70,
        font: fonts.bold,
        size: 26,
        color: COLORS.muted,
        align: "center",
      });
    }
  });
  const branches = [
    {
      x: 80,
      title: "CLIMATE BRANCH",
      question:
        "How can greenhouse-gas emissions change Earth's energy balance and temperature?",
      accent: COLORS.justice,
      light: COLORS.justiceLight,
      boundary:
        "BOUNDARY: A chamber or PhET can model warming mechanisms. Microplastics do not cause chamber warming.",
    },
    {
      x: 1310,
      title: "MICROPLASTIC BRANCH",
      question:
        "How can wear or weathering create smaller pieces that move through environmental pathways?",
      accent: COLORS.living,
      light: COLORS.scienceLight,
      boundary:
        "BOUNDARY: Carbon dioxide does not carry plastic particles into bodies. Detection does not prove harm.",
    },
  ];
  branches.forEach((branch) => {
    drawPanel(page, {
      x: branch.x,
      top: 535,
      width: 1202,
      height: 860,
      fill: branch.light,
      border: branch.accent,
      borderWidth: 5,
    });
    drawWrapped(page, branch.title, {
      x: branch.x + 45,
      top: 575,
      width: 1112,
      font: fonts.bold,
      size: 36,
      color: branch.accent,
      align: "center",
    });
    drawWrapped(page, branch.question, {
      x: branch.x + 70,
      top: 650,
      width: 1062,
      font: fonts.bold,
      size: 24,
      color: COLORS.ink,
      lineHeight: 30,
      align: "center",
    });
    const labels = ["MECHANISM", "EVIDENCE", "UNCERTAINTY", "POWER", "ACTION"];
    labels.forEach((label, index) => {
      const x = branch.x + 55 + (index % 2) * 560;
      const top = 785 + Math.floor(index / 2) * 175;
      drawPanel(page, {
        x,
        top,
        width: index === 4 ? 1092 : 520,
        height: 135,
        fill: COLORS.white,
        border:
          index === 0
            ? COLORS.science
            : index === 1
              ? COLORS.evidence
              : index === 2
                ? COLORS.muted
                : COLORS.justice,
        borderWidth: 3,
      });
      drawWrapped(page, label, {
        x: x + 20,
        top: top + 18,
        width: (index === 4 ? 1092 : 520) - 40,
        font: fonts.bold,
        size: 22,
        color:
          index === 0
            ? COLORS.science
            : index === 1
              ? COLORS.evidence
              : index === 2
                ? COLORS.muted
                : COLORS.justice,
        align: "center",
      });
    });
    drawPanel(page, {
      x: branch.x + 55,
      top: 1280,
      width: 1092,
      height: 82,
      fill: COLORS.white,
      border: branch.accent,
      borderWidth: 3,
    });
    drawWrapped(page, branch.boundary, {
      x: branch.x + 78,
      top: 1300,
      width: 1046,
      font: fonts.bold,
      size: 19,
      color: branch.accent,
      lineHeight: 24,
      align: "center",
    });
  });
  drawPanel(page, {
    x: 80,
    top: 1440,
    width: 2432,
    height: 170,
    fill: COLORS.accessLight,
    border: COLORS.access,
    borderWidth: 4,
  });
  drawWrapped(
    page,
    "ADD ALL FOUR GOTTA-HAVES | Use causal words on arrows | Keep youth language and dissent visible | Speaking is optional",
    {
      x: 120,
      top: 1485,
      width: 2352,
      font: fonts.bold,
      size: 28,
      color: COLORS.access,
      lineHeight: 34,
      align: "center",
    },
  );
  drawFooter(
    page,
    fonts,
    "This is a scaffold, not a completed answer. The final model must show what the campers' evidence supports.",
  );
  await writePdf(doc, outputPath);
  register({
    priority: "P4",
    day: "Thursday",
    file: rel(outputPath),
    size: "36 x 24 in landscape poster",
    color: "Full color",
    paper: "Matte heavyweight poster/bond paper",
    sheets: 1,
    finishing: "Single-sided; actual size; do not crop, mount, laminate, or add bleed",
  });
}

async function makeTwoBranchCards(outputPath) {
  const labels = [
    ["FOSSIL RESOURCES", "Shared lifecycle"],
    ["PLASTIC PRODUCTION", "Shared lifecycle"],
    ["TRANSPORT", "Shared lifecycle"],
    ["USE", "Shared lifecycle"],
    ["DISPOSAL / REUSE", "Shared lifecycle"],
    ["GREENHOUSE-GAS EMISSIONS", "Climate branch"],
    ["OUTGOING INFRARED ENERGY", "Climate branch"],
    ["MORE ENERGY RETAINED", "Climate branch"],
    ["WARMING", "Climate branch"],
    ["WEAR / WEATHERING", "Microplastic branch"],
    ["FRAGMENTS / FIBERS", "Microplastic branch"],
    ["AIR", "Possible pathway"],
    ["WATER", "Possible pathway"],
    ["SOIL", "Possible pathway"],
    ["FOOD", "Possible pathway"],
    ["ORGANISMS / PEOPLE", "Possible encounter"],
    ["EVIDENCE", "Attach a source or observation"],
    ["UNCERTAINTY", "Name what is not proven"],
    ["POWER", "Who can make a decision?"],
    ["ACTION", "What fair change is possible?"],
  ].map(([title, body], index) => ({
    title,
    body,
    accent:
      index < 5
        ? COLORS.ink
        : index < 9
          ? COLORS.justice
          : index < 16
            ? COLORS.living
            : index < 18
              ? COLORS.evidence
              : COLORS.infrastructure,
    fill: index % 2 ? COLORS.white : COLORS.light,
    titleSize: 11.5,
    bodySize: 8.5,
    centered: true,
  }));
  await makeCardGrid({
    title: "Thursday Two-Branch Model Cards",
    cards: labels,
    columns: 2,
    rows: 4,
    sets: 2,
    outputPath,
    day: "Thursday",
    priority: "P4",
    finishing: "Single-sided; cut on grid lines; keep each 3-page set together",
  });
}

async function makeTriFoldHeaders(outputPath) {
  const sections = [
    {
      title: "1 | PHENOMENON + QUESTION",
      body:
        "Humans aren't trash cans, but we have plastics in our bodies. How does plastic break into tiny pieces, move through the environment and into living bodies, and how can we stop it fairly?",
      accent: COLORS.science,
    },
    {
      title: "2 | EVIDENCE",
      body:
        "Show what we observed or learned. Label the source. Keep uncertainty and evidence limits visible.",
      accent: COLORS.evidence,
    },
    {
      title: "3 | MODEL + PATHWAY",
      body:
        "Use arrows and causal words. Show what moves, how it moves, and which relationships changed after new evidence.",
      accent: COLORS.living,
    },
    {
      title: "4 | JUSTICE + POWER",
      body:
        "Who benefits, who carries burdens, who is protected, and who can change the system? Do not blame families.",
      accent: COLORS.infrastructure,
    },
    {
      title: "5 | YOUTH ACTION",
      body:
        "What future do we want? Who is our audience? What fair request matches our evidence?",
      accent: COLORS.justice,
    },
  ];
  const { doc, fonts } = await newPdf("Tri-Fold Section Headers");
  sections.forEach((section) => {
    const page = doc.addPage(LETTER_LANDSCAPE);
    drawPanel(page, {
      x: 30,
      top: 30,
      width: 732,
      height: 522,
      fill: COLORS.white,
      border: section.accent,
      borderWidth: 4,
    });
    drawPanel(page, {
      x: 30,
      top: 30,
      width: 732,
      height: 105,
      fill: section.accent,
      border: section.accent,
    });
    drawWrapped(page, section.title, {
      x: 55,
      top: 58,
      width: 682,
      font: fonts.bold,
      size: 28,
      color: COLORS.white,
      align: "center",
    });
    drawWrapped(page, section.body, {
      x: 70,
      top: 175,
      width: 652,
      font: fonts.bold,
      size: 20,
      color: COLORS.ink,
      lineHeight: 28,
      align: "center",
    });
    drawWrapped(page, "Youth words, images, arrows, art, audio/QR, or questions go here.", {
      x: 70,
      top: 405,
      width: 652,
      font: fonts.italic,
      size: 16,
      color: COLORS.access,
      align: "center",
    });
  });
  await writePdf(doc, outputPath);
  register({
    priority: "P3",
    day: "Wednesday-Thursday",
    file: rel(outputPath),
    size: "11 x 8.5 in landscape",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 5,
    finishing: "Single-sided; do not cut; trim only if needed for tri-fold placement",
  });
}

async function makeShowcaseRoleBoard(outputPath) {
  const cards = [
    ["SPEAK", "Explain one part live."],
    ["PARTNER SPEAK", "Share with a partner or have them read your words."],
    ["POINT / MODEL TOUR", "Guide visitors through cards, arrows, or evidence."],
    ["ART EXPLANATION", "Show the title, message, and fair request."],
    ["PLAY AUDIO / VIDEO", "Use a recorded explanation."],
    ["GREETER", "Welcome visitors and show where to begin."],
    ["QUESTION COLLECTOR", "Write, draw, or record audience questions."],
    ["SEATED / QUIET ROLE", "Support materials, timing, or responses from a quieter space."],
    ["PASS + RETURN", "Pause now and choose another role later."],
  ].map(([title, body], index) => ({
    title,
    body,
    accent: index % 2 ? COLORS.access : COLORS.justice,
    fill: index % 2 ? COLORS.accessLight : COLORS.justiceLight,
    centered: true,
  }));
  await makeCardGrid({
    title: "Showcase Role Choices",
    cards,
    columns: 3,
    rows: 3,
    sets: 3,
    outputPath,
    day: "Thursday",
    priority: "P4",
    finishing: "Single-sided; do not cut; use as three station choice boards",
  });
}

async function makeAudienceFeedbackCards(outputPath) {
  const { doc, fonts } = await newPdf("Audience Feedback Cards");
  const page = doc.addPage(LETTER);
  drawWrapped(page, "INVISIBLE INVADERS | SHOWCASE FEEDBACK | 4 CARDS PER SHEET", {
    x: 36,
    top: 18,
    width: 540,
    font: fonts.bold,
    size: 12,
    color: COLORS.justice,
    align: "center",
  });
  for (let card = 0; card < 4; card += 1) {
    const row = Math.floor(card / 2);
    const col = card % 2;
    const x = 36 + col * 276;
    const top = 52 + row * 350;
    drawPanel(page, {
      x,
      top,
      width: 264,
      height: 330,
      fill: card % 2 ? COLORS.white : COLORS.light,
      border: COLORS.justice,
      borderWidth: 1.2,
    });
    drawWrapped(page, "I NOTICED", {
      x: x + 14,
      top: top + 15,
      width: 236,
      font: fonts.bold,
      size: 11,
      color: COLORS.evidence,
    });
    drawRule(page, x + 14, top + 52, x + 250);
    drawRule(page, x + 14, top + 75, x + 250);
    drawWrapped(page, "EVIDENCE I SAW OR HEARD", {
      x: x + 14,
      top: top + 96,
      width: 236,
      font: fonts.bold,
      size: 10,
      color: COLORS.evidence,
    });
    drawRule(page, x + 14, top + 131, x + 250);
    drawRule(page, x + 14, top + 154, x + 250);
    drawWrapped(page, "A QUESTION I HAVE", {
      x: x + 14,
      top: top + 175,
      width: 236,
      font: fonts.bold,
      size: 10,
      color: COLORS.joy,
    });
    drawRule(page, x + 14, top + 210, x + 250);
    drawRule(page, x + 14, top + 233, x + 250);
    drawWrapped(page, "AN ACTION OR FUTURE I HEARD", {
      x: x + 14,
      top: top + 254,
      width: 236,
      font: fonts.bold,
      size: 10,
      color: COLORS.justice,
    });
    drawRule(page, x + 14, top + 289, x + 250);
    drawWrapped(page, "Name optional: __________________", {
      x: x + 14,
      top: top + 306,
      width: 236,
      font: fonts.regular,
      size: 8.5,
      color: COLORS.muted,
    });
  }
  const repeated = await repeatPdfBytes(await doc.save(), 5);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P4",
    day: "Thursday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable; color recommended",
    paper: "24-28 lb white text",
    sheets: 5,
    finishing: "Single-sided; cut each sheet into four cards (20 cards total)",
  });
}

async function makeKeepQuestionChangeLabels(outputPath) {
  const { doc, fonts } = await newPdf("KEEP QUESTION CHANGE Sort Labels");
  const labels = [
    {
      title: "KEEP",
      body: "The model or message is supported and should remain.",
      accent: COLORS.evidence,
      fill: COLORS.evidenceLight,
    },
    {
      title: "QUESTION",
      body: "We still need evidence or clarification.",
      accent: COLORS.joy,
      fill: COLORS.joyLight,
    },
    {
      title: "CHANGE",
      body: "Evidence supports a revision, correction, or clearer limit.",
      accent: COLORS.justice,
      fill: COLORS.justiceLight,
    },
  ];
  labels.forEach((label) => {
    const page = doc.addPage(LETTER_LANDSCAPE);
    drawPanel(page, {
      x: 30,
      top: 30,
      width: 732,
      height: 522,
      fill: label.fill,
      border: label.accent,
      borderWidth: 5,
    });
    drawWrapped(page, label.title, {
      x: 60,
      top: 115,
      width: 672,
      font: fonts.bold,
      size: 72,
      color: label.accent,
      align: "center",
    });
    drawWrapped(page, label.body, {
      x: 85,
      top: 275,
      width: 622,
      font: fonts.bold,
      size: 24,
      color: COLORS.ink,
      lineHeight: 32,
      align: "center",
    });
    drawWrapped(page, "Feedback does not change youth work automatically. Evidence and youth agency guide the decision.", {
      x: 85,
      top: 430,
      width: 622,
      font: fonts.italic,
      size: 14,
      color: COLORS.access,
      align: "center",
    });
  });
  await writePdf(doc, outputPath);
  register({
    priority: "P5",
    day: "Friday",
    file: rel(outputPath),
    size: "11 x 8.5 in landscape",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 3,
    finishing: "Single-sided; do not cut",
  });
}

async function makeFridayReflection(outputPath) {
  const { doc, fonts } = await newPdf("Friday Final Model And Advice Reflection");
  const modelPage = doc.addPage(LETTER);
  drawHeader(modelPage, fonts, {
    title: "Final Model Check + Advice",
    subtitle:
      "You may keep the model unchanged when the evidence supports it. Reflection does not require gratitude or disclosure.",
    accent: COLORS.evidence,
    label: "FRIDAY | PAGE 1 OF 2 | GOTTA-HAVES 1-4",
  });
  drawResponseChoices(modelPage, fonts, 102);

  const drawReflectionField = (
    page,
    { title, prompt, top, height, accent, fill = COLORS.white, lines = 2 },
  ) => {
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height,
      fill,
      border: accent,
    });
    drawWrapped(page, title, {
      x: 49,
      top: top + 12,
      width: 175,
      font: fonts.bold,
      size: 10.5,
      color: accent,
    });
    drawWrapped(page, prompt, {
      x: 230,
      top: top + 12,
      width: 332,
      font: fonts.regular,
      size: 10,
      color: COLORS.ink,
      lineHeight: 13,
    });
    for (let line = 0; line < lines; line += 1) {
      drawRule(page, 49, top + 55 + line * 25, 562, COLORS.line);
    }
  };

  const modelFields = [
    {
      title: "FEEDBACK I CHOOSE",
      prompt: "[ ] KEEP   [ ] QUESTION   [ ] CHANGE",
      top: 160,
      height: 78,
      accent: COLORS.evidence,
      fill: COLORS.light,
      lines: 1,
    },
    {
      title: "MODEL PART",
      prompt: "Which arrow, evidence tag, uncertainty, action, or question?",
      top: 248,
      height: 105,
      accent: COLORS.science,
      lines: 2,
    },
    {
      title: "EVIDENCE / REASON",
      prompt: "What supports the change, question, or decision to keep it?",
      top: 363,
      height: 145,
      accent: COLORS.evidence,
      fill: COLORS.light,
      lines: 4,
    },
    {
      title: "FINAL MOVE",
      prompt: "Add one note OR explain why the model should remain unchanged.",
      top: 518,
      height: 160,
      accent: COLORS.justice,
      lines: 4,
    },
  ];
  modelFields.forEach((field) => {
    drawReflectionField(modelPage, field);
  });
  drawFooter(
    modelPage,
    fonts,
    "Observation and evidence come first. A KEEP decision is a valid revision when the model remains supported.",
  );

  const advicePage = doc.addPage(LETTER);
  drawHeader(advicePage, fonts, {
    title: "Advice, Questions + Permission",
    subtitle:
      "Choose what you want to share. You may respond privately, with a partner, or not yet.",
    accent: COLORS.access,
    label: "FRIDAY | PAGE 2 OF 2 | CAMPER VOICE",
  });
  drawResponseChoices(advicePage, fonts, 102);
  [
    {
      title: "ADVICE FOR FUTURE CAMPERS",
      prompt: "What should they keep, change, or investigate?",
      top: 160,
      height: 145,
      accent: COLORS.justice,
      fill: COLORS.justiceLight,
      lines: 4,
    },
    {
      title: "ADVICE FOR FACILITATORS",
      prompt: "What should we change because of camper evidence?",
      top: 315,
      height: 145,
      accent: COLORS.access,
      fill: COLORS.accessLight,
      lines: 4,
    },
    {
      title: "QUESTION THAT CONTINUES",
      prompt: "What do you still wonder?",
      top: 470,
      height: 120,
      accent: COLORS.joy,
      fill: COLORS.joyLight,
      lines: 3,
    },
    {
      title: "MY SHARING CHOICE",
      prompt:
        "[ ] Share with the group  [ ] Share privately  [ ] Share without my name  [ ] Keep with me  [ ] Decide later",
      top: 600,
      height: 105,
      accent: COLORS.evidence,
      fill: COLORS.evidenceLight,
      lines: 2,
    },
  ].forEach((field) => {
    drawReflectionField(advicePage, field);
  });
  drawFooter(
    advicePage,
    fonts,
    "Drawn, written, spoken, recorded, modeled, photographed, partner, seated, quiet, pass, and re-entry routes are valid.",
  );

  const repeated = await repeatPdfBytes(await doc.save(), 12);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P5",
    day: "Friday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white acceptable; color recommended",
    paper: "24-28 lb white text",
    sheets: 24,
    finishing:
      "Single-sided; collate as 12 two-page camper sets; clip each set; do not cut",
  });
}

async function makeCleanupChecklist(outputPath) {
  const { doc, fonts } = await newPdf("Friday Cleanup And Archive Checklist");
  const page = doc.addPage(LETTER);
  drawHeader(page, fonts, {
    title: "Cleanup, Return, And Archive Checklist",
    subtitle:
      "Match roles to mobility, sensory, and energy needs. No one must lift, touch residue, or speak publicly.",
    accent: COLORS.access,
    label: "FRIDAY | FACILITATOR CHECK",
  });
  const tasks = [
    "Photograph and date the final model.",
    "Preserve only consented youth work; remove identifying details from public records.",
    "Store evidence records, feedback, and advice in labeled folders.",
    "Count and return magnifiers, trays, scoops, jars, microscopes, cameras, chargers, and display materials.",
    "Keep filters, slides, tape lifts, and suspected particles labeled and covered.",
    "Follow instructor-approved disposal for sand, filtered brine, filters, and sample materials.",
    "Clean one station at a time so labels are not swapped.",
    "Separate clean art tools from sample-processing tools.",
    "Record borrowed, missing, damaged, or still-drying materials and assign an owner.",
    "Save one access change, one evidence change, and one youth question for the final unit-plan revision.",
    "Complete identity recognition without requiring gratitude, disclosure, or public performance.",
    "End with a brief, unrushed goodbye.",
  ];
  let top = 120;
  tasks.forEach((task, index) => {
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height: 45,
      fill: index % 2 ? COLORS.white : COLORS.light,
      border: COLORS.line,
    });
    drawCheckbox(page, 50, top + 15, 12, COLORS.access);
    drawWrapped(page, task, {
      x: 75,
      top: top + 10,
      width: 485,
      font: fonts.regular,
      size: 10,
      color: COLORS.ink,
      lineHeight: 12,
      maxLines: 2,
    });
    top += 49;
  });
  drawPanel(page, {
    x: 36,
    top: 718,
    width: 540,
    height: 38,
    fill: COLORS.justiceLight,
    border: COLORS.justice,
  });
  drawWrapped(page, "Anything unfinished: ______________________  Owner: __________  Due: __________", {
    x: 48,
    top: 729,
    width: 516,
    font: fonts.bold,
    size: 9.5,
    color: COLORS.ink,
  });
  const repeated = await repeatPdfBytes(await doc.save(), 2);
  fs.writeFileSync(outputPath, repeated);
  register({
    priority: "P5",
    day: "Friday",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait",
    color: "Black and white",
    paper: "24-28 lb white text",
    sheets: 2,
    finishing: "Single-sided; one copy for Piter and one for Aastha",
  });
}

async function makeFamilyNote(outputPath) {
  const imagePath = path.join(
    ROOT,
    "_local-course-materials",
    "parent-note-output",
    "Invisible-Invaders-Family-Note-PRINT.png",
  );
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Family-note source image is missing: ${imagePath}`);
  }
  const { doc } = await newPdf("Invisible Invaders Family Note");
  const image = await doc.embedPng(fs.readFileSync(imagePath));
  for (let copy = 0; copy < 15; copy += 1) {
    const page = doc.addPage(LETTER);
    const maxW = 576;
    const maxH = 720;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (LETTER[0] - width) / 2,
      y: (LETTER[1] - height) / 2,
      width,
      height,
    });
  }
  await writePdf(doc, outputPath);
  register({
    priority: "P1",
    day: "Field Friday / Family",
    file: rel(outputPath),
    size: "8.5 x 11 in portrait; 8 x 10 in image area",
    color: "Full color",
    paper: "28-32 lb bright-white text",
    sheets: 15,
    finishing: "Single-sided; no crop, bleed, duplex, or cutting",
  });
}

async function makeSampleLabels(outputPath) {
  const labels = [
    ["DURAND REFERENCE", "Prepared model - not beach data"],
    ["ONTARIO REFERENCE", "Prepared model - not beach data"],
    ["MYSTERY BIRD CLUE", "Fictional model case"],
    ["SAMPLE 1", "Real field sample - keep sealed"],
    ["SAMPLE 2", "Real field sample - keep sealed"],
    ["SAMPLE 3", "Real field sample - keep sealed"],
    ["SAMPLE 4", "Real field sample - keep sealed"],
    ["SAMPLE 5", "Real field sample - keep sealed"],
    ["SAMPLE 6", "Real field sample - keep sealed"],
    ["BACKUP A", "Clean field container"],
    ["BACKUP B", "Clean field container"],
    ["PROCEDURAL BLANK", "Process separately first"],
  ].map(([title, body], index) => ({
    title,
    body,
    accent:
      index < 3
        ? COLORS.science
        : index < 9
          ? COLORS.evidence
          : index < 11
            ? COLORS.muted
            : COLORS.justice,
    fill: index % 2 ? COLORS.white : COLORS.light,
    centered: true,
  }));
  await makeCardGrid({
    title: "Sample And Model Labels",
    cards: labels,
    columns: 3,
    rows: 4,
    sets: 2,
    outputPath,
    day: "Field Friday / Monday",
    priority: "P1",
    paper: "Full-sheet white label stock OR 65-80 lb white cardstock",
    finishing:
      "Single-sided; cut on grid lines; attach with clear tape if printed on cardstock",
  });
}

async function makePrintManifest(outputPath) {
  const { doc, fonts } = await newPdf("Invisible Invaders Print Order Manifest");
  const priorities = {
    P1: "PRINT FIRST | Needed for Field Friday, July 24",
    P2: "PRINT NEXT | Reusable access tools and Monday, July 27",
    P3: "PRINT BY TUESDAY | Tuesday-Wednesday materials",
    P4: "PRINT BY THURSDAY | Showcase materials",
    P5: "PRINT BY FRIDAY | Reflection and cleanup",
  };
  const grouped = Object.keys(priorities).map((priority) => ({
    priority,
    items: outputItems.filter((item) => item.priority === priority),
  }));
  grouped.forEach((group, groupIndex) => {
    let page = doc.addPage(LETTER);
    let pageNumber = 1;
    const firstHeaderBottom = drawHeader(page, fonts, {
      title: priorities[group.priority],
      subtitle:
        "Each PDF already contains the exact number of sheets listed. Print each file once.",
      accent:
        group.priority === "P1"
          ? COLORS.justice
          : group.priority === "P2"
            ? COLORS.evidence
            : COLORS.science,
      label: "INVISIBLE INVADERS | PRINT ORDER MANIFEST",
      pageNumber,
      flowTitleSpacing: true,
    });
    let top = Math.max(115, firstHeaderBottom + 14);
    for (const item of group.items) {
      const rowHeight = 125;
      if (top + rowHeight > 740) {
        page = doc.addPage(LETTER);
        pageNumber += 1;
        drawHeader(page, fonts, {
          title: `${priorities[group.priority]} | Continued`,
          accent: COLORS.science,
          label: "PRINT ORDER MANIFEST",
          pageNumber,
        });
        top = 105;
      }
      drawPanel(page, {
        x: 36,
        top,
        width: 540,
        height: rowHeight - 8,
        fill: top % 2 ? COLORS.white : COLORS.light,
        border: COLORS.line,
      });
      drawWrapped(page, item.file, {
        x: 48,
        top: top + 10,
        width: 516,
        font: fonts.bold,
        size: 9.5,
        color: COLORS.ink,
        lineHeight: 11.5,
        maxLines: 2,
      });
      drawWrapped(
        page,
        `${item.day} | ${item.size} | ${item.color} | ${item.sheets} sheet(s)`,
        {
          x: 48,
          top: top + 40,
          width: 516,
          font: fonts.bold,
          size: 9,
          color: COLORS.science,
          lineHeight: 11,
        },
      );
      drawWrapped(page, `Paper: ${item.paper}`, {
        x: 48,
        top: top + 61,
        width: 516,
        font: fonts.regular,
        size: 8.8,
        color: COLORS.ink,
        lineHeight: 11,
      });
      drawWrapped(page, `Finish: ${item.finishing}`, {
        x: 48,
        top: top + 82,
        width: 516,
        font: fonts.regular,
        size: 8.8,
        color: COLORS.ink,
        lineHeight: 11,
        maxLines: 2,
      });
      top += rowHeight;
    }
    drawFooter(
      page,
      fonts,
      "Global instruction: single-sided, actual PDF page size, no fit-to-page, no crop, no bleed, no binding. Keep daily groups separate.",
    );
  });
  const page = doc.insertPage(0, LETTER);
  drawHeader(page, fonts, {
    title: "Invisible Invaders | Print Order",
    subtitle: "Get Real! Science Camp with Piter and Aastha | Prepared July 23, 2026",
    accent: COLORS.science,
    label: "START HERE",
  });
  drawPanel(page, {
    x: 36,
    top: 110,
    width: 540,
    height: 118,
    fill: COLORS.justiceLight,
    border: COLORS.justice,
    borderWidth: 1.5,
  });
  drawWrapped(page, "PRINT PRIORITY", {
    x: 52,
    top: 125,
    width: 508,
    font: fonts.bold,
    size: 12,
    color: COLORS.justice,
  });
  drawWrapped(
    page,
    "1. Field Friday first. 2. Reusable access tools and Monday. 3. Tuesday-Wednesday. 4. Thursday showcase. 5. Friday reflection.",
    {
      x: 52,
      top: 152,
      width: 508,
      font: fonts.bold,
      size: 12,
      color: COLORS.ink,
      lineHeight: 16,
    },
  );
  drawPanel(page, {
    x: 36,
    top: 245,
    width: 540,
    height: 200,
    fill: COLORS.light,
    border: COLORS.science,
  });
  drawWrapped(page, "GLOBAL SHOP INSTRUCTIONS", {
    x: 52,
    top: 263,
    width: 508,
    font: fonts.bold,
    size: 12,
    color: COLORS.science,
  });
  const instructions = [
    "Print each PDF exactly once; copy counts are already expanded into the PDF page count.",
    "Single-sided only. Do not duplex or bind.",
    "Use actual PDF page size / 100%. Do not fit-to-page, crop, add bleed, or resize.",
    "Use color, paper, and finishing listed for each file.",
    "Cut only files whose names or manifest rows say CUT.",
    "Keep each daily folder separate with a paper band, clip, or labeled envelope.",
    "Before production, contact Piter if a listed paper size or cut cannot be completed exactly.",
  ];
  let instructionTop = 295;
  instructions.forEach((instruction) => {
    drawCheckbox(page, 52, instructionTop + 1, 9, COLORS.science);
    instructionTop = drawWrapped(page, instruction, {
      x: 69,
      top: instructionTop,
      width: 490,
      font: fonts.regular,
      size: 10,
      color: COLORS.ink,
      lineHeight: 12,
    });
    instructionTop += 10;
  });
  drawPanel(page, {
    x: 36,
    top: 465,
    width: 540,
    height: 145,
    fill: COLORS.accessLight,
    border: COLORS.access,
  });
  drawWrapped(page, "ACCESS AND READABILITY", {
    x: 52,
    top: 482,
    width: 508,
    font: fonts.bold,
    size: 12,
    color: COLORS.access,
  });
  drawWrapped(
    page,
    "Do not shrink the text, remove color-coded labels, or combine pages into a booklet. The materials pair color with words, use large type, show one step at a time, and preserve seated, quiet, partner, visual, audio, pass, and re-entry routes.",
    {
      x: 52,
      top: 512,
      width: 508,
      font: fonts.regular,
      size: 11,
      color: COLORS.ink,
      lineHeight: 15,
    },
  );
  drawPanel(page, {
    x: 36,
    top: 630,
    width: 540,
    height: 92,
    fill: COLORS.evidenceLight,
    border: COLORS.evidence,
  });
  drawWrapped(page, "COUNT ASSUMPTION", {
    x: 52,
    top: 644,
    width: 508,
    font: fonts.bold,
    size: 11,
    color: COLORS.evidence,
  });
  drawWrapped(
    page,
    "Prepared for 12 campers, Piter, Aastha, six pair samples, one procedural blank, and a small number of backups.",
    {
      x: 52,
      top: 671,
      width: 508,
      font: fonts.regular,
      size: 10.5,
      color: COLORS.ink,
      lineHeight: 14,
    },
  );
  drawFooter(page, fonts, `Print package version: ${PACKAGE_VERSION_LABEL}`);
  await writePdf(doc, outputPath);
}

async function makePickupChecklist(outputPath) {
  const { doc, fonts } = await newPdf("Print Order Pickup Checklist");
  const page = doc.addPage(LETTER);
  drawHeader(page, fonts, {
    title: "Print Pickup Check",
    subtitle: "Check before leaving Staples or UPS.",
    accent: COLORS.justice,
    label: "PITER | START HERE",
  });
  const checks = [
    "The print manifest and every requested daily folder/file are present.",
    "Field Friday materials are separated and on top.",
    "All standard pages are single-sided and actual size.",
    "The visual agendas are 17 x 11 in landscape.",
    "The community map and two-branch model are 36 x 24 in landscape.",
    "No poster was cropped, stretched, mounted, or laminated.",
    "Card files were printed on cardstock and cut only where requested.",
    "Two-up and four-up Field Friday sheets were cut into the correct number of cards.",
    "Durand and Ontario evidence records each have 12 full-page copies.",
    "Family notes have 15 full-color copies and the phone/showcase information is readable.",
    "Facilitator guides are collated into two separate sets.",
    "Day folders are clipped/banded and labeled in priority order.",
    "No text is clipped, blurred, too small, or printed over a fold/cut line.",
    "Keep the receipt and note any shortage or substitution before leaving.",
  ];
  let top = 112;
  checks.forEach((check, index) => {
    drawPanel(page, {
      x: 36,
      top,
      width: 540,
      height: 41,
      fill: index % 2 ? COLORS.white : COLORS.light,
      border: COLORS.line,
    });
    drawCheckbox(page, 50, top + 13, 12, COLORS.justice);
    drawWrapped(page, check, {
      x: 76,
      top: top + 9,
      width: 482,
      font: fonts.regular,
      size: 9.7,
      color: COLORS.ink,
      lineHeight: 12,
      maxLines: 2,
    });
    top += 44;
  });
  drawFooter(
    page,
    fonts,
    "If a size, count, or cut is wrong, ask the shop to correct it before pickup.",
  );
  await writePdf(doc, outputPath);
}

function writeCsv(filePath) {
  const headers = [
    "Priority",
    "Day",
    "File",
    "Finished size",
    "Color",
    "Paper",
    "Sheets in PDF",
    "Finishing",
  ];
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = outputItems.map((item) =>
    [
      item.priority,
      item.day,
      item.file,
      item.size,
      item.color,
      item.paper,
      item.sheets,
      item.finishing,
    ]
      .map(escape)
      .join(","),
  );
  fs.writeFileSync(filePath, `${headers.map(escape).join(",")}\n${rows.join("\n")}\n`);
}

function writeEmailTemplate(filePath) {
  const text = `Subject: Print order - Invisible Invaders Get Real! Science Camp

Hello,

Please print the attached Invisible Invaders camp package. The PDF named
"00-PRINT-ORDER-MANIFEST.pdf" is the controlling instruction sheet.

IMPORTANT:
- Print each PDF exactly once. The PDFs already contain the required number of sheets/copies.
- Single-sided only. Do not duplex or bind.
- Print at the PDF's actual page size / 100 percent.
- Do not fit-to-page, crop, add bleed, resize, mount, or laminate.
- Follow the listed color, paper, cutting, and collation instructions.
- Cut only the files explicitly marked CUT.
- Keep each day together with a labeled band, clip, or envelope.

Priority order:
1. Field Friday, July 24
2. Reusable access tools and Monday, July 27
3. Tuesday-Wednesday, July 28-29
4. Thursday showcase, July 30
5. Friday reflection, July 31

The order includes 8.5 x 11 inch pages, 17 x 11 inch visual agendas, and two
36 x 24 inch landscape posters. Please contact me before changing a size,
paper type, cut, or finishing instruction.

Please send a price and completion estimate before production.

Thank you,
Piter Garcia
`;
  fs.writeFileSync(filePath, text);
}

function writeReadme(filePath) {
  const text = `# Invisible Invaders Print Package

Prepared July 23, 2026 for 12 campers, Piter, and Aastha.

## Start Here

1. Open \`00-PRINT-ORDER-MANIFEST.pdf\`.
2. Use \`00-EMAIL-TO-STAPLES-OR-UPS.txt\` when emailing the order.
3. Send the full ZIP when the shop can print the entire package.
4. Send the Priority 1 ZIP first when Field Friday must be produced immediately.
5. Bring \`00-PITER-PICKUP-CHECKLIST.pdf\` to pickup.

## Print Priority

- P1: Field Friday and family note, needed July 24.
- P2: reusable access materials and Monday, needed July 27.
- P3: Tuesday and Wednesday.
- P4: Thursday showcase.
- P5: Friday reflection and cleanup.

## Source Of Truth

These print artifacts preserve the latest lesson decisions; they do not replace or edit the source documents.

- [Current Camp Operations Guide](${DRIVE_LINKS.operations})
- [Current Field Friday Routine](${DRIVE_LINKS.friday})
- [Field Friday Visual Guide](${DRIVE_LINKS.fridaySlides})
- [Monday Lesson](${DRIVE_LINKS.monday})
- [Tuesday Lesson](${DRIVE_LINKS.tuesday})
- [Wednesday Lesson](${DRIVE_LINKS.wednesday})
- [Thursday Showcase Lesson](${DRIVE_LINKS.thursday})
- [Friday Reflection Lesson](${DRIVE_LINKS.fridayReflection})

## Accessibility

The package uses large text, clear headings, low-clutter forms, visible sequences, words plus color, and multiple participation routes. Color never carries meaning alone. Speaking, writing, drawing, pointing, building, photography/audio, partner, seated/quiet, pass, and re-entry routes remain available.
`;
  fs.writeFileSync(filePath, text);
}

function createZip(zipPath, sourceDir, includePaths) {
  if (fs.existsSync(zipPath)) {
    throw new Error(`Refusing to overwrite an existing ZIP archive: ${zipPath}`);
  }
  const args = ["-q", "-r", zipPath, ...includePaths];
  const result = spawnSync("zip", args, {
    cwd: sourceDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`zip failed: ${result.stderr || result.stdout}`);
  }
}

function convertFridayDocx(workDir) {
  const sourceDocx = path.join(
    ROOT,
    "public-submissions",
    "friday-anchoring-phenomenon-routine.docx",
  );
  const result = spawnSync(
    process.env.CODEX_SOFFICE || "soffice",
    [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      workDir,
      sourceDocx,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to convert Friday DOCX: ${result.stderr || result.stdout}`);
  }
  const pdfPath = path.join(workDir, "friday-anchoring-phenomenon-routine.pdf");
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Friday PDF was not created: ${pdfPath}`);
  }
  return pdfPath;
}

const dayPlans = [
  {
    key: "MONDAY",
    title: "Monday | Organism Evidence + First Model",
    date: "July 27, 2026",
    gottaHave: "GOTTA-HAVE 2: WATER TRANSPORTS MATERIALS",
    question:
      "How can moving water help plastic reach living organisms and food webs, and what can our evidence not tell us yet about route or harm?",
    priority: "P2",
    accent: COLORS.water,
    light: rgb(1, 0.95, 0.9),
    liveLink: DRIVE_LINKS.monday,
    launch:
      "\"Humans aren't trash cans, but we have plastics in our bodies. How could that happen, and what can this evidence not tell us yet?\"",
    sequence: [
      ["8 min", "Preview + choose route", "Show agenda; private noticing; one direction at a time."],
      ["10 min", "Article/video + anchor", "Sort what the source shows and does not show."],
      ["15 min", "Organism/body evidence", "Use direct, shared-screen, image, worksheet, or environment-only route."],
      ["20 min", "Build first pathway model", "Source -> release -> air/water/food -> organism/person; label uncertainty."],
      ["10 min", "Return to places/map", "Add youth questions without private addresses."],
      ["10 min", "Scientist circle", "Evidence, power, what matters, and what remains unknown."],
      ["5 min", "Identity + close", "Recognize contribution and end on time."],
    ],
    agenda: [
      { title: "NOTICE", body: "See the whole plan and choose a route." },
      { title: "SOURCE", body: "Read, watch, listen, or use still images." },
      { title: "SORT", body: "Evidence, possible, question, or too strong." },
      { title: "EXAMINE", body: "Choose an organism/body evidence route." },
      { title: "MODEL", body: "Build a source-to-body pathway." },
      { title: "MAP + CIRCLE", body: "Connect places, questions, and power." },
      { title: "CLOSE", body: "Name one contribution and what comes next." },
    ],
    materials: [
      "Trusted short article/video in captioned, transcript, still-image, and read-aloud forms",
      "Claim-sort cards and response choices",
      "Instructor-approved organism/body evidence plus environment-only alternative",
      "Source-to-body model sheets/cards",
      "Neighborhood map, landmarks, arrows, and questions",
      "Sand processing visual and labeled sample records",
    ],
    access: [
      "Model, map, talk, draw, write, point, photo/audio, partner, and pass routes",
      "Large-print cards with word + color + symbol",
      "No touching real samples required",
      "No forced identity, body, or health disclosure",
      "Preserve camper language before adult revision",
    ],
    limits: [
      "Detection shows presence or possible exposure; it does not prove a specific route or health effect.",
      "Adults control any dissection, chemical preparation, or biological sample handling.",
      "Label each relationship supported, possible, or unknown.",
    ],
    after: [
      "Photograph models without student names or faces.",
      "Record whose ideas entered the public model and who needs another route.",
      "Prepare Tuesday's wheel investigation from camper questions.",
    ],
  },
  {
    key: "TUESDAY",
    title: "Tuesday | Wheels, Friction + Wear",
    date: "July 28, 2026",
    gottaHave: "GOTTA-HAVE 3: LIVING ORGANISMS",
    question:
      "After wear releases smaller plastic particles, how might organisms encounter them, and what response evidence would we still need?",
    priority: "P3",
    accent: COLORS.living,
    light: COLORS.scienceLight,
    liveLink: DRIVE_LINKS.tuesday,
    launch:
      "\"What might change when a wheel rolls or races across a surface, and what evidence would help us explain why?\"",
    sequence: [
      ["8 min", "Reconnect + choose role", "Review Monday's model; predict; make roles visible."],
      ["20 min", "Before -> roll/ride -> after", "Record baseline and after evidence through safe equivalent routes."],
      ["15 min", "Compare evidence", "Use tread, temperature, photos, and sealed/source evidence."],
      ["12 min", "Source check", "Label observed, source-supported, inferred, or uncertain."],
      ["12 min", "Revise model", "Add release mechanism; keep exposure/response unanswered."],
      ["8 min", "Circle + close", "Share evidence and uncertainty; choose Wednesday question."],
    ],
    agenda: [
      { title: "PREVIEW", body: "See the plan and choose a role." },
      { title: "PREDICT", body: "What might change and why?" },
      { title: "MEASURE BEFORE", body: "Temperature, tread, image, or description." },
      { title: "ROLL / RIDE", body: "Use a safe movement or observation route." },
      { title: "MEASURE AFTER", body: "Record only what changed." },
      { title: "COMPARE", body: "Observation, source, inference, uncertainty." },
      { title: "REVISE", body: "Change one model arrow with evidence." },
      { title: "CLOSE", body: "Carry one place/power question forward." },
    ],
    materials: [
      "Intact wheels, safe surface, cones, timer, and required PPE",
      "Infrared thermometer/touch-free probe tested before use",
      "Wheel evidence records, tread cards/rulers, clipboards",
      "Adult-prepared sealed wear evidence or trusted images",
      "Evidence and uncertainty tags",
      "Monday models and camera/paper backup",
    ],
    access: [
      "Ride, toy-wheel, timing, photo, temperature, record, describe, observe, or pass",
      "Word + color + symbol wheel/lane IDs",
      "Seated or low-energy roles remain available",
      "Role changes happen by choice",
      "No permanent recorder/helper role",
    ],
    limits: [
      "Campers do not sand, scrape, cut, heat, or intentionally create loose particles.",
      "Temperature change shows energy transfer, not a particle count.",
      "A short trial does not measure exposure, biological response, harm, or real-road quantity.",
    ],
    after: [
      "Save one before/after image and one uncertainty statement.",
      "Tie every model revision to an observation or source.",
      "Carry one place-and-power question into Wednesday.",
    ],
  },
  {
    key: "WEDNESDAY",
    title: "Wednesday | Justice, Place + Advocacy",
    date: "July 29, 2026",
    gottaHave: "GOTTA-HAVE 4: HUMAN INFRASTRUCTURE",
    question:
      "Which product, transportation, drain, wastewater, waste, purchasing, and policy decisions shape these pathways, and what fair change do we want?",
    priority: "P3",
    accent: COLORS.infrastructure,
    light: COLORS.accessLight,
    liveLink: DRIVE_LINKS.wednesday,
    launch:
      "\"What do our jar, beach, and wheel evidence help us notice, and where are decisions made about materials, waste, water, food, and information?\"",
    sequence: [
      ["10 min", "Return to places/map", "Add observations and possible routes; no private homes."],
      ["15 min", "Build justice/power map", "Who contributes, benefits, carries burdens, and can act?"],
      ["12 min", "Scientist circle", "Evidence, lived knowledge, uncertainty, and desired future."],
      ["25 min", "Choose audience + message", "Review examples; match evidence to a fair request."],
      ["10 min", "Begin art + tri-fold", "Place science, justice, and action sections."],
      ["5 min", "Identity + close", "Photograph progress; assign Thursday tasks."],
    ],
    agenda: [
      { title: "RETURN", body: "Reconnect to Field Friday places." },
      { title: "LABEL", body: "Observed, sourced, questioned, or uncertain." },
      { title: "MAP POWER", body: "Who decides, benefits, carries burden, or cares?" },
      { title: "CIRCLE", body: "Use one prompt and several response routes." },
      { title: "CHOOSE FUTURE", body: "What do youth want to happen?" },
      { title: "CREATE", body: "Choose audience, medium, message, and role." },
      { title: "CLOSE", body: "Name exactly what Thursday must finish." },
    ],
    materials: [
      "Community systems map poster and evidence labels",
      "Power and responsibility cards",
      "Tuesday models and evidence/uncertainty/action tags",
      "Advocacy planners and youth examples",
      "Clean art materials and tri-fold boards",
      "Question cards, visual agenda, quiet space, recording/paper backup",
    ],
    access: [
      "Floor, table, personal, verbal-description, photo, partner, seated, quiet, or no-map routes",
      "No forced identity, disability, illness, address, or family disclosure",
      "Lived knowledge is meaningful but not representative of everyone",
      "Youth choose the future, audience, medium, and role",
      "No single correct advocacy position",
    ],
    limits: [
      "Label local claims observed, sourced, questioned, or uncertain.",
      "Do not use ZIP code or identity as a shortcut for exposure or burden.",
      "Do not blame youth or families for systems they do not control.",
    ],
    after: [
      "Check that every message names evidence and uncertainty.",
      "Confirm cleaned, safe art materials and a real audience.",
      "Photograph progress and assign exact Thursday finishing tasks.",
    ],
  },
  {
    key: "THURSDAY",
    title: "Thursday | Revise, Advocate + Showcase",
    date: "July 30, 2026 | Showcase 12:00-1:00 PM",
    gottaHave: "GOTTA-HAVES 1-4: SYNTHESIS",
    question:
      "How can one final model connect Earth systems, water transport, living organisms, and human infrastructure while keeping climate and microplastic branches distinct?",
    priority: "P4",
    accent: COLORS.justice,
    light: COLORS.justiceLight,
    liveLink: DRIVE_LINKS.thursday,
    launch:
      "\"How can one plastic system create both climate pollution and microplastic pollution, and what can our model explain now that it could not explain Monday?\"",
    sequence: [
      ["12 min", "Compare Monday + current model", "Lay out the shared plastic lifecycle."],
      ["18 min", "Build two distinct branches", "Add mechanisms, evidence, uncertainty, power, and actions."],
      ["25 min", "Finish art + tri-fold", "Phenomenon -> evidence -> model -> justice -> action."],
      ["10 min", "Choose role + rehearse", "Live, partner, recorded, pointed, art, greeting, question, or pass."],
      ["Noon", "Showcase", "Youth lead hands-on activities and communicate their evidence."],
      ["5 min", "Identity + close", "Save feedback for Friday; end predictably."],
    ],
    agenda: [
      { title: "COMPARE", body: "What changed since Monday?" },
      { title: "BUILD", body: "Shared lifecycle and two distinct branches." },
      { title: "CHECK", body: "Mechanism, evidence, uncertainty, power, action." },
      { title: "FINISH", body: "Art and tri-fold story." },
      { title: "CHOOSE ROLE", body: "Use a live, recorded, pointed, partner, or quiet role." },
      { title: "REHEARSE", body: "Warm/cool feedback once." },
      { title: "SHOWCASE", body: "Share science, justice, and the future youth want." },
      { title: "SAVE FEEDBACK", body: "Keep questions for Friday." },
    ],
    materials: [
      "Monday/current models and 36 x 24 two-branch model base",
      "Two-branch model cards and Four Gotta-Haves",
      "Evidence, uncertainty, power, and action tags",
      "Clean advocacy art and tri-fold section headers",
      "Role-choice boards and audience feedback cards",
      "Display stands, timer, recording/display device, paper backup",
    ],
    access: [
      "Speaking, recorded audio, pointing, model tour, art, greeting, questions, partner, seated, quiet, or pass",
      "Youth language, dissent, and uncertainty remain visible",
      "Paper backup and verbal description for every digital element",
      "No public-speaking requirement",
      "No ranking live speech above other modes",
    ],
    limits: [
      "Microplastics do not cause chamber warming.",
      "Carbon dioxide does not carry plastic particles into bodies.",
      "Do not use alarmist health claims; links and claims must be tested.",
    ],
    after: [
      "Save audience questions and feedback.",
      "Photograph Monday and Thursday models side by side.",
      "Credit youth ideas that changed the model and pack Friday materials.",
    ],
  },
  {
    key: "FRIDAY",
    title: "Friday | Feedback, Reflection + Goodbye",
    date: "July 31, 2026",
    gottaHave: "GOTTA-HAVES 1-4: EVIDENCE CHECK",
    question:
      "Which checklist connections should our final model keep, question, or change after audience feedback, and why?",
    priority: "P5",
    accent: COLORS.evidence,
    light: COLORS.evidenceLight,
    liveLink: DRIVE_LINKS.fridayReflection,
    launch:
      "\"What should we KEEP, what QUESTION remains, and what evidence-supported CHANGE, if any, would improve our final model?\"",
    sequence: [
      ["10 min", "Sort feedback", "KEEP, QUESTION, or CHANGE; one idea per camper by any route."],
      ["10 min", "Final model move", "Add one supported note or justify keeping the model unchanged."],
      ["10-15 min", "Advice + close", "Future campers, facilitators, and continuing questions."],
      ["As needed", "Return + cleanup", "Use accessible roles; archive only consented work."],
    ],
    agenda: [
      { title: "READ / HEAR", body: "Review audience feedback." },
      { title: "SORT", body: "KEEP, QUESTION, or CHANGE." },
      { title: "CHOOSE", body: "Pick one model part to revisit." },
      { title: "EVIDENCE CHECK", body: "Support a change or explain why it stays." },
      { title: "ADVICE", body: "Future campers and facilitators." },
      { title: "CLEAN + RETURN", body: "Use a safe role that fits your energy." },
      { title: "GOODBYE", body: "Brief, unrushed, and no forced gratitude." },
    ],
    materials: [
      "Showcase feedback and KEEP/QUESTION/CHANGE labels",
      "Final model, advocacy artifact, tri-fold, and action statement",
      "Final model/advice reflection sheets",
      "Camera/paper backup and consent/archive labels",
      "Cleanup checklist, storage folders, bins, wipes, and gloves as needed",
      "Identity display and no-token alternative",
    ],
    access: [
      "Draw, write, speak, record, model, photo, partner, private, seated, quiet, or pass",
      "No required gratitude, disclosure, public speaking, or single positive story",
      "Disagreement and uncertainty are legitimate evidence",
      "Archive only consented work",
      "Cleanup roles fit mobility, sensory, and energy needs",
    ],
    limits: [
      "Friday does not introduce a new causal claim or rebuild the model from scratch.",
      "Feedback informs action; youth retain authority over their message.",
      "No final change is made without evidence.",
    ],
    after: [
      "Preserve de-identified artifacts for the final unit-plan revision.",
      "Record which supports expanded participation.",
      "Assign owner/date to any action that continues after camp.",
    ],
  },
];

async function main() {
  ensureNewOutputRoot();
  const startDir = dayDir("00", "START-HERE-AND-REUSABLE");
  const fridayDir = dayDir("01", "FIELD-FRIDAY-JULY-24");
  const mondayDir = dayDir("02", "MONDAY-JULY-27");
  const tuesdayDir = dayDir("03", "TUESDAY-JULY-28");
  const wednesdayDir = dayDir("04", "WEDNESDAY-JULY-29");
  const thursdayDir = dayDir("05", "THURSDAY-SHOWCASE-JULY-30");
  const reflectionDir = dayDir("06", "FRIDAY-REFLECTION-JULY-31");
  const buildDir = BUILD_SOURCE_ROOT;
  fs.mkdirSync(buildDir, { recursive: true });

  const fridayPdf = convertFridayDocx(buildDir);
  await extractRepeatedPages(
    fridayPdf,
    [0, 1, 2, 3, 4, 5, 6, 7],
    2,
    path.join(
      fridayDir,
      "P1-FRIDAY-01-Facilitator-Guide-2sets-COLOR-LETTER.pdf",
    ),
  );
  register({
    priority: "P1",
    day: "Field Friday",
    file: rel(
      path.join(
        fridayDir,
        "P1-FRIDAY-01-Facilitator-Guide-2sets-COLOR-LETTER.pdf",
      ),
    ),
    size: "8.5 x 11 in portrait",
    color: "Full color",
    paper: "28-32 lb white text",
    sheets: 16,
    finishing: "Single-sided; collate as two 8-page sets; staple each set",
  });
  const fridayForms = [
    [9, 12, "P1-FRIDAY-03-Durand-Evidence-Record-12copies-COLOR-LETTER.pdf", "12 full-page copies; do not cut"],
    [11, 12, "P1-FRIDAY-04-Ontario-Evidence-Record-12copies-COLOR-LETTER.pdf", "12 full-page copies; do not cut"],
    [13, 6, "P1-FRIDAY-05-Case-Mission-6sheets-2up-COLOR-CUT.pdf", "Cut each sheet in half to make 12 mission cards"],
    [15, 6, "P1-FRIDAY-06-Case-Reflection-6sheets-2up-COLOR-CUT.pdf", "Cut each sheet in half to make 12 reflection cards"],
    [17, 3, "P1-FRIDAY-07-Sand-Sampling-Record-3sheets-4up-BW-CUT.pdf", "Cut each sheet into four cards to make 12 records"],
    [19, 6, "P1-FRIDAY-08-Sampling-Protocol-6sheets-2up-COLOR-CUT.pdf", "Cut each sheet in half to make 12 protocol cards"],
  ];
  for (const [index, copies, name, finishing] of fridayForms) {
    const outputPath = path.join(fridayDir, name);
    await extractRepeatedPages(fridayPdf, [index], copies, outputPath);
    register({
      priority: "P1",
      day: "Field Friday",
      file: rel(outputPath),
      size: "8.5 x 11 in portrait",
      color: name.includes("-BW-") ? "Black and white" : "Full color",
      paper: name.includes("-CUT") ? "65-80 lb white cover/cardstock" : "24-28 lb white text",
      sheets: copies,
      finishing: `Single-sided; ${finishing}`,
    });
  }

  const visualGuideSource = path.join(
    ROOT,
    "public-submissions",
    "invisible-invaders-field-friday-visual-guide.pdf",
  );
  const visualGuideTarget = path.join(
    fridayDir,
    "P1-FRIDAY-02-Visual-Guide-1set-COLOR-LETTER-LANDSCAPE.pdf",
  );
  await fitPdfToPage(
    visualGuideSource,
    visualGuideTarget,
    LETTER_LANDSCAPE,
  );
  register({
    priority: "P1",
    day: "Field Friday",
    file: rel(visualGuideTarget),
    size: "11 x 8.5 in landscape",
    color: "Full color",
    paper: "65-80 lb white cover/cardstock",
    sheets: 8,
    finishing: "Single-sided; keep in slide order; do not cut",
  });

  await makeFamilyNote(
    path.join(
      fridayDir,
      "P1-FRIDAY-09-Family-Note-15copies-COLOR-LETTER.pdf",
    ),
  );
  await makeSampleLabels(
    path.join(
      fridayDir,
      "P1-FRIDAY-10-Sample-And-Model-Labels-2sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
  );

  await makeAccessBoard(
    path.join(
      startDir,
      "P2-REUSABLE-01-Access-Choice-Board-3copies-COLOR-CARDSTOCK.pdf",
    ),
  );
  await makeCardGrid({
    title: "Reusable Evidence Tags",
    cards: [
      ["OBSERVED", "We directly noticed or measured this.", COLORS.evidence, COLORS.evidenceLight],
      ["SOURCE-SUPPORTED", "A named trusted source supports this.", COLORS.science, COLORS.scienceLight],
      ["POSSIBLE / INFERENCE", "The idea fits evidence but is not confirmed.", COLORS.science, COLORS.white],
      ["UNKNOWN / UNCERTAIN", "We need more evidence.", COLORS.muted, COLORS.light],
      ["QUESTION", "This is something we still need to investigate.", COLORS.joy, COLORS.joyLight],
      ["MODEL LIMIT", "This model cannot show or prove this.", COLORS.evidence, COLORS.white],
      ["JUSTICE / POWER", "Who benefits, carries burdens, decides, or can act?", COLORS.infrastructure, COLORS.accessLight],
      ["ACTION", "What fair change matches the evidence?", COLORS.justice, COLORS.justiceLight],
    ].map(([title, body, accent, fill]) => ({ title, body, accent, fill })),
    columns: 2,
    rows: 4,
    sets: 4,
    outputPath: path.join(
      startDir,
      "P2-REUSABLE-02-Evidence-Tags-4sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
    day: "Reusable",
    priority: "P2",
  });
  await makeGottaHaves(
    path.join(
      startDir,
      "P2-REUSABLE-03-Four-Gotta-Haves-2sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
  );
  await makeCardGrid({
    title: "Scientist Circle Prompts",
    cards: [
      ["WHAT DO YOU NOTICE?", "Observation first. Details matter."],
      ["WHAT EVIDENCE?", "Point to a record, source, image, model, or experience."],
      ["WHAT MAKES YOU THINK THAT?", "Explain the connection or mechanism."],
      ["WHAT IS STILL UNKNOWN?", "Name uncertainty without treating it as failure."],
      ["CAN YOU CONNECT OR REPHRASE?", "Build with another idea without replacing it."],
      ["WHAT SHOULD CHANGE?", "Model, question, action, or learning environment?"],
      ["PASS + RETURN", "You may pause and re-enter later."],
      ["ANOTHER ROUTE", "Draw, point, write, dictate, partner, record, or move a card."],
    ].map(([title, body], index) => ({
      title,
      body,
      accent: index > 5 ? COLORS.access : COLORS.evidence,
      fill: index > 5 ? COLORS.accessLight : COLORS.white,
    })),
    columns: 2,
    rows: 4,
    sets: 3,
    outputPath: path.join(
      startDir,
      "P2-REUSABLE-04-Scientist-Circle-Prompts-3sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
    day: "Reusable",
    priority: "P2",
  });
  await makeCardGrid({
    title: "Reusable Camp Roles",
    cards: [
      ["OBSERVER", "Notice details with eyes, magnifier, image, screen, or partner description."],
      ["EVIDENCE RECORDER", "Draw, write, type, dictate, point, or record audio."],
      ["MAPPER / MODELER", "Place cards, arrows, labels, or questions."],
      ["LABEL CHECKER", "Match written IDs across containers, records, filters, and images."],
      ["PHOTOGRAPHER", "Capture approved evidence, never private information."],
      ["TIMER", "Track the visible step and offer transition warnings."],
      ["MATERIALS MONITOR", "Keep clean/used tools and samples organized."],
      ["SKEPTIC / CHECKER", "Ask what else the evidence could mean."],
      ["SEATED COORDINATOR", "Track the whole sequence and next step."],
      ["SPEAKER (OPTIONAL)", "Share live only when this route works for you."],
      ["PARTNER SUPPORT", "Share with or for a partner with permission."],
      ["PASS + RE-ENTER", "Pause now and choose a route later."],
    ].map(([title, body], index) => ({
      title,
      body,
      accent: index > 8 ? COLORS.access : COLORS.science,
      fill: index % 2 ? COLORS.white : COLORS.light,
    })),
    columns: 2,
    rows: 4,
    sets: 3,
    outputPath: path.join(
      startDir,
      "P2-REUSABLE-05-Camp-Role-Cards-3sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
    day: "Reusable",
    priority: "P2",
  });

  for (const day of dayPlans) {
    const targetDir =
      day.key === "MONDAY"
        ? mondayDir
        : day.key === "TUESDAY"
          ? tuesdayDir
          : day.key === "WEDNESDAY"
            ? wednesdayDir
            : day.key === "THURSDAY"
              ? thursdayDir
              : reflectionDir;
    const prefix =
      day.key === "MONDAY"
        ? "P2-MONDAY"
        : day.key === "TUESDAY"
          ? "P3-TUESDAY"
          : day.key === "WEDNESDAY"
            ? "P3-WEDNESDAY"
            : day.key === "THURSDAY"
              ? "P4-THURSDAY"
              : "P5-FRIDAY";
    await makeFacilitatorBrief(
      day,
      path.join(targetDir, `${prefix}-01-Facilitator-Brief-2sets-COLOR-LETTER.pdf`),
    );
    await makeVisualAgenda(
      day,
      path.join(targetDir, `${prefix}-02-Visual-Agenda-1copy-COLOR-11x17.pdf`),
    );
  }

  await makeSourceToBodyModel(
    path.join(
      mondayDir,
      "P2-MONDAY-03-Source-To-Body-Model-12copies-COLOR-11x17.pdf",
    ),
  );
  await makeClaimSort(
    path.join(
      mondayDir,
      "P2-MONDAY-04-Claim-Sort-4sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
  );
  await makeSandProcessVisual(
    path.join(
      mondayDir,
      "P2-MONDAY-05-Sand-Process-Visual-3copies-COLOR-CARDSTOCK.pdf",
    ),
  );
  await makeSandDataRecord(
    path.join(
      mondayDir,
      "P2-MONDAY-06-Sand-Data-Record-8sets-2pages-BW-LETTER.pdf",
    ),
  );

  await makeWheelEvidenceRecord(
    path.join(
      tuesdayDir,
      "P3-TUESDAY-03-Wheel-Evidence-Record-12copies-LETTER.pdf",
    ),
  );
  await makeModelRevisionStrips(
    path.join(
      tuesdayDir,
      "P3-TUESDAY-04-Model-Revision-Strips-6sheets-2up-CUT.pdf",
    ),
  );

  await makeNeighborhoodMapPoster(
    path.join(
      wednesdayDir,
      "P3-WEDNESDAY-03-Community-Systems-Map-1copy-COLOR-36x24.pdf",
    ),
  );
  await makePowerCards(
    path.join(
      wednesdayDir,
      "P3-WEDNESDAY-04-Power-And-Responsibility-Cards-2sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
  );
  await makeAdvocacyPlanner(
    path.join(
      wednesdayDir,
      "P3-WEDNESDAY-05-Advocacy-Planner-12copies-LETTER.pdf",
    ),
  );
  await makeTriFoldHeaders(
    path.join(
      wednesdayDir,
      "P3-WEDNESDAY-06-Tri-Fold-Section-Headers-5pages-COLOR-CARDSTOCK.pdf",
    ),
  );

  await makeTwoBranchPoster(
    path.join(
      thursdayDir,
      "P4-THURSDAY-03-Two-Branch-Model-Base-1copy-COLOR-36x24.pdf",
    ),
  );
  await makeTwoBranchCards(
    path.join(
      thursdayDir,
      "P4-THURSDAY-04-Two-Branch-Model-Cards-2sets-COLOR-CARDSTOCK-CUT.pdf",
    ),
  );
  await makeShowcaseRoleBoard(
    path.join(
      thursdayDir,
      "P4-THURSDAY-05-Showcase-Role-Choices-3copies-COLOR-CARDSTOCK.pdf",
    ),
  );
  await makeAudienceFeedbackCards(
    path.join(
      thursdayDir,
      "P4-THURSDAY-06-Audience-Feedback-5sheets-4up-CUT.pdf",
    ),
  );

  await makeKeepQuestionChangeLabels(
    path.join(
      reflectionDir,
      "P5-FRIDAY-03-Keep-Question-Change-3pages-COLOR-CARDSTOCK.pdf",
    ),
  );
  await makeFridayReflection(
    path.join(
      reflectionDir,
      "P5-FRIDAY-04-Final-Model-And-Advice-Reflection-12copies-LETTER.pdf",
    ),
  );
  await makeCleanupChecklist(
    path.join(
      reflectionDir,
      "P5-FRIDAY-05-Cleanup-And-Archive-Checklist-2copies-LETTER.pdf",
    ),
  );

  await validateOutputItems();

  const manifestPath = path.join(OUTPUT_ROOT, "00-PRINT-ORDER-MANIFEST.pdf");
  await makePrintManifest(manifestPath);
  const pickupPath = path.join(OUTPUT_ROOT, "00-PITER-PICKUP-CHECKLIST.pdf");
  await makePickupChecklist(pickupPath);
  const csvPath = path.join(OUTPUT_ROOT, "00-PRINT-ORDER-MANIFEST.csv");
  writeCsv(csvPath);
  const emailPath = path.join(OUTPUT_ROOT, "00-EMAIL-TO-STAPLES-OR-UPS.txt");
  writeEmailTemplate(emailPath);
  const readmePath = path.join(OUTPUT_ROOT, "00-README-FIRST.md");
  writeReadme(readmePath);

  const fullZip = path.join(
    path.dirname(OUTPUT_ROOT),
    `Invisible-Invaders-PRINT-PACKAGE-FULL-${PACKAGE_VERSION_LABEL}.zip`,
  );
  const priorityZip = path.join(
    path.dirname(OUTPUT_ROOT),
    `Invisible-Invaders-PRINT-FIRST-Field-Friday-${PACKAGE_VERSION_LABEL}.zip`,
  );

  const summary = {
    outputRoot: OUTPUT_ROOT,
    packageVersion: PACKAGE_VERSION_LABEL,
    buildSourceArchive: BUILD_SOURCE_ROOT,
    files: outputItems.length,
    fullZip,
    priorityZip,
    manifestPath,
    pickupPath,
  };
  fs.writeFileSync(
    path.join(OUTPUT_ROOT, "00-BUILD-SUMMARY.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  createZip(fullZip, path.dirname(OUTPUT_ROOT), [path.basename(OUTPUT_ROOT)]);
  createZip(priorityZip, OUTPUT_ROOT, [
    "00-PRINT-ORDER-MANIFEST.pdf",
    "00-PITER-PICKUP-CHECKLIST.pdf",
    "00-EMAIL-TO-STAPLES-OR-UPS.txt",
    "00-README-FIRST.md",
    "01-FIELD-FRIDAY-JULY-24",
  ]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
