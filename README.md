# Editor de Uniformes — Configurador 2D

Editor web 2D de personalização de produtos esportivos (camisas, calções). O
cliente escolhe um produto renderizado como imagem-base e sobrepõe **logo
(upload)**, **nome**, **número**, **texto livre** e **cores por região**. Cada
elemento é manipulável no canvas (mover, redimensionar, rotacionar). O resultado
pode ser **salvo**, **visualizado**, **exportado como PNG** e enviado como
**orçamento (JSON)**.

> Não é 3D: os produtos são imagens e a personalização são camadas sobrepostas.

## Stack

- **React + TypeScript + Vite**
- **Fabric.js v6** — canvas, objetos arrastáveis/escaláveis/rotacionáveis
- **Zustand** — store único de design + undo/redo
- **Tailwind CSS** + **shadcn/ui** (Radix UI) — design system claro e minimalista
- **Lucide** — ícones
- **sonner** — toasts
- **Supabase** — Postgres (designs + catálogo) + Storage (logos) — *opcional*
- **Vercel** — hospedagem do SPA

> O app funciona **100% local** (localStorage + dataURL) mesmo sem Supabase
> configurado. Com Supabase, ganha **salvar/abrir designs na nuvem**, **catálogo
> de produtos no banco** e **upload de logos no Storage**.

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional: preencha com as credenciais do Supabase
npm run dev                  # http://localhost:5173
```

Sem `.env.local`, o app roda no modo local. Com as variáveis preenchidas, os
recursos de nuvem ligam automaticamente.

Outros scripts:

```bash
npm run build    # type-check (tsc -b) + build de produção
npm run preview  # serve o build de produção
npm run lint     # apenas type-check (tsc --noEmit)
```

> Requer Node 18+.

## Funcionalidades

| Área | O que faz |
|------|-----------|
| **Produtos** | Galeria por categoria (Camisa / Calção); troca a imagem-base. |
| **Acabamentos** | Gola e punho (registrados no orçamento). |
| **Nome e Número** | Adiciona/edita nome, número e texto: fonte, tamanho, cor de preenchimento, contorno e posições predefinidas. |
| **Logos / Upload** | Upload de imagem (PNG/JPG/WebP), normalizada no client; posições predefinidas (peito, manga, costas…), redimensionar e rotacionar. Múltiplos patrocínios. |
| **Cores** | Paleta por região (corpo, mangas, gola, cós, faixa…) com toggle "Sincronizar". |
| **Topbar** | Salvar, Visualizar, Desfazer/Refazer, Zoom, Exportar PNG, Orçamento (JSON), Nova simulação. |
| **Canvas** | Toggle Frente/Verso, seleção/rotação, snapping ao centro, atalhos de teclado. |

### Atalhos

- `Ctrl/Cmd + Z` — desfazer · `Ctrl/Cmd + Shift + Z` ou `Ctrl + Y` — refazer
- `Delete` / `Backspace` — excluir o objeto selecionado
- Duplo clique em um texto — edição inline no canvas

## Decisões de arquitetura (performance)

O hand-off prioriza fluidez (60fps, sem travas, sem leaks). Principais escolhas:

- **Canvas Fabric instanciado uma única vez** (`CanvasStage`) e sincronizado
  com o store por **reconciliação por id** — nada de recriar o canvas a cada
  render. Durante o arraste, o Fabric atualiza a própria view; o store só é
  sincronizado no `object:modified` (sem churn por pixel).
- **Coordenadas relativas (0–1)** no store — resilientes a resize e exportação
  em alta resolução. O palco interno é fixo (1000×1000) e só o CSS escala.
- **Undo/redo por snapshots JSON** com **debounce** (não grava a cada pixel),
  limite de 50 estados.
- **Debounce (200ms)** em inputs de texto e color pickers.
- **Imagens de upload normalizadas** no client (≤ 2000px) com
  `createImageBitmap` quando disponível, e **cache** de imagens decodificadas.
- **Autosave** em `localStorage` com debounce; restaurado no boot.
- **Sem memory leaks**: `CanvasStage` faz `dispose()` e remove listeners no
  unmount.

## Estrutura

```
src/
├─ components/
│  ├─ Topbar.tsx              # salvar, undo/redo, zoom, exportar, preview
│  ├─ LeftPanel.tsx           # abas de edição
│  ├─ CanvasStage.tsx         # wrapper Fabric (instância única + reconciliação)
│  ├─ SideToggle.tsx          # Frente / Verso
│  ├─ SelectionToolbar.tsx    # camadas + excluir do objeto selecionado
│  ├─ RightPanelColors.tsx    # cores por região + sincronizar
│  ├─ panels/                 # TabProducts, TabFinishes, TabNameNumber,
│  │                          # TabLogos, TabUpload, LogoUploader
│  └─ ui/                     # shadcn/ui (button, input, select, dialog, tabs,
│                             # slider, switch, tooltip…) + controles com debounce
├─ store/
│  └─ useDesignStore.ts       # Zustand: estado + ações + undo/redo + autosave
├─ lib/
│  ├─ products.ts             # catálogo + render por cores
│  ├─ jerseyTemplates.ts      # templates SVG parametrizados por região
│  ├─ image.ts                # normalização/cache de imagens
│  ├─ canvasBridge.ts         # ponte UI ⇄ canvas (export PNG)
│  ├─ supabase.ts             # cliente Supabase (degrada se não configurado)
│  ├─ api.ts                  # products, designs (save/list/load), upload logo
│  ├─ fonts.ts, id.ts, storage.ts, download.ts
└─ types/
   └─ design.ts               # modelo de dados (fonte única de verdade)
```

## Produtos de exemplo

Há 2 produtos placeholder (**Camisa Clássica** e **Calção Pro**) renderizados
como **SVG parametrizado por região** — assim a coloração por região é nítida e
escala para qualquer resolução, sem tint sobre raster. Em produção, basta trocar
a função `render` do produto por URLs de imagens reais (frente/verso); o resto
da aplicação não muda.

## Exportação

- **PNG** em alta resolução via `toDataURL({ multiplier })` (2× no preview, 3×
  no download).
- **Orçamento (JSON)** = serialização do `DesignState` completo (produto, lado,
  cores, acabamentos e todos os elementos com posição/escala/rotação).

## Backend (Supabase)

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto (ex.: `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Chave **publicável** (pública, protegida por RLS). |

### Esquema do banco

As migrations estão em [`supabase/migrations`](supabase/migrations):

- `products` — catálogo (id, nome, categoria, `template`, `regions` JSONB). O
  **render** (SVG por cor) fica no client, indexado por `template`. Adicionar um
  produto = inserir uma linha reusando um template (`shirt`/`shorts`).
- `designs` — designs/orçamentos salvos (`state` JSONB = `DesignState`, `preview`
  PNG, `updated_at`).
- Bucket de Storage `logos` (público) para os logos enviados.

> **RLS / MVP sem auth:** as políticas são públicas (anon pode ler/escrever) — é
> intencional nesta fase. Ao adicionar autenticação, troque as policies
> `*_public_all` por regras baseadas em `auth.uid()`.

Aplicar localmente com a CLI do Supabase:

```bash
supabase link --project-ref SEU_REF
supabase db push
```

## Deploy na Vercel

1. Suba o repositório para o GitHub e **importe na Vercel** (framework detectado:
   Vite — já há um [`vercel.json`](vercel.json) com rewrite de SPA).
2. Em **Settings → Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Build: `npm run build` · Output: `dist`.

Ou via CLI:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # produção
```
