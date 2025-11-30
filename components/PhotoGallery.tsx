import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
        無照片
      </div>
    );
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev! + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev! - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div className="mt-4">
      {/* Grid View */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div 
            key={index} 
            className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group"
            onClick={() => openLightbox(index)}
          >
            <img 
              src={photo} 
              alt={`Travel moment ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button 
            onClick={closeLightbox} 
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={32} />
          </button>

          <button 
            onClick={prevPhoto} 
            className="absolute left-2 md:left-8 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={40} />
          </button>

          <div className="max-w-4xl max-h-[80vh] w-full flex justify-center">
            <img 
              src={photos[lightboxIndex]} 
              alt="Fullscreen view" 
              className="max-h-[80vh] max-w-full object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>

          <button 
            onClick={nextPhoto} 
            className="absolute right-2 md:right-8 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={40} />
          </button>
          
          <div className="absolute bottom-8 left-0 right-0 text-center text-white/80 text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
};
