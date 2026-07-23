const PptxGenJS = require("pptxgenjs");
const path = require("path");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Piter Garcia and Aastha";
pptx.company = "University of Rochester - EDU 486";
pptx.subject = "Invisible Invaders Field Friday visual lesson guide";
pptx.title = "Invisible Invaders: Field Friday Visual Guide";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};
pptx.defineSlideMaster({
  title: "CAMP",
  background: { color: "F7FAFC" },
  objects: [
    {
      line: {
        x: 0.42,
        y: 7.15,
        w: 12.5,
        h: 0,
        line: { color: "CBD5E1", width: 1 },
      },
    },
    {
      text: {
        text: "GET REAL! SCIENCE CAMP  |  INVISIBLE INVADERS",
        options: {
          x: 0.5,
          y: 7.18,
          w: 6.8,
          h: 0.18,
          fontFace: "Aptos",
          fontSize: 7.5,
          bold: true,
          color: "475569",
          margin: 0,
          breakLine: false,
          charSpacing: 0,
        },
      },
    },
    {
      text: {
        text: "Piter + Aastha",
        options: {
          x: 10.7,
          y: 7.18,
          w: 2.1,
          h: 0.18,
          fontFace: "Aptos",
          fontSize: 7.5,
          bold: true,
          color: "475569",
          align: "right",
          margin: 0,
          charSpacing: 0,
        },
      },
    },
  ],
  slideNumber: {
    x: 12.85,
    y: 7.17,
    w: 0.2,
    h: 0.18,
    color: "475569",
    fontFace: "Aptos",
    fontSize: 7.5,
    align: "right",
    margin: 0,
  },
});

const C = {
  ink: "172033",
  body: "334155",
  muted: "64748B",
  line: "CBD5E1",
  white: "FFFFFF",
  earth: "2F855A",
  earthSoft: "DDF3E7",
  water: "D97706",
  waterSoft: "FFF0CC",
  life: "2563A6",
  lifeSoft: "DDEEFF",
  systems: "A12A87",
  systemsSoft: "F7DEF1",
  coral: "C2413B",
  coralSoft: "FDE8E5",
  teal: "0F766E",
  tealSoft: "DDF5F2",
  sand: "E9D8A6",
  darkSand: "B89B5E",
};

function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55,
    y: 0.38,
    w: 12.15,
    h: 0.55,
    fontFace: "Aptos Display",
    fontSize: 27,
    bold: true,
    color: C.ink,
    margin: 0,
    breakLine: false,
    charSpacing: 0,
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.58,
      y: 0.98,
      w: 11.9,
      h: 0.42,
      fontFace: "Aptos",
      fontSize: 13,
      color: C.body,
      margin: 0,
      breakLine: false,
      charSpacing: 0,
      fit: "shrink",
    });
  }
}

function addRoundedBox(slide, x, y, w, h, fill, line = fill, radius = 0.08) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: radius,
    fill: { color: fill },
    line: { color: line, width: 1 },
    radius,
  });
}

function addStep(slide, x, y, w, number, label, fill, textColor = C.ink) {
  addRoundedBox(slide, x, y, w, 1.02, fill, fill);
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 0.1,
    y: y + 0.17,
    w: 0.55,
    h: 0.55,
    fill: { color: C.white },
    line: { color: C.white },
  });
  slide.addText(String(number), {
    x: x + 0.1,
    y: y + 0.245,
    w: 0.55,
    h: 0.3,
    fontSize: 15,
    bold: true,
    color: textColor,
    align: "center",
    margin: 0,
    charSpacing: 0,
  });
  slide.addText(label, {
    x: x + 0.7,
    y: y + 0.16,
    w: w - 0.78,
    h: 0.65,
    fontSize: 14,
    bold: true,
    color: textColor,
    margin: 0,
    valign: "mid",
    charSpacing: 0,
    fit: "shrink",
  });
}

function addArrow(slide, x, y, w, color = C.muted) {
  slide.addShape(pptx.ShapeType.chevron, {
    x,
    y,
    w,
    h: 0.35,
    fill: { color },
    line: { color },
  });
}

function addJar(slide, x, y, w, h, label, accent, fragments) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: y + 0.24,
    w,
    h: h - 0.24,
    rectRadius: 0.05,
    fill: { color: "F8FAFC", transparency: 8 },
    line: { color: accent, width: 2.2 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.17,
    y,
    w: w - 0.34,
    h: 0.28,
    fill: { color: accent },
    line: { color: accent },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: x + 0.08,
    y: y + h - 0.88,
    w: w - 0.16,
    h: 0.7,
    adjustPoint: 0.25,
    rotate: 180,
    fill: { color: C.sand },
    line: { color: C.darkSand, transparency: 100 },
  });
  fragments.forEach((f) => {
    slide.addShape(f.type || pptx.ShapeType.ellipse, {
      x: x + f.x * w,
      y: y + f.y * h,
      w: f.w * w,
      h: f.h * h,
      rotate: f.rotate || 0,
      fill: { color: f.color || accent },
      line: { color: f.color || accent },
    });
  });
  slide.addText(label, {
    x,
    y: y + h + 0.07,
    w,
    h: 0.34,
    fontSize: 13,
    bold: true,
    color: C.ink,
    align: "center",
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });
}

function addCallout(slide, text, x, y, w, h, fill, accent) {
  addRoundedBox(slide, x, y, w, h, fill, accent);
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 0.09,
    h,
    fill: { color: accent },
    line: { color: accent },
  });
  slide.addText(text, {
    x: x + 0.22,
    y: y + 0.12,
    w: w - 0.34,
    h: h - 0.22,
    fontSize: 12.5,
    bold: true,
    color: C.ink,
    margin: 0,
    valign: "mid",
    breakLine: false,
    charSpacing: 0,
    fit: "shrink",
  });
}

// Slide 1: visible routine.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Researchers, come investigate!", "We will solve a model sand case, collect real evidence, and leave one question for camp.");
  const steps = [
    ["CASE", C.earthSoft, C.earth],
    ["PREDICT", C.waterSoft, C.water],
    ["LOOK", C.lifeSoft, C.life],
    ["MAGNIFY", C.systemsSoft, C.systems],
    ["MATCH", C.coralSoft, C.coral],
    ["SAMPLE", C.tealSoft, C.teal],
    ["WONDER", "E2E8F0", C.body],
  ];
  steps.forEach((s, i) => {
    addStep(slide, 0.55 + (i % 4) * 3.15, 1.75 + Math.floor(i / 4) * 1.35, 2.55, i + 1, s[0], s[1], s[2]);
    if (i % 4 !== 3 && i !== steps.length - 1) addArrow(slide, 3.15 + (i % 4) * 3.15, 2.08 + Math.floor(i / 4) * 1.35, 0.38, s[2]);
  });
  addCallout(
    slide,
    "Choose a route: point, draw, speak, write, photograph, work with a partner, ask us to write, or pass and join later.",
    0.7,
    5.35,
    11.9,
    1.05,
    C.white,
    C.life
  );
}

// Slide 2: fictional case.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "The fictional case", "A model mystery gives us a known answer. Real beach evidence will stay open until we investigate it.");

  addRoundedBox(slide, 0.65, 1.65, 3.1, 3.75, C.earthSoft, C.earth);
  slide.addShape(pptx.ShapeType.rect, {
    x: 1.25,
    y: 2.2,
    w: 1.9,
    h: 1.45,
    fill: { color: C.white },
    line: { color: C.earth, width: 2 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 1.58,
    y: 2.47,
    w: 1.0,
    h: 0.55,
    fill: { color: "94A3B8" },
    line: { color: "64748B" },
  });
  slide.addShape(pptx.ShapeType.triangle, {
    x: 2.47,
    y: 2.57,
    w: 0.32,
    h: 0.25,
    rotate: 90,
    fill: { color: C.water },
    line: { color: C.water },
  });
  slide.addText("MODEL BIRD\n+ SEALED SAND CLUE", {
    x: 0.95,
    y: 3.95,
    w: 2.5,
    h: 0.75,
    fontSize: 15,
    bold: true,
    align: "center",
    color: C.earth,
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });

  addArrow(slide, 3.95, 3.1, 0.7, C.muted);
  addJar(slide, 5.05, 1.85, 1.75, 2.55, "Durand reference", C.life, [
    { x: 0.28, y: 0.44, w: 0.11, h: 0.09, color: C.life },
    { x: 0.57, y: 0.63, w: 0.08, h: 0.07, color: C.life },
  ]);
  slide.addText("OR", {
    x: 6.86,
    y: 2.9,
    w: 0.7,
    h: 0.45,
    fontSize: 17,
    bold: true,
    align: "center",
    color: C.muted,
    margin: 0,
    charSpacing: 0,
  });
  addJar(slide, 7.65, 1.85, 1.75, 2.55, "Ontario reference", C.systems, [
    { x: 0.2, y: 0.58, w: 0.18, h: 0.045, rotate: 25, color: C.systems, type: pptx.ShapeType.rect },
    { x: 0.61, y: 0.43, w: 0.12, h: 0.05, rotate: -30, color: C.systems, type: pptx.ShapeType.rect },
    { x: 0.45, y: 0.72, w: 0.08, h: 0.08, color: C.systems },
  ]);
  slide.addText("Which reference sample best matches the clue?", {
    x: 4.85,
    y: 4.85,
    w: 4.8,
    h: 0.65,
    fontSize: 20,
    bold: true,
    align: "center",
    color: C.ink,
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });
  addCallout(
    slide,
    "EVIDENCE LIMIT: This is a fictional model case. It does not report a real injured bird, prove why an animal needed care, or confirm that a visible fragment is plastic.",
    9.82,
    1.75,
    2.85,
    3.75,
    C.coralSoft,
    C.coral
  );
}

// Slide 3: before, during, after.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Before → During → After", "The goal is not a perfect first guess. The goal is to notice, compare, and revise with evidence.");
  const cards = [
    {
      title: "BEFORE",
      color: C.water,
      fill: C.waterSoft,
      lines: ["Predict what you will notice first.", "Circle your confidence.", "Say, draw, point, or ask for a scribe."],
    },
    {
      title: "DURING",
      color: C.life,
      fill: C.lifeSoft,
      lines: ["Look without magnification.", "Count visible proxy pieces.", "Magnify and record what changes."],
    },
    {
      title: "AFTER",
      color: C.systems,
      fill: C.systemsSoft,
      lines: ["Compare both site records.", "Match the mystery clue.", "Revise your claim and name a limit."],
    },
  ];
  cards.forEach((c, i) => {
    const x = 0.7 + i * 4.15;
    addRoundedBox(slide, x, 1.7, 3.55, 4.45, c.fill, c.color);
    slide.addText(c.title, {
      x: x + 0.25,
      y: 2.05,
      w: 3.05,
      h: 0.55,
      fontSize: 24,
      bold: true,
      color: c.color,
      align: "center",
      margin: 0,
      charSpacing: 0,
    });
    c.lines.forEach((line, j) => {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: x + 0.34,
        y: 2.92 + j * 0.9,
        w: 0.42,
        h: 0.42,
        fill: { color: c.color },
        line: { color: c.color },
      });
      slide.addText(String(j + 1), {
        x: x + 0.34,
        y: 3.005 + j * 0.9,
        w: 0.42,
        h: 0.2,
        fontSize: 11,
        bold: true,
        color: C.white,
        align: "center",
        margin: 0,
        charSpacing: 0,
      });
      slide.addText(line, {
        x: x + 0.9,
        y: 2.86 + j * 0.9,
        w: 2.35,
        h: 0.55,
        fontSize: 14,
        color: C.ink,
        margin: 0,
        valign: "mid",
        charSpacing: 0,
        fit: "shrink",
      });
    });
    if (i < 2) addArrow(slide, x + 3.67, 3.72, 0.42, c.color);
  });
}

// Slide 4: comparison visual.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Compare the evidence", "A match should use more than one feature. Keep the observations separate from the conclusion.");

  const cols = [
    ["FEATURE", C.ink, "E2E8F0"],
    ["DURAND", C.life, C.lifeSoft],
    ["ONTARIO", C.systems, C.systemsSoft],
    ["MYSTERY CLUE", C.earth, C.earthSoft],
  ];
  const rows = ["Grain color", "Grain size", "Visible proxy count", "Magnified proxy count", "Other pattern"];
  const x0 = 0.65;
  const y0 = 1.65;
  const widths = [2.3, 2.85, 2.85, 3.55];
  let x = x0;
  cols.forEach((c, i) => {
    addRoundedBox(slide, x, y0, widths[i], 0.65, c[2], c[1]);
    slide.addText(c[0], {
      x: x + 0.08,
      y: y0 + 0.17,
      w: widths[i] - 0.16,
      h: 0.28,
      fontSize: 13,
      bold: true,
      color: c[1],
      align: "center",
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
    x += widths[i] + 0.08;
  });
  rows.forEach((row, r) => {
    let cx = x0;
    widths.forEach((w, i) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: cx,
        y: y0 + 0.72 + r * 0.72,
        w,
        h: 0.64,
        fill: { color: i === 0 ? "F1F5F9" : C.white },
        line: { color: C.line, width: 1 },
      });
      if (i === 0) {
        slide.addText(row, {
          x: cx + 0.15,
          y: y0 + 0.89 + r * 0.72,
          w: w - 0.3,
          h: 0.25,
          fontSize: 12.5,
          bold: true,
          color: C.ink,
          margin: 0,
          charSpacing: 0,
          fit: "shrink",
        });
      } else {
        slide.addText("record", {
          x: cx + 0.2,
          y: y0 + 0.88 + r * 0.72,
          w: w - 0.4,
          h: 0.26,
          fontSize: 11,
          italic: true,
          color: C.muted,
          align: "center",
          margin: 0,
          charSpacing: 0,
        });
      }
      cx += w + 0.08;
    });
  });
  addCallout(slide, "Claim = best match. Evidence = the features that support it. Limit = what the model cannot tell us.", 1.25, 6.05, 10.7, 0.72, C.white, C.earth);
}

// Slide 5: evidence language.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Use evidence language", "The three sentence starters keep observation, inference, and uncertainty from blending together.");
  const cards = [
    ["I NOTICED ...", "What I saw, counted, or measured.", C.life, C.lifeSoft],
    ["I THINK ...", "My explanation or best match.", C.water, C.waterSoft],
    ["WE STILL NEED ...", "Evidence that could confirm or challenge the claim.", C.systems, C.systemsSoft],
  ];
  cards.forEach((c, i) => {
    const x = 0.75 + i * 4.15;
    addRoundedBox(slide, x, 1.75, 3.55, 3.35, c[3], c[2]);
    slide.addText(c[0], {
      x: x + 0.25,
      y: 2.15,
      w: 3.05,
      h: 0.52,
      fontSize: 21,
      bold: true,
      color: c[2],
      align: "center",
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
    slide.addText(c[1], {
      x: x + 0.42,
      y: 3.0,
      w: 2.72,
      h: 1.15,
      fontSize: 16,
      color: C.ink,
      align: "center",
      valign: "mid",
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
  });
  addCallout(
    slide,
    "A visually suspected fiber or fragment is not chemically confirmed plastic. Careful uncertainty is part of good science.",
    1.05,
    5.55,
    11.2,
    0.9,
    C.coralSoft,
    C.coral
  );
}

// Slide 6: field sampling.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Collect a real sand sample", "Every pair uses the same method so our samples remain traceable and comparable.");
  const steps = [
    ["CHOOSE", "Choose and name the site.", C.earth],
    ["FRAME", "Place the red square.", C.coral],
    ["SCOOP", "Collect the top 1/2 inch.", C.water],
    ["SEAL", "Close the jar before moving.", C.life],
    ["LABEL", "Pair + site + time.", C.systems],
    ["MAP", "Draw or mark the location.", C.teal],
  ];
  steps.forEach((s, i) => {
    const x = 0.65 + (i % 3) * 4.2;
    const y = 1.7 + Math.floor(i / 3) * 1.55;
    addRoundedBox(slide, x, y, 3.65, 1.05, C.white, s[2]);
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.16,
      y: y + 0.2,
      w: 0.62,
      h: 0.62,
      fill: { color: s[2] },
      line: { color: s[2] },
    });
    slide.addText(String(i + 1), {
      x: x + 0.16,
      y: y + 0.335,
      w: 0.62,
      h: 0.24,
      fontSize: 14,
      bold: true,
      color: C.white,
      align: "center",
      margin: 0,
      charSpacing: 0,
    });
    slide.addText(s[0], {
      x: x + 0.92,
      y: y + 0.16,
      w: 2.45,
      h: 0.3,
      fontSize: 15,
      bold: true,
      color: s[2],
      margin: 0,
      charSpacing: 0,
    });
    slide.addText(s[1], {
      x: x + 0.92,
      y: y + 0.48,
      w: 2.45,
      h: 0.35,
      fontSize: 11.5,
      color: C.ink,
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
  });
  addCallout(slide, "STOP: Do not add salt water at the beach. Keep every field sample sealed and separate. We will process each sample in its own labeled container.", 1.05, 5.3, 11.15, 1.02, C.coralSoft, C.coral);
}

// Slide 7: roles and access.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Choose your science role", "Roles can change. No role owns the science, and every role can add evidence.");
  const roles = [
    ["OBSERVER", C.earthSoft, C.earth],
    ["SAMPLER", C.waterSoft, C.water],
    ["LABELER", C.lifeSoft, C.life],
    ["MAPPER", C.systemsSoft, C.systems],
    ["PHOTOGRAPHER", C.coralSoft, C.coral],
    ["RECORDER", C.tealSoft, C.teal],
    ["MATERIALS MONITOR", "E2E8F0", C.body],
    ["SEATED COORDINATOR", "F1F5F9", C.ink],
  ];
  roles.forEach((r, i) => {
    const x = 0.7 + (i % 4) * 3.12;
    const y = 1.7 + Math.floor(i / 4) * 1.35;
    addRoundedBox(slide, x, y, 2.62, 0.96, r[1], r[2]);
    slide.addText(r[0], {
      x: x + 0.15,
      y: y + 0.3,
      w: 2.32,
      h: 0.3,
      fontSize: 13.5,
      bold: true,
      color: r[2],
      align: "center",
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
  });
  addCallout(slide, "You may look, point, draw, speak, write, photograph, dictate, use home language, work with a partner, choose a low-energy role, or pass and re-enter.", 0.85, 4.65, 11.65, 1.2, C.white, C.life);
  slide.addText("Our goal is the same: observe, compare, name uncertainty, and ask a useful question.", {
    x: 1.15,
    y: 6.05,
    w: 11.0,
    h: 0.45,
    fontSize: 17,
    bold: true,
    color: C.ink,
    align: "center",
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });
}

// Slide 8: close and preview.
{
  const slide = pptx.addSlide("CAMP");
  addTitle(slide, "Leave one question", "Friday opens the mystery. Camp week adds evidence and revises the model.");
  addRoundedBox(slide, 0.65, 1.6, 5.3, 2.05, C.earthSoft, C.earth);
  slide.addText("ANCHOR", {
    x: 0.95,
    y: 1.92,
    w: 1.15,
    h: 0.32,
    fontSize: 13,
    bold: true,
    color: C.earth,
    margin: 0,
    charSpacing: 0,
  });
  slide.addText("Humans aren't trash cans, but we have plastics in our bodies.", {
    x: 0.95,
    y: 2.35,
    w: 4.55,
    h: 0.84,
    fontSize: 21,
    bold: true,
    color: C.ink,
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });
  addRoundedBox(slide, 6.25, 1.6, 6.4, 2.05, C.waterSoft, C.water);
  slide.addText("DRIVING QUESTION", {
    x: 6.55,
    y: 1.92,
    w: 2.1,
    h: 0.32,
    fontSize: 13,
    bold: true,
    color: C.water,
    margin: 0,
    charSpacing: 0,
  });
  slide.addText("How does plastic break into tiny pieces, move through the environment and into living bodies, and how can we stop it fairly?", {
    x: 6.55,
    y: 2.28,
    w: 5.65,
    h: 1.0,
    fontSize: 18,
    bold: true,
    color: C.ink,
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });

  slide.addText("Choose one question to leave for Monday:", {
    x: 0.8,
    y: 4.05,
    w: 4.4,
    h: 0.38,
    fontSize: 16,
    bold: true,
    color: C.ink,
    margin: 0,
    charSpacing: 0,
  });
  const qs = [
    "What might a first look miss?",
    "How could plastic move through connected systems?",
    "What evidence would confirm a suspected particle?",
    "Where could a fair change interrupt the pathway?",
  ];
  qs.forEach((q, i) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.88,
      y: 4.58 + i * 0.45,
      w: 0.24,
      h: 0.24,
      fill: { color: [C.earth, C.water, C.life, C.systems][i] },
      line: { color: [C.earth, C.water, C.life, C.systems][i] },
    });
    slide.addText(q, {
      x: 1.25,
      y: 4.49 + i * 0.45,
      w: 5.0,
      h: 0.36,
      fontSize: 12.5,
      color: C.ink,
      margin: 0,
      charSpacing: 0,
      fit: "shrink",
    });
  });

  addRoundedBox(slide, 6.65, 4.0, 5.55, 2.05, C.lifeSoft, C.life);
  slide.addText("MONDAY PREVIEW", {
    x: 6.95,
    y: 4.33,
    w: 2.1,
    h: 0.32,
    fontSize: 14,
    bold: true,
    color: C.life,
    margin: 0,
    charSpacing: 0,
  });
  slide.addText("BRINE  →  SETTLE  →  TRANSFER\n→  FILTER  →  DRY  →  INSPECT", {
    x: 6.95,
    y: 4.85,
    w: 4.95,
    h: 0.74,
    fontSize: 17,
    bold: true,
    align: "center",
    color: C.ink,
    margin: 0,
    charSpacing: 0,
    fit: "shrink",
  });
  slide.addText("Suspected is not the same as confirmed.", {
    x: 7.25,
    y: 5.66,
    w: 4.35,
    h: 0.28,
    fontSize: 11.5,
    italic: true,
    color: C.body,
    align: "center",
    margin: 0,
    charSpacing: 0,
  });
}

const outPath = path.resolve(
  __dirname,
  "..",
  "public-submissions",
  "invisible-invaders-field-friday-visual-guide.pptx"
);

pptx.writeFile({ fileName: outPath });
