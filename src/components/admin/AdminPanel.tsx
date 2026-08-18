import { useEffect, useState } from 'react';
import { BarChart3, Loader2, LogOut, Moon, Shirt, Sun, Users } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { useTemaStore } from '@/store/useTemaStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import logoUrl from '@/assets/kypzl-logo.png';
import { Button } from '../ui/button';
import { PainelKpis } from './PainelKpis';
import { TabelaLeads } from './TabelaLeads';
import { GestorModelos } from './GestorModelos';

/**
 * Área de administração da KYPZL — `/admin`.
 *
 *   · Resumo: KPIs do funil (leads, peças pedidas, temas mais escolhidos).
 *   · Leads: quem pediu o quê, com o conjunto desenhado tal como o montou.
 *   · Modelos: inserir a arte de camisola, calção e meião.
 *
 * Fica atrás de sessão porque os leads têm dados pessoais — a conta é criada
 * pela KYPZL no painel do Supabase, não há registo aberto aqui.
 */
type Separador = 'resumo' | 'leads' | 'modelos';

const SEPARADORES: { id: Separador; rotulo: string; Icone: typeof Users }[] = [
  { id: 'resumo', rotulo: 'Resumo', Icone: BarChart3 },
  { id: 'leads', rotulo: 'Leads', Icone: Users },
  { id: 'modelos', rotulo: 'Modelos', Icone: Shirt },
];

export function AdminPanel() {
  const email = useAdminStore((s) => s.email);
  const aVerificar = useAdminStore((s) => s.aVerificar);
  const iniciar = useAdminStore((s) => s.iniciar);
  const sair = useAdminStore((s) => s.sair);
  const escuro = useTemaStore((s) => s.tema === 'escuro');
  const alternarTema = useTemaStore((s) => s.alternar);
  const [separador, setSeparador] = useState<Separador>('resumo');

  useEffect(() => iniciar(), [iniciar]);

  if (aVerificar) {
    return (
      <div className="grid h-full place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) return <Entrada />;

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <img
          src={logoUrl}
          alt="KYPZL"
          className="h-7 w-auto shrink-0 dark:brightness-0 dark:invert"
        />
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Administração
        </span>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {SEPARADORES.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              onClick={() => setSeparador(id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                separador === id
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Icone className="h-3.5 w-3.5" />
              {rotulo}
            </button>
          ))}
        </nav>

        <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{email}</span>
        <Button variant="outline" size="sm" onClick={alternarTema} title="Trocar o tema">
          {escuro ? <Sun /> : <Moon />}
        </Button>
        <Button variant="outline" size="sm" onClick={sair} title="Terminar sessão">
          <LogOut />
        </Button>
      </header>

      {/* separadores em ecrãs estreitos, onde o menu do cabeçalho não cabe */}
      <nav className="flex gap-1 border-b p-2 md:hidden">
        {SEPARADORES.map(({ id, rotulo, Icone }) => (
          <button
            key={id}
            onClick={() => setSeparador(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition',
              separador === id ? 'bg-foreground text-background' : 'text-muted-foreground',
            )}
          >
            <Icone className="h-3.5 w-3.5" />
            {rotulo}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {separador === 'resumo' && <PainelKpis />}
        {separador === 'leads' && <TabelaLeads />}
        {separador === 'modelos' && <GestorModelos />}
      </div>
    </div>
  );
}

/** Ecrã de entrada. Sem "criar conta" nem "recuperar palavra-passe": a conta
    é criada e reposta no painel do Supabase, por quem lá tem acesso. */
function Entrada() {
  const entrar = useAdminStore((s) => s.entrar);
  const erro = useAdminStore((s) => s.erro);
  const aEntrar = useAdminStore((s) => s.aEntrar);
  const [email, setEmail] = useState('');
  const [palavra, setPalavra] = useState('');

  return (
    <div className="grid h-full place-items-center bg-background p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          entrar(email.trim(), palavra);
        }}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <img
          src={logoUrl}
          alt="KYPZL"
          className="h-7 w-auto dark:brightness-0 dark:invert"
        />
        <div>
          <h1 className="text-lg font-bold">Administração</h1>
          <p className="text-xs text-muted-foreground">
            Entre com a conta criada no painel do Supabase.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            Supabase não está configurado neste ambiente — sem base de dados
            não há leads nem modelos para mostrar.
          </p>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Palavra-passe</span>
          <input
            type="password"
            required
            value={palavra}
            onChange={(e) => setPalavra(e.target.value)}
            autoComplete="current-password"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground"
          />
        </label>

        {erro && <p className="text-xs font-semibold text-destructive">{erro}</p>}

        <Button type="submit" className="w-full" disabled={aEntrar}>
          {aEntrar && <Loader2 className="animate-spin" />}
          Entrar
        </Button>
      </form>
    </div>
  );
}
