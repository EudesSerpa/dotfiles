# dotfiles

Mi entorno de trabajo: **Herdr** (terminal para agentes), **Neovim con LazyVim** y Claude Code. El mismo repo sirve para Windows y macOS.

## Qué hay aquí

| Carpeta | Qué es | Se enlaza en (Windows) | Se enlaza en (macOS) |
|---|---|---|---|
| `nvim/` | LazyVim: TypeScript, Tailwind, ESLint, Prettier, Python, Docker, Vitest, tema oxocarbon, neo-tree y minimapa | `%LOCALAPPDATA%\nvim` | `~/.config/nvim` |
| `herdr-app/keys.json` | Atajos de Herdr | `~/.config/herdr-app/keys.json` | igual |
| `herdr-app/mods/nvim-here` | `Ctrl+Shift+E`: Neovim en el proyecto del panel (en un Claude, el del último archivo que editó) | `~/.config/herdr-app/mods/` | igual |
| `herdr-app/mods/split-left` | `Ctrl+Shift+A`: dividir el panel a la izquierda | `~/.config/herdr-app/mods/` | igual |
| `claude/statusline.mjs` | Status line de Claude Code: cuenta, ruta, rama, modelo, contexto y cuota 5h/7d | `statusLine` en `~/.claude/settings.json` | igual |

### Status line de Claude Code

```
motosmart.col@gmail.com  …/matriculas/frontend  ⎇ develop
Opus 5.5  ctx 19% 191k/1M  5h ────── 1%  (22:11 · 4h43m)  7d ━━━─── 42%  (Sun 19:51 · 1d2h)
```

- **Fila 1:** cuenta con la sesión iniciada, ruta, rama con `↑` / `↓` commits por delante o por detrás, y `⇅remote` bajo Remote Control.
- **Fila 2:** modelo, contexto usado y cuota de 5 horas y 7 días, con la hora de reinicio y cuánto falta.
- Se adapta al ancho de la terminal: usa versiones más cortas de cada parte y, si la cuota no cabe, la pasa a su propia fila.

`settings.json` no se versiona, porque también guarda permisos. `claude/install-statusline.js` escribe ahí solo la clave `statusLine`, con la ruta de este repo, y deja un respaldo en `settings.json.bak`. Los instaladores lo ejecutan.

`nvim/lazy-lock.json` fija la versión de cada plugin, así ambas máquinas usan exactamente las mismas.

## Instalar

### Windows

Requisitos: [Scoop](https://scoop.sh), Git y PowerShell 7.

```powershell
git clone <url-del-repo> $HOME\dotfiles
cd $HOME\dotfiles
pwsh -File .\install.ps1
```

Para enlazar `keys.json` como archivo, Windows necesita el **Modo de desarrollador** (Configuración > Sistema > Para desarrolladores). Sin él, el script lo copia y te avisa. Las carpetas se enlazan siempre: usan junctions, que no necesitan permisos.

### macOS

Requisitos: [Homebrew](https://brew.sh) y Git.

1. Instala la app de Herdr desde [herdr.dev](https://herdr.dev) y ábrela una vez.
2. Clona y ejecuta:

```bash
git clone <url-del-repo> ~/dotfiles
cd ~/dotfiles
./install.sh
```

3. Elige **JetBrainsMono Nerd Font** en Herdr si no la toma sola.
4. Revisa los atajos con Alt/Option (`Alt+H/J/K/L`, `Alt+1…9`): en macOS, Option escribe caracteres especiales y puede que haya que ajustarlos.

### Qué hacen los scripts

1. Instalan las herramientas: neovim, lazygit, ripgrep, fd, fzf, tree-sitter, un compilador de C, Node y la fuente.
2. Mueven la configuración que ya existía a `<ruta>.backup-<fecha>`. No borran nada.
3. Enlazan las carpetas de este repo en su lugar.
4. Instalan los plugins de Neovim y los servidores de lenguaje (Mason).

Se pueden ejecutar varias veces: lo que ya está enlazado lo dejan igual. Con `-SkipPackages` (Windows) o `--skip-packages` (macOS) solo enlazan.

## Día a día

Como la configuración está enlazada, cambiar algo en Neovim o Herdr cambia el archivo del repo.

```bash
cd ~/dotfiles
git add -A && git commit -m "describe el cambio" && git push   # en la máquina donde cambiaste algo
git pull                                                       # en la otra
```

Si agregas un plugin nuevo, en la otra máquina abre Neovim y ejecuta `:Lazy restore`.

## Lo que no va en el repo

- Plugins y servidores descargados: se instalan solos desde `lazy-lock.json` y Mason.
- Tokens, `~/.claude.json`, `.env` y cualquier otro secreto.
- Lo que Herdr genera (`gpui-kit.d.ts`, `jsconfig.json`): está en `.gitignore`.
