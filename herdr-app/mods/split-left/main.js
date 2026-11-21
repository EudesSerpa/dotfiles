// Splits the focused pane to the left: Herdr only splits right or down, so split
// right and swap the new pane (which takes focus) into the left spot.
// Bound in keys.json as "mod.open:split-left"; it closes itself right away.
import { View, div } from "gpui-kit";
import { focused, props, run, closeOverlay, notify } from "herdr";

export default class SplitLeft extends View {
  init() {
    try {
      const pane = focused()?.pane;
      if (!pane) throw new Error("no hay un panel con foco");
      run("pane.split", { direction: "right", pane });
      run("pane.swap", { direction: "left" });
    } catch (e) {
      notify({ title: "Dividir a la izquierda", level: "error", body: String(e?.message ?? e) });
    } finally {
      const overlay = props()?.overlay;
      if (overlay) closeOverlay(overlay);
    }
  }

  render() {
    return div();
  }
}
