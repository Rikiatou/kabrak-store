import { useState } from 'react';
import { X, Image as ImageIcon, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/i18n/useTranslation';

interface ImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

export function ImageUpload({ values, onChange, label, max = 5 }: ImageUploadProps) {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const [uploading, setUploading] = useState(false);

  const uploadOne = async (file: File): Promise<string | null> => {
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(fr ? 'Fichier trop volumineux. Taille maximum: 10MB.' : 'File too large. Maximum size: 10MB.');
      return null;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(fr ? 'Type de fichier invalide. Formats acceptés: JPEG, PNG, WebP, GIF.' : 'Invalid file type. Accepted formats: JPEG, PNG, WebP, GIF.');
      return null;
    }
    const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
    if (!cloudName || !uploadPreset) {
      toast.error(fr ? 'Configuration Cloudinary manquante. Vérifiez les variables d\'environnement.' : 'Missing Cloudinary configuration. Check environment variables.');
      return null;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) {
      console.error('Cloudinary error:', data);
      toast.error(fr ? `Erreur upload: ${data.error?.message || 'Erreur inconnue'}` : `Upload error: ${data.error?.message || 'Unknown error'}`);
      return null;
    }
    return data.secure_url || null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const room = max - values.length;
    if (files.length > room) toast.error(fr ? `Maximum ${max} photos par produit.` : `Maximum ${max} photos per product.`);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, room)) {
        const url = await uploadOne(file);
        if (url) urls.push(url);
      }
      if (urls.length) onChange([...values, ...urls]);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(fr ? 'Erreur upload image' : 'Image upload error');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const makeMain = (i: number) => onChange([values[i], ...values.filter((_, j) => j !== i)]);

  return (
    <div>
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">
                {fr ? 'Principale' : 'Main'}
              </span>
            ) : (
              <button type="button" onClick={() => makeMain(i)} title={fr ? 'Mettre en photo principale' : 'Set as main photo'}
                className="absolute bottom-1 left-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70">
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={() => remove(i)} title={fr ? 'Supprimer' : 'Remove'}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <div className="relative aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-blue-400 transition-colors text-center px-1">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                <p className="text-[11px] text-muted-foreground">{fr ? 'Ajouter des photos' : 'Add photos'} ({values.length}/{max})</p>
              </>
            )}
            <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        )}
      </div>
    </div>
  );
}
