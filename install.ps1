# Windows setup: installs the tools with Scoop and links this repo's config into place.
# Run from PowerShell 7:  pwsh -File .\install.ps1            (add -SkipPackages to only link)
# Existing config is moved to "<path>.backup-<date>" before linking; nothing is deleted.
param([switch]$SkipPackages)
$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Link-Item([string]$Source, [string]$Target, [switch]$Dir) {
  $Source = (Resolve-Path (Join-Path $Repo $Source)).Path
  if (Test-Path -LiteralPath $Target) {
    $item = Get-Item -LiteralPath $Target -Force
    if ($item.LinkType -and (@($item.Target) -contains $Source)) { Write-Host "ok     $Target"; return }
    Move-Item -LiteralPath $Target "$Target.backup-$Stamp"
    Write-Host "backup $Target -> $Target.backup-$Stamp"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
  if ($Dir) {
    # Junctions need no admin rights or Developer Mode.
    New-Item -ItemType Junction -Path $Target -Target $Source | Out-Null
    Write-Host "link   $Target"
  } else {
    try {
      New-Item -ItemType SymbolicLink -Path $Target -Target $Source -ErrorAction Stop | Out-Null
      Write-Host "link   $Target"
    } catch {
      Copy-Item -LiteralPath $Source $Target
      Write-Warning "copied $Target (file links need Developer Mode: Settings > System > For developers). Re-run after enabling it, or copy changes back to the repo by hand."
    }
  }
}

if (-not $SkipPackages) {
  if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) { throw "Install Scoop first: https://scoop.sh" }
  scoop bucket add extras 2>$null
  scoop bucket add nerd-fonts 2>$null
  # gcc compiles Treesitter parsers; tree-sitter is its CLI.
  scoop install neovim lazygit ripgrep fd fzf tree-sitter gcc nerd-fonts/JetBrainsMono-NF
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { scoop install nodejs-lts }
}

Link-Item 'nvim' "$env:LOCALAPPDATA\nvim" -Dir
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { "$HOME\.config\herdr-app" }
Link-Item 'herdr-app\keys.json' "$HerdrHome\keys.json"
Link-Item 'herdr-app\mods\nvim-here' "$HerdrHome\mods\nvim-here" -Dir
Link-Item 'herdr-app\mods\split-left' "$HerdrHome\mods\split-left" -Dir

node "$Repo\claude\install-statusline.js"

if (-not $SkipPackages) {
  & "$Repo\scripts\nvim-bootstrap.ps1"
}
Write-Host "`nDone. Open a new terminal, then run: nvim ."
