// ── CSS Property Dataset for Memorization System ──────────────────────

export interface CssValue {
  value: string;
  description: string;
}

export interface CssPropertyDemo {
  html: string;
  css: string;
  highlightProp: string;
}

export interface CssProperty {
  id: string;
  property: string;
  category: CssCategory["id"];
  shortDescription: string;
  values: CssValue[];
  defaultValue: string;
  appliesTo: string;
  demo: CssPropertyDemo;
  relatedProps: string[];
  mnemonicHint?: string;
}

export interface CssCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  properties: CssProperty[];
}

// ── Flexbox ───────────────────────────────────────────────────────────

const flexboxProperties: CssProperty[] = [
  {
    id: "flex-direction",
    property: "flex-direction",
    category: "flexbox",
    shortDescription: "Sets the main axis direction — how flex items flow.",
    values: [
      { value: "row", description: "Items flow left to right (default). Main axis = horizontal." },
      { value: "row-reverse", description: "Items flow right to left." },
      { value: "column", description: "Items flow top to bottom. Main axis = vertical." },
      { value: "column-reverse", description: "Items flow bottom to top." },
    ],
    defaultValue: "row",
    appliesTo: "flex containers",
    demo: {
      html: `<div class="container">\n  <div class="box a">A</div>\n  <div class="box b">B</div>\n  <div class="box c">C</div>\n</div>`,
      css: `.container {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 20px; border-radius: 6px; font-weight: 600; color: #fff; }\n.a { background: #3b82f6; }\n.b { background: #8b5cf6; }\n.c { background: #ec4899; }`,
      highlightProp: "flex-direction",
    },
    relatedProps: ["justify-content", "align-items"],
    mnemonicHint: "Point your finger in the flow direction — that's the main axis.",
  },
  {
    id: "justify-content",
    property: "justify-content",
    category: "flexbox",
    shortDescription: "Distributes items along the main axis (the flow direction).",
    values: [
      { value: "flex-start", description: "Pack items to the start of the main axis." },
      { value: "flex-end", description: "Pack items to the end of the main axis." },
      { value: "center", description: "Center items along the main axis." },
      { value: "space-between", description: "Equal space between items, none at edges." },
      { value: "space-around", description: "Equal space around each item (half-size at edges)." },
      { value: "space-evenly", description: "Equal space between items AND at edges." },
    ],
    defaultValue: "flex-start",
    appliesTo: "flex containers",
    demo: {
      html: `<div class="container">\n  <div class="box">A</div>\n  <div class="box">B</div>\n  <div class="box">C</div>\n</div>`,
      css: `.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  height: 80px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 20px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "justify-content",
    },
    relatedProps: ["align-items", "flex-direction", "align-content"],
    mnemonicHint: "Justify = along the flow. If items flow left-right, justify controls horizontal.",
  },
  {
    id: "align-items",
    property: "align-items",
    category: "flexbox",
    shortDescription: "Positions items along the cross axis (perpendicular to flow).",
    values: [
      { value: "stretch", description: "Items stretch to fill the container's cross axis (default)." },
      { value: "flex-start", description: "Items align to the start of the cross axis." },
      { value: "flex-end", description: "Items align to the end of the cross axis." },
      { value: "center", description: "Items center on the cross axis." },
      { value: "baseline", description: "Items align by their text baselines." },
    ],
    defaultValue: "stretch",
    appliesTo: "flex containers",
    demo: {
      html: `<div class="container">\n  <div class="box tall">Tall</div>\n  <div class="box">Mid</div>\n  <div class="box short">Short</div>\n</div>`,
      css: `.container {\n  display: flex;\n  align-items: center;\n  height: 120px;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 20px; background: #8b5cf6; color: #fff; border-radius: 6px; font-weight: 600; }\n.tall { padding: 24px 20px; }\n.short { padding: 6px 20px; }`,
      highlightProp: "align-items",
    },
    relatedProps: ["justify-content", "align-self", "flex-direction"],
    mnemonicHint: "Align = across the flow. If items flow left-right, align controls vertical.",
  },
  {
    id: "flex-wrap",
    property: "flex-wrap",
    category: "flexbox",
    shortDescription: "Controls whether flex items wrap to new lines.",
    values: [
      { value: "nowrap", description: "All items on one line, may overflow (default)." },
      { value: "wrap", description: "Items wrap to the next line when they don't fit." },
      { value: "wrap-reverse", description: "Items wrap in reverse order." },
    ],
    defaultValue: "nowrap",
    appliesTo: "flex containers",
    demo: {
      html: `<div class="container">\n  <div class="box">1</div>\n  <div class="box">2</div>\n  <div class="box">3</div>\n  <div class="box">4</div>\n  <div class="box">5</div>\n</div>`,
      css: `.container {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  padding: 12px;\n  width: 200px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 20px; background: #06b6d4; color: #fff; border-radius: 6px; font-weight: 600; min-width: 60px; }`,
      highlightProp: "flex-wrap",
    },
    relatedProps: ["align-content", "flex-direction"],
  },
  {
    id: "flex-grow",
    property: "flex-grow",
    category: "flexbox",
    shortDescription: "How much a flex item grows to fill available space on the main axis.",
    values: [
      { value: "0", description: "Item does not grow (default)." },
      { value: "1", description: "Item absorbs its share of remaining space." },
      { value: "<number>", description: "Proportional share of remaining space." },
    ],
    defaultValue: "0",
    appliesTo: "flex items",
    demo: {
      html: `<div class="container">\n  <div class="sidebar">Sidebar</div>\n  <div class="main">Main (flex-grow: 1)</div>\n</div>`,
      css: `.container {\n  display: flex;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.sidebar { padding: 16px; background: #6366f1; color: #fff; border-radius: 6px; font-weight: 600; width: 100px; }\n.main { flex-grow: 1; padding: 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "flex-grow",
    },
    relatedProps: ["flex-shrink", "flex-basis"],
    mnemonicHint: "grow/shrink/basis always operate along the main axis.",
  },
  {
    id: "flex-shrink",
    property: "flex-shrink",
    category: "flexbox",
    shortDescription: "How much a flex item shrinks when there isn't enough space.",
    values: [
      { value: "1", description: "Item can shrink proportionally (default)." },
      { value: "0", description: "Item will not shrink — locks at basis/width." },
      { value: "<number>", description: "Proportional shrink factor." },
    ],
    defaultValue: "1",
    appliesTo: "flex items",
    demo: {
      html: `<div class="container">\n  <div class="fixed">Fixed (shrink: 0)</div>\n  <div class="flexible">Flexible</div>\n</div>`,
      css: `.container {\n  display: flex;\n  gap: 8px;\n  padding: 12px;\n  width: 250px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.fixed { flex-shrink: 0; width: 150px; padding: 16px; background: #ef4444; color: #fff; border-radius: 6px; font-weight: 600; }\n.flexible { padding: 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "flex-shrink",
    },
    relatedProps: ["flex-grow", "flex-basis"],
  },
  {
    id: "flex-basis",
    property: "flex-basis",
    category: "flexbox",
    shortDescription: "Sets the initial main-axis size of a flex item before grow/shrink.",
    values: [
      { value: "auto", description: "Use the item's width/height (default)." },
      { value: "<length>", description: "Explicit starting size (e.g. 200px, 30%)." },
      { value: "0", description: "Start at zero — let flex-grow distribute all space." },
      { value: "content", description: "Size based on content (similar to auto)." },
    ],
    defaultValue: "auto",
    appliesTo: "flex items",
    demo: {
      html: `<div class="container">\n  <div class="item a">basis: 200px</div>\n  <div class="item b">basis: 100px</div>\n</div>`,
      css: `.container {\n  display: flex;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.item { padding: 16px; color: #fff; border-radius: 6px; font-weight: 600; }\n.a { flex-basis: 200px; background: #8b5cf6; }\n.b { flex-basis: 100px; background: #06b6d4; }`,
      highlightProp: "flex-basis",
    },
    relatedProps: ["flex-grow", "flex-shrink"],
  },
  {
    id: "gap",
    property: "gap",
    category: "flexbox",
    shortDescription: "Sets spacing between flex/grid items without affecting outer edges.",
    values: [
      { value: "<length>", description: "Uniform gap (e.g. 12px, 1rem)." },
      { value: "<row> <column>", description: "Separate row and column gaps." },
    ],
    defaultValue: "0",
    appliesTo: "flex and grid containers",
    demo: {
      html: `<div class="container">\n  <div class="box">A</div>\n  <div class="box">B</div>\n  <div class="box">C</div>\n  <div class="box">D</div>\n</div>`,
      css: `.container {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 16px;\n  padding: 12px;\n  width: 180px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 20px; background: #f59e0b; color: #fff; border-radius: 6px; font-weight: 600; min-width: 60px; }`,
      highlightProp: "gap",
    },
    relatedProps: ["row-gap", "column-gap"],
    mnemonicHint: "gap replaces the margin hack — spacing between items only, never at container edges.",
  },
  {
    id: "align-self",
    property: "align-self",
    category: "flexbox",
    shortDescription: "Overrides align-items for a single flex item on the cross axis.",
    values: [
      { value: "auto", description: "Inherits from align-items (default)." },
      { value: "flex-start", description: "Align to cross-axis start." },
      { value: "flex-end", description: "Align to cross-axis end." },
      { value: "center", description: "Center on cross axis." },
      { value: "stretch", description: "Stretch to fill cross axis." },
      { value: "baseline", description: "Align by text baseline." },
    ],
    defaultValue: "auto",
    appliesTo: "flex items",
    demo: {
      html: `<div class="container">\n  <div class="box">Normal</div>\n  <div class="box special">align-self: flex-end</div>\n  <div class="box">Normal</div>\n</div>`,
      css: `.container {\n  display: flex;\n  align-items: flex-start;\n  height: 120px;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; }\n.special { align-self: flex-end; background: #ec4899; }`,
      highlightProp: "align-self",
    },
    relatedProps: ["align-items"],
  },
  {
    id: "order",
    property: "order",
    category: "flexbox",
    shortDescription: "Changes the visual order of a flex item without changing HTML.",
    values: [
      { value: "0", description: "Default order (same as source order)." },
      { value: "<integer>", description: "Lower numbers appear first." },
    ],
    defaultValue: "0",
    appliesTo: "flex items",
    demo: {
      html: `<div class="container">\n  <div class="box a">1st in HTML</div>\n  <div class="box b">2nd (order: -1)</div>\n  <div class="box c">3rd in HTML</div>\n</div>`,
      css: `.container {\n  display: flex;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 12px 16px; color: #fff; border-radius: 6px; font-weight: 600; }\n.a { background: #3b82f6; }\n.b { background: #ec4899; order: -1; }\n.c { background: #06b6d4; }`,
      highlightProp: "order",
    },
    relatedProps: ["flex-direction"],
  },
  {
    id: "align-content",
    property: "align-content",
    category: "flexbox",
    shortDescription: "Distributes space between wrapped lines on the cross axis.",
    values: [
      { value: "stretch", description: "Lines stretch to fill cross axis (default)." },
      { value: "flex-start", description: "Lines pack to cross-axis start." },
      { value: "flex-end", description: "Lines pack to cross-axis end." },
      { value: "center", description: "Lines center on cross axis." },
      { value: "space-between", description: "Equal space between lines." },
      { value: "space-around", description: "Equal space around lines." },
    ],
    defaultValue: "stretch",
    appliesTo: "multi-line flex containers",
    demo: {
      html: `<div class="container">\n  <div class="box">1</div><div class="box">2</div><div class="box">3</div>\n  <div class="box">4</div><div class="box">5</div><div class="box">6</div>\n</div>`,
      css: `.container {\n  display: flex;\n  flex-wrap: wrap;\n  align-content: space-between;\n  height: 150px;\n  width: 200px;\n  gap: 6px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 8px 16px; background: #8b5cf6; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "align-content",
    },
    relatedProps: ["flex-wrap", "align-items"],
    mnemonicHint: "align-content only works with flex-wrap. No wrapping = no effect.",
  },
];

// ── Grid ──────────────────────────────────────────────────────────────

const gridProperties: CssProperty[] = [
  {
    id: "grid-template-columns",
    property: "grid-template-columns",
    category: "grid",
    shortDescription: "Defines the number and widths of columns in a grid.",
    values: [
      { value: "<track-list>", description: "Space-separated sizes (e.g. 200px 1fr 1fr)." },
      { value: "repeat(n, size)", description: "Repeat a track pattern n times." },
      { value: "auto-fill", description: "Fill as many columns as fit in repeat()." },
      { value: "auto-fit", description: "Like auto-fill but collapses empty tracks." },
      { value: "minmax(min, max)", description: "Track size clamps between min and max." },
    ],
    defaultValue: "none",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell">1</div>\n  <div class="cell">2</div>\n  <div class="cell">3</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: 1fr 2fr 1fr;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 16px; background: #06b6d4; color: #fff; border-radius: 6px; font-weight: 600; text-align: center; }`,
      highlightProp: "grid-template-columns",
    },
    relatedProps: ["grid-template-rows", "gap"],
    mnemonicHint: "fr = fraction of remaining space. 1fr 2fr = 1/3 + 2/3.",
  },
  {
    id: "grid-template-rows",
    property: "grid-template-rows",
    category: "grid",
    shortDescription: "Defines the number and heights of rows in a grid.",
    values: [
      { value: "<track-list>", description: "Space-separated sizes (e.g. 60px auto 1fr)." },
      { value: "repeat(n, size)", description: "Repeat a track pattern." },
      { value: "minmax(min, max)", description: "Track size clamps between min and max." },
    ],
    defaultValue: "none",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell header">Header</div>\n  <div class="cell main">Main</div>\n  <div class="cell footer">Footer</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-rows: 50px 1fr 40px;\n  height: 200px;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 8px 16px; color: #fff; border-radius: 6px; font-weight: 600; }\n.header { background: #6366f1; }\n.main { background: #3b82f6; }\n.footer { background: #8b5cf6; }`,
      highlightProp: "grid-template-rows",
    },
    relatedProps: ["grid-template-columns"],
  },
  {
    id: "grid-template-areas",
    property: "grid-template-areas",
    category: "grid",
    shortDescription: "Names grid regions using a visual ASCII layout.",
    values: [
      { value: '"name ..."', description: "Quoted strings where each word is a cell name." },
      { value: ".", description: "A dot represents an empty cell." },
    ],
    defaultValue: "none",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="layout">\n  <header class="hd">Header</header>\n  <nav class="nav">Nav</nav>\n  <main class="main">Main</main>\n  <footer class="ft">Footer</footer>\n</div>`,
      css: `.layout {\n  display: grid;\n  grid-template-areas:\n    "hd hd"\n    "nav main"\n    "ft ft";\n  grid-template-columns: 100px 1fr;\n  grid-template-rows: auto 1fr auto;\n  gap: 6px;\n  height: 180px;\n  padding: 8px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.hd { grid-area: hd; background: #6366f1; }\n.nav { grid-area: nav; background: #8b5cf6; }\n.main { grid-area: main; background: #3b82f6; }\n.ft { grid-area: ft; background: #06b6d4; }\n.layout > * { padding: 8px; color: #fff; border-radius: 4px; font-weight: 600; }`,
      highlightProp: "grid-template-areas",
    },
    relatedProps: ["grid-area", "grid-template-columns", "grid-template-rows"],
    mnemonicHint: "Visual ASCII art for layouts — each quoted string is one row.",
  },
  {
    id: "grid-column",
    property: "grid-column",
    category: "grid",
    shortDescription: "Places a grid item across column tracks by line numbers.",
    values: [
      { value: "<start> / <end>", description: "Start and end line numbers (e.g. 1 / 3)." },
      { value: "span <n>", description: "Span across n column tracks." },
      { value: "auto", description: "Auto-placed by the grid algorithm." },
    ],
    defaultValue: "auto",
    appliesTo: "grid items",
    demo: {
      html: `<div class="grid">\n  <div class="cell wide">Spans 2 cols</div>\n  <div class="cell">Normal</div>\n  <div class="cell">Normal</div>\n  <div class="cell">Normal</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 16px; color: #fff; border-radius: 6px; font-weight: 600; text-align: center; background: #3b82f6; }\n.wide { grid-column: 1 / 3; background: #ec4899; }`,
      highlightProp: "grid-column",
    },
    relatedProps: ["grid-row", "grid-area"],
  },
  {
    id: "grid-row",
    property: "grid-row",
    category: "grid",
    shortDescription: "Places a grid item across row tracks by line numbers.",
    values: [
      { value: "<start> / <end>", description: "Start and end line numbers." },
      { value: "span <n>", description: "Span across n row tracks." },
      { value: "auto", description: "Auto-placed by the grid algorithm." },
    ],
    defaultValue: "auto",
    appliesTo: "grid items",
    demo: {
      html: `<div class="grid">\n  <div class="cell tall">Spans 2 rows</div>\n  <div class="cell">B</div>\n  <div class="cell">C</div>\n  <div class="cell">D</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  grid-template-rows: repeat(2, 60px);\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 12px; color: #fff; border-radius: 6px; font-weight: 600; text-align: center; background: #06b6d4; }\n.tall { grid-row: 1 / 3; background: #8b5cf6; }`,
      highlightProp: "grid-row",
    },
    relatedProps: ["grid-column", "grid-area"],
  },
  {
    id: "grid-area",
    property: "grid-area",
    category: "grid",
    shortDescription: "Assigns a grid item to a named area or sets row/column span.",
    values: [
      { value: "<name>", description: "Name matching a grid-template-areas region." },
      { value: "<row-start> / <col-start> / <row-end> / <col-end>", description: "Explicit placement." },
    ],
    defaultValue: "auto",
    appliesTo: "grid items",
    demo: {
      html: `<div class="layout">\n  <div class="hd">Header</div>\n  <div class="content">Content</div>\n  <div class="side">Side</div>\n</div>`,
      css: `.layout {\n  display: grid;\n  grid-template-areas:\n    "header header"\n    "content sidebar";\n  grid-template-columns: 1fr 120px;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.hd { grid-area: header; background: #6366f1; }\n.content { grid-area: content; background: #3b82f6; }\n.side { grid-area: sidebar; background: #f59e0b; }\n.layout > * { padding: 12px; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "grid-area",
    },
    relatedProps: ["grid-template-areas"],
  },
  {
    id: "grid-auto-flow",
    property: "grid-auto-flow",
    category: "grid",
    shortDescription: "Controls how auto-placed items fill the grid.",
    values: [
      { value: "row", description: "Fill by row, adding new rows as needed (default)." },
      { value: "column", description: "Fill by column, adding new columns." },
      { value: "dense", description: "Fill gaps left by larger items (may reorder)." },
    ],
    defaultValue: "row",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell">1</div>\n  <div class="cell wide">2 (wide)</div>\n  <div class="cell">3</div>\n  <div class="cell">4</div>\n  <div class="cell">5</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  grid-auto-flow: dense;\n  gap: 6px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 12px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; text-align: center; }\n.wide { grid-column: span 2; background: #ec4899; }`,
      highlightProp: "grid-auto-flow",
    },
    relatedProps: ["grid-template-columns", "grid-template-rows"],
  },
  {
    id: "grid-auto-rows",
    property: "grid-auto-rows",
    category: "grid",
    shortDescription: "Sets the size of implicitly created rows.",
    values: [
      { value: "auto", description: "Rows size to content (default)." },
      { value: "<length>", description: "Fixed row height." },
      { value: "minmax(min, max)", description: "Row height clamps between min and max." },
    ],
    defaultValue: "auto",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell">1</div>\n  <div class="cell">2</div>\n  <div class="cell">3</div>\n  <div class="cell">4</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  grid-auto-rows: minmax(50px, auto);\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 12px; background: #06b6d4; color: #fff; border-radius: 6px; font-weight: 600; text-align: center; }`,
      highlightProp: "grid-auto-rows",
    },
    relatedProps: ["grid-auto-columns", "grid-auto-flow"],
  },
  {
    id: "justify-items",
    property: "justify-items",
    category: "grid",
    shortDescription: "Aligns all grid items within their cell along the inline (row) axis.",
    values: [
      { value: "stretch", description: "Items stretch to fill the cell (default)." },
      { value: "start", description: "Items align to the cell's start edge." },
      { value: "end", description: "Items align to the cell's end edge." },
      { value: "center", description: "Items center within the cell." },
    ],
    defaultValue: "stretch",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell">A</div>\n  <div class="cell">B</div>\n  <div class="cell">C</div>\n  <div class="cell">D</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  justify-items: center;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 12px 24px; background: #f59e0b; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "justify-items",
    },
    relatedProps: ["align-items", "justify-self"],
  },
  {
    id: "place-items",
    property: "place-items",
    category: "grid",
    shortDescription: "Shorthand for align-items + justify-items in one declaration.",
    values: [
      { value: "<align> <justify>", description: "Sets both axes at once (e.g. center center)." },
      { value: "<value>", description: "Single value sets both to the same." },
    ],
    defaultValue: "stretch",
    appliesTo: "grid containers",
    demo: {
      html: `<div class="grid">\n  <div class="cell">Centered</div>\n  <div class="cell">In cell</div>\n</div>`,
      css: `.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  place-items: center;\n  height: 120px;\n  gap: 8px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.cell { padding: 12px 20px; background: #8b5cf6; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "place-items",
    },
    relatedProps: ["align-items", "justify-items"],
    mnemonicHint: "place-items: center is the fastest way to center grid children.",
  },
];

// ── Positioning ───────────────────────────────────────────────────────

const positioningProperties: CssProperty[] = [
  {
    id: "position",
    property: "position",
    category: "positioning",
    shortDescription: "Sets how an element is positioned in the document flow.",
    values: [
      { value: "static", description: "Normal flow, top/left/z-index have no effect (default)." },
      { value: "relative", description: "Normal flow, then offset by top/left. Creates stacking context." },
      { value: "absolute", description: "Removed from flow, positioned relative to nearest positioned ancestor." },
      { value: "fixed", description: "Removed from flow, positioned relative to the viewport." },
      { value: "sticky", description: "Normal flow until scroll threshold, then sticks." },
    ],
    defaultValue: "static",
    appliesTo: "all elements",
    demo: {
      html: `<div class="parent">\n  <div class="box">Static</div>\n  <div class="box abs">Absolute</div>\n  <div class="box">Static</div>\n</div>`,
      css: `.parent {\n  position: relative;\n  padding: 24px;\n  height: 120px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { padding: 8px 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; margin-bottom: 4px; display: inline-block; }\n.abs { position: absolute; top: 8px; right: 8px; background: #ec4899; }`,
      highlightProp: "position",
    },
    relatedProps: ["z-index", "top", "right", "bottom", "left"],
    mnemonicHint: "absolute looks for the nearest ancestor with position != static.",
  },
  {
    id: "z-index",
    property: "z-index",
    category: "positioning",
    shortDescription: "Controls stacking order of positioned elements.",
    values: [
      { value: "auto", description: "Same stacking order as parent (default)." },
      { value: "<integer>", description: "Higher numbers stack on top within the same context." },
    ],
    defaultValue: "auto",
    appliesTo: "positioned elements (not static)",
    demo: {
      html: `<div class="stack">\n  <div class="box a">z: 1</div>\n  <div class="box b">z: 3</div>\n  <div class="box c">z: 2</div>\n</div>`,
      css: `.stack {\n  position: relative;\n  height: 100px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.box { position: absolute; padding: 12px 20px; color: #fff; border-radius: 6px; font-weight: 600; }\n.a { z-index: 1; top: 10px; left: 10px; background: #3b82f6; }\n.b { z-index: 3; top: 20px; left: 30px; background: #ec4899; }\n.c { z-index: 2; top: 30px; left: 50px; background: #8b5cf6; }`,
      highlightProp: "z-index",
    },
    relatedProps: ["position"],
    mnemonicHint: "z-index only works on positioned elements. No position = z-index ignored.",
  },
  {
    id: "top",
    property: "top",
    category: "positioning",
    shortDescription: "Offset from the top edge of the containing block.",
    values: [
      { value: "auto", description: "No offset (default)." },
      { value: "<length>", description: "Offset in px, rem, etc." },
      { value: "<percentage>", description: "Percentage of containing block's height." },
    ],
    defaultValue: "auto",
    appliesTo: "positioned elements",
    demo: {
      html: `<div class="parent">\n  <div class="child">top: 20px</div>\n</div>`,
      css: `.parent {\n  position: relative;\n  height: 100px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.child { position: absolute; top: 20px; left: 12px; padding: 8px 16px; background: #6366f1; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "top",
    },
    relatedProps: ["bottom", "left", "right", "position"],
  },
  {
    id: "right",
    property: "right",
    category: "positioning",
    shortDescription: "Offset from the right edge of the containing block.",
    values: [
      { value: "auto", description: "No offset (default)." },
      { value: "<length>", description: "Offset in px, rem, etc." },
      { value: "<percentage>", description: "Percentage of containing block's width." },
    ],
    defaultValue: "auto",
    appliesTo: "positioned elements",
    demo: {
      html: `<div class="parent">\n  <div class="child">right: 12px</div>\n</div>`,
      css: `.parent {\n  position: relative;\n  height: 80px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.child { position: absolute; top: 12px; right: 12px; padding: 8px 16px; background: #f59e0b; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "right",
    },
    relatedProps: ["left", "top", "bottom", "position"],
  },
  {
    id: "bottom",
    property: "bottom",
    category: "positioning",
    shortDescription: "Offset from the bottom edge of the containing block.",
    values: [
      { value: "auto", description: "No offset (default)." },
      { value: "<length>", description: "Offset in px, rem, etc." },
      { value: "<percentage>", description: "Percentage of containing block's height." },
    ],
    defaultValue: "auto",
    appliesTo: "positioned elements",
    demo: {
      html: `<div class="parent">\n  <div class="child">bottom: 8px</div>\n</div>`,
      css: `.parent {\n  position: relative;\n  height: 100px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.child { position: absolute; bottom: 8px; left: 12px; padding: 8px 16px; background: #06b6d4; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "bottom",
    },
    relatedProps: ["top", "left", "right", "position"],
  },
  {
    id: "left",
    property: "left",
    category: "positioning",
    shortDescription: "Offset from the left edge of the containing block.",
    values: [
      { value: "auto", description: "No offset (default)." },
      { value: "<length>", description: "Offset in px, rem, etc." },
      { value: "<percentage>", description: "Percentage of containing block's width." },
    ],
    defaultValue: "auto",
    appliesTo: "positioned elements",
    demo: {
      html: `<div class="parent">\n  <div class="child">left: 30px</div>\n</div>`,
      css: `.parent {\n  position: relative;\n  height: 80px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}\n.child { position: absolute; top: 12px; left: 30px; padding: 8px 16px; background: #ef4444; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "left",
    },
    relatedProps: ["right", "top", "bottom", "position"],
  },
];

// ── Box Model ─────────────────────────────────────────────────────────

const boxModelProperties: CssProperty[] = [
  {
    id: "box-sizing",
    property: "box-sizing",
    category: "box-model",
    shortDescription: "Controls whether padding/border are included in width/height.",
    values: [
      { value: "content-box", description: "Width/height = content only. Padding+border add to total (default)." },
      { value: "border-box", description: "Width/height includes padding + border. Easier to reason about." },
    ],
    defaultValue: "content-box",
    appliesTo: "all elements",
    demo: {
      html: `<div class="content-box">content-box: 200px + padding</div>\n<div class="border-box">border-box: 200px total</div>`,
      css: `.content-box {\n  box-sizing: content-box;\n  width: 200px;\n  padding: 20px;\n  background: #ef4444;\n  color: #fff;\n  font-weight: 600;\n  margin-bottom: 8px;\n  border-radius: 6px;\n}\n.border-box {\n  box-sizing: border-box;\n  width: 200px;\n  padding: 20px;\n  background: #22c55e;\n  color: #fff;\n  font-weight: 600;\n  border-radius: 6px;\n}`,
      highlightProp: "box-sizing",
    },
    relatedProps: ["width", "padding", "border"],
    mnemonicHint: "border-box: what you set is what you get. Always use it.",
  },
  {
    id: "margin",
    property: "margin",
    category: "box-model",
    shortDescription: "Space outside the element's border — pushes neighbors away.",
    values: [
      { value: "<length>", description: "All four sides (e.g. 16px)." },
      { value: "<top> <right> <bottom> <left>", description: "Each side individually." },
      { value: "auto", description: "Auto-fills space — used for horizontal centering." },
    ],
    defaultValue: "0",
    appliesTo: "all elements",
    demo: {
      html: `<div class="outer">\n  <div class="box">margin: 20px auto</div>\n</div>`,
      css: `.outer {\n  background: #f3f4f6;\n  padding: 8px;\n  border-radius: 8px;\n}\n.box {\n  margin: 20px auto;\n  width: 200px;\n  padding: 16px;\n  background: #3b82f6;\n  color: #fff;\n  border-radius: 6px;\n  font-weight: 600;\n  text-align: center;\n}`,
      highlightProp: "margin",
    },
    relatedProps: ["padding"],
    mnemonicHint: "margin: auto centers horizontally. Vertical margins collapse between siblings.",
  },
  {
    id: "padding",
    property: "padding",
    category: "box-model",
    shortDescription: "Space inside the element between content and border.",
    values: [
      { value: "<length>", description: "All four sides." },
      { value: "<top> <right> <bottom> <left>", description: "Each side individually." },
    ],
    defaultValue: "0",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">Padding creates inner space</div>`,
      css: `.box {\n  padding: 24px 32px;\n  background: #8b5cf6;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n}`,
      highlightProp: "padding",
    },
    relatedProps: ["margin", "box-sizing"],
  },
  {
    id: "width",
    property: "width",
    category: "box-model",
    shortDescription: "Sets the width of an element's content area (or border-box).",
    values: [
      { value: "auto", description: "Browser calculates — blocks fill parent, inlines shrink-wrap (default)." },
      { value: "<length>", description: "Fixed width (px, rem, etc.)." },
      { value: "<percentage>", description: "Percentage of containing block's width." },
      { value: "fit-content", description: "Shrink to content but respect max-width." },
      { value: "min-content", description: "Narrowest without overflow." },
      { value: "max-content", description: "Widest — no wrapping." },
    ],
    defaultValue: "auto",
    appliesTo: "all elements except inline non-replaced",
    demo: {
      html: `<div class="a">width: 80%</div>\n<div class="b">width: fit-content</div>`,
      css: `.a {\n  width: 80%;\n  padding: 12px;\n  background: #3b82f6;\n  color: #fff;\n  border-radius: 6px;\n  font-weight: 600;\n  margin-bottom: 8px;\n}\n.b {\n  width: fit-content;\n  padding: 12px 24px;\n  background: #ec4899;\n  color: #fff;\n  border-radius: 6px;\n  font-weight: 600;\n}`,
      highlightProp: "width",
    },
    relatedProps: ["height", "min-width", "max-width"],
  },
  {
    id: "height",
    property: "height",
    category: "box-model",
    shortDescription: "Sets the height of an element's content area (or border-box).",
    values: [
      { value: "auto", description: "Determined by content (default)." },
      { value: "<length>", description: "Fixed height." },
      { value: "<percentage>", description: "Percentage of containing block's height." },
      { value: "100vh", description: "Full viewport height." },
      { value: "100dvh", description: "Dynamic viewport height (accounts for mobile toolbars)." },
    ],
    defaultValue: "auto",
    appliesTo: "all elements except inline non-replaced",
    demo: {
      html: `<div class="box">height: 100px</div>`,
      css: `.box {\n  height: 100px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: #06b6d4;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n}`,
      highlightProp: "height",
    },
    relatedProps: ["width", "min-height", "max-height"],
  },
  {
    id: "overflow",
    property: "overflow",
    category: "box-model",
    shortDescription: "Controls what happens when content exceeds the element's box.",
    values: [
      { value: "visible", description: "Content overflows and is visible (default)." },
      { value: "hidden", description: "Content is clipped, no scrollbar." },
      { value: "scroll", description: "Always shows scrollbars." },
      { value: "auto", description: "Scrollbar only when content overflows." },
    ],
    defaultValue: "visible",
    appliesTo: "block containers",
    demo: {
      html: `<div class="box">This box has overflow: auto. When the content is too tall it gets a scrollbar. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</div>`,
      css: `.box {\n  overflow: auto;\n  height: 60px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n  font-size: 14px;\n  line-height: 1.6;\n}`,
      highlightProp: "overflow",
    },
    relatedProps: ["overflow-x", "overflow-y"],
    mnemonicHint: "overflow: hidden creates a BFC (Block Formatting Context) — clears floats.",
  },
  {
    id: "border",
    property: "border",
    category: "box-model",
    shortDescription: "Shorthand for border-width, border-style, and border-color.",
    values: [
      { value: "<width> <style> <color>", description: "All three in one (e.g. 2px solid #333)." },
      { value: "none", description: "No border." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="solid">2px solid</div>\n<div class="dashed">2px dashed</div>`,
      css: `.solid {\n  border: 2px solid #6366f1;\n  padding: 16px;\n  border-radius: 8px;\n  font-weight: 600;\n  margin-bottom: 8px;\n}\n.dashed {\n  border: 2px dashed #ec4899;\n  padding: 16px;\n  border-radius: 8px;\n  font-weight: 600;\n}`,
      highlightProp: "border",
    },
    relatedProps: ["border-radius", "outline"],
  },
  {
    id: "min-width",
    property: "min-width",
    category: "box-model",
    shortDescription: "Sets the minimum width — element won't shrink below this.",
    values: [
      { value: "auto", description: "Default minimum (usually 0, but flex items have intrinsic min)." },
      { value: "<length>", description: "Explicit minimum (e.g. 200px)." },
      { value: "0", description: "Allow shrinking to zero — fixes flexbox overflow bugs." },
    ],
    defaultValue: "auto",
    appliesTo: "all elements",
    demo: {
      html: `<div class="container">\n  <div class="item">min-width: 150px</div>\n</div>`,
      css: `.container {\n  width: 100px;\n  background: #f3f4f6;\n  padding: 8px;\n  border-radius: 8px;\n}\n.item {\n  min-width: 150px;\n  padding: 12px;\n  background: #f59e0b;\n  color: #fff;\n  border-radius: 6px;\n  font-weight: 600;\n}`,
      highlightProp: "min-width",
    },
    relatedProps: ["max-width", "width"],
    mnemonicHint: "Flex items default to min-width: auto. Set min-width: 0 to fix text overflow.",
  },
];

// ── Visual ────────────────────────────────────────────────────────────

const visualProperties: CssProperty[] = [
  {
    id: "background",
    property: "background",
    category: "visual",
    shortDescription: "Shorthand for background color, image, position, size, repeat.",
    values: [
      { value: "<color>", description: "Solid background color." },
      { value: "linear-gradient(...)", description: "Gradient background." },
      { value: "url(...)", description: "Background image." },
      { value: "<color> url(...) <position> / <size> <repeat>", description: "Full shorthand." },
    ],
    defaultValue: "transparent",
    appliesTo: "all elements",
    demo: {
      html: `<div class="gradient">Linear gradient</div>`,
      css: `.gradient {\n  background: linear-gradient(135deg, #6366f1, #ec4899);\n  padding: 24px;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n  text-align: center;\n}`,
      highlightProp: "background",
    },
    relatedProps: ["background-color", "background-image"],
  },
  {
    id: "color",
    property: "color",
    category: "visual",
    shortDescription: "Sets the text color (foreground) of an element.",
    values: [
      { value: "<color>", description: "Named, hex, rgb(), hsl(), or oklch() color." },
      { value: "inherit", description: "Inherits from parent." },
      { value: "currentColor", description: "References the current color value (useful for SVGs)." },
    ],
    defaultValue: "inherited from parent",
    appliesTo: "all elements",
    demo: {
      html: `<p class="demo">Color sets text and currentColor for borders/SVGs</p>`,
      css: `.demo {\n  color: #6366f1;\n  border-bottom: 2px solid currentColor;\n  padding: 12px;\n  font-weight: 600;\n  font-size: 16px;\n}`,
      highlightProp: "color",
    },
    relatedProps: ["background-color", "opacity"],
  },
  {
    id: "border-radius",
    property: "border-radius",
    category: "visual",
    shortDescription: "Rounds the corners of an element.",
    values: [
      { value: "<length>", description: "Uniform radius (e.g. 8px)." },
      { value: "<tl> <tr> <br> <bl>", description: "Each corner individually." },
      { value: "50%", description: "Creates a circle (on square elements)." },
      { value: "9999px", description: "Pill shape on rectangles." },
    ],
    defaultValue: "0",
    appliesTo: "all elements",
    demo: {
      html: `<div class="rounded">8px</div>\n<div class="pill">Pill</div>\n<div class="circle"></div>`,
      css: `.rounded { border-radius: 8px; background: #3b82f6; color: #fff; padding: 16px; font-weight: 600; margin-bottom: 8px; display: inline-block; margin-right: 8px; }\n.pill { border-radius: 9999px; background: #8b5cf6; color: #fff; padding: 8px 24px; font-weight: 600; display: inline-block; margin-right: 8px; }\n.circle { border-radius: 50%; background: #ec4899; width: 50px; height: 50px; display: inline-block; }`,
      highlightProp: "border-radius",
    },
    relatedProps: ["border"],
  },
  {
    id: "box-shadow",
    property: "box-shadow",
    category: "visual",
    shortDescription: "Adds shadow effects around an element's frame.",
    values: [
      { value: "<x> <y> <blur> <spread> <color>", description: "Offset, blur, spread, and color." },
      { value: "inset ...", description: "Inner shadow instead of outer." },
      { value: "none", description: "No shadow." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="card">Elevated card</div>`,
      css: `.card {\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n  padding: 24px;\n  border-radius: 12px;\n  background: #fff;\n  font-weight: 600;\n}`,
      highlightProp: "box-shadow",
    },
    relatedProps: ["border-radius", "filter"],
  },
  {
    id: "opacity",
    property: "opacity",
    category: "visual",
    shortDescription: "Sets the transparency level of an element and its children.",
    values: [
      { value: "1", description: "Fully opaque (default)." },
      { value: "0", description: "Fully transparent (still takes space and is clickable)." },
      { value: "0-1", description: "Any value between 0 and 1." },
    ],
    defaultValue: "1",
    appliesTo: "all elements",
    demo: {
      html: `<div class="row">\n  <div class="box" style="opacity: 1">1.0</div>\n  <div class="box" style="opacity: 0.6">0.6</div>\n  <div class="box" style="opacity: 0.3">0.3</div>\n</div>`,
      css: `.row { display: flex; gap: 8px; }\n.box { padding: 16px 24px; background: #6366f1; color: #fff; border-radius: 6px; font-weight: 600; }`,
      highlightProp: "opacity",
    },
    relatedProps: ["visibility"],
    mnemonicHint: "opacity: 0 hides visually but element is still in the layout and clickable.",
  },
  {
    id: "transform",
    property: "transform",
    category: "visual",
    shortDescription: "Applies 2D/3D transformations: translate, rotate, scale, skew.",
    values: [
      { value: "translateX/Y(n)", description: "Move element without affecting layout." },
      { value: "rotate(deg)", description: "Rotate clockwise." },
      { value: "scale(n)", description: "Resize (1 = normal, 2 = double)." },
      { value: "skew(deg)", description: "Skew along X/Y axis." },
      { value: "none", description: "No transform." },
    ],
    defaultValue: "none",
    appliesTo: "transformable elements",
    demo: {
      html: `<div class="row">\n  <div class="box rotate">Rotate 15deg</div>\n  <div class="box scale">Scale 1.2</div>\n</div>`,
      css: `.row { display: flex; gap: 24px; padding: 24px; }\n.box { padding: 16px; background: #3b82f6; color: #fff; border-radius: 6px; font-weight: 600; }\n.rotate { transform: rotate(15deg); }\n.scale { transform: scale(1.2); }`,
      highlightProp: "transform",
    },
    relatedProps: ["transition", "transform-origin"],
    mnemonicHint: "transform doesn't affect layout — neighbors don't move.",
  },
  {
    id: "transition",
    property: "transition",
    category: "visual",
    shortDescription: "Animates property changes over time.",
    values: [
      { value: "<property> <duration> <timing> <delay>", description: "Full shorthand." },
      { value: "all 0.3s ease", description: "Animate all properties over 300ms." },
      { value: "none", description: "No transitions." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">Hover me</div>`,
      css: `.box {\n  padding: 16px 32px;\n  background: #3b82f6;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n  transition: background 0.3s ease, transform 0.3s ease;\n  cursor: pointer;\n  display: inline-block;\n}\n.box:hover {\n  background: #8b5cf6;\n  transform: scale(1.05);\n}`,
      highlightProp: "transition",
    },
    relatedProps: ["transform", "animation"],
  },
  {
    id: "cursor",
    property: "cursor",
    category: "visual",
    shortDescription: "Sets the mouse cursor style when hovering over an element.",
    values: [
      { value: "auto", description: "Browser decides (default)." },
      { value: "pointer", description: "Hand icon — indicates clickable." },
      { value: "grab", description: "Open hand — indicates draggable." },
      { value: "not-allowed", description: "Circle with line — indicates disabled." },
      { value: "text", description: "I-beam — indicates selectable text." },
    ],
    defaultValue: "auto",
    appliesTo: "all elements",
    demo: {
      html: `<div class="row">\n  <button class="btn pointer">pointer</button>\n  <button class="btn grab">grab</button>\n  <button class="btn no">not-allowed</button>\n</div>`,
      css: `.row { display: flex; gap: 8px; }\n.btn { padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; color: #fff; }\n.pointer { cursor: pointer; background: #3b82f6; }\n.grab { cursor: grab; background: #8b5cf6; }\n.no { cursor: not-allowed; background: #6b7280; }`,
      highlightProp: "cursor",
    },
    relatedProps: [],
  },
  {
    id: "outline",
    property: "outline",
    category: "visual",
    shortDescription: "Draws a line outside the border — doesn't affect layout. Used for focus.",
    values: [
      { value: "<width> <style> <color>", description: "Similar to border shorthand." },
      { value: "none", description: "Remove outline (avoid for a11y — provide :focus-visible instead)." },
    ],
    defaultValue: "varies by UA",
    appliesTo: "all elements",
    demo: {
      html: `<button class="btn">Focus me (tab)</button>`,
      css: `.btn {\n  padding: 12px 24px;\n  border: 2px solid #3b82f6;\n  border-radius: 8px;\n  background: #fff;\n  font-weight: 600;\n  font-size: 14px;\n  cursor: pointer;\n}\n.btn:focus-visible {\n  outline: 3px solid #8b5cf6;\n  outline-offset: 2px;\n}`,
      highlightProp: "outline",
    },
    relatedProps: ["border", "outline-offset"],
    mnemonicHint: "outline doesn't take space or affect layout — it overlaps adjacent content.",
  },
  {
    id: "filter",
    property: "filter",
    category: "visual",
    shortDescription: "Applies graphical effects like blur, brightness, contrast to an element.",
    values: [
      { value: "blur(px)", description: "Gaussian blur." },
      { value: "brightness(n)", description: "Adjust brightness (1 = normal)." },
      { value: "grayscale(n)", description: "Convert to grayscale (1 = full)." },
      { value: "drop-shadow(...)", description: "Shadow that follows the element's shape." },
      { value: "none", description: "No filter." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="row">\n  <div class="box blur">blur(3px)</div>\n  <div class="box gray">grayscale(1)</div>\n</div>`,
      css: `.row { display: flex; gap: 12px; }\n.box { padding: 16px; background: #ec4899; color: #fff; border-radius: 6px; font-weight: 600; }\n.blur { filter: blur(3px); }\n.gray { filter: grayscale(1); }`,
      highlightProp: "filter",
    },
    relatedProps: ["opacity", "backdrop-filter"],
  },
];

// ── Typography ────────────────────────────────────────────────────────

const typographyProperties: CssProperty[] = [
  {
    id: "font-size",
    property: "font-size",
    category: "typography",
    shortDescription: "Sets the size of text.",
    values: [
      { value: "<length>", description: "Absolute size (px) or relative (rem, em)." },
      { value: "<percentage>", description: "Relative to parent's font-size." },
      { value: "clamp(min, preferred, max)", description: "Fluid typography between breakpoints." },
    ],
    defaultValue: "medium (16px in most browsers)",
    appliesTo: "all elements",
    demo: {
      html: `<p class="small">14px</p>\n<p class="normal">16px (default)</p>\n<p class="large">clamp(1rem, 2.5vw, 2rem)</p>`,
      css: `.small { font-size: 14px; margin: 4px 0; }\n.normal { font-size: 16px; margin: 4px 0; }\n.large { font-size: clamp(1rem, 2.5vw, 2rem); margin: 4px 0; font-weight: 600; }`,
      highlightProp: "font-size",
    },
    relatedProps: ["line-height", "font-weight"],
    mnemonicHint: "rem = relative to root (html). em = relative to parent. Prefer rem.",
  },
  {
    id: "font-weight",
    property: "font-weight",
    category: "typography",
    shortDescription: "Sets the boldness of text.",
    values: [
      { value: "normal", description: "Same as 400." },
      { value: "bold", description: "Same as 700." },
      { value: "100-900", description: "Numeric scale in increments of 100." },
    ],
    defaultValue: "normal (400)",
    appliesTo: "all elements",
    demo: {
      html: `<p class="light">300 Light</p>\n<p class="normal">400 Normal</p>\n<p class="semibold">600 Semibold</p>\n<p class="bold">700 Bold</p>`,
      css: `.light { font-weight: 300; margin: 4px 0; }\n.normal { font-weight: 400; margin: 4px 0; }\n.semibold { font-weight: 600; margin: 4px 0; }\n.bold { font-weight: 700; margin: 4px 0; }`,
      highlightProp: "font-weight",
    },
    relatedProps: ["font-size"],
  },
  {
    id: "line-height",
    property: "line-height",
    category: "typography",
    shortDescription: "Sets the height of a line box — controls spacing between text lines.",
    values: [
      { value: "normal", description: "Browser default, usually ~1.2." },
      { value: "<number>", description: "Unitless multiplier of font-size (recommended)." },
      { value: "<length>", description: "Fixed height (px, rem)." },
    ],
    defaultValue: "normal",
    appliesTo: "all elements",
    demo: {
      html: `<p class="tight">Tight line-height (1.2). Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>\n<p class="loose">Loose line-height (1.8). Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>`,
      css: `.tight { line-height: 1.2; margin-bottom: 12px; font-size: 14px; }\n.loose { line-height: 1.8; font-size: 14px; }`,
      highlightProp: "line-height",
    },
    relatedProps: ["font-size"],
    mnemonicHint: "Use unitless numbers (1.5, 1.8) — they scale with font-size. Avoid px.",
  },
  {
    id: "text-align",
    property: "text-align",
    category: "typography",
    shortDescription: "Horizontally aligns inline content within a block container.",
    values: [
      { value: "left", description: "Align to the left (default in LTR)." },
      { value: "right", description: "Align to the right." },
      { value: "center", description: "Center the text." },
      { value: "justify", description: "Stretch lines to fill the full width." },
    ],
    defaultValue: "left (in LTR)",
    appliesTo: "block containers",
    demo: {
      html: `<p class="left">Left aligned</p>\n<p class="center">Center aligned</p>\n<p class="right">Right aligned</p>`,
      css: `.left { text-align: left; padding: 8px; background: #f3f4f6; border-radius: 4px; margin-bottom: 4px; }\n.center { text-align: center; padding: 8px; background: #f3f4f6; border-radius: 4px; margin-bottom: 4px; }\n.right { text-align: right; padding: 8px; background: #f3f4f6; border-radius: 4px; }`,
      highlightProp: "text-align",
    },
    relatedProps: ["justify-content"],
    mnemonicHint: "text-align centers text. justify-content/margin:auto center the box itself.",
  },
  {
    id: "text-decoration",
    property: "text-decoration",
    category: "typography",
    shortDescription: "Adds decorative lines to text (underline, strikethrough, etc.).",
    values: [
      { value: "none", description: "No decoration." },
      { value: "underline", description: "Line below text." },
      { value: "line-through", description: "Line through the middle (strikethrough)." },
      { value: "overline", description: "Line above text." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<p><span class="under">Underline</span> | <span class="strike">Strikethrough</span> | <span class="over">Overline</span></p>`,
      css: `.under { text-decoration: underline; text-underline-offset: 3px; }\n.strike { text-decoration: line-through; color: #6b7280; }\n.over { text-decoration: overline; }`,
      highlightProp: "text-decoration",
    },
    relatedProps: ["text-underline-offset"],
  },
  {
    id: "text-transform",
    property: "text-transform",
    category: "typography",
    shortDescription: "Controls text capitalization.",
    values: [
      { value: "none", description: "No change (default)." },
      { value: "uppercase", description: "ALL CAPS." },
      { value: "lowercase", description: "all lowercase." },
      { value: "capitalize", description: "First Letter Of Each Word." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<p class="upper">uppercase text</p>\n<p class="cap">capitalize each word</p>`,
      css: `.upper { text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 4px; }\n.cap { text-transform: capitalize; }`,
      highlightProp: "text-transform",
    },
    relatedProps: [],
  },
  {
    id: "letter-spacing",
    property: "letter-spacing",
    category: "typography",
    shortDescription: "Adjusts the space between characters.",
    values: [
      { value: "normal", description: "Default spacing for the font." },
      { value: "<length>", description: "Additional space (e.g. 0.05em, 1px). Negative = tighter." },
    ],
    defaultValue: "normal",
    appliesTo: "all elements",
    demo: {
      html: `<p class="tight">Tight -0.02em</p>\n<p class="wide">Wide 0.15em</p>`,
      css: `.tight { letter-spacing: -0.02em; font-size: 18px; font-weight: 600; margin-bottom: 4px; }\n.wide { letter-spacing: 0.15em; text-transform: uppercase; font-size: 12px; font-weight: 600; }`,
      highlightProp: "letter-spacing",
    },
    relatedProps: ["word-spacing"],
  },
  {
    id: "white-space",
    property: "white-space",
    category: "typography",
    shortDescription: "Controls how whitespace and line breaks in the source are handled.",
    values: [
      { value: "normal", description: "Collapse whitespace, wrap at container edge (default)." },
      { value: "nowrap", description: "Collapse whitespace, no wrapping." },
      { value: "pre", description: "Preserve whitespace and newlines (like <pre>)." },
      { value: "pre-wrap", description: "Preserve whitespace, but wrap at container edge." },
      { value: "pre-line", description: "Collapse spaces, preserve newlines." },
    ],
    defaultValue: "normal",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">white-space: nowrap truncates long text that would otherwise wrap to the next line</div>`,
      css: `.box {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  width: 250px;\n  padding: 12px;\n  background: #f3f4f6;\n  border-radius: 8px;\n}`,
      highlightProp: "white-space",
    },
    relatedProps: ["overflow", "text-overflow"],
    mnemonicHint: "nowrap + overflow: hidden + text-overflow: ellipsis = truncation pattern.",
  },
];

// ── Animation ─────────────────────────────────────────────────────────

const animationProperties: CssProperty[] = [
  {
    id: "animation",
    property: "animation",
    category: "animation",
    shortDescription: "Shorthand for keyframe-based animations: name, duration, timing, etc.",
    values: [
      { value: "<name> <duration> <timing> <delay> <count> <direction> <fill> <state>", description: "Full shorthand." },
      { value: "none", description: "No animation." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">Bouncing</div>`,
      css: `@keyframes bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-20px); }\n}\n.box {\n  animation: bounce 1s ease-in-out infinite;\n  display: inline-block;\n  padding: 16px 24px;\n  background: #8b5cf6;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n}`,
      highlightProp: "animation",
    },
    relatedProps: ["transition", "animation-timing-function"],
  },
  {
    id: "animation-timing-function",
    property: "animation-timing-function",
    category: "animation",
    shortDescription: "Controls the speed curve of an animation or transition.",
    values: [
      { value: "ease", description: "Slow start, fast middle, slow end (default)." },
      { value: "linear", description: "Constant speed." },
      { value: "ease-in", description: "Slow start." },
      { value: "ease-out", description: "Slow end." },
      { value: "ease-in-out", description: "Slow start and end." },
      { value: "cubic-bezier(x1,y1,x2,y2)", description: "Custom curve." },
    ],
    defaultValue: "ease",
    appliesTo: "all elements",
    demo: {
      html: `<div class="row">\n  <div class="box ease">ease</div>\n  <div class="box linear">linear</div>\n</div>`,
      css: `@keyframes slide {\n  from { transform: translateX(0); }\n  to { transform: translateX(100px); }\n}\n.row { display: flex; flex-direction: column; gap: 8px; }\n.box { display: inline-block; padding: 8px 16px; color: #fff; border-radius: 6px; font-weight: 600; width: fit-content; animation: slide 2s infinite alternate; }\n.ease { animation-timing-function: ease; background: #3b82f6; }\n.linear { animation-timing-function: linear; background: #ec4899; }`,
      highlightProp: "animation-timing-function",
    },
    relatedProps: ["animation", "transition"],
  },
  {
    id: "will-change",
    property: "will-change",
    category: "animation",
    shortDescription: "Hints to the browser which properties will animate — enables GPU compositing.",
    values: [
      { value: "auto", description: "No hint (default)." },
      { value: "transform", description: "Promote to GPU layer for transform animations." },
      { value: "opacity", description: "Promote for opacity animations." },
      { value: "scroll-position", description: "Element will be scrolled." },
    ],
    defaultValue: "auto",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">GPU-accelerated</div>`,
      css: `.box {\n  will-change: transform;\n  transition: transform 0.3s ease;\n  padding: 16px 24px;\n  background: #06b6d4;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n  display: inline-block;\n  cursor: pointer;\n}\n.box:hover {\n  transform: translateY(-4px);\n}`,
      highlightProp: "will-change",
    },
    relatedProps: ["transform", "opacity"],
    mnemonicHint: "Only use will-change on elements that actually animate. Too many = memory waste.",
  },
  {
    id: "animation-fill-mode",
    property: "animation-fill-mode",
    category: "animation",
    shortDescription: "Controls whether animation styles apply before/after the animation runs.",
    values: [
      { value: "none", description: "No styles applied outside animation (default)." },
      { value: "forwards", description: "Element retains final keyframe styles after animation ends." },
      { value: "backwards", description: "Element gets first keyframe styles during delay." },
      { value: "both", description: "Combines forwards and backwards." },
    ],
    defaultValue: "none",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">Fade in (forwards)</div>`,
      css: `@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(10px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n.box {\n  animation: fadeIn 1s ease forwards;\n  padding: 16px 24px;\n  background: #6366f1;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n  display: inline-block;\n}`,
      highlightProp: "animation-fill-mode",
    },
    relatedProps: ["animation"],
    mnemonicHint: "forwards = keep the end state. Without it, element snaps back after animation.",
  },
  {
    id: "animation-delay",
    property: "animation-delay",
    category: "animation",
    shortDescription: "Sets how long to wait before starting the animation.",
    values: [
      { value: "0s", description: "Start immediately (default)." },
      { value: "<time>", description: "Delay in seconds or milliseconds." },
      { value: "negative value", description: "Start partway through the animation." },
    ],
    defaultValue: "0s",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box a">No delay</div>\n<div class="box b">0.5s delay</div>\n<div class="box c">1s delay</div>`,
      css: `@keyframes slideIn {\n  from { transform: translateX(-50px); opacity: 0; }\n  to { transform: translateX(0); opacity: 1; }\n}\n.box { padding: 8px 16px; color: #fff; border-radius: 6px; font-weight: 600; margin-bottom: 6px; animation: slideIn 0.5s ease forwards; opacity: 0; }\n.a { background: #3b82f6; animation-delay: 0s; }\n.b { background: #8b5cf6; animation-delay: 0.5s; }\n.c { background: #ec4899; animation-delay: 1s; }`,
      highlightProp: "animation-delay",
    },
    relatedProps: ["animation", "transition-delay"],
    mnemonicHint: "Negative delay = skip ahead. animation-delay: -0.5s on a 1s animation starts at 50%.",
  },
  {
    id: "animation-iteration-count",
    property: "animation-iteration-count",
    category: "animation",
    shortDescription: "How many times the animation plays.",
    values: [
      { value: "1", description: "Play once (default)." },
      { value: "<number>", description: "Play n times." },
      { value: "infinite", description: "Loop forever." },
    ],
    defaultValue: "1",
    appliesTo: "all elements",
    demo: {
      html: `<div class="box">Pulse (infinite)</div>`,
      css: `@keyframes pulse {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.1); }\n}\n.box {\n  animation: pulse 1.5s ease-in-out infinite;\n  padding: 16px 24px;\n  background: #ec4899;\n  color: #fff;\n  border-radius: 8px;\n  font-weight: 600;\n  display: inline-block;\n}`,
      highlightProp: "animation-iteration-count",
    },
    relatedProps: ["animation", "animation-direction"],
  },
];

// ── Build Categories ──────────────────────────────────────────────────

export const CSS_CATEGORIES: CssCategory[] = [
  {
    id: "flexbox",
    name: "Flexbox",
    icon: "\u2194",
    color: "violet",
    properties: flexboxProperties,
  },
  {
    id: "grid",
    name: "Grid",
    icon: "\u25A6",
    color: "cyan",
    properties: gridProperties,
  },
  {
    id: "positioning",
    name: "Positioning",
    icon: "\u271B",
    color: "orange",
    properties: positioningProperties,
  },
  {
    id: "box-model",
    name: "Box Model",
    icon: "\u25A1",
    color: "blue",
    properties: boxModelProperties,
  },
  {
    id: "visual",
    name: "Visual",
    icon: "\u25C9",
    color: "crimson",
    properties: visualProperties,
  },
  {
    id: "typography",
    name: "Typography",
    icon: "Aa",
    color: "indigo",
    properties: typographyProperties,
  },
  {
    id: "animation",
    name: "Animation",
    icon: "\u25B6",
    color: "grass",
    properties: animationProperties,
  },
];

/** All CSS properties in a flat array */
export const ALL_CSS_PROPERTIES: CssProperty[] = CSS_CATEGORIES.flatMap(
  (cat) => cat.properties,
);

/** Look up a property by id */
export function getCssProperty(id: string): CssProperty | undefined {
  return ALL_CSS_PROPERTIES.find((p) => p.id === id);
}

/** Get all properties in a category */
export function getCategoryProperties(categoryId: string): CssProperty[] {
  return CSS_CATEGORIES.find((c) => c.id === categoryId)?.properties ?? [];
}

/** Get category metadata by id */
export function getCategory(categoryId: string): CssCategory | undefined {
  return CSS_CATEGORIES.find((c) => c.id === categoryId);
}
