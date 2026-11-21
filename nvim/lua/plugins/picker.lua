-- Herdr takes Alt+H (move to left pane) before Neovim sees it, so the picker's
-- "toggle hidden files" moves to Alt+. (dotfiles start with a dot).
return {
  "folke/snacks.nvim",
  opts = {
    picker = {
      win = {
        input = { keys = { ["<a-.>"] = { "toggle_hidden", mode = { "i", "n" } } } },
        list = { keys = { ["<a-.>"] = "toggle_hidden" } },
      },
    },
  },
}
