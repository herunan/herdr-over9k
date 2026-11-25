// A file chooser for Options › Logo: type a path (~ for home), or Browse… for
// the system's file picker (macOS, Windows, or zenity / kdialog on Linux), which
// uses the file at once. Use (or Enter) hands the typed path on. Shows why when
// the file couldn't be used (error, set by whoever got it).
import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { exec, window } from "herdr";

// The system's picker for an image: prints the chosen file, nothing when cancelled.
const BROWSE = {
  macos: ["osascript", ["-e", 'POSIX path of (choose file with prompt "Choose a logo" of type {"public.svg-image", "public.png", "public.jpeg"})']],
  windows: ["powershell", ["-NoProfile", "-STA", "-Command",
    "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = 'Choose a logo'; $d.Filter = 'Images (*.svg, *.png, *.jpg)|*.svg;*.png;*.jpg;*.jpeg'; if ($d.ShowDialog() -eq 'OK') { $d.FileName }"]],
  linux: ["sh", ["-c", 'zenity --file-selection --title="Choose a logo" --file-filter="Images | *.svg *.png *.jpg *.jpeg" 2>/dev/null || kdialog --title "Choose a logo" --getopenfilename "$HOME" "*.svg *.png *.jpg *.jpeg" 2>/dev/null']],
};

export class FilePick {
  // `done(path, cx)` runs on Enter, Use, or a file picked with Browse…; `home` turns this computer's home into ~.
  constructor({ value, home = null, done }) {
    this.home = home;
    this.done = done;
    this.error = null;
    this.input = InputState.new({ value: value || "", placeholder: "~/Downloads/logo.svg" });
    this.input.on("submit", (_e, cx) => this.use(cx));
    this.input.on("change", () => { this.error = null; });
    this.input.focus();
  }

  path() {
    return this.input.value().trim();
  }

  use(cx) {
    const p = this.path();
    if (p) this.done(p, cx);
    cx.notify();
  }

  tilde(f) {
    return this.home && f.startsWith(this.home + "/") ? `~${f.slice(this.home.length)}` : f;
  }

  browse(cx) {
    const [cmd, args] = BROWSE[window()?.platform] ?? BROWSE.linux;
    cx.spawn(async (cx) => {
      const r = await exec(cmd, args).catch(() => null);
      const f = r?.code === 0 ? r.stdout.trim() : "";
      if (!f) return;
      this.input.set_value(this.tilde(f));
      this.use(cx);
    });
  }

  view(t) {
    const button = (id, text, primary, fn) => h_flex().id(id).h(28).px(9).flex_none().rounded(6).items_center().cursor_pointer()
      .border_1().border_color(primary ? t.solid : t.input).bg(primary ? t.solid : t.raised)
      .text_size(12).text_color(primary ? t.solid_foreground : t.foreground).hover((s) => s.opacity(0.88))
      .on_click((_e, cx) => fn(cx)).child(text);
    return v_flex().flex_none().gap(6)
      .child(h_flex().gap(6).items_center()
        .child(Input.new(this.input).flex_1().h(28).px(8).rounded(6).border_1().border_color(t.accent).bg(t.background).text_size(12.5))
        .child(button("logo-browse", "Browse…", false, (cx) => this.browse(cx)))
        .child(button("logo-use", "Use", true, (cx) => this.use(cx))))
      .when(Boolean(this.error), (el) => el.child(div().px(2).text_size(11.5).text_color(t.ansi1).child(this.error ?? "")));
  }
}
