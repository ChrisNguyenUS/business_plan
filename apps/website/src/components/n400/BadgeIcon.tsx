import Image from 'next/image';

interface BadgeIconProps {
  slug: string;
  alt: string;
  size?: number;
  earned: boolean;
  className?: string;
}

// Reusable image wrapper for the 24 PNGs at public/images/n400/badges/<slug>.png.
// Earned variant renders at full saturation; locked variant is desaturated +
// dimmed so the gallery is scannable at a glance.
export function BadgeIcon({ slug, alt, size = 64, earned, className = '' }: BadgeIconProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/images/n400/badges/${slug}.png`}
        alt={alt}
        width={size}
        height={size}
        className={earned ? '' : 'opacity-40 grayscale'}
        sizes={`${size}px`}
      />
    </div>
  );
}
