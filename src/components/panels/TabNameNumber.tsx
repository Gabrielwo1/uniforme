import { Hash, Plus, Trash2, Type } from 'lucide-react';
import { useDesignStore } from '@/store/useDesignStore';
import { FONTS } from '@/lib/fonts';
import type { TextElement } from '@/types/design';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DebouncedColor,
  DebouncedText,
  NumberSlider,
} from '../ui/DebouncedControls';

/** Predefinições de posição (relativas) por tipo. */
const LAYOUTS: Record<string, { label: string; x: number; y: number }[]> = {
  name: [
    { label: 'Costas (topo)', x: 0.5, y: 0.34 },
    { label: 'Frente (peito)', x: 0.5, y: 0.42 },
  ],
  number: [
    { label: 'Costas (centro)', x: 0.5, y: 0.55 },
    { label: 'Peito (esq.)', x: 0.36, y: 0.34 },
  ],
  text: [
    { label: 'Centro', x: 0.5, y: 0.5 },
    { label: 'Inferior', x: 0.5, y: 0.78 },
  ],
};

const KIND_LABEL = { name: 'Nome', number: 'Número', text: 'Texto' } as const;

export function TabNameNumber() {
  const side = useDesignStore((s) => s.design.side);
  const elements = useDesignStore((s) => s.design.elements);
  const selectedId = useDesignStore((s) => s.selectedId);
  const addText = useDesignStore((s) => s.addText);
  const setSelected = useDesignStore((s) => s.setSelected);
  const removeElement = useDesignStore((s) => s.removeElement);

  const texts = elements.filter(
    (e): e is TextElement => e.type === 'text' && e.side === side,
  );
  const selected = texts.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => addText('name')}>
          <Plus /> Nome
        </Button>
        <Button variant="outline" size="sm" onClick={() => addText('number')}>
          <Hash /> Nº
        </Button>
        <Button variant="outline" size="sm" onClick={() => addText('text')}>
          <Type /> Texto
        </Button>
      </div>

      {texts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Elementos ({side === 'front' ? 'frente' : 'verso'})
          </p>
          {texts.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition',
                selectedId === t.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/40',
              )}
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {KIND_LABEL[t.kind]}
              </span>
              <span className="truncate">{t.value || '—'}</span>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <TextEditor el={selected} onDelete={() => removeElement(selected.id)} />
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Adicione um nome, número ou texto e selecione-o (aqui ou no canvas)
          para editar fonte, tamanho e cores.
        </p>
      )}
    </div>
  );
}

function TextEditor({ el, onDelete }: { el: TextElement; onDelete: () => void }) {
  const update = useDesignStore((s) => s.updateElement);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Editar {KIND_LABEL[el.kind]}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Conteúdo</Label>
        <DebouncedText value={el.value} onCommit={(v) => update(el.id, { value: v })} />
      </div>

      <div className="space-y-1.5">
        <Label>Fonte</Label>
        <Select
          value={el.fontFamily}
          onValueChange={(v) => update(el.id, { fontFamily: v })}
        >
          <SelectTrigger style={{ fontFamily: el.fontFamily }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <NumberSlider
        label="Tamanho"
        value={el.fontSize}
        min={16}
        max={360}
        onChange={(v) => update(el.id, { fontSize: v })}
      />

      <DebouncedColor
        label="Preenchimento"
        value={el.fill}
        onCommit={(v) => update(el.id, { fill: v })}
      />
      <DebouncedColor
        label="Contorno"
        value={el.stroke ?? '#000000'}
        onCommit={(v) => update(el.id, { stroke: v })}
      />
      <NumberSlider
        label="Espessura do contorno"
        value={el.strokeWidth ?? 0}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => update(el.id, { strokeWidth: v })}
      />

      <div className="space-y-1.5">
        <Label>Posição</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {LAYOUTS[el.kind].map((l) => (
            <Button
              key={l.label}
              variant="outline"
              size="sm"
              className="text-[11px]"
              onClick={() => update(el.id, { x: l.x, y: l.y })}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
