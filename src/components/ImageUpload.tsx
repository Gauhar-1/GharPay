import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ onUploadComplete, maxFiles = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    
    const newUrls: string[] = [];
    
    for (const file of acceptedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `properties/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property_images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('property_images')
          .getPublicUrl(filePath);

        newUrls.push(data.publicUrl);
      } catch (error: any) {
        toast.error(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    const updatedUrls = [...previewUrls, ...newUrls];
    setPreviewUrls(updatedUrls);
    onUploadComplete(updatedUrls);
    setUploading(false);
    toast.success(`${newUrls.length} image(s) uploaded successfully!`);
  }, [onUploadComplete, previewUrls]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles
  });

  const removeImage = (urlToRemove: string) => {
      const updatedUrls = previewUrls.filter(url => url !== urlToRemove);
      setPreviewUrls(updatedUrls);
      onUploadComplete(updatedUrls);
  };

  return (
    <div className="space-y-4 w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? 'border-accent bg-accent/5' : 'border-border bg-secondary/30 hover:bg-secondary/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
             <Loader2 size={24} className="animate-spin text-accent" />
             <p className="text-sm">Uploading your images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
             <UploadCloud size={24} className={isDragActive ? "text-accent" : ""} />
             <p className="text-sm text-center">
                 {isDragActive
                   ? "Drop the images here ..."
                   : "Drag & drop property images here, or click to select"}
             </p>
             <p className="text-[10px] opacity-70">PNG, JPG up to 5MB</p>
          </div>
        )}
      </div>

      {previewUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
              {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-muted group border border-border">
                      <img src={url} alt={`Preview ${idx}`} className="object-cover w-full h-full" />
                      <button 
                         onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                         className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      >
                         <X size={12} />
                      </button>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
