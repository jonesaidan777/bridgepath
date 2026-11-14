// Minimal single-font PDF writer for the resume preview download. No dependencies:
// standard Times fonts with WinAnsi encoding, word-wrapped text, multi-page.

export interface ResumeEntry { heading: string; date?: string; bullets: string[] }
export interface ResumeSection { title: string; entries?: ResumeEntry[]; text?: string; bullets?: string[] }
export interface ResumeModel { name: string; contact: string; sections: ResumeSection[] }

const PAGE_W = 612, PAGE_H = 792, MARGIN = 54;
const WIN_ANSI: Record<string, number> = {
  "–": 0x96, "—": 0x97, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "•": 0x95, "·": 0xb7, "…": 0x85,
};

function encode(text: string) {
  let out = "";
  for (const char of text) {
    const code = WIN_ANSI[char] ?? char.charCodeAt(0);
    const safe = code > 255 ? 63 : code; // "?" for anything outside WinAnsi
    const c = String.fromCharCode(safe);
    out += c === "(" || c === ")" || c === "\\" ? `\\${c}` : c;
  }
  return out;
}
// Times averages under ~0.5em per character; 0.5 keeps wrapping safe.
const fits = (text: string, size: number, width: number) => text.length * size * 0.5 <= width;
function wrap(text: string, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next, size, width) || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export function buildResumePdf(model: ResumeModel): Blob {
  const pages: string[][] = [[]];
  let y = PAGE_H - MARGIN;
  const ops = () => pages[pages.length - 1];
  const need = (height: number) => {
    if (y - height < MARGIN) { pages.push([]); y = PAGE_H - MARGIN; }
  };
  const text = (value: string, x: number, size: number, bold = false) =>
    ops().push(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${encode(value)}) Tj ET`);
  const textRight = (value: string, size: number) =>
    text(value, PAGE_W - MARGIN - value.length * size * 0.5, size);
  const width = PAGE_W - MARGIN * 2;

  need(40);
  text(model.name, PAGE_W / 2 - model.name.length * 22 * 0.27, 22, true);
  y -= 18;
  text(model.contact, PAGE_W / 2 - model.contact.length * 10 * 0.25, 10);
  y -= 22;
  for (const section of model.sections) {
    need(30);
    text(section.title.toUpperCase(), MARGIN, 11, true);
    y -= 5;
    ops().push(`${MARGIN} ${y.toFixed(1)} m ${PAGE_W - MARGIN} ${y.toFixed(1)} l 0.8 w S`);
    y -= 14;
    if (section.text) for (const line of wrap(section.text, 10, width)) { need(14); text(line, MARGIN, 10); y -= 14; }
    for (const bullet of section.bullets ?? []) {
      wrap(bullet, 10, width - 14).forEach((line, index) => {
        need(13);
        if (index === 0) text("•", MARGIN + 2, 10);
        text(line, MARGIN + 14, 10);
        y -= 13;
      });
    }
    for (const entry of section.entries ?? []) {
      need(16);
      const date = entry.date ?? "";
      const headingLines = wrap(entry.heading, 10, width - (date ? date.length * 5 + 16 : 0));
      headingLines.forEach((line, index) => {
        need(14); text(line, MARGIN, 10, true);
        if (index === 0 && date) textRight(date, 10);
        y -= 14;
      });
      for (const bullet of entry.bullets) {
        wrap(bullet, 10, width - 14).forEach((line, index) => {
          need(13);
          if (index === 0) text("•", MARGIN + 2, 10);
          text(line, MARGIN + 14, 10);
          y -= 13;
        });
      }
      y -= 6;
    }
    y -= 6;
  }

  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalog = add(""), pagesId = add("");
  const font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>");
  const font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds = pages.map(pageOps => {
    const stream = pageOps.join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Every character is already a single byte (WinAnsi), so latin1 bytes keep offsets exact.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}
