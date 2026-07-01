# Visualizing Our Grounding Frameworks - Part 1

Student: Piter Z. Garcia Bautista
Course: EDU486 - Integrating Science and Technology
Working title: Community Evidence, Technology, and Justice-Centered STEM
Due: July 14, 2026

## Submission Focus

This visualization represents my current understanding of the JuST Framework and the role technology can play in justice-centered STEM learning. My central claim is that technology is not automatically liberating or harmful. It becomes meaningful when it helps youth, families, and communities ask stronger questions, collect and interpret evidence, create new representations, and act on what they learn.

## Visualization

[![Justice-centered STEM with technology concept map](grounding-frameworks-visual.svg)](grounding-frameworks-visual.svg)

The image above is the submit-ready visual. The Mermaid version below is included so the structure can be revised quickly inside GitHub as my thinking changes.

Direct links:

- [Grounding framework visual SVG](grounding-frameworks-visual.svg)
- [Grounding framework visual PNG export](</Users/pitergarcia/DataScience/Semester4(UofR)/EDU486/submission_exports/grounding-frameworks-visual.png>)
- [Grounding frameworks Part 1 DOCX export](</Users/pitergarcia/DataScience/Semester4(UofR)/EDU486/submission_exports/grounding-frameworks-part1.docx>)
- [Module 1 source map](../../docs/source-map.md#module-1-local-sources)

```mermaid
flowchart TD
    A["Justice-centered STEM with technology"] --> B["Build community"]
    A --> C["1. Plan: meaningfulness and centering justice"]
    A --> D["2. Elicit student culture"]
    A --> E["3. Revise thinking with diverse and local expertise"]
    A --> F["4. Use what we learned to make the world better"]

    B --> B1["Belonging, trust, sensory access, language access, roles"]
    C --> C1["Start with a real environmental question, not a tool demo"]
    D --> D1["Youth questions, family knowledge, place, culture, community assets"]
    E --> E1["Compare evidence from readings, youth observations, teachers, families, and local experts"]
    F --> F1["Create a product that can inform, teach, advocate, or invite action"]

    T["Technology as design material"] --> T1["Supports: access, creation, evidence, audience, collaboration"]
    T --> T2["Complicates: surveillance, unequal access, replacement, distraction, cognitive load"]
    T --> T3["Constrains: platform rules, data gaps, bias, time, device reliability"]

    P["PICRAT / TIF lens"] --> P1["Passive, interactive, creative participation"]
    P --> P2["Replacement, amplification, transformation"]
    P --> P3["Best use depends on justice purpose, not tool novelty"]

    Q["Puzzle Plan / PhD bridge"] --> Q1["Inclusive AI and equitable diagnostics"]
    Q --> Q2["EQUITAS habits: equity, universality, transparency, inclusion, access"]
    Q --> Q3["Teach youth to question data, tools, and who gets represented"]

    B1 --> T
    C1 --> T
    D1 --> P
    E1 --> Q
    T1 --> F1
    T2 --> E1
    T3 --> E1
```

## Annotations

**Community before tool.** The first move in justice-centered STEM is not choosing an app. It is building the conditions where students can safely bring questions, language, sensory needs, family knowledge, and local experience into the work.

**Technology has affordances and risks.** A digital map, microscope camera, AI summary, spreadsheet, or slideshow can help students see patterns and reach audiences. The same tools can also create barriers through surveillance, inaccessible interfaces, inaccurate outputs, unequal access, or too many steps held in working memory.

**PICRAT helps me ask what students are actually doing.** A tool that only replaces a worksheet might still improve access, but it should not be treated as transformation. In this course, I want technology to move students toward interactive and creative participation when that deepens learning and agency.

**JuST helps me keep the moral center visible.** The framework pushes me to plan for meaningfulness, elicit student culture, revise with diverse expertise, and use learning for action. That cycle keeps STEM from becoming disconnected facts or tool practice.

**My Puzzle Plan connection is evidence justice.** My broader work on equitable diagnostics and inclusive AI keeps asking: whose data counts, whose patterns are missed, and who is harmed when systems appear neutral? In EDU486, I can translate that question into a youth-accessible STEM practice: students can learn to collect, question, and communicate evidence without losing community knowledge.

## Example For Planet Protectors Camp

If our camp theme centers microplastics or water quality, a justice-centered technology activity could ask students to investigate how plastic pollution is noticed, measured, and communicated.

- Youth knowledge: Where do we see plastic waste? What places do adults ignore? What does our community already do to protect water, parks, streets, or homes?
- STEM evidence: Students observe, sort, count, photograph, map, or model plastic pollution patterns.
- Technology support: A shared map, spreadsheet, phone/microscope image, or simple data visualization helps students create evidence.
- Technology caution: The tool should not replace direct observation or local stories. Students should be able to explain what the data does not show.
- Action: Students create a poster, mini-report, demonstration, or family/community message about what they learned and what should change.

## Brief Reflection

At this point in the course, I understand the JuST Framework as a cycle of relationship, inquiry, revision, and action. It asks me to make STEM learning accountable to students and communities rather than only to content coverage. Technology belongs in that cycle when it expands participation, helps students make meaning, or supports action. It becomes a problem when it narrows the work to screen time, surveillance, or polished products without community purpose.

For my own teaching, the most important tension is that technology can both reveal and hide injustice. A data tool can make pollution patterns visible, but it can also make students trust numbers more than people. AI can help me explore a topic quickly, but it can also flatten local experience or produce confident but incomplete explanations. A justice-centered teacher has to design routines where students ask who made the tool, what evidence it includes, what it leaves out, and how the work can help people.

My working commitment is to design technology-supported STEM where youth are not just users. They are observers, questioners, builders, critics, and communicators. That is the connection I want to carry into the camp plan and later revise in Part 2 after I have evidence from actual teaching.

## AI Use Disclosure

OpenAI Codex (GPT-5) was used on July 1, 2026 to synthesize course materials, organize assignment requirements, and draft an initial version of this artifact. I reviewed, revised, and am responsible for the final content, examples, and submission decisions.
