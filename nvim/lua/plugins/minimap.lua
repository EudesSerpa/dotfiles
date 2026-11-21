-- Minimap from fazt/dotfiles: opens by itself on code files, closes on panels and pickers.
return {
  "nvim-mini/mini.map",
  event = "VeryLazy",
  config = function()
    local map = require("mini.map")
    map.setup({
      integrations = {
        map.gen_integration.builtin_search(),
        map.gen_integration.diagnostic(),
        map.gen_integration.gitsigns(),
      },
      symbols = { encode = map.gen_encode_symbols.dot("4x2") },
      window = { width = 10, winblend = 50 },
    })
    vim.keymap.set("n", "<leader>mo", map.toggle, { desc = "Toggle minimap" })
    vim.keymap.set("n", "<leader>mf", map.toggle_focus, { desc = "Focus minimap" })
    vim.keymap.set("n", "<leader>mr", map.refresh, { desc = "Refresh minimap" })

    local excluded = {
      [""] = true, ["snacks_dashboard"] = true, ["snacks_picker_input"] = true, ["snacks_picker_list"] = true,
      ["snacks_notif"] = true, ["neo-tree"] = true, ["lazy"] = true, ["mason"] = true, ["help"] = true,
      ["qf"] = true, ["checkhealth"] = true, ["man"] = true, ["noice"] = true, ["trouble"] = true,
      ["which-key"] = true, ["lazygit"] = true,
    }
    local function should_show()
      local buf = vim.api.nvim_get_current_buf()
      if vim.bo[buf].buftype ~= "" or excluded[vim.bo[buf].filetype] then return false end
      if vim.api.nvim_win_get_config(0).relative ~= "" then return false end -- floating windows
      return vim.api.nvim_buf_get_name(buf) ~= ""
    end
    local function sync()
      vim.schedule(function()
        if should_show() then map.open() else map.close() end
      end)
    end
    vim.api.nvim_create_autocmd({ "BufEnter", "BufWinEnter", "FileType" }, {
      group = vim.api.nvim_create_augroup("MiniMapAutoToggle", { clear = true }),
      callback = sync,
    })
    sync() -- the file opened at startup entered before this plugin loaded
  end,
}
