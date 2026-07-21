import { useEffect, useState } from 'react';
import { Image, Scissors, Shirt, Type, Upload } from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TabProducts } from './panels/TabProducts';
import { TabFinishes } from './panels/TabFinishes';
import { TabNameNumber } from './panels/TabNameNumber';
import { TabLogos } from './panels/TabLogos';
import { TabUpload } from './panels/TabUpload';

const TABS = [
  { key: 'products', label: 'Produtos', Icon: Shirt },
  { key: 'finishes', label: 'Acabam.', Icon: Scissors },
  { key: 'name', label: 'Nome/Nº', Icon: Type },
  { key: 'logos', label: 'Logos', Icon: Image },
  { key: 'upload', label: 'Upload', Icon: Upload },
];

export function LeftPanel() {
  const [tab, setTab] = useState('products');
  // O fluxo do pedido ("Sim, continuar") pede a volta à aba Produtos.
  const gotoProducts = useOrderStore((s) => s.gotoProductsSignal);
  useEffect(() => {
    if (gotoProducts > 0) setTab('products');
  }, [gotoProducts]);

  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? '';

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      orientation="vertical"
      className="flex h-full shrink-0"
    >
      {/* rail vertical de ícones */}
      <TabsList className="h-full shrink-0 flex-col justify-start gap-1 rounded-none border-r bg-background p-2">
        {TABS.map(({ key, label, Icon }) => (
          <TabsTrigger
            key={key}
            value={key}
            title={label}
            className={cn(
              'group relative h-auto w-16 flex-col gap-1 rounded-lg px-0 py-2.5 text-[10px] font-medium text-muted-foreground transition',
              'hover:bg-muted hover:text-foreground',
              'data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none',
            )}
          >
            {/* barra de acento à esquerda no ativo */}
            <span
              className={cn(
                'absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 transition',
                'group-data-[state=active]:opacity-100',
              )}
            />
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* painel de conteúdo */}
      <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-background">
        <div className="flex h-11 shrink-0 items-center border-b px-4">
          <span className="text-sm font-semibold">{activeLabel}</span>
        </div>
        <div className="scrollbar-clean flex-1 overflow-y-auto p-4">
          <TabsContent value="products" className="mt-0">
            <TabProducts />
          </TabsContent>
          <TabsContent value="finishes" className="mt-0">
            <TabFinishes />
          </TabsContent>
          <TabsContent value="name" className="mt-0">
            <TabNameNumber />
          </TabsContent>
          <TabsContent value="logos" className="mt-0">
            <TabLogos />
          </TabsContent>
          <TabsContent value="upload" className="mt-0">
            <TabUpload />
          </TabsContent>
        </div>
      </aside>
    </Tabs>
  );
}
