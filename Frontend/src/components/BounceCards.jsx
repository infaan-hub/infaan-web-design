import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

export default function BounceCards({ items = [], onCardClick }) {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card) => {
        if (!card) return;
        gsap.set(card, { scale: 0, opacity: 0 });
      });

      const tl = gsap.timeline({ delay: 0.15 });
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        tl.to(card, {
          scale: 1,
          opacity: 1,
          duration: 0.9,
          ease: "elastic.out(1, 0.45)",
        }, i * 0.12);
      });
    }, containerRef);

    return () => ctx.revert();
  }, [items]);

  const handleMouseEnter = useCallback((index) => {
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      if (i === index) {
        gsap.to(card, {
          scale: 1.05,
          zIndex: 10,
          duration: 0.4,
          ease: "power2.out",
        });
      } else {
        const direction = i < index ? -1 : 1;
        gsap.to(card, {
          x: direction * 50,
          scale: 0.85,
          opacity: 0.5,
          duration: 0.4,
          ease: "power2.out",
        });
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    cardsRef.current.forEach((card) => {
      if (!card) return;
      gsap.to(card, {
        x: 0,
        scale: 1,
        opacity: 1,
        zIndex: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    });
  }, []);

  if (!items.length) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        minHeight: 420,
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={(el) => { cardsRef.current[index] = el; }}
          role="button"
          tabIndex={0}
          aria-label={item.name}
          style={{
            position: "absolute",
            top: index * 12,
            left: index * 12,
            width: "100%",
            maxWidth: 480,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            overflow: "hidden",
            cursor: "pointer",
            background: "#fff",
            transformOrigin: "center center",
          }}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
          onClick={() => onCardClick?.(item)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCardClick?.(item);
            }
          }}
        >
          <img
            src={item.image_data}
            alt={item.name}
            style={{
              width: "100%",
              display: "block",
              aspectRatio: "1 / 0.75",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "18px 20px",
              color: "#fff",
              pointerEvents: "none",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "1.15rem",
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {item.name}
            </h4>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.8rem",
                opacity: 0.75,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Portfolio
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
