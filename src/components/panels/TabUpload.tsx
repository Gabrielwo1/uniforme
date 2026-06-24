import { LogoUploader } from './LogoUploader';

export function TabUpload() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Upload de imagem
      </p>
      <LogoUploader />
    </div>
  );
}
