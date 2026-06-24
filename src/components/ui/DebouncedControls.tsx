import { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Slider } from './slider';
import { Label } from './label';

/**
 * Inputs controlados com DEBOUNCE antes de aplicar ao store/canvas.
 * Evita re-render/medição do Fabric a cada tecla ou pixel do color picker
 * (seção 2 do hand-off: debounce de 150–250ms).
 */

const DELAY = 200;

function useDebouncedCommit(value: string, onCommit: (v: string) => void) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setLocal(value);
  }, [value]);

  const update = (v: string) => {
    setLocal(v);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dirty.current = false;
      onCommit(v);
    }, DELAY);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return [local, update] as const;
}

export function DebouncedText({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [local, update] = useDebouncedCommit(value, onCommit);
  return (
    <Input
      value={local}
      placeholder={placeholder}
      onChange={(e) => update(e.target.value)}
    />
  );
}

export function DebouncedColor({
  value,
  onCommit,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  label?: string;
}) {
  const [local, update] = useDebouncedCommit(value, onCommit);
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <span
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border shadow-sm ring-1 ring-black/5"
        style={{ background: local }}
      >
        <input
          type="color"
          value={local}
          onChange={(e) => update(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
      <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
        {local}
      </span>
    </label>
  );
}

export function NumberSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
