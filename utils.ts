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

// Convert File to Base64 string for storage in Firestore
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};