#!/usr/bin/env python3
"""Auditoria das traduções: o que o código pede vs. o que a tabela tem.

A chave de cada texto é o PRÓPRIO TEXTO EM PORTUGUÊS (ver src/i18n/useIdioma.ts).
O código pede textos de duas maneiras, e o script apanha as duas:

  1. EXPLÍCITA — `t('Texto')`, `t("Texto")`, `t(\\`Texto\\`)`;
  2. IMPLÍCITA — constantes cujo valor é passado a `t()` mais tarde
     (rótulos de menu, nomes de posições, nomes das cores da paleta,
     `titulo=`/`legenda=`/`rotulo=` de componentes que traduzem por dentro).

Uso:
  python3 scripts/verificar_i18n.py            # auditoria (sai com código 1 se falhar)
  python3 scripts/verificar_i18n.py --chaves   # lista as chaves pedidas pelo código

Falha se: (a) o código pede uma chave que a tabela não tem; (b) uma linha da
tabela tem uma coluna vazia; (c) uma tradução perdeu/ganhou um {marcador}
em relação ao português; (d) uma linha da tabela já não é pedida por ninguém
(texto órfão — aviso, não falha).
"""

import glob
import re
import sys

RAIZ = __file__.rsplit('/scripts/', 1)[0]

# onde a interface vive (o painel de administração fica em PT de propósito)
FICHEIROS = (
    glob.glob(f'{RAIZ}/src/components/kit/*.tsx')
    + glob.glob(f'{RAIZ}/src/components/*.tsx')
    + [f'{RAIZ}/src/App.tsx', f'{RAIZ}/src/lib/kitLocais.ts', f'{RAIZ}/src/lib/kitCores.ts',
       f'{RAIZ}/src/types/kit.ts']
)
IGNORAR = ('SimulatorHeader', 'Topbar', 'LeftPanel', 'RightPanel', 'CanvasStage', 'CartDrawer',
           'AiGeneration', 'CloudDesigns', 'CheckoutPage', 'StartFlow', 'OrderFlow')

ESTRINGE = r"""(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)"""
RE_T = re.compile(r'(?<![\w.$])t\(\s*' + ESTRINGE)
# props/propriedades passadas como chave a componentes que traduzem por dentro
RE_PROP = re.compile(
    r'\b(?:titulo|legenda|rotulo|label)\b\s*(?:=\s*|:\s*)' + ESTRINGE)
# kitLocais: { id: '…', nome: '…' } das POSIÇÕES; kitCores: { nome: '…', hex: '…' }
RE_LOCAL = re.compile(r"\{ id: '[a-z-]+', nome: '([^']+)', peca:")
RE_COR = re.compile(r"\{ nome: '([^']+)', hex:")
RE_LABEL_CONST = re.compile(r"^\s+(?:camisola|calcao|meiao|frente|verso|texto|numero|logo|estampas|cores|nome|escudo):\s*'([^']+)',?\s*$", re.M)


# atributos `title` de ligações externas e afins — nomes próprios, não se traduzem
NAO_TRADUZIR = {'Instagram @kypzl_', 'www.kypzl.pt', 'Anton', 'Bebas Neue', 'Teko', 'Oswald', 'Inter'}


def desescapar(s: str) -> str:
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')


def chaves_do_codigo() -> dict[str, set[str]]:
    achadas: dict[str, set[str]] = {}

    def anotar(chave: str, ficheiro: str):
        chave = desescapar(chave)
        if '${' in chave or chave in NAO_TRADUZIR:  # template JS / nome próprio: não é chave
            return
        if not re.search(r'[A-Za-zÀ-ÿ]', chave) or len(chave) < 2:
            return
        achadas.setdefault(chave, set()).add(ficheiro.split('/src/')[-1])

    for f in sorted(set(FICHEIROS)):
        if any(x in f for x in IGNORAR):
            continue
        s = open(f).read()
        for m in RE_T.finditer(s):
            anotar(next(g for g in m.groups() if g is not None), f)
        if f.endswith(('.tsx',)):
            for m in RE_PROP.finditer(s):
                v = next(g for g in m.groups() if g is not None)
                # só props em português (acentos ou palavras do domínio); evita
                # `label: 'Português'` dos idiomas e afins
                anotar(v, f)
        if f.endswith('kitLocais.ts'):
            for m in RE_LOCAL.finditer(s):
                anotar(m.group(1), f)
        if f.endswith('kitCores.ts'):
            for m in RE_COR.finditer(s):
                anotar(m.group(1), f)
        if f.endswith('types/kit.ts') or f.endswith('KitLab.tsx'):
            for m in RE_LABEL_CONST.finditer(s):
                anotar(m.group(1), f)
    # a landing: textos em constantes de módulo (passos, tags, depoimentos…)
    s = open(f'{RAIZ}/src/components/SiteLanding.tsx').read()
    for m in re.finditer(r'\b(?:texto)=' + ESTRINGE, s):
        anotar(next(g for g in m.groups() if g is not None), 'components/SiteLanding.tsx')
    for m in re.finditer(r'\b(?:title|desc|tag|quote|role)\b\s*[:=]\s*' + ESTRINGE, s):
        anotar(next(g for g in m.groups() if g is not None), 'components/SiteLanding.tsx')
    for nome in ('TREINO_TAGS', 'LIFESTYLE_ITEMS'):
        bloco = re.search(r'const ' + nome + r' = \[(.*?)\];', s, re.S)
        for m in re.finditer(ESTRINGE, bloco.group(1)):
            anotar(next(g for g in m.groups() if g is not None), 'components/SiteLanding.tsx')
    bloco = re.search(r"\[\s*('Produção própria'.*?)\]\.map\(\(item\)", s, re.S)
    for m in re.finditer(ESTRINGE, bloco.group(1)):
        anotar(next(g for g in m.groups() if g is not None), 'components/SiteLanding.tsx')
    # zonas da peça e o tema "Liso" (kitDemo) — traduzidos ao desenhar o painel
    s = open(f'{RAIZ}/src/lib/kitDemo.ts').read()
    for m in re.finditer(r"nome: '(Cor base|Gola|Punhos|Linha da gola|Liso|Gola 1|Gola 2)'", s):
        anotar(m.group(1), 'lib/kitDemo.ts')
    # nomes de temas DESCRITIVOS (vêm da base de dados; os nomes próprios —
    # Dino, Aska, Milan, Canarinho — ficam como estão em todas as línguas)
    for nome in ('Riscas', 'Azul Royal', 'Hexágonos', 'Canarinho Gola em Bico'):
        anotar(nome, 'base de dados (kit_templates.nome)')
    # nomes dos segmentos do cabeçalho: `{ nome: 'Futebol', ativo: …`
    s = open(f'{RAIZ}/src/components/kit/OutrosSimuladores.tsx').read()
    for m in re.finditer(r"\{ nome: '([^']+)', ativo:", s):
        anotar(m.group(1), 'components/kit/OutrosSimuladores.tsx')
    # frases em arrays/objetos passados a t() depois (checkout: passos; patrocínio)
    return achadas


def tabela() -> list[tuple[str, ...]]:
    linhas = []
    for f in sorted(glob.glob(f'{RAIZ}/src/i18n/textos/*.ts')):
        if f.endswith('index.ts'):
            continue
        s = open(f).read()
        # cada linha: [ 'pt', 'en', 'es', 'fr', 'de', 'it' ],  (strings em '' ou "")
        for m in re.finditer(r'^\s*\[\s*((?:' + ESTRINGE + r'\s*,\s*){5}' + ESTRINGE + r')\s*,?\s*\],?\s*$', s, re.M):
            partes = re.findall(ESTRINGE, m.group(1))
            linhas.append(tuple(desescapar(next(g for g in p if g)) if any(p) else '' for p in partes))
    return linhas


def main() -> int:
    codigo = chaves_do_codigo()
    if '--chaves' in sys.argv:
        for k in sorted(codigo):
            print(k)
        print(f'\n{len(codigo)} chaves', file=sys.stderr)
        return 0

    linhas = tabela()
    na_tabela = {l[0]: l for l in linhas}
    erros = 0

    em_falta = sorted(k for k in codigo if k not in na_tabela)
    for k in em_falta:
        print(f'FALTA   {k!r}   ← {", ".join(sorted(codigo[k]))}')
    erros += len(em_falta)

    for l in linhas:
        for i, col in enumerate(('en', 'es', 'fr', 'de', 'it'), start=1):
            if not l[i].strip():
                print(f'VAZIO   {l[0]!r} [{col}]')
                erros += 1
        marc = set(re.findall(r'\{\w+\}', l[0]))
        neg = l[0].count('**')
        for i, col in enumerate(('en', 'es', 'fr', 'de', 'it'), start=1):
            if set(re.findall(r'\{\w+\}', l[i])) != marc or l[i].count('**') != neg:
                print(f'MARCADOR {l[0]!r} [{col}] → {l[i]!r}')
                erros += 1
    duplicadas = [k for k in {l[0] for l in linhas} if sum(1 for l in linhas if l[0] == k) > 1]
    for k in duplicadas:
        print(f'DUPLICADA {k!r}')
        erros += 1

    orfas = sorted(k for k in na_tabela if k not in codigo)
    for k in orfas:
        print(f'órfã    {k!r}')

    print(f'\n{len(codigo)} chaves no código · {len(linhas)} linhas na tabela · '
          f'{len(em_falta)} em falta · {len(orfas)} órfãs · {erros} erros')
    return 1 if erros else 0


if __name__ == '__main__':
    sys.exit(main())
