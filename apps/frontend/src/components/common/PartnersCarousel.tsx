import { useRef, useState, useEffect } from 'react';

interface Partner {
  id: string;
  name: string;
  logo: string;
  bgColor?: string;
}

const PARTNERS: Partner[] = [
  { id: 'avalanche',  name: 'Avalanche',       logo: '/partners-logo/avax.png',       bgColor: '#E84142' },
  { id: 'letmeclick', name: 'LetMeClick',      logo: '/partners-logo/letmeclick.png', bgColor: '#3B82F6' },
  { id: 'klik',       name: 'KLIK!',           logo: '/partners-logo/klik.jpeg',      bgColor: '#F59E0B' },
  { id: 'team1',      name: 'Avalanche Team1', logo: '/partners-logo/team1.jpg',      bgColor: '#8B5CF6' },
];

const CARD_GAP = 0;
const SPEED_PX_PER_S = 50;

function getCardsVisible() {
  if (window.innerWidth < 640) return 2;
  if (window.innerWidth < 1024) return 3;
  return 4;
}

function getCardWidth() {
  return Math.floor(window.innerWidth / getCardsVisible());
}

export function PartnersCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const initialCardW = getCardWidth();
  const stepRef = useRef(initialCardW + CARD_GAP);
  const singleWidthRef = useRef(PARTNERS.length * (initialCardW + CARD_GAP));

  const [cardWidth, setCardWidth] = useState(getCardWidth);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!pausedRef.current) {
        offsetRef.current += SPEED_PX_PER_S * delta;
        if (offsetRef.current >= singleWidthRef.current) {
          offsetRef.current -= singleWidthRef.current;
        }
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Recompute card size on window resize
  useEffect(() => {
    const onResize = () => {
      const cw = getCardWidth();
      setCardWidth(cw);
      stepRef.current = cw + CARD_GAP;
      singleWidthRef.current = PARTNERS.length * stepRef.current;
      if (offsetRef.current >= singleWidthRef.current) {
        offsetRef.current = offsetRef.current % singleWidthRef.current;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleEnter = (partner: Partner) => {
    pausedRef.current = true;
    setHoveredId(partner.id);
  };

  const handleLeave = () => {
    pausedRef.current = false;
    lastTimeRef.current = null;
    setHoveredId(null);
  };

  // Enough copies so track is always wider than viewport
  const COPIES = Math.max(8, Math.ceil((window.innerWidth * 2) / (PARTNERS.length * (cardWidth + CARD_GAP))) + 1);
  const items = Array.from({ length: COPIES }, () => PARTNERS).flat();

  return (
    <div className="relative w-full overflow-hidden select-none">


      {/* Track */}
      <div
        ref={trackRef}
        className="flex will-change-transform"
        style={{ paddingTop: '12px', paddingBottom: '40px' }}
      >
        {items.map((partner, idx) => {
          const isHovered = hoveredId === partner.id;
          return (
            <div
              key={`${partner.id}-${idx}`}
              onMouseEnter={() => handleEnter(partner)}
              onMouseLeave={handleLeave}
              onTouchStart={() => handleEnter(partner)}
              onTouchEnd={handleLeave}
              className="shrink-0 cursor-pointer flex flex-col"
              style={{ width: `${cardWidth}px` }}
            >
              {/* Card */}
              <div
                className="border overflow-hidden"
                style={{
                  height: '110px',
                  transition: 'filter 0.35s ease, border-color 0.25s ease',
                  borderColor: isHovered
                    ? 'var(--color-primary, #df7f3e)'
                    : 'rgba(255,255,255,0.07)',
                  background: 'transparent',
                  filter: isHovered ? 'grayscale(0)' : 'grayscale(1) brightness(0.85)',
                }}
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-full h-full object-contain p-4 pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Name below card */}
              <div
                className="flex justify-center pt-3"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
              >
                <span className="font-mono text-sm font-bold uppercase tracking-widest text-primary">
                  {partner.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
