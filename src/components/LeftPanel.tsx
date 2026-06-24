import { Image, Scissors, Shirt, Type, Upload } from 'lucide-react';
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
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-background">
      <Tabs defaultValue="products" className="flex h-full flex-col">
        <div className="border-b p-2">
          <TabsList className="grid w-full grid-cols-5 gap-0.5 bg-muted/60">
            {TABS.map(({ key, label, Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex-col gap-1 px-0 py-1.5 text-[10px] font-medium"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
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
      </Tabs>
    </aside>
  );
}
