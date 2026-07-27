import type { OrderCustomer } from '@/types/order';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

/**
 * Formulário de contacto do pedido — partilhado entre o passo 'form' do
 * CartDrawer (onde é preenchido, antes da geração da foto por IA) e o
 * checkout (onde pode ser revisto/corrigido antes do envio).
 *
 * Controlado: o estado vive em quem usa (normalmente o useOrderStore), para
 * que os dados sobrevivam à navegação entre painel e checkout.
 */

/** Mínimo para enviar o pedido: nome utilizável + e-mail plausível. */
export function isCustomerValid(c: OrderCustomer): boolean {
  return c.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(c.email);
}

export function CustomerForm({
  value,
  onChange,
  idPrefix = 'ord',
  className,
  autoFocus,
}: {
  value: OrderCustomer;
  onChange: (customer: OrderCustomer) => void;
  /** Prefixo dos ids — evita colisão quando o form aparece em dois sítios. */
  idPrefix?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const set =
    (k: keyof OrderCustomer) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [k]: e.target.value });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome *</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={set('name')}
          placeholder="O seu nome"
          autoFocus={autoFocus}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>E-mail *</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={value.email}
          onChange={set('email')}
          placeholder="nome@exemplo.pt"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>Telefone</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={value.phone ?? ''}
            onChange={set('phone')}
            placeholder="+351 ..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-club`}>Clube / Equipa</Label>
          <Input
            id={`${idPrefix}-club`}
            value={value.club ?? ''}
            onChange={set('club')}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>Observações</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={value.notes ?? ''}
          onChange={set('notes')}
          placeholder="Quantidades, tamanhos, prazos…"
        />
      </div>
    </div>
  );
}
