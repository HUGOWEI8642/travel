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
