import logoUrl from '@/assets/kypzl-logo.png';

/**
 * Tela de carregamento do simulador: a logo da KYPZL ESTÁTICA sobre o
 * fundo do estádio, com uma fila de chevrons — a seta da própria marca —
 * a acender em sequência, à maneira dos ecrãs desportivos.
 *
 * Não é decoração pura — o simulador tem mesmo trabalho a fazer no arranque
 * (os temas convertidos pesam ~3 MB de vetores e os da base de dados vêm
 * pela rede). A tela segura o ecrã enquanto isso acontece, com um MÍNIMO de
 * ~3 s (pedido do cliente): menos que isso e ela pisca em vez de apresentar
 * a marca; o mínimo também evita o flash nos carregamentos instantâneos de
 * cache.
 *
 * A animação é CSS (ver index.css): um keyframe não justifica Lottie, e
 * fica pronto no primeiro frame — antes de qualquer JS carregar.
 */
const SETAS = 5;

export function TelaCarregamento() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background">
      {/* o mesmo campo do simulador, esbatido: a tela é um antegosto do
          ecrã que vem a seguir, não um ecrã à parte */}
      <img
        src="/moldes/fundo.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/80"
      />

      <div className="relative flex flex-col items-center gap-6">
        <img
          src={logoUrl}
          alt="KYPZL"
          className="h-12 w-auto dark:brightness-0 dark:invert"
        />

        {/* o desfasamento entre setas dá a onda a correr para a direita */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: SETAS }, (_, i) => (
            <span
              key={i}
              className="seta-a-carregar"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          A preparar o simulador…
        </p>
      </div>
    </div>
  );
}
