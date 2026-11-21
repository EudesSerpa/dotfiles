#!/usr/bin/env bash
# macOS setup: installs the tools with Homebrew and links this repo's config into place.
# Run:  ./install.sh            (add --skip-packages to only link)
# Existing config is moved to "<path>.backup-<date>" before linking; nothing is deleted.
set -euo pipefail
REPO="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
SKIP_PACKAGES=false
[ "${1:-}" = "--skip-packages" ] && SKIP_PACKAGES=true

link() {
  local src="$REPO/$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then echo "ok     $dst"; return; fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then mv "$dst" "$dst.backup-$STAMP"; echo "backup $dst -> $dst.backup-$STAMP"; fi
  ln -s "$src" "$dst"
  echo "link   $dst"
}

if [ "$SKIP_PACKAGES" = false ]; then
  if ! command -v brew >/dev/null 2>&1; then echo "Install Homebrew first: https://brew.sh" >&2; exit 1; fi
  # The Command Line Tools bring the C compiler Treesitter needs.
  xcode-select -p >/dev/null 2>&1 || xcode-select --install
  brew bundle --file "$REPO/Brewfile"
fi

link nvim "$HOME/.config/nvim"
HERDR_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
link herdr-app/keys.json "$HERDR_HOME/keys.json"
link herdr-app/mods/nvim-here "$HERDR_HOME/mods/nvim-here"
link herdr-app/mods/split-left "$HERDR_HOME/mods/split-left"
node "$REPO/claude/install-statusline.js"

if [ "$SKIP_PACKAGES" = false ]; then
  TOOLS="vtsls eslint-lsp tailwindcss-language-server json-lsp pyright ruff dockerfile-language-server docker-compose-language-service hadolint marksman markdownlint-cli2 markdown-toc prettier yaml-language-server taplo lua-language-server stylua shfmt"
  nvim --headless "+Lazy! restore" +qa
  nvim --headless "+Lazy! load mason.nvim" "+MasonInstall $TOOLS" +qa
fi
echo
echo "Done. Open a new terminal, then run: nvim ."
