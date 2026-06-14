# Resources for Capacitor

Place the following files here before running `npx @capacitor/assets generate`:

- `icon.png` — 1024x1024px PNG, sem transparência (fundo sólido)
- `icon-foreground.png` — 1024x1024px PNG com transparência (Adaptive Icon Android)
- `icon-background.png` — 1024x1024px PNG fundo sólido (Adaptive Icon Android)
- `splash.png` — 2732x2732px PNG (splash screen)
- `splash-dark.png` — 2732x2732px PNG (splash screen modo escuro, opcional)

O Capacitor Assets gera automaticamente todos os tamanhos necessários
para Android (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) e iOS (1x, 2x, 3x).

## Gerar assets:
```bash
npx @capacitor/assets generate
```
