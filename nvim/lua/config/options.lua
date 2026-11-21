-- Options are automatically loaded before lazy.nvim startup
-- Default options: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua

local opt = vim.opt

-- Windows: use PowerShell 7 for :terminal and :!cmd
if vim.fn.has("win32") == 1 and vim.fn.executable("pwsh") == 1 then
  opt.shell = "pwsh"
  opt.shellcmdflag = "-NoLogo -NoProfile -ExecutionPolicy RemoteSigned -Command [Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;"
  opt.shellredir = '2>&1 | Out-File -Encoding UTF8 %s; exit $LastExitCode'
  opt.shellpipe = '2>&1 | Out-File -Encoding UTF8 %s; exit $LastExitCode'
  opt.shellquote = ""
  opt.shellxquote = ""
end

opt.relativenumber = true
opt.wrap = false
opt.scrolloff = 8

-- The project uses ESLint + Prettier: let Prettier format, ESLint fix on save
vim.g.lazyvim_prettier_needs_config = true
vim.g.lazyvim_eslint_auto_format = true
