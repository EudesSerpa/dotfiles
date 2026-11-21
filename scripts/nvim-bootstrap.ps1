# Installs the plugin versions pinned in nvim/lazy-lock.json and the language servers,
# so the first real launch is ready. Mason has to be loaded first because it is lazy.
$Tools = 'vtsls eslint-lsp tailwindcss-language-server json-lsp pyright ruff dockerfile-language-server docker-compose-language-service hadolint marksman markdownlint-cli2 markdown-toc prettier yaml-language-server taplo lua-language-server stylua shfmt'
nvim --headless '+Lazy! restore' +qa
nvim --headless '+Lazy! load mason.nvim' "+MasonInstall $Tools" +qa
