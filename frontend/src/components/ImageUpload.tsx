import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
      const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

      console.log('Cloudinary config:', { cloudName, uploadPreset });

      if (!cloudName || !uploadPreset) {
        alert('Configuration Cloudinary manquante. Vérifiez les variables VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();

      if (!res.ok) {
        console.error('Cloudinary error full:', JSON.stringify(data));
        alert(`Erreur upload: ${data.error?.message || JSON.stringify(data)}`);
        return;
      }

      if (data.secure_url) {
        onChange(data.secure_url);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div>
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Product" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative w-full h-40 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Cliquez pour uploader</p>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
