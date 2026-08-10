import { cn } from '@/lib/cn';

type Props = {
  name: string;
  url?: string | null;
  color?: string;
  size?: number;
  ring?: boolean;
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Avatar({ name, url, color = '#8b5cf6', size = 36, ring, className }: Props) {
  const style = {
    width: size,
    height: size,
    background: url
      ? undefined
      : `linear-gradient(135deg, ${color}, ${color}aa)`,
    boxShadow: ring ? `0 0 0 2px ${color}55, 0 0 0 4px rgba(255,255,255,0.06)` : undefined,
  };
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center text-white font-medium tracking-tight select-none',
        className
      )}
      style={style}
      title={name}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.38 }}>{initials(name)}</span>
      )}
    </div>
  );
}
