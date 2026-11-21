// Opens Neovim in a pane to the right, in the focused pane's folder. For a Claude
// Code pane, in the project of the last file Claude edited (see folder.mjs).
// Bound in keys.json as "mod.open:nvim-here"; it closes itself right away.
import { View, div } from "gpui-kit";
import { exec, focused, panes, props, run, closeOverlay, notify, appHome } from "herdr";

export default class NvimHere extends View {
  init(_props, cx) {
    cx.spawn(async () => {
      try {
        const f = focused();
        const pane = panes().find((p) => p.pane === f?.pane);
        const cwd = f?.cwd ?? pane?.cwd;
        if (!cwd) throw new Error("no sé en qué carpeta está este panel");
        const claude = pane?.app === "claude-code" || pane?.program?.key === "claude";
        const script = `${appHome()}/mods/nvim-here/folder.mjs`;
        const out = await exec("node", [script, cwd, claude ? "claude" : "plain"]);
        const folder = out.code === 0 && out.stdout.trim() ? out.stdout.trim() : cwd;
        run("terminal.open", { argv: ["nvim"], folder, place: "right" });
      } catch (e) {
        notify({ title: "Neovim aquí", level: "error", body: String(e?.message ?? e) });
      } finally {
        const overlay = props()?.overlay;
        if (overlay) closeOverlay(overlay);
      }
    });
  }

  render() {
    return div();
  }
}
