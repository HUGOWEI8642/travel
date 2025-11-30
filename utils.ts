
export const generateDateRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const currDate = new Date(start);
  const lastDate = new Date(end);

  // Safety check to prevent infinite loops if dates are invalid
  if (isNaN(currDate.getTime()) || isNaN(lastDate.getTime())) return [];
  if (currDate > lastDate) return [];

  while (currDate <= lastDate) {
    dates.push(currDate.toISOString().split('T')[0]);
    currDate.setDate(currDate.getDate() + 1);
  }
  return dates;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

// Convert File to Base64 string but COMPRESSED
// Optimized for mobile uploads: Uses URL.createObjectURL to avoid loading full file into memory
export const compressImage = (file: File, maxWidth = 600, quality = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Create a virtual URL pointing to the file (does not load into memory yet)
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      // Clean up the URL object immediately after loading
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions (Max width 600px for safety)
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG
      // This results in a much smaller string safe for Firestore
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    // Trigger load
    img.src = objectUrl;
  });
};

// Legacy helper kept for reference, but compressImage is preferred
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
