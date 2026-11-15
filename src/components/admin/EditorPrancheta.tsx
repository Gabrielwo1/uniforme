import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Grid3x3,
  History,
  Loader2,
  Redo2,
  Rocket,
  Save,
  Undo2,
  Undo,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { admin, type VersaoAjustes } from '@/lib/adminApi';
import {
  AJUSTES_VAZIOS,
  AjustesRascunhoCtx,
  TELA,
  ajusteNulo,
  chaveZona,
  limparAjustes,
  type Ajuste,
  type AjustesLado,
  type AjustesTodos,
} from '@/lib/ajustes';
import { estampasDemo, moldeDemo } from '@/lib/kitDemo';
import { useAdminStore } from '@/store/useAdminStore';
import { LADOS_KIT, LADO_LABEL, PECAS_KIT, type Estampa, type LadoKit, type PecaConfig, type PecaKit } from '@/types/kit';
import { cn } from '@/lib/utils';
import { CamadaFixa } from '../kit/CamadaFixa';
import { PecaMockup } from '../kit/PecaMockup';
import { Button } from '../ui/button';

/**
 * Prancheta — editor de camadas do admin.
 *
 * Mostra a prancheta do simulador (o jogador e todas as camadas das peças,
 * com o sombreado) e deixa deslocar CADA camada, em décimas de píxel da tela
 * comum de 1520×2460: arrastar, setas do teclado (1 px, Shift 10, Alt 0,1) ou
 * números. Os PNG não são tocados — o que se grava é só o deslocamento de cada
 * camada (ver src/lib/ajustes.ts), primeiro como rascunho, depois publicado.
 *
 * O editor usa o MESMO motor do simulador (`PecaMockup`, `CamadaFixa`), com o
 * rascunho injetado por contexto: o que se vê aqui é o que o cliente vê.
 */

interface Camada {
  chave: string;
  grupo: string;
  nome: string;
  url?: string;
}

const PASSOS = { fino: 0.1, normal: 1, grosso: 10 };

const NOME_PECA: Record<PecaKit, string> = { camisola: 'Camisola', calcao: 'Calção', meiao: 'Meião' };

function ficheiro(url?: string) {
  return url ? decodeURIComponent(url.split('/').pop() ?? '') : '';
}

/** Caixa (em píxeis da tela) onde a camada tem conteúdo, lida do alfa do PNG. */
const CAIXAS = new Map<string, Promise<{ x: number; y: number; w: number; h: number } | null>>();
function caixaDe(url: string) {
  let p = CAIXAS.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const f = 4; // lê a 1/4: chega para uma moldura
        const w = Math.round(img.naturalWidth / f);
        const h = Math.round(img.naturalHeight / f);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (d[(y * w + x) * 4 + 3] > 24) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
        resolve(x1 < 0 ? null : { x: x0 * f, y: y0 * f, w: (x1 - x0 + 1) * f, h: (y1 - y0 + 1) * f });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    CAIXAS.set(url, p);
  }
  return p;
}

function configPara(peca: PecaKit, cod: string): { estampa: Estampa; config: PecaConfig } {
  const lista = estampasDemo(peca);
  const e = lista.find((x) => x.codModelo === cod) ?? lista[0];
  return {
    estampa: e,
    config: {
      estampaId: e.id,
      coresZonas: { corpo: e.corBasePadrao, ...(e.coresZonasPadrao ?? {}) },
      cores: {},
    },
  };
}

const arred = (n: number) => Math.round(n * 10) / 10;

export function EditorPrancheta() {
  const codigo = useAdminStore((s) => s.codigo)!;
  const [pronto, setPronto] = useState(false);
  const [lado, setLado] = useState<LadoKit>('frente');
  const [cod, setCod] = useState('');
  const [trabalho, setTrabalho] = useState<AjustesTodos>(AJUSTES_VAZIOS);
  const [guardado, setGuardado] = useState<AjustesTodos>(AJUSTES_VAZIOS);
  const [publicado, setPublicado] = useState<AjustesTodos>(AJUSTES_VAZIOS);
  const [sel, setSel] = useState('camisola.corpo');
  const [zoom, setZoom] = useState(0.45);
  const [realcar, setRealcar] = useState(true);
  const [comparar, setComparar] = useState(false);
  const [grelha, setGrelha] = useState(false);
  const [aGravar, setAGravar] = useState<null | 'rascunho' | 'publicar'>(null);
  const [historico, setHistorico] = useState<VersaoAjustes[] | null>(null);
  const [caixa, setCaixa] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const desfazer = useRef<AjustesTodos[]>([]);
  const refazer = useRef<AjustesTodos[]>([]);
  const [, forcar] = useState(0);

  // ---- arranque: estampas registadas + ajustes do servidor
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { registarReais, registarDaBaseDeDados } = await import('@/lib/kitReal');
      registarReais();
      await registarDaBaseDeDados();
      const linhas = await admin.ajustes(codigo);
      if (!vivo) return;
      const pub: AjustesTodos = { frente: {}, verso: {} };
      const rasc: AjustesTodos = { frente: {}, verso: {} };
      for (const l of linhas) {
        pub[l.lado] = l.publicado ?? {};
        rasc[l.lado] = l.rascunho ?? l.publicado ?? {};
      }
      setPublicado(pub);
      setGuardado(rasc);
      setTrabalho(rasc);
      const primeira = estampasDemo('camisola').find((e) => e.codModelo === '013') ?? estampasDemo('camisola')[0];
      setCod(primeira?.codModelo ?? '');
      setPronto(true);
    })().catch((e) => toast.error(e instanceof Error ? e.message : 'Não foi possível abrir a prancheta.'));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  // ---- camadas da prancheta, do fundo para a frente
  const camadas = useMemo<Camada[]>(() => {
    if (!pronto) return [];
    const lista: Camada[] = [
      { chave: 'jogador', grupo: 'Jogador', nome: 'Jogador (cabeça, pescoço, braços, pernas)', url: `/moldes/jog/jogador-${lado}.png` },
    ];
    for (const peca of [...PECAS_KIT].reverse()) {
      const { estampa } = configPara(peca, cod);
      const molde = moldeDemo(peca, lado, estampa.golaEstilo);
      for (const z of molde.zonas) {
        lista.push({ chave: chaveZona(peca, z.id), grupo: NOME_PECA[peca], nome: z.nome + (z.recebeEstampa ? ' · estampa e sombreado' : ' · sombreado'), url: z.imagem });
      }
      if (molde.detalhes) {
        const url = /href="([^"]+)"/.exec(molde.detalhes)?.[1];
        lista.push({ chave: chaveZona(peca, 'pele'), grupo: NOME_PECA[peca], nome: 'Pele do decote (detalhes)', url });
      }
      if (peca === 'meiao') lista.push({ chave: 'botas', grupo: 'Chuteiras', nome: 'Chuteiras', url: `/moldes/jog/botas-${lado}.png` });
    }
    return lista;
  }, [pronto, lado, cod]);

  // a seleção tem de existir neste lado/modelo
  useEffect(() => {
    if (camadas.length && !camadas.some((c) => c.chave === sel)) setSel(camadas.find((c) => c.chave === 'camisola.corpo')?.chave ?? camadas[0].chave);
  }, [camadas, sel]);

  const camadaSel = camadas.find((c) => c.chave === sel);
  useEffect(() => {
    let vivo = true;
    setCaixa(null);
    if (camadaSel?.url) caixaDe(camadaSel.url).then((c) => vivo && setCaixa(c));
    return () => {
      vivo = false;
    };
  }, [camadaSel?.url]);

  const atual: AjustesLado = trabalho[lado];
  const ajusteSel: Ajuste = atual[sel] ?? { dx: 0, dy: 0 };

  // ---- edição (com desfazer/refazer)
  const registar = useCallback((antes: AjustesTodos) => {
    desfazer.current.push(antes);
    if (desfazer.current.length > 200) desfazer.current.shift();
    refazer.current = [];
    forcar((n) => n + 1);
  }, []);

  const mudar = useCallback(
    (chave: string, fn: (a: Ajuste) => Ajuste, { guardarHistorico = true } = {}) => {
      setTrabalho((t) => {
        if (guardarHistorico) registar(t);
        const a = fn(t[lado][chave] ?? { dx: 0, dy: 0 });
        const novo = { ...t[lado] };
        if (ajusteNulo(a)) delete novo[chave];
        else novo[chave] = a;
        return { ...t, [lado]: novo };
      });
    },
    [lado, registar],
  );

  const andar = useCallback(
    (ddx: number, ddy: number) => mudar(sel, (a) => ({ ...a, dx: arred(a.dx + ddx), dy: arred(a.dy + ddy) })),
    [mudar, sel],
  );

  const voltarAtras = useCallback(() => {
    const anterior = desfazer.current.pop();
    if (!anterior) return;
    setTrabalho((t) => {
      refazer.current.push(t);
      return anterior;
    });
    forcar((n) => n + 1);
  }, []);

  const avancar = useCallback(() => {
    const seguinte = refazer.current.pop();
    if (!seguinte) return;
    setTrabalho((t) => {
      desfazer.current.push(t);
      return seguinte;
    });
    forcar((n) => n + 1);
  }, []);

  // ---- teclado: setas movem a camada selecionada
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? avancar() : voltarAtras();
        return;
      }
      const passo = e.shiftKey ? PASSOS.grosso : e.altKey ? PASSOS.fino : PASSOS.normal;
      const d: Record<string, [number, number]> = {
        ArrowLeft: [-passo, 0],
        ArrowRight: [passo, 0],
        ArrowUp: [0, -passo],
        ArrowDown: [0, passo],
      };
      if (d[e.key]) {
        e.preventDefault();
        andar(...d[e.key]);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [andar, avancar, voltarAtras]);

  // ---- arrastar a camada selecionada
  const arrasto = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const aoPremir = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, dx: ajusteSel.dx, dy: ajusteSel.dy };
    registar(trabalho);
  };
  const aoMover = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = arred(a.dx + (e.clientX - a.x) / zoom);
    const dy = arred(a.dy + (e.clientY - a.y) / zoom);
    mudar(sel, (x) => ({ ...x, dx, dy }), { guardarHistorico: false });
  };
  const aoSoltar = () => {
    arrasto.current = null;
  };

  // ---- gravar
  const sujo = JSON.stringify(limparAjustes(atual)) !== JSON.stringify(limparAjustes(guardado[lado]));
  const porPublicar = JSON.stringify(limparAjustes(atual)) !== JSON.stringify(limparAjustes(publicado[lado]));

  const guardarRascunho = async () => {
    setAGravar('rascunho');
    try {
      await admin.guardarRascunho(codigo, lado, limparAjustes(atual));
      setGuardado((g) => ({ ...g, [lado]: limparAjustes(atual) }));
      toast.success('Rascunho guardado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setAGravar(null);
    }
  };

  const publicar = async () => {
    if (!window.confirm(`Publicar os ajustes da ${LADO_LABEL[lado].toLowerCase()}? Passam a valer já no simulador.`)) return;
    setAGravar('publicar');
    try {
      await admin.publicarAjustes(codigo, lado, limparAjustes(atual));
      setGuardado((g) => ({ ...g, [lado]: limparAjustes(atual) }));
      setPublicado((g) => ({ ...g, [lado]: limparAjustes(atual) }));
      toast.success('Publicado. O simulador já usa estes ajustes.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível publicar.');
    } finally {
      setAGravar(null);
    }
  };

  const abrirHistorico = async () => {
    try {
      setHistorico(await admin.historicoAjustes(codigo, lado));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível ler o histórico.');
    }
  };

  if (!pronto) {
    return (
      <div className="grid h-64 place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const W = TELA.w * zoom;
  const H = TELA.h * zoom;
  const alteradas = Object.keys(atual).length;
  const catalogo = estampasDemo('camisola');
  const grupos = camadas.reduce<Record<string, Camada[]>>((g, c) => ((g[c.grupo] ??= []).unshift(c), g), {});

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[560px] flex-col gap-3">
      {/* barra superior */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5">
          {LADOS_KIT.map((l) => (
            <button
              key={l}
              onClick={() => setLado(l)}
              className={cn('rounded px-3 py-1 text-xs font-semibold', l === lado ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent')}
            >
              {LADO_LABEL[l]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Modelo de teste
          <select value={cod} onChange={(e) => setCod(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs text-foreground">
            {catalogo.map((e) => (
              <option key={e.id} value={e.codModelo}>
                Cod. {e.codModelo} · {e.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={voltarAtras} disabled={!desfazer.current.length} title="Desfazer (Ctrl/Cmd+Z)"><Undo2 /></Button>
          <Button variant="outline" size="icon-sm" onClick={avancar} disabled={!refazer.current.length} title="Refazer (Ctrl/Cmd+Shift+Z)"><Redo2 /></Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.2, arred(z - 0.05)))} title="Menos zoom"><ZoomOut /></Button>
          <input type="range" min={0.2} max={1.5} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-28" />
          <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(1.5, arred(z + 0.05)))} title="Mais zoom"><ZoomIn /></Button>
          <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>

        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={realcar} onChange={(e) => setRealcar(e.target.checked)} />Realçar a selecionada</label>
        <Button variant={grelha ? 'default' : 'outline'} size="sm" onClick={() => setGrelha((g) => !g)}><Grid3x3 />Grelha</Button>
        <Button variant={comparar ? 'default' : 'outline'} size="sm" onMouseDown={() => setComparar(true)} onMouseUp={() => setComparar(false)} onMouseLeave={() => setComparar(false)} title="Segure para ver o que está publicado">
          Ver publicado
        </Button>

        <span className="ml-auto flex items-center gap-2">
          {porPublicar && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">{sujo ? 'por guardar' : 'por publicar'}</span>}
          <Button variant="outline" size="sm" onClick={abrirHistorico}><History />Histórico</Button>
          <Button variant="outline" size="sm" onClick={() => setTrabalho((t) => (registar(t), { ...t, [lado]: publicado[lado] }))} disabled={!porPublicar}><Undo />Voltar ao publicado</Button>
          <Button variant="outline" size="sm" onClick={guardarRascunho} disabled={!sujo || aGravar !== null}>{aGravar === 'rascunho' ? <Loader2 className="animate-spin" /> : <Save />}Guardar rascunho</Button>
          <Button size="sm" onClick={publicar} disabled={!porPublicar || aGravar !== null}>{aGravar === 'publicar' ? <Loader2 className="animate-spin" /> : <Rocket />}Publicar</Button>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_1fr_260px]">
        {/* camadas */}
        <div className="min-h-0 overflow-y-auto rounded-lg border bg-card">
          {Object.entries(grupos).map(([grupo, lista]) => (
            <div key={grupo}>
              <div className="sticky top-0 z-10 border-b bg-muted/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">{grupo}</div>
              {lista.map((c) => {
                const a = atual[c.chave];
                return (
                  <div key={c.chave} onClick={() => setSel(c.chave)} className={cn('flex cursor-pointer items-center gap-2 border-b px-2 py-1.5', c.chave === sel ? 'bg-primary/10' : 'hover:bg-accent')}>
                    <div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded border bg-[conic-gradient(#ddd_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] bg-[length:8px_8px]">
                      {c.url && <img src={c.url} alt="" className="h-full w-full object-contain" draggable={false} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{c.nome}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground" title={c.url}>{c.chave} · {ficheiro(c.url)}</div>
                      {a && !ajusteNulo(a) && <div className="font-mono text-[10px] text-amber-600">{a.dx} , {a.dy} px</div>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); mudar(c.chave, (x) => ({ ...x, oculta: !x.oculta })); }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      title={a?.oculta ? 'Mostrar' : 'Esconder'}
                    >
                      {a?.oculta ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* prancheta */}
        <div className="min-h-0 overflow-auto rounded-lg border bg-[#8a8d94]">
          <div className="p-6">
            <div className="relative mx-auto select-none" style={{ width: W, height: H }} data-editor-palco>
              {realcar && <style>{`[data-editor-palco] [data-camada]:not([data-camada="${sel}"]){opacity:.3}`}</style>}
              <div className="absolute inset-0 bg-gradient-to-b from-[#f2f4f6] to-[#cfd5dc]" />
              <AjustesRascunhoCtx.Provider value={comparar ? publicado : trabalho}>
                <CamadaFixa tipo="jogador" lado={lado} className="z-0" />
                {PECAS_KIT.map((peca, i) => {
                  const { estampa, config } = configPara(peca, cod);
                  return (
                    <PecaMockup key={peca} molde={moldeDemo(peca, lado, estampa.golaEstilo)} estampa={estampa} config={config} className="absolute inset-0" style={{ zIndex: 30 - i * 10 }} />
                  );
                })}
                <CamadaFixa tipo="botas" lado={lado} className="z-[15]" />
              </AjustesRascunhoCtx.Provider>

              {grelha && (
                <div
                  className="pointer-events-none absolute inset-0 z-40"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.25) 1px, transparent 1px)',
                    backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                  }}
                />
              )}

              {caixa && (
                <div
                  className="pointer-events-none absolute z-40 border border-dashed border-sky-500"
                  style={{ left: (caixa.x + ajusteSel.dx) * zoom, top: (caixa.y + ajusteSel.dy) * zoom, width: caixa.w * zoom, height: caixa.h * zoom }}
                />
              )}

              {/* captura o arrasto da camada selecionada */}
              <div className="absolute inset-0 z-50 cursor-move touch-none" onPointerDown={aoPremir} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} />
            </div>
          </div>
        </div>

        {/* inspetor */}
        <div className="min-h-0 space-y-4 overflow-y-auto rounded-lg border bg-card p-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Camada selecionada</div>
            <div className="mt-1 text-sm font-semibold">{camadaSel?.nome}</div>
            <div className="break-all font-mono text-[10px] text-muted-foreground">{camadaSel?.chave}</div>
            <div className="break-all font-mono text-[10px] text-muted-foreground">{ficheiro(camadaSel?.url)}</div>
            {caixa && <div className="mt-1 font-mono text-[10px] text-muted-foreground">conteúdo {caixa.w}×{caixa.h} px em ({caixa.x}, {caixa.y})</div>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['dx', 'dy'] as const).map((k) => (
              <label key={k} className="text-xs">
                <span className="text-muted-foreground">{k === 'dx' ? 'X (→)' : 'Y (↓)'} px</span>
                <input
                  type="number"
                  step={0.1}
                  value={ajusteSel[k]}
                  onChange={(e) => mudar(sel, (a) => ({ ...a, [k]: arred(Number(e.target.value) || 0) }))}
                  className="mt-0.5 h-8 w-full rounded-md border bg-background px-2 font-mono text-sm"
                />
              </label>
            ))}
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Mover</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span />
              <Button variant="outline" size="sm" onClick={() => andar(0, -1)}>↑ 1</Button>
              <span />
              <Button variant="outline" size="sm" onClick={() => andar(-1, 0)}>← 1</Button>
              <Button variant="ghost" size="sm" onClick={() => mudar(sel, () => ({ dx: 0, dy: 0 }))}>zero</Button>
              <Button variant="outline" size="sm" onClick={() => andar(1, 0)}>→ 1</Button>
              <span />
              <Button variant="outline" size="sm" onClick={() => andar(0, 1)}>↓ 1</Button>
              <span />
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {[[-0.1, 0, '←.1'], [0.1, 0, '→.1'], [0, -0.1, '↑.1'], [0, 0.1, '↓.1']].map(([x, y, r]) => (
                <Button key={String(r)} variant="outline" size="sm" onClick={() => andar(x as number, y as number)}>{r}</Button>
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Setas movem 1 px · <b>Shift</b> 10 px · <b>Alt</b> 0,1 px. Arraste na prancheta para mover a camada
            selecionada. 1 px = 1/{TELA.w} da largura da tela. Cmd/Ctrl+Z desfaz.
          </p>

          <div className="border-t pt-3 text-xs text-muted-foreground">
            {alteradas === 0 ? 'Sem ajustes neste lado.' : `${alteradas} camada${alteradas > 1 ? 's' : ''} ajustada${alteradas > 1 ? 's' : ''} na ${LADO_LABEL[lado].toLowerCase()}.`}
          </div>
        </div>
      </div>

      {historico && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={() => setHistorico(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-sm font-bold">Versões anteriores · {LADO_LABEL[lado]}</div>
            {historico.length === 0 && <p className="text-xs text-muted-foreground">Ainda não há versões anteriores.</p>}
            {historico.map((v) => (
              <div key={v.id} className="flex items-center gap-2 border-b py-2 text-xs">
                <div className="flex-1">
                  <div className="font-semibold">{new Date(v.criado_em).toLocaleString('pt-PT')}</div>
                  <div className="text-muted-foreground">{Object.keys(v.dados ?? {}).length} camada(s) ajustada(s)</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setTrabalho((t) => (registar(t), { ...t, [lado]: v.dados ?? {} })); setHistorico(null); toast.success('Versão carregada no editor. Guarde ou publique para a manter.'); }}>
                  Carregar
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setHistorico(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
