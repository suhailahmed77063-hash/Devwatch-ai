# College ERP — Run Instructions

## Project

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Recharts

## How to reproduce artifacts

No special artifact reproduction needed — `node_modules` and `.next` are already present.

## How to start the dev server

```bash
npm run dev
```

This starts Next.js on port 3000 (default). Use `-p <port>` to override.

**Note:** If another `next dev` is already running, Next.js will refuse to start a second instance. Either use the existing one or stop it first.

## Manual start (detached, Windows)

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Confirm alive:
```powershell
powershell -NoProfile -Command "Get-Process -Id <pid>"
```
