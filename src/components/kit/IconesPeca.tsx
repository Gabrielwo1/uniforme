/**
 * Miniaturas de traço das peças, para os cartões-opção dos painéis de
 * personalização (nome/número e escudo/logos): a camisola, o calção e o
 * meião em contorno, com as MARCAS da configuração (texto, escudo, barra
 * de patrocínio) desenhadas por cima como filhos SVG — é o ícone "igual à
 * configuração" do concorrente.
 *
 * Tudo na mesma gramática dos ícones do app: viewBox 60×60, traço 2,
 * `currentColor`.
 */

const BASE = {
  viewBox: '0 0 60 60',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinejoin: 'round' as const,
  className: 'h-14 w-14 text-muted-foreground',
};

export function CamisolaIcone({
  verso = false,
  children,
}: {
  verso?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <svg {...BASE}>
      <path d="M22 10 8 16l4 10 6-3v29h24V23l6 3 4-10-14-6c-2 3-6 4-8 4s-6-1-8-4Z" />
      {/* gola: curva na frente, reta no verso */}
      {verso ? <path d="M24 10h12" /> : <path d="M23 10c2 4 5 5 7 5s5-1 7-5" />}
      {children}
    </svg>
  );
}

export function CalcaoIcone({ children }: { children?: React.ReactNode }) {
  return (
    <svg {...BASE}>
      <path d="M12 18h36l4 28H36l-6-16-6 16H8Z" />
      {children}
    </svg>
  );
}

export function MeiaoIcone({ children }: { children?: React.ReactNode }) {
  return (
    <svg {...BASE}>
      <path d="M24 8h14v24c0 5 8 7 8 13 0 5-5 7-9 7-7 0-13-5-13-12Z" />
      <path d="M24 14h14" />
      {children}
    </svg>
  );
}

/** Texto de marca (NOME, 10) para pôr dentro de um ícone. */
export function MarcaTexto({
  x,
  y,
  corpo,
  tamanho,
}: {
  x: number;
  y: number;
  corpo: string;
  tamanho: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={tamanho}
      fontWeight={800}
      fill="currentColor"
      stroke="none"
    >
      {corpo}
    </text>
  );
}

/** Escudinho de clube, centrado em (cx, cy). */
export function MarcaEscudo({ cx, cy, escala = 1 }: { cx: number; cy: number; escala?: number }) {
  return (
    <path
      d={`M${cx} ${cy - 5} l5 2 v4 c0 4 -3 6 -5 7 c-2 -1 -5 -3 -5 -7 v-4 Z`}
      fill="currentColor"
      stroke="none"
      transform={escala !== 1 ? `scale(${escala})` : undefined}
    />
  );
}

/** Barra de patrocínio, centrada em (cx, cy). */
export function MarcaBarra({
  cx,
  cy,
  w = 20,
  h = 6,
}: {
  cx: number;
  cy: number;
  w?: number;
  h?: number;
}) {
  return (
    <rect
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      rx={1}
      fill="currentColor"
      stroke="none"
      opacity={0.85}
    />
  );
}
