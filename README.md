# FiveM Bot Detector

Detecteer verdachte bots in FiveM servers via de publieke cfx.re API.

## Hoe werkt het?

De tool analyseert servers op basis van:
- **Naampatronen** — bot-achtige of gegenereerde namen
- **Ping-patronen** — identieke of 0ms pings
- **Duplicaten** — meerdere spelers met dezelfde naam
- **Ontbrekende identifiers** — spelers zonder Steam/Discord ID

> ⚠️ Bot-detectie is nooit 100% accuraat. Het is een indicatie op basis van patronen.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployen via Vercel (via GitHub)

1. **Push naar GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/JOUW_USERNAME/fivem-bot-detector.git
   git push -u origin main
   ```

2. **Vercel koppelen:**
   - Ga naar [vercel.com](https://vercel.com)
   - Klik op "New Project"
   - Importeer je GitHub repository
   - Klik op "Deploy" — Vercel detecteert Next.js automatisch

Klaar! Je website is live.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Edge Runtime** voor snelle API calls
- **cfx.re Public API** voor serverdata
