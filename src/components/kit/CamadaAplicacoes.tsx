import { useEffect, useReducer } from 'react';
import type { Aplicacao, LadoKit, PecaKit } from '@/types/kit';
import { fontePorId, localPorId } from '@/lib/kitLocais';

/**
 * Desenha os nomes, números e logos sobre uma peça.
 *
 * Entra como `children` do `PecaMockup`, ou seja, por cima da cor, da
 * estampa e do sombreado — que é a ordem real: o nome é aplicado sobre o
 * tecido já estampado. A camada é recortada pela mesma máscara da peça,
 * por isso um escudo grande demais fica cortado na costura em vez de
 * flutuar ao lado da camisola.
 */
export function CamadaAplicacoes({
  aplicacoes,
  peca,
  lado,
  viewBox,
  mascara,
  destaque,
}: {
  aplicacoes: Aplicacao[];
  peca: PecaKit;
  lado: LadoKit;
  viewBox: string;
  /** PNG da zona do corpo — o alfa recorta as aplicações à peça. */
  mascara?: string;
  /** Local a assinalar com uma guia, enquanto se mexe nele no painel. */
  destaque?: string | null;
}) {
  useEsperarFontes();

  const visiveis = aplicacoes.filter((a) => {
    const local = localPorId(a.localId);
    return local?.peca === peca && local.lado === lado && temConteudo(a);
  });

  const guia = destaque ? localPorId(destaque) : undefined;
  const mostrarGuia = guia?.peca === peca && guia.lado === lado;
  if (visiveis.length === 0 && !mostrarGuia) return null;

  const estilo: React.CSSProperties = mascara
    ? {
        WebkitMaskImage: `url(${mascara})`,
        maskImage: `url(${mascara})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }
    : {};

  return (
    <>
      <svg
        viewBox={viewBox}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={estilo}
      >
        {visiveis.map((a) => (
          <Aplicada key={a.id} aplicacao={a} />
        ))}
      </svg>

      {/* a guia fica FORA da máscara de propósito: se o local resvalar para
          fora da peça, é precisamente isso que o utilizador precisa de ver */}
      {mostrarGuia && (
        <svg viewBox={viewBox} className="pointer-events-none absolute inset-0 h-full w-full">
          <rect
            x={guia.caixa.x}
            y={guia.caixa.y}
            width={guia.caixa.w}
            height={guia.caixa.h}
            fill="none"
            stroke="#2563eb"
            strokeWidth={6}
            strokeDasharray="18 12"
            rx={8}
          />
        </svg>
      )}
    </>
  );
}

function temConteudo(a: Aplicacao): boolean {
  return a.tipo === 'logo' ? Boolean(a.imagem) : Boolean(a.texto?.trim());
}

function Aplicada({ aplicacao: a }: { aplicacao: Aplicacao }) {
  const local = localPorId(a.localId);
  if (!local) return null;

  const { caixa } = local;
  const w = caixa.w * a.escala;
  const h = caixa.h * a.escala;
  // o deslocamento é fração da caixa DO LOCAL, não da caixa já escalada:
  // assim o passo do ajuste fino não muda quando se mexe no tamanho
  const cx = caixa.x + caixa.w / 2 + a.dx * caixa.w;
  const cy = caixa.y + caixa.h / 2 + a.dy * caixa.h;

  if (a.tipo === 'logo') {
    return (
      <image
        href={a.imagem}
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  const texto = (a.texto ?? '').trim();
  const fonte = fontePorId(a.fonteId);
  const corpo = corpoQueEncaixa(texto, fonte.css, w, h);

  return (
    <text
      x={cx}
      y={cy}
      fontFamily={fonte.css}
      fontSize={corpo}
      fill={a.cor}
      stroke={a.corContorno || 'none'}
      strokeWidth={a.corContorno ? corpo * 0.07 : 0}
      // o contorno desenha-se ATRÁS do preenchimento; sem isto o traço come
      // metade da espessura da letra e o número fica ilegível
      paintOrder="stroke"
      strokeLinejoin="round"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {texto}
    </text>
  );
}

/* ------------------------------------------------------------- medição -- */

let contexto: CanvasRenderingContext2D | null | undefined;

/**
 * Maior corpo de letra que cabe na caixa.
 *
 * A largura é MEDIDA (canvas 2D, mesma família que o SVG vai usar) em vez de
 * estimada por um fator médio: as famílias de desporto são condensadas em
 * graus muito diferentes — um "GONÇALVES" em Bebas ocupa quase metade do que
 * ocupa em Inter — e um fator único deixaria umas a transbordar e outras
 * ridiculamente pequenas.
 */
function corpoQueEncaixa(texto: string, css: string, w: number, h: number): number {
  if (contexto === undefined) contexto = document.createElement('canvas').getContext('2d');
  if (!contexto || !texto) return h;
  contexto.font = `100px ${css}`;
  const largura = contexto.measureText(texto).width;
  if (largura <= 0) return h;
  return Math.min(h, (w / largura) * 100);
}

/**
 * Volta a desenhar quando as fontes web acabarem de carregar.
 *
 * A medição feita antes disso usa a fonte de recurso e sai errada — o texto
 * ficaria com o tamanho de outra família. Um render extra resolve.
 */
function useEsperarFontes() {
  const [, redesenhar] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (vivo) redesenhar();
    });
    return () => {
      vivo = false;
    };
  }, []);
}
