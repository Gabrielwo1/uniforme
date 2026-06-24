/**
 * Ponte entre a UI (Topbar) e o canvas Fabric, que vive dentro do <CanvasStage>.
 *
 * Mantém operações não-serializáveis (exportar PNG, zoom do viewport) FORA do
 * store de design — o store guarda apenas dados puros/JSON. O CanvasStage
 * registra suas funções aqui ao montar e as remove ao desmontar.
 */
export interface CanvasBridge {
  exportPNG: (multiplier?: number) => string | null;
  fitView: () => void;
}

const bridge: CanvasBridge = {
  exportPNG: () => null,
  fitView: () => {},
};

export function registerCanvas(api: Partial<CanvasBridge>) {
  Object.assign(bridge, api);
}

export function getCanvas(): CanvasBridge {
  return bridge;
}
