# VHS documentation
#
# You can view all VHS documentation on the command line with `vhs manual`.
# Or see https://github.com/charmbracelet/vhs#vhs-command-reference

# Output file
Output assets/bunup-demo.gif

# The tools we will use
Require bunx

# === Scene ====
Set Width 2000
Set Height 960

Set CursorBlink false

Set Theme { "name": "Carbonfox", "black": "#282828", "red": "#ee5396", "green": "#25be6a", "yellow": "#08bdba", "blue": "#78a9ff", "magenta": "#be95ff", "cyan": "#33b1ff", "white": "#dfdfe0", "brightBlack": "#484848", "brightRed": "#f16da6", "brightGreen": "#46c880", "brightYellow": "#2dc7c4", "brightBlue": "#8cb6ff", "brightMagenta": "#c8a5ff", "brightCyan": "#52bdff", "brightWhite": "#e4e4e5", "background": "#161616", "foreground": "#f2f4f8", "selection": "#2a2a2a", "cursor": "#b6b8bb" }

Set FontSize 32

# Terminal settings
Set Shell 'bash'

# Terminal prompt. It looks like '● mycommand ...'
Env PS1 '\e[0;32m●\e[0m '

# ===== Actions =====

Sleep 2s
Type@200ms 'bunx bunup'
Sleep 3s
Enter
Sleep 10s
