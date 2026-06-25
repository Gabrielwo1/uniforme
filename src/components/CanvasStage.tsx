import { useEffect, useRef } from 'react';
import { Canvas, FabricImage, FabricObject, IText, Point } from 'fabric';
import { useDesignStore } from '@/store/useDesignStore';
import { registerCanvas } from '@/lib/canvasBridge';
import { ensureFontLoaded } from '@/lib/fonts';
import type { DesignElement, ImageElement, TextElement } from '@/types/design';
import { SideToggle } from './SideToggle';
import { SelectionToolbar } from './SelectionToolbar';

/**
 * Espaço lógico fixo do palco (quadrado). Todas as coordenadas internas vivem
 * em 0..STAGE; as posições no store são relativas (0..1) e convertidas aqui.
 * Manter o backstore fixo + escalar só o CSS = coordenadas estáveis em resize.
 */
const STAGE = 1000;
/** Largura lógica de uma imagem com scale = 1. */
const DEFAULT_IMG_WIDTH = 300;
const SNAP_THRESHOLD = 8;

/** objeto Fabric carrega o id do elemento do store. */
type Tagged = FabricObject & { elId?: string };

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const objectsRef = useRef<Map<string, Tagged>>(new Map());
  /** trava reentrância: true enquanto aplicamos mudanças do store -> canvas. */
  const applyingRef = useRef(false);
  const bgTokenRef = useRef(0);
  /** guias de centro ativas no frame atual. */
  const guidesRef = useRef<{ v: boolean; h: boolean }>({ v: false, h: false });

  // Slices reativos que disparam reconciliação.
  const elements = useDesignStore((s) => s.design.elements);
  const side = useDesignStore((s) => s.design.side);
  const baseImages = useDesignStore((s) => s.design.baseImages);
  const selectedId = useDesignStore((s) => s.selectedId);
  const zoom = useDesignStore((s) => s.zoom);

  /* ------------------------------------------------- criação única do canvas */
  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new Canvas(canvasElRef.current, {
      width: STAGE,
      height: STAGE,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      // uniformScaling=true (default): escala proporcional; shift = livre.
    });
    fabricRef.current = canvas;

    // Controles uniformes/limpos por padrão (vermelho KYPZL).
    FabricObject.ownDefaults.transparentCorners = false;
    FabricObject.ownDefaults.cornerColor = '#ffffff';
    FabricObject.ownDefaults.cornerStrokeColor = '#B62126';
    FabricObject.ownDefaults.cornerStyle = 'circle';
    FabricObject.ownDefaults.borderColor = '#B62126';
    FabricObject.ownDefaults.cornerSize = 12;
    FabricObject.ownDefaults.padding = 4;

    /* -------- sincronização canvas -> store (somente em ações do usuário) */
    const handleModified = (e: { target?: FabricObject }) => {
      if (applyingRef.current || !e.target) return;
      syncObjectToStore(e.target as Tagged);
    };

    const handleSelection = () => {
      if (applyingRef.current) return;
      const active = canvas.getActiveObject() as Tagged | undefined;
      useDesignStore.getState().setSelected(active?.elId ?? null);
    };

    const handleCleared = () => {
      if (applyingRef.current) return;
      useDesignStore.getState().setSelected(null);
    };

    const handleTextChanged = (e: { target?: FabricObject }) => {
      const t = e.target as Tagged | undefined;
      if (!t?.elId) return;
      useDesignStore
        .getState()
        .updateElement(t.elId, { value: (t as IText).text ?? '' });
    };

    // Snapping ao centro durante o arraste.
    const handleMoving = (e: { target?: FabricObject }) => {
      const t = e.target;
      if (!t) return;
      const center = t.getCenterPoint();
      let snappedV = false;
      let snappedH = false;
      if (Math.abs(center.x - STAGE / 2) < SNAP_THRESHOLD) {
        t.setPositionByOrigin(
          new Point(STAGE / 2, center.y),
          'center',
          'center',
        );
        snappedV = true;
      }
      if (Math.abs(center.y - STAGE / 2) < SNAP_THRESHOLD) {
        const c2 = t.getCenterPoint();
        t.setPositionByOrigin(new Point(c2.x, STAGE / 2), 'center', 'center');
        snappedH = true;
      }
      guidesRef.current = { v: snappedV, h: snappedH };
    };

    const clearGuides = () => {
      guidesRef.current = { v: false, h: false };
      canvas.requestRenderAll();
    };

    // Desenha as guias de centro por cima da cena.
    const handleAfterRender = () => {
      const { v, h } = guidesRef.current;
      if (!v && !h) return;
      const ctx = canvas.getContext();
      ctx.save();
      ctx.strokeStyle = 'rgba(182,33,38,0.9)';
      ctx.lineWidth = 1;
      const vp = canvas.viewportTransform;
      const toScreen = (x: number, y: number): [number, number] => [
        x * vp[0] + vp[4],
        y * vp[3] + vp[5],
      ];
      if (v) {
        const [sx, sy0] = toScreen(STAGE / 2, 0);
        const [, sy1] = toScreen(STAGE / 2, STAGE);
        ctx.beginPath();
        ctx.moveTo(sx, sy0);
        ctx.lineTo(sx, sy1);
        ctx.stroke();
      }
      if (h) {
        const [sx0, sy] = toScreen(0, STAGE / 2);
        const [sx1] = toScreen(STAGE, STAGE / 2);
        ctx.beginPath();
        ctx.moveTo(sx0, sy);
        ctx.lineTo(sx1, sy);
        ctx.stroke();
      }
      ctx.restore();
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:moving', handleMoving);
    canvas.on('mouse:up', clearGuides);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);
    canvas.on('text:changed', handleTextChanged);
    canvas.on('after:render', handleAfterRender);

    // Apaga objeto selecionado com Delete/Backspace (fora de edição de texto).
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
      const active = canvas.getActiveObject() as (Tagged & { isEditing?: boolean }) | undefined;
      if (!active || active.isEditing) return;
      ev.preventDefault();
      if (active.elId) useDesignStore.getState().removeElement(active.elId);
    };
    window.addEventListener('keydown', onKey);

    // Export PNG em alta resolução + fit do viewport (via ponte).
    registerCanvas({
      exportPNG: (multiplier = 2) => {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return canvas.toDataURL({
          format: 'png',
          multiplier,
          enableRetinaScaling: false,
        });
      },
      fitView: () => fitDisplay(),
    });

    // Ajuste responsivo do tamanho exibido (CSS) mantendo backstore = STAGE.
    function fitDisplay() {
      const el = containerRef.current;
      if (!el || !fabricRef.current) return;
      const pad = 32;
      const size = Math.max(
        160,
        Math.min(el.clientWidth - pad, el.clientHeight - pad),
      );
      const display = size * useDesignStore.getState().zoom;
      fabricRef.current.setDimensions(
        { width: `${display}px`, height: `${display}px` },
        { cssOnly: true },
      );
    }

    const ro = new ResizeObserver(() => fitDisplay());
    if (containerRef.current) ro.observe(containerRef.current);
    fitDisplay();

    // cleanup: remove listeners e descarta o canvas (sem memory leaks).
    return () => {
      window.removeEventListener('keydown', onKey);
      ro.disconnect();
      canvas.off();
      canvas.dispose();
      fabricRef.current = null;
      objectsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- converte objeto Fabric -> elemento no store */
  function syncObjectToStore(obj: Tagged) {
    const id = obj.elId;
    if (!id) return;
    const center = obj.getCenterPoint();
    const patch: Partial<DesignElement> = {
      x: center.x / STAGE,
      y: center.y / STAGE,
      rotation: obj.angle ?? 0,
    };
    if (obj instanceof IText) {
      // "assa" a escala no fontSize para não acumular transformações.
      const effective = Math.round((obj.fontSize ?? 16) * (obj.scaleX ?? 1));
      obj.set({ fontSize: effective, scaleX: 1, scaleY: 1 });
      (patch as Partial<TextElement>).fontSize = effective;
      patch.scale = 1;
    } else {
      const el = useDesignStore
        .getState()
        .design.elements.find((e) => e.id === id) as ImageElement | undefined;
      if (el) {
        const baseScale = DEFAULT_IMG_WIDTH / el.naturalW;
        patch.scale = (obj.scaleX ?? 1) / baseScale;
      }
    }
    useDesignStore.getState().updateElement(id, patch);
  }

  /* ----------------------------------- fundo (imagem-base) por lado/cores */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = baseImages[side];
    const token = ++bgTokenRef.current;
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      // descarta resultado obsoleto (troca rápida de lado/cor).
      if (token !== bgTokenRef.current || !fabricRef.current) return;
      img.set({
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        scaleX: STAGE / (img.width || STAGE),
        scaleY: STAGE / (img.height || STAGE),
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = img;
      canvas.requestRenderAll();
    });
  }, [baseImages, side]);

  /* ------------------------------ reconciliação store -> objetos do canvas */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    applyingRef.current = true;
    canvas.renderOnAddRemove = false;

    const map = objectsRef.current;
    const visible = elements
      .filter((e) => e.side === side)
      .sort((a, b) => a.zIndex - b.zIndex);
    const wantedIds = new Set(visible.map((e) => e.id));

    // remove objetos que saíram (troca de lado / exclusão).
    for (const [id, obj] of map) {
      if (!wantedIds.has(id)) {
        canvas.remove(obj);
        map.delete(id);
      }
    }

    // adiciona / atualiza objetos presentes.
    let pendingAsync = 0;
    const finish = () => {
      // aplica ordem de empilhamento conforme zIndex.
      visible.forEach((el) => {
        const obj = map.get(el.id);
        if (obj) canvas.bringObjectToFront(obj);
      });
      canvas.renderOnAddRemove = true;
      canvas.requestRenderAll();
      applyingRef.current = false;
      // reaplica seleção pendente após reconciliar.
      applySelection();
    };

    for (const el of visible) {
      const existing = map.get(el.id);
      if (existing) {
        updateFabricObject(existing, el);
      } else if (el.type === 'text') {
        const obj = makeText(el);
        map.set(el.id, obj);
        canvas.add(obj);
      } else {
        pendingAsync++;
        makeImage(el).then((obj) => {
          // pode ter sido removido/trocado de lado durante o load.
          if (!fabricRef.current) return;
          map.set(el.id, obj);
          canvas.add(obj);
          pendingAsync--;
          if (pendingAsync === 0) finish();
        });
      }
    }

    if (pendingAsync === 0) finish();

    function applySelection() {
      const want = useDesignStore.getState().selectedId;
      const current = canvas?.getActiveObject() as Tagged | undefined;
      if (current?.elId === want) return;
      applyingRef.current = true;
      if (want && map.has(want)) {
        canvas!.setActiveObject(map.get(want)!);
      } else {
        canvas!.discardActiveObject();
      }
      canvas!.requestRenderAll();
      applyingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, side]);

  /* ------------------------------------- seleção vinda de fora (painéis) */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const map = objectsRef.current;
    const current = canvas.getActiveObject() as Tagged | undefined;
    if (current?.elId === selectedId) return;
    applyingRef.current = true;
    if (selectedId && map.has(selectedId)) {
      canvas.setActiveObject(map.get(selectedId)!);
    } else if (!selectedId) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    applyingRef.current = false;
  }, [selectedId]);

  /* ------------------------------------------------- zoom (escala de CSS) */
  useEffect(() => {
    getCanvasBridgeFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function getCanvasBridgeFit() {
    // re-aplica fit (que considera o zoom atual do store).
    const canvas = fabricRef.current;
    const el = containerRef.current;
    if (!canvas || !el) return;
    const pad = 32;
    const size = Math.max(
      160,
      Math.min(el.clientWidth - pad, el.clientHeight - pad),
    );
    const display = size * zoom;
    canvas.setDimensions(
      { width: `${display}px`, height: `${display}px` },
      { cssOnly: true },
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-muted/40">
      <SideToggle />
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-auto p-4"
      >
        <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
          <canvas ref={canvasElRef} />
        </div>
      </div>
      <SelectionToolbar />
    </div>
  );
}

/* ======================================================= fábrica de objetos */

function applyCommonControls(obj: FabricObject) {
  obj.set({
    originX: 'center',
    originY: 'center',
    centeredScaling: true,
    centeredRotation: true,
  });
  // só cantos + rotação (mantém escala proporcional).
  obj.setControlsVisibility({
    mt: false,
    mb: false,
    ml: false,
    mr: false,
    mtr: true,
  });
}

function makeText(el: TextElement): Tagged {
  const obj = new IText(el.value, {
    left: el.x * STAGE,
    top: el.y * STAGE,
    angle: el.rotation,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth ?? 0,
    paintFirst: 'stroke',
    fontWeight: 700,
    textAlign: 'center',
    scaleX: el.scale,
    scaleY: el.scale,
  }) as Tagged;
  obj.elId = el.id;
  applyCommonControls(obj);
  // garante a fonte decodificada e remede o texto.
  ensureFontLoaded(el.fontFamily).then(() => {
    (obj as IText).initDimensions();
    obj.canvas?.requestRenderAll();
  });
  return obj;
}

async function makeImage(el: ImageElement): Promise<Tagged> {
  const img = (await FabricImage.fromURL(el.src, {
    crossOrigin: 'anonymous',
  })) as Tagged;
  const baseScale = DEFAULT_IMG_WIDTH / (el.naturalW || DEFAULT_IMG_WIDTH);
  img.set({
    left: el.x * STAGE,
    top: el.y * STAGE,
    angle: el.rotation,
    scaleX: baseScale * el.scale,
    scaleY: baseScale * el.scale,
  });
  img.elId = el.id;
  applyCommonControls(img);
  return img;
}

/** Atualiza um objeto existente apenas se os valores divergirem (epsilon). */
function updateFabricObject(obj: Tagged, el: DesignElement) {
  const near = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;
  const center = obj.getCenterPoint();
  const tx = el.x * STAGE;
  const ty = el.y * STAGE;
  if (!near(center.x, tx) || !near(center.y, ty)) {
    obj.setPositionByOrigin(new Point(tx, ty), 'center', 'center');
  }
  if (!near(obj.angle ?? 0, el.rotation, 0.01)) obj.set({ angle: el.rotation });

  if (el.type === 'text' && obj instanceof IText) {
    if (obj.text !== el.value) obj.set({ text: el.value });
    if (!near(obj.fontSize ?? 0, el.fontSize)) obj.set({ fontSize: el.fontSize });
    obj.set({
      fontFamily: el.fontFamily,
      fill: el.fill,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth ?? 0,
      scaleX: el.scale,
      scaleY: el.scale,
    });
  } else if (el.type === 'image') {
    const baseScale = DEFAULT_IMG_WIDTH / (el.naturalW || DEFAULT_IMG_WIDTH);
    const target = baseScale * el.scale;
    if (!near(obj.scaleX ?? 0, target, 0.001)) {
      obj.set({ scaleX: target, scaleY: target });
    }
  }
  obj.setCoords();
}
