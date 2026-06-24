import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateFromStorage } from './store/useDesignStore';
import { loadCatalog } from './lib/products';
import './index.css';

/**
 * StrictMode é intencionalmente omitido: o double-mount de efeitos em dev
 * conflita com o ciclo de vida do canvas Fabric (init/dispose), causando o
 * erro "canvas already initialized". O <CanvasStage> já faz cleanup correto.
 */
async function boot() {
  // Carrega o catálogo do Supabase (best-effort) antes do primeiro paint.
  await loadCatalog();
  // Restaura o último design salvo localmente.
  hydrateFromStorage();
  createRoot(document.getElementById('root')!).render(<App />);
}

boot();
