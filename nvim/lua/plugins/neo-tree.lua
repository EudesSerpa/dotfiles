-- Neo-tree setup from fazt/dotfiles on top of LazyVim's editor.neo-tree extra:
-- source tabs (files / buffers / git), show hidden and gitignored files, darker panel.
return {
  "nvim-neo-tree/neo-tree.nvim",
  opts = {
    source_selector = {
      winbar = true,
      sources = {
        { source = "filesystem" },
        { source = "buffers" },
        { source = "git_status" },
      },
    },
    default_component_configs = {
      indent = { indent_size = 2, padding = 1, with_markers = true, indent_marker = "│", last_indent_marker = "└" },
    },
    window = { width = 30 },
    filesystem = {
      filtered_items = { visible = true, hide_dotfiles = false, hide_gitignored = false },
    },
  },
  config = function(_, opts)
    require("neo-tree").setup(opts)
    local bg = "#0a0a0a"
    local function set_dark()
      for _, group in ipairs({ "NeoTreeNormal", "NeoTreeNormalNC", "NeoTreeEndOfBuffer", "NeoTreeStatusLine" }) do
        vim.api.nvim_set_hl(0, group, { bg = bg })
      end
      vim.api.nvim_set_hl(0, "NeoTreeWinSeparator", { bg = bg, fg = bg })
    end
    set_dark()
    vim.api.nvim_create_autocmd("ColorScheme", { callback = set_dark })
  end,
}
