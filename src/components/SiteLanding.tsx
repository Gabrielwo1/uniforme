import { useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  PenTool,
  Phone,
  Printer,
  Scissors,
  Search,
  ShieldCheck,
  Shirt,
  Sparkle,
  Star,
  AtSign,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * Landing page institucional da KYPZL — a porta de entrada real do site
 * (fiel ao design em Figma: node 0:5, "KYPZL V.1 - UX Site - Syntax").
 * O simulador (funil modalidade→categoria→modelo→editor→checkout) só
 * começa quando o utilizador clica "Entrar no simulador" — ver
 * useFlowStore.enterSimulator().
 */

const enterSimulator = () => useFlowStore.getState().enterSimulator();
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const NAV_LINKS = [
  { label: 'Equipamentos', id: 'equipamentos' },
  { label: 'Personalização', id: 'processo' },
  { label: 'Modalidades', id: 'modalidades' },
  { label: 'Como Funciona', id: 'como-funciona' },
  { label: 'Contacto', id: 'contacto' },
];

export function SiteLanding() {
  return (
    <div className="scrollbar-clean h-full overflow-y-auto bg-white text-[#0e0e0e]">
      <Header />
      <Hero />
      <ProcessSection />
      <HowItWorks />
      <ModalitiesSection />
      <PremiumSection />
      <TrainingBanner />
      <LifestyleSection />
      <AccessoriesSection />
      <Testimonials />
      <NewsletterBanner />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------- header */
function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-[#131313] text-white">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-5 sm:px-8">
        <img src={logoUrl} alt="KYPZL" className="h-7 w-auto shrink-0 brightness-0 invert" />

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="text-sm font-medium text-white/75 transition hover:text-white"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/60 sm:inline">
            PT
          </span>
          <Button
            size="sm"
            className="hidden rounded-full sm:inline-flex"
            onClick={enterSimulator}
          >
            Entrar no simulador
          </Button>
          <button
            className="text-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-white/10 bg-[#131313] px-5 pb-4 pt-2 lg:hidden">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                scrollTo(l.id);
                setOpen(false);
              }}
              className="rounded-md px-2 py-2.5 text-left text-sm font-medium text-white/80 hover:bg-white/5"
            >
              {l.label}
            </button>
          ))}
          <Button className="mt-2 rounded-full" onClick={enterSimulator}>
            Entrar no simulador
          </Button>
        </div>
      )}
    </header>
  );
}

/* --------------------------------------------------------------- hero */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
      <div className="absolute inset-0">
        <img src="/site/hero.jpg" alt="" className="h-full w-full object-cover object-top opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      </div>

      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-10 px-5 pb-16 pt-14 sm:px-8 lg:pb-24 lg:pt-20">
        <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl lg:text-[44px]">
          Equipamentos desportivos <span className="text-primary">personalizados</span> para clubes, equipas e atletas
        </h1>

        <div className="grid gap-10 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-end">
          <ul className="space-y-3">
            {[
              'Produção própria',
              'Personalização total',
              'Tecidos técnicos de elevada qualidade',
              'Soluções para todas as modalidades',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 border-b border-white/10 pb-3 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 shrink-0 -rotate-45 text-primary" />
                {item}
              </li>
            ))}
          </ul>

          <div className="max-w-md space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {['/site/mod-futebol.jpg', '/site/mod-basquetebol.jpg', '/site/mod-voleibol.jpg'].map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-[#0a0a0a] object-cover"
                  />
                ))}
              </div>
              <p className="text-sm font-semibold">
                + 8000
                <span className="ml-1 block text-[11px] font-normal text-white/55 sm:inline sm:ml-1">
                  unidades produzidas
                </span>
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Concebemos equipamentos técnicos que combinam desempenho, conforto e identidade. Da
              primeira ideia à produção final, acompanhamos todo o processo para criar soluções
              totalmente personalizadas para a sua equipa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full" onClick={enterSimulator}>
                Entrar no simulador <ArrowUpRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => scrollTo('contacto')}
              >
                Contato
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- processo/qualidade */
function ProcessSection() {
  return (
    <section id="processo" className="mx-auto max-w-[1360px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Todo o processo. <span className="text-primary">Sob o mesmo compromisso</span> de qualidade.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Na KYPZL controlamos todas as etapas da produção, desde o design até à confeção. Este
          modelo permite-nos garantir maior controlo, qualidade consistente e um acompanhamento
          mais próximo em cada projeto.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <ProcessCard
          image="/site/tecidos.jpg"
          tag="Conforto & Performance"
          title="Tecidos técnicos de alta qualidade"
          desc="Materiais respiráveis, leves e resistentes, desenvolvidos para proporcionar o máximo desempenho em competição e treino."
        />
        <ProcessCard
          image="/site/identidade.jpg"
          tag="Design Exclusivo"
          title="Identidade visual da sua equipe"
          desc="Cada equipamento é criado do zero, com sublimação digital, para refletir a identidade única do seu clube ou equipa."
        />
      </div>

      <div className="mt-10 flex justify-center">
        <Button size="lg" className="rounded-full" onClick={enterSimulator}>
          Entrar no simulador <ArrowUpRight />
        </Button>
      </div>
    </section>
  );
}

function ProcessCard({
  image,
  tag,
  title,
  desc,
}: {
  image: string;
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative h-72 overflow-hidden rounded-2xl">
      <img
        src={image}
        alt={title}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{tag}</p>
        <p className="mt-1.5 text-lg font-bold text-white">{title}</p>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/70">{desc}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- como funciona */
const STEPS = [
  {
    n: '01',
    icon: Search,
    title: 'Partilhe a sua ideia conosco.',
    desc: 'Conta-nos sobre a sua equipa, cores, modalidade e tudo o que imagina.',
  },
  {
    n: '02',
    icon: PenTool,
    title: 'Desenvolvemos o design.',
    desc: 'A nossa equipa cria uma proposta visual exclusiva para aprovação.',
  },
  {
    n: '03',
    icon: Printer,
    title: 'Produzimos através de sublimação.',
    desc: 'Imprimimos o design em tecido técnico com cores vibrantes e duradouras.',
  },
  {
    n: '04',
    icon: Scissors,
    title: 'Realizamos o corte e a confeção.',
    desc: 'Cada peça é cortada e cosida com precisão e acabamentos impecáveis.',
  },
  {
    n: '05',
    icon: ShieldCheck,
    title: 'Efetuamos o controlo de qualidade.',
    desc: 'Inspeção rigorosa antes de enviar o equipamento pronto para campo.',
  },
  {
    n: '06',
    icon: PackageCheck,
    title: 'Receba o seu equipamento.',
    desc: 'Entregamos nos prazos acordados, prontos a entrar em campo.',
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/40 py-16 lg:py-24">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Desenvolvemos equipamentos que <span className="text-primary">representam a identidade</span> da sua equipa.
          </h2>
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cada projeto é único. Trabalhamos consigo para criar equipamentos totalmente
              personalizados através de tecnologia de sublimação, materiais técnicos e
              acabamentos de elevada qualidade.
            </p>
            <Button className="mt-5 rounded-full" onClick={() => scrollTo('contacto')}>
              Contato
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Passo {s.n}</p>
              <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-bold leading-snug">{s.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ modalidades */
const MODALITIES_ROW1 = [
  { label: 'Futebol', image: '/site/mod-futebol.jpg' },
  { label: 'Futsal', image: '/site/mod-futsal.jpg' },
  { label: 'Basquetebol', image: '/site/mod-basquetebol.jpg' },
  { label: 'Voleibol', image: '/site/mod-voleibol.jpg' },
];
const MODALITIES_ROW2 = [
  { label: 'Andebol', image: '/site/mod-andebol.jpg' },
  { label: 'Atletismo', image: '/site/mod-atletismo.jpg' },
  { label: 'Hóquei em Patins', image: '/site/mod-hoquei.jpg' },
  { label: 'Outras Modalidades', image: '/site/mod-outras.jpg' },
];

function ModalitiesSection() {
  return (
    <section id="modalidades" className="bg-[#0a0a0a] py-16 text-white lg:py-24">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MODALITIES_ROW1.map((m) => (
              <ModalityCard key={m.label} {...m} />
            ))}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Soluções para <span className="text-primary">qualquer modalidade</span> desportiva
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Produzimos equipamentos personalizados adaptados às exigências de cada modalidade.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODALITIES_ROW2.map((m) => (
            <ModalityCard key={m.label} {...m} />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-xl px-5 text-center sm:px-8">
        <h3 className="text-xl font-bold sm:text-2xl">
          Concebidos para competir ao <span className="text-primary">mais alto nível</span>.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Equipamentos desenvolvidos para proporcionar conforto, resistência e total liberdade de
          movimentos.
        </p>
      </div>
    </section>
  );
}

function ModalityCard({ label, image }: { label: string; image: string }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl">
      <span className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary" />
      <img
        src={image}
        alt={label}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <span className="absolute bottom-3 left-3 text-sm font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
        {label}
      </span>
    </div>
  );
}

/* ----------------------------------------------------- premium/champion */
const PREMIUM_ITEMS = [
  { label: 'Camisolas', Icon: Shirt },
  { label: 'Calções', Icon: Shirt },
  { label: 'Equipamentos de Guarda-Redes', Icon: ShieldCheck },
  { label: 'Meias', Icon: Shirt },
];

function PremiumSection() {
  return (
    <section id="equipamentos" className="mx-auto max-w-[1360px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="relative flex h-[420px] flex-col justify-end overflow-hidden rounded-2xl">
          <img src="/site/premium.jpg" alt="Linha Premium" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="relative p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Linha</p>
            <p className="text-4xl font-extrabold text-white">Premium</p>
            <p className="mt-1 text-sm font-medium text-white/70">Desempenho de Elite</p>
            <ul className="mt-4 space-y-2">
              {PREMIUM_ITEMS.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-white/85">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </li>
              ))}
            </ul>
            <Button className="mt-5 rounded-full" onClick={enterSimulator}>
              Entrar no simulador <ArrowUpRight />
            </Button>
          </div>
        </div>

        <div className="relative flex h-[420px] flex-col justify-end overflow-hidden rounded-2xl">
          <img src="/site/champion.jpg" alt="Linha Champion" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <p className="relative p-7 text-3xl font-extrabold text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
            Champion
          </p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- banner treino */
const TREINO_TAGS = [
  'T-Shirts Técnicas',
  'Sweats',
  'Calças',
  'Corta-Ventos',
  'Coletes',
  'Vestuário Térmico',
];

function TrainingBanner() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-16 text-white lg:py-24">
      <img src="/site/treino-banner.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />

      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold sm:text-3xl">
            <span className="text-primary">Preparados</span> para acompanhar cada treino.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            A coleção de treino KYPZL combina conforto, respirabilidade e durabilidade para
            responder às exigências do dia a dia.
          </p>
          <Button className="mt-5 rounded-full" onClick={enterSimulator}>
            Entrar no simulador <ArrowUpRight />
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap gap-2.5 lg:mt-0 lg:max-w-sm lg:justify-end lg:absolute lg:right-8 lg:top-1/2 lg:-translate-y-1/2">
          {TREINO_TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-semibold backdrop-blur"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ lifestyle */
const LIFESTYLE_ITEMS = ['Kits', 'Casacos', 'Blusões', 'Polos', 'Calças', 'Bermudas', 'Coletes'];

function LifestyleSection() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center">
        <div className="relative h-[480px] overflow-hidden rounded-2xl">
          <img src="/site/lifestyle.jpg" alt="Lifestyle & Viagem" className="h-full w-full object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
            Lifestyle &amp; Viagem
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Uma imagem <span className="text-primary">profissional</span> dentro e fora da competição.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Coleção desenvolvida para deslocações, eventos e representação institucional,
            mantendo o conforto e a identidade visual da equipa.
          </p>

          <div className="mt-6 divide-y rounded-xl border">
            {LIFESTYLE_ITEMS.map((item) => (
              <button
                key={item}
                onClick={enterSimulator}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition hover:bg-muted/60"
              >
                {item}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <Button className="mt-6 rounded-full" onClick={() => scrollTo('contacto')}>
            Contato
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- acessórios */
function AccessoriesSection() {
  return (
    <section className="bg-muted/40 py-16 lg:py-24">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Tudo o que a sua equipa precisa <span className="text-primary">num só lugar</span>.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Complete o equipamento com acessórios desenvolvidos para facilitar o transporte, a
            organização e a utilização diária.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <AccessoryCard
            image="/site/acc-mochilas.jpg"
            title="Mochilas"
            desc="Compactas e organizadas para o essencial do dia a dia."
            className="h-72 sm:h-auto sm:flex-1"
          />
          <div className="flex flex-col gap-4 sm:w-2/5">
            <AccessoryCard image="/site/acc-sacos.jpg" title="Sacos Desportivos" className="h-52 sm:flex-1" />
            <AccessoryCard image="/site/acc-trolleys.jpg" title="Trolleys" className="h-52 sm:flex-1" />
          </div>
        </div>
      </div>
    </section>
  );
}

function AccessoryCard({
  image,
  title,
  desc,
  className,
}: {
  image: string;
  title: string;
  desc?: string;
  className?: string;
}) {
  return (
    <div className={cn('group relative overflow-hidden rounded-2xl', className)}>
      <img
        src={image}
        alt={title}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5">
        <div>
          <p className="text-base font-bold text-white">{title}</p>
          {desc && <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-white/70">{desc}</p>}
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- testemunhos */
const TESTIMONIALS = [
  {
    quote:
      'A KYPZL superou todas as expectativas. Os equipamentos chegaram no prazo, com qualidade excecional e o design ficou exatamente como queríamos.',
    initials: 'JS',
    name: 'João Silva',
    role: 'Diretor Desportivo · SC Porto',
  },
  {
    quote:
      'A atenção ao detalhe e o acompanhamento da KYPZL são incomparáveis. Recomendamos sem hesitar a qualquer clube.',
    initials: 'MS',
    name: 'Maria Santos',
    role: 'Presidente · AD Norte',
  },
  {
    quote:
      'Os nossos atletas adoraram os equipamentos. A qualidade dos tecidos e o conforto fizeram toda a diferença na performance.',
    initials: 'CM',
    name: 'Carlos Mendes',
    role: 'Treinador · FC Atlético',
  },
  {
    quote:
      'Profissionalismo do início ao fim. Da primeira reunião à entrega, sentimos que a KYPZL vestiu a camisola do nosso clube.',
    initials: 'RP',
    name: 'Rita Pereira',
    role: 'Coordenadora · Ginásio Clube',
  },
];

function Testimonials() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {t.initials}
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- newsletter */
function NewsletterBanner() {
  return (
    <section className="border-t bg-[#0a0a0a] py-10 text-white">
      <div className="mx-auto flex max-w-[1360px] flex-col items-center gap-4 px-5 text-center sm:flex-row sm:justify-between sm:text-left sm:px-8">
        <p className="text-sm font-medium text-white/80">
          Siga a KYPZL e acompanhe os nossos projetos mais recentes
        </p>
        <Button
          asChild
          variant="secondary"
          className="rounded-full"
        >
          <a href="https://instagram.com/kypzl_" target="_blank" rel="noreferrer">
            Seguir no Instagram <ArrowUpRight />
          </a>
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer */
function Footer() {
  return (
    <footer id="contacto" className="bg-[#0a0a0a] pt-14 text-white">
      <div className="mx-auto grid max-w-[1360px] gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[280px_1fr_1fr]">
        <div>
          <img src={logoUrl} alt="KYPZL" className="h-7 w-auto brightness-0 invert" />
          <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-white/55">
            Siga a KYPZL e acompanhe os nossos projetos mais recentes.
          </p>
          <div className="mt-4 flex gap-2.5">
            <a
              href="https://instagram.com/kypzl_"
              target="_blank"
              rel="noreferrer"
              title="Instagram @kypzl_"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-primary hover:text-primary"
            >
              <AtSign className="h-4 w-4" />
            </a>
            <a
              href="https://www.kypzl.pt"
              target="_blank"
              rel="noreferrer"
              title="www.kypzl.pt"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-primary hover:text-primary"
            >
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Navegação</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/65">
            {[
              { label: 'Equipamentos de Jogo', action: enterSimulator },
              { label: 'Equipamentos de Treino', action: enterSimulator },
              { label: 'Vestuário de Saída', action: enterSimulator },
              { label: 'Material e Acessórios', action: enterSimulator },
              { label: 'Kits', action: enterSimulator },
              { label: 'Personalização', action: () => scrollTo('processo') },
              { label: 'Contacto', action: () => scrollTo('contacto') },
            ].map((l) => (
              <li key={l.label}>
                <button onClick={l.action} className="transition hover:text-white">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Contactos</p>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-white/40" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/40">Telefone</p>
                <a href="tel:+351912300289" className="font-medium text-white/85 hover:text-white">
                  +351 912 300 289
                </a>
              </div>
            </li>
            <li className="flex gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-white/40" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/40">E-mail</p>
                <a href="mailto:info@kypzl.pt" className="font-medium text-white/85 hover:text-white">
                  info@kypzl.pt
                </a>
              </div>
            </li>
            <li className="flex gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-white/40" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/40">Morada</p>
                <p className="font-medium text-white/85">
                  Rua Padre Cruz 22, 4765-383 Oliveira São Mateus, Portugal
                </p>
              </div>
            </li>
            <li className="flex gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-white/40" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/40">Horário</p>
                <p className="font-medium text-white/85">Seg - Sex: 09h00 às 18h00</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-2 px-5 text-xs text-white/40 sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} KYPZL. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1.5">
            <Sparkle className="h-3 w-3" />
            <MessageCircle className="hidden h-3 w-3" />
            Feito com sublimação de alta qualidade
          </p>
        </div>
      </div>
    </footer>
  );
}
