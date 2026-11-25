// The company logo (Options › Logo, shown by over9k-footer's header). A picked
// image is copied into Herdr's home under LOGO_DIR (outside the mods, so an
// install keeps it), with a new name each time so the header loads it afresh.
// It shows in the Herdr icon's place and as high (LOGO_H), at most LOGO_W wide.
// Saved as logo: { light, dark }, each { path, aspect, layers? } (paths from
// Herdr's home). over9k-footer draws it the same way (logoView there too).
import { div, svg, image } from "gpui-kit";
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

export const LOGO_DIR = "over9k-logo";
const LOGO_H = 20, LOGO_W = 110, TYPES = ["svg", "png", "jpg", "jpeg"];

// $1 the file (~ for home), $2 where the copy goes: copies it, then prints the
// size `file` gives a PNG or JPEG ("164 x 57"; a JPEG's last one is its size).
const COPY = `case "$1" in "~") f=$HOME ;; "~/"*) f="$HOME/\${1#"~/"}" ;; *) f=$1 ;; esac
[ -f "$f" ] || { echo "There's no file at $1"; exit 2; }
mkdir -p "$(dirname "$2")" && cp "$f" "$2" || exit 1
file -b "$2" 2>/dev/null | grep -o '[0-9][0-9]* *x *[0-9][0-9]*' | tail -n 1`;

const root = () => appHome().replace(/\\/g, "/");

// How big a logo shows: LOGO_H high, unless that's wider than LOGO_W.
export function logoSize(aspect) {
  const a = aspect > 0 ? aspect : 1, w = Math.min(LOGO_W, Math.round(LOGO_H * a));
  return { w, h: Math.round(w / a) };
}

// The logo, drawn: its colour layers stacked (each an svg(), tinted; a
// "currentColor" one in the theme's text colour), else the image.
export function logoView(logo, t) {
  const { w, h } = logoSize(logo.aspect);
  if (!logo.layers?.length) return image(logo.path).w(w).h(h).flex_none();
  return div().relative().w(w).h(h).flex_none().children(logo.layers.map((l) =>
    svg(l.path).absolute().inset_0().w(w).h(h).text_color(l.color === "currentColor" ? t.foreground : l.color)));
}

// An SVG's shape (its viewBox, else its width and height), and the SVG again
// with a size in pixels on its <svg>; null when it has none. Herdr draws an SVG
// image() at that size and scales it without smoothing, so it gets exactly the
// size it shows at (at the viewBox's size, or twice, it looks jagged).
function svgShape(text) {
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const vb = tag.match(/\sviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const attr = (name) => Number(tag.match(new RegExp(`\\s${name}\\s*=\\s*["']\\s*([\\d.]+)(px)?\\s*["']`, "i"))?.[1]) || 0;
  const w = vb ? Number(vb[1]) : attr("width"), h = vb ? Number(vb[2]) : attr("height");
  if (!(w > 0 && h > 0)) return null;
  const sized = (from, pw, ph) => from.replace(/<svg\b[^>]*>/i, (t) => t.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/<svg\b/i, `<svg width="${pw}" height="${ph}"${vb ? "" : ` viewBox="0 0 ${w} ${h}"`}`));
  return { aspect: w / h, sized };
}

// A flat-colour logo, split: one SVG per fill colour, that colour's shapes
// filled and the rest not. An image() blends its edges into dark fringes (thin
// light strokes on a dark theme look grey and ragged); an svg() is a clean
// one-colour mask drawn at the screen's resolution. null when it can't be split
// safely: gradients, patterns, masks, clips, filters, <use>, embedded images,
// text, CSS (style), opacity, strokes, a colour it can't read, or over 8 colours.
const NAMED = { white: "#ffffff", black: "#000000" };
function colour(v) {
  v = v.trim().toLowerCase();
  if (v === "none" || v === "transparent") return "none";
  if (v === "currentcolor") return "currentColor";
  if (NAMED[v]) return NAMED[v];
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return "#" + [...v.slice(1)].map((c) => c + c).join("");
  return null;
}
function svgLayers(text) {
  if (/<(style|linearGradient|radialGradient|pattern|mask|clipPath|filter|use|image|text)\b/i.test(text)) return null;
  if (/\s(style|opacity|fill-opacity)\s*=/i.test(text) || /\sstroke\s*=\s*["'](?!\s*none)/i.test(text)) return null;
  const fillOf = (attrs) => attrs.match(/\sfill\s*=\s*["']([^"']*)["']/i)?.[1];
  const inherited = ["#000000"]; // what a shape gets without its own fill (SVG's default: black)
  const shapes = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g;
  for (let m; (m = re.exec(text)); ) {
    const [tag, close, name, attrs, self] = m, own = fillOf(attrs);
    const group = /^(svg|g|a|switch)$/i.test(name);
    if (close) { if (group) inherited.pop(); continue; }
    if (group) { if (!self) inherited.push(own != null ? colour(own) : inherited.at(-1)); continue; }
    if (!/^(path|rect|circle|ellipse|polygon|polyline|line)$/i.test(name)) continue;
    const fill = own != null ? colour(own) : inherited.at(-1);
    if (fill === null) return null;
    shapes.push({ at: m.index, tag, fill });
  }
  const colours = [...new Set(shapes.map((s) => s.fill).filter((f) => f !== "none"))];
  if (colours.length === 0 || colours.length > 8) return null;
  const refill = (s, on) => s.tag.replace(/\sfill\s*=\s*("[^"]*"|'[^']*')/i, "").replace(/^<([\w:-]+)/, `<$1 fill="${on ? "#000000" : "none"}"`);
  return colours.map((c) => ({
    color: c,
    text: shapes.reduceRight((t, s) => t.slice(0, s.at) + refill(s, s.fill === c) + t.slice(s.at + s.tag.length), text),
  }));
}

// A picked file (~ for home) as the slot's logo: copied in, an SVG given the
// size it shows at and split into colour layers where it can be. Resolves
// { logo } or { error } (why, for under the chooser).
export async function makeLogo(slot, file) {
  const ext = (file.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  if (!TYPES.includes(ext)) return { error: "Pick an SVG, PNG or JPEG." };
  const stem = `${LOGO_DIR}/${slot}-${Date.now()}`, path = `${stem}.${ext}`, abs = `${root()}/${path}`;
  const r = await exec("sh", ["-c", COPY, "sh", file, abs]).catch((e) => ({ code: 1, stdout: String(e) }));
  if (r?.code !== 0) return { error: (r?.stdout || r?.stderr || "").trim() || "Couldn't copy it." };
  if (ext !== "svg") {
    const m = r.stdout.match(/(\d+)\s*x\s*(\d+)/);
    return { logo: { path, aspect: m && Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : 1 } };
  }
  const text = await readTextFile(abs).catch(() => null);
  const shape = text && svgShape(text);
  if (!shape) { dropLogo({ path }); return { error: "That SVG has no size (a viewBox, or width and height)." }; }
  const { w, h } = logoSize(shape.aspect);
  await writeTextFile(abs, shape.sized(text, w, h), text).catch(() => null);
  const layers = [];
  for (const [i, l] of (svgLayers(text) ?? []).entries()) {
    const p = `${stem}-${i + 1}.svg`;
    await writeTextFile(`${root()}/${p}`, shape.sized(l.text, w, h), null).catch(() => null);
    layers.push({ path: p, color: l.color });
  }
  return { logo: { path, aspect: shape.aspect, ...(layers.length ? { layers } : {}) } };
}

// A logo's copies, gone (Remove, or a new one in its slot).
export function dropLogo(logo) {
  const files = [logo?.path, ...(logo?.layers ?? []).map((l) => l.path)].filter(Boolean).map((p) => `${root()}/${p}`);
  if (files.length) exec("sh", ["-c", 'rm -f "$@"', "sh", ...files]).catch(() => null);
}
