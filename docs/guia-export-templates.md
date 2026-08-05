# Guia de exportação — Simulador KYPZL

Este documento diz **exatamente** que ficheiros o simulador precisa e como
exportá-los a partir do Illustrator/Photoshop.

A ideia do simulador: a peça deixa de ser uma imagem fixa e passa a ser uma
composição. O sistema pinta a silhueta com a cor base, coloca por cima cada
camada de cor da estampa (que o cliente pode recolorir uma a uma) e aplica o
sombreado do tecido. Por isso precisamos das partes **separadas** — não de um
render final achatado.

---

## ⚠️ Antes de exportar tudo: mande UM conjunto de teste

Não exporte as 10 estampas de uma vez. Mande primeiro:

- **1 molde** de camisola (frente + verso + textura)
- **1 estampa** completa (frente + verso)

Validamos o encaixe e, se algo tiver de mudar, muda-se numa peça em vez de dez.

---

## Regra de ouro: o artboard tem de ser sempre o mesmo

O simulador sobrepõe a estampa à silhueta assumindo que ambas partilham o
**mesmo sistema de coordenadas**. Se o artboard mudar de tamanho entre
ficheiros, ou se a peça for movida entre exports, a estampa sai desalinhada.

**Padrão para todos os ficheiros:**

| | |
|---|---|
| Artboard | **2000 × 2000 px** (quadrado) |
| Um artboard por lado | `frente` e `verso` |
| Posição da peça | centrada, ocupando ~80% da altura |
| Nunca | mover, escalar ou rodar a peça entre exports |

O mais seguro é ter **um ficheiro `.ai` por peça** com os dois artboards, e
todas as estampas construídas por cima desse mesmo ficheiro.

---

## Parte 1 — O modelo da peça (molde)

Uma vez por peça (camisola, calção, meião). São **3 ficheiros por lado**:

### 1.1 Silhueta — `camisola-frente.svg`

O contorno exterior da peça, como **uma única forma fechada** preenchida a
branco. É isto que recebe a cor base e que recorta as estampas.

- Sem sombras, sem costuras, sem gola — só o contorno.
- Traços convertidos: `Objeto > Expandir`.
- Sem máscaras de recorte.

`Ficheiro > Exportar > Exportar como… > SVG` → marcar **"Usar pranchetas"**.

### 1.2 Textura de sombreado — `camisola-frente-textura.png`

As dobras e sombras do tecido, **a preto e branco** (sem cor), fundo
transparente. É o que dá o aspeto de tecido real em vez de um desenho chapado.

Se já existe o mockup em PSD (o `KYPZL Jersey.psd` serve):
1. Desligar todas as camadas de **cor**;
2. Deixar visíveis apenas as camadas de **sombra / luz / dobras**;
3. Dessaturar (`Imagem > Ajustes > Preto e branco`);
4. Exportar PNG-24 com transparência, **2000 × 2000 px**.

> Quanto mais neutra (cinzenta) a textura, melhor: ela é multiplicada sobre a
> cor escolhida pelo cliente. Se ficar com tom azulado, todas as camisolas
> saem azuladas.

### 1.3 Detalhes (opcional) — `camisola-frente-detalhes.svg`

Costuras, gola, punhos, vivos — tudo o que fica **por cima** da estampa e não
muda de cor com ela. Se não houver, salte este ficheiro.

---

## Parte 2 — As estampas

Um ficheiro por peça e por lado. **Cada cor tem de ser uma camada separada** —
que, pelo que já confirmámos, é como os templates estão feitos.

### 2.1 Preparar as camadas

No painel *Camadas*, deixe uma camada de topo por cor, nomeadas assim:

```
COR-1        ← primeira cor da estampa
COR-2        ← segunda cor
COR-3        ← terceira cor (se houver)
```

O nome é o que aparece ao cliente no painel de cores, por isso pode ser
descritivo em vez de numerado — `LISTRAS`, `OMBROS`, `FAIXA-PEITO`,
`PUNHOS`. Só evite acentos e espaços nos nomes (use `-`).

Importante:
- Uma cor por camada, **sem misturar** duas cores na mesma camada.
- Não interessa a cor com que está desenhado (o sistema substitui). Pode
  deixar tudo preto.
- Tudo **dentro** dos limites da silhueta — o que sair fora é recortado.
- Traços convertidos em formas: `Objeto > Expandir`.
- Texto convertido em curvas: `Texto > Criar contornos`.
- Sem efeitos raster (sombras, desfoques, transparências do Illustrator);
  se existirem, `Objeto > Rasterizar` não serve — refaça em vetor.

### 2.2 Exportar

`Ficheiro > Exportar > Exportar como… > SVG` → **"Usar pranchetas"** ligado.

Nas opções de SVG:

| Opção | Valor |
|---|---|
| Estilo | **Atributos de apresentação** |
| Fontes | Converter em contornos |
| Imagens | Incorporar |
| IDs de objeto | **Nomes de camada** ← essencial |
| Minificar | desligado |

A opção **"IDs de objeto: Nomes de camada"** é a que faz cada camada aparecer
no ficheiro com o seu nome. Sem ela, não conseguimos separar as cores.

**Não precisa de exportar uma camada de cada vez** — um único SVG com todas as
camadas nomeadas chega. Nós separamos daqui.

---

## Parte 3 — Como entregar

Uma pasta no Drive assim:

```
SIMULADOR/
├─ moldes/
│  ├─ camisola-frente.svg
│  ├─ camisola-frente-textura.png
│  ├─ camisola-frente-detalhes.svg      (opcional)
│  ├─ camisola-verso.svg
│  ├─ camisola-verso-textura.png
│  ├─ calcao-frente.svg / ...
│  └─ meiao-frente.svg / ...
└─ estampas/
   ├─ 001-nome-da-estampa/
   │  ├─ camisola-frente.svg
   │  ├─ camisola-verso.svg
   │  ├─ calcao-frente.svg              (se a estampa cobrir o calção)
   │  └─ ...
   └─ 002-outra-estampa/
      └─ ...
```

O número da pasta (`001`, `002`) é o **código do modelo** que aparece ao
cliente no simulador. Se já existe uma numeração interna, use essa.

---

## Resumo do que faz falta

**Por peça (3 peças × 2 lados):**
- [ ] silhueta `.svg`
- [ ] textura de sombreado `.png`
- [ ] detalhes `.svg` *(opcional)*

**Por estampa:**
- [ ] um `.svg` por peça e lado, com uma camada nomeada por cor

**Erros que quebram o encaixe:**
- artboard de tamanho diferente entre ficheiros
- peça movida ou redimensionada entre exports
- duas cores na mesma camada
- exportar sem "Usar pranchetas" (corta ao conteúdo e desalinha)
- exportar sem "IDs de objeto: Nomes de camada"
