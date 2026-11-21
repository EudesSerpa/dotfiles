-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
local map = vim.keymap.set

-- VSCode muscle memory
map({ "n", "i", "v" }, "<C-s>", "<cmd>w<cr><esc>", { desc = "Save file" })
map("n", "<C-p>", function() LazyVim.pick("files")() end, { desc = "Find files" })
map("n", "<C-b>", "<leader>fe", { remap = true, desc = "Toggle explorer (Neo-tree)" })
map("n", "<C-`>", function() Snacks.terminal() end, { desc = "Toggle terminal" })
map("t", "<C-`>", "<cmd>close<cr>", { desc = "Hide terminal" })
