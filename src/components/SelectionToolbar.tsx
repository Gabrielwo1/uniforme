import { BringToFront, SendToBack, Trash2 } from 'lucide-react';
import { useDesignStore } from '@/store/useDesignStore';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';

/** Ações sobre o objeto selecionado: camadas e exclusão. */
export function SelectionToolbar() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const bringForward = useDesignStore((s) => s.bringForward);
  const sendBackward = useDesignStore((s) => s.sendBackward);
  const removeElement = useDesignStore((s) => s.removeElement);

  if (!selectedId) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-md backdrop-blur">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => bringForward(selectedId)}>
            <BringToFront />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Trazer para frente</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => sendBackward(selectedId)}>
            <SendToBack />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Enviar para trás</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => removeElement(selectedId)}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Excluir (Delete)</TooltipContent>
      </Tooltip>
    </div>
  );
}
