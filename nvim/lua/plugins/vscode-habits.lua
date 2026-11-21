-- Small additions to make the jump from VSCode easier
return {
  -- Vitest adapter for the test.core extra (<leader>tt run file, <leader>tr nearest)
  { "nvim-neotest/neotest", dependencies = { "marilari88/neotest-vitest" }, opts = { adapters = { "neotest-vitest" } } },
}
