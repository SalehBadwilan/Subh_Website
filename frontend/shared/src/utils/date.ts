/** تنسيق تاريخ ISO بالعربية. */
export function formatDateAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** تنسيق وقت بالعربية. */
export function formatTimeAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** تاريخ ووقت معاً. */
export function formatDateTimeAr(iso: string): string {
  return `${formatDateAr(iso)} - ${formatTimeAr(iso)}`;
}

/** «منذ كم» بالعربية. */
export function timeAgoAr(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${Math.floor(months / 12)} سنة`;
}
