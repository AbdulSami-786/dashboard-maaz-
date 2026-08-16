import { Star } from 'lucide-react';

export default function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < rating ? 'var(--status-warning)' : 'none'}
          color={i < rating ? 'var(--status-warning)' : 'var(--border-strong)'}
        />
      ))}
    </span>
  );
}
