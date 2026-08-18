import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  FileUp,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { admin } from '@/lib/adminApi';
import type { KitTemplateRow } from '@/lib/api';
import { useAdminStore } from '@/store/useAdminStore';
import {
  converterMolde,
  ErroDeMolde,
  pesoAproximado,
  type MoldeConvertido,
} from '@/lib/converterMolde';
import { PECAS_KIT, PECA_LABEL, type PecaKit } from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Espera } from './PainelKpis';

/**
 * Inserir modelos novos.
 *
 * A regra que mantém isto simples: um modelo é a arte de UMA PEÇA. Envia-se
 * a camisola, o calção e o meião em separado, cada um com o seu ficheiro, e
 * o que os junta num tema é o Cód. Modelo — o mesmo número que o cadeado do
 * simulador usa para sincronizar. Um tema com só a camisola é válido: as
 * outras peças ficam com a cor base.
 *
 * Nada é guardado às cegas. Cada ficheiro é convertido AQUI, no browser, e o
 * painel mostra o que encontrou — caixa do molde, cor de fundo, camadas —
 * antes de deixar gravar. Se o ficheiro não estiver no formato, diz porquê
 * em vez de gravar um modelo partido.
 */
type Estado =
  | { fase: 'vazio' }
  | { fase: 'erro'; mensagem: string; ficheiro: string }
  | { fase: 'pronto'; molde: MoldeConvertido; ficheiro: string };

export function GestorModelos() {
  const codigo = useAdminStore((s) => s.codigo)!;
  const [nome, setNome] = useState('');
  const [codModelo, setCodModelo] = useState('');
  const [pecas, setPecas] = useState<Record<PecaKit, Estado>>({
    camisola: { fase: 'vazio' },
    calcao: { fase: 'vazio' },
    meiao: { fase: 'vazio' },
  });
  const [aGuardar, setAGuardar] = useState(false);
  const [guardados, setGuardados] = useState<KitTemplateRow[] | null>(null);

  const recarregar = () => admin.modelos(codigo).then(setGuardados);
  useEffect(() => {
    recarregar();
  }, []);

  const prontas = PECAS_KIT.filter((p) => pecas[p].fase === 'pronto');
  const podeGuardar = nome.trim() !== '' && codModelo.trim() !== '' && prontas.length > 0;

  const limpar = () => {
    setNome('');
    setCodModelo('');
    setPecas({ camisola: { fase: 'vazio' }, calcao: { fase: 'vazio' }, meiao: { fase: 'vazio' } });
  };

  const guardar = async () => {
    if (!podeGuardar) return;
    setAGuardar(true);
    try {
      // uma peça de cada vez, e para se ao primeiro erro: gravar metade de
      // um tema e dizer que correu bem seria pior do que não gravar nada
      for (const peca of prontas) {
        const estado = pecas[peca];
        if (estado.fase !== 'pronto') continue;
        await admin.guardarModelo(codigo, {
          cod_modelo: codModelo.trim(),
          nome: nome.trim(),
          peca,
          lado: 'frente',
          quadro: estado.molde.quadro,
          cor_fundo: estado.molde.corFundo,
          camadas: estado.molde.camadas,
        });
      }
      toast.success(
        `${nome.trim()} guardado — ${prontas.map((p) => PECA_LABEL[p]).join(', ')}.`,
      );
      limpar();
      await recarregar();
    } catch (e) {
      toast.error(`Não foi possível guardar: ${(e as Error).message}`);
    } finally {
      setAGuardar(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold">Novo modelo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Um ficheiro por peça. O Cód. Modelo é o que junta as três num
            tema — use o mesmo código para camisola, calção e meião.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Nome do tema
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Aston Vila"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Cód. Modelo
            </span>
            <input
              value={codModelo}
              onChange={(e) => setCodModelo(e.target.value.replace(/\s/g, ''))}
              placeholder="007"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm font-bold outline-none focus:border-foreground"
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {PECAS_KIT.map((peca) => (
            <ZonaDaPeca
              key={peca}
              peca={peca}
              estado={pecas[peca]}
              onEstado={(e) => setPecas((v) => ({ ...v, [peca]: e }))}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button onClick={guardar} disabled={!podeGuardar || aGuardar}>
            {aGuardar ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar modelo
          </Button>
          <Button variant="outline" onClick={limpar} disabled={aGuardar}>
            Limpar
          </Button>
          <p className="text-xs text-muted-foreground">
            {prontas.length === 0
              ? 'Carregue pelo menos uma peça.'
              : `${prontas.length} peça(s) prontas: ${prontas
                  .map((p) => PECA_LABEL[p])
                  .join(', ')}.`}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Modelos guardados</h2>
        {guardados === null ? (
          <Espera />
        ) : guardados.length === 0 ? (
          <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Ainda não há modelos na base de dados. (O tema Milan é o único
            embutido no código e não aparece nesta lista.)
          </p>
        ) : (
          <ListaGuardados linhas={guardados} aoMudar={recarregar} />
        )}
      </section>
    </div>
  );
}

/** Uma peça: largar o ficheiro, ver o que saiu de lá. */
function ZonaDaPeca({
  peca,
  estado,
  onEstado,
}: {
  peca: PecaKit;
  estado: Estado;
  onEstado: (e: Estado) => void;
}) {
  const [sobre, setSobre] = useState(false);

  const ler = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.svg$/i.test(f.name)) {
      onEstado({ fase: 'erro', ficheiro: f.name, mensagem: 'O ficheiro tem de ser .svg.' });
      return;
    }
    try {
      const molde = converterMolde(await f.text());
      onEstado({ fase: 'pronto', molde, ficheiro: f.name });
    } catch (e) {
      onEstado({
        fase: 'erro',
        ficheiro: f.name,
        mensagem:
          e instanceof ErroDeMolde ? e.message : 'Não foi possível ler este ficheiro.',
      });
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        ler(e.dataTransfer.files[0]);
      }}
      className={cn(
        'space-y-2 rounded-lg border-2 border-dashed p-3 transition',
        sobre && 'border-primary bg-primary/5',
        estado.fase === 'pronto' && 'border-solid border-border bg-muted/30',
        estado.fase === 'erro' && 'border-destructive/50 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold">{PECA_LABEL[peca]}</span>
        {estado.fase === 'pronto' && <Check className="h-3.5 w-3.5 text-primary" />}
        {estado.fase !== 'vazio' && (
          <button
            onClick={() => onEstado({ fase: 'vazio' })}
            title="Remover"
            className="ml-auto text-muted-foreground transition hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {estado.fase === 'vazio' && (
        <label className="flex cursor-pointer flex-col items-center gap-1.5 py-5 text-center">
          <FileUp className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            Arraste o SVG do molde
            <br />
            ou clique para escolher
          </span>
          <input
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={(e) => ler(e.target.files?.[0])}
          />
        </label>
      )}

      {estado.fase === 'erro' && (
        <div className="space-y-1">
          <p className="truncate text-[11px] font-semibold">{estado.ficheiro}</p>
          <p className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            {estado.mensagem}
          </p>
        </div>
      )}

      {estado.fase === 'pronto' && <Resultado molde={estado.molde} ficheiro={estado.ficheiro} />}
    </div>
  );
}

/** O que a conversão encontrou, desenhado — é a prova de que vai funcionar
    antes de haver qualquer coisa gravada. */
function Resultado({ molde, ficheiro }: { molde: MoldeConvertido; ficheiro: string }) {
  const { quadro, corFundo, camadas, avisos } = molde;
  const kb = Math.round(pesoAproximado(molde) / 1024);

  return (
    <div className="space-y-2">
      <p className="truncate text-[11px] font-semibold">{ficheiro}</p>

      <div
        className="overflow-hidden rounded-md border"
        style={{ backgroundColor: corFundo ?? 'transparent' }}
      >
        <svg
          viewBox={`${quadro.x} ${quadro.y} ${quadro.w} ${quadro.h}`}
          className="h-32 w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {camadas.map((c) => (
            <g key={c.id} dangerouslySetInnerHTML={{ __html: c.svg }} />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {camadas.map((c, i) => (
          <span
            key={c.id}
            title={`Camada ${String.fromCharCode(65 + i)} · ${c.cor}`}
            className="h-4 w-4 rounded border"
            style={{ backgroundColor: c.cor }}
          />
        ))}
        <span className="ml-1 text-[10px] text-muted-foreground">
          {camadas.length} camada(s) · {kb} KB
        </span>
      </div>

      {avisos.map((a) => (
        <p key={a} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {a}
        </p>
      ))}
    </div>
  );
}

/** Modelos já na base de dados, agrupados pelo código que os une num tema. */
function ListaGuardados({
  linhas,
  aoMudar,
}: {
  linhas: KitTemplateRow[];
  aoMudar: () => void;
}) {
  const codigo = useAdminStore((s) => s.codigo)!;
  const apagar = (id: string) => admin.apagarModelo(codigo, id).then(aoMudar);
  const porTema = new Map<string, KitTemplateRow[]>();
  for (const l of linhas) {
    porTema.set(l.cod_modelo, [...(porTema.get(l.cod_modelo) ?? []), l]);
  }

  return (
    <div className="space-y-2">
      {[...porTema.entries()].map(([cod, pecas]) => (
        <div key={cod} className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{pecas[0].nome}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
              Cód. {cod}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {pecas.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2 py-1.5',
                  !p.enabled && 'opacity-50',
                )}
              >
                <span className="text-xs font-semibold">{PECA_LABEL[p.peca]}</span>
                <span className="flex gap-0.5">
                  {p.camadas.map((c) => (
                    <span
                      key={c.id}
                      className="h-3 w-3 rounded-sm border"
                      style={{ backgroundColor: c.cor }}
                    />
                  ))}
                </span>
                <button
                  onClick={() => admin.alternarModelo(codigo, p.id, !p.enabled).then(aoMudar)}
                  title={p.enabled ? 'Esconder do simulador' : 'Mostrar no simulador'}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  {p.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Apagar ${PECA_LABEL[p.peca]} de ${p.nome}?`)) {
                      apagar(p.id);
                    }
                  }}
                  title="Apagar"
                  className="text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
