// client/src/components/MobileAnalyticsCarousel.jsx
// Mobile-Responsive Swipeable Horizontal Carousel for Side-by-Side Analytics
// Converts desktop multi-column cards into a smooth swipeable carousel on mobile with pagination dots

import { useState, useRef, useEffect, memo} from 'react';

function MobileAnalyticsCarousel({ children, className = '' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];

  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, clientWidth } = trackRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      setActiveIndex(idx);
    }
  };

  const scrollToSlide = (idx) => {
    if (!trackRef.current) return;
    const clientWidth = trackRef.current.clientWidth;
    trackRef.current.scrollTo({
      left: idx * clientWidth,
      behavior: 'smooth',
    });
    setActiveIndex(idx);
  };

  return (
    <div className={`carousel-container ${className}`}>
      {/* Scrollable Track with CSS Scroll-Snap */}
      <div
        ref={trackRef}
        className="carousel-track"
        onScroll={handleScroll}
      >
        {items.map((child, idx) => (
          <div key={idx} className="carousel-slide">
            {child}
          </div>
        ))}
      </div>

      {/* Pagination Dots (visible on mobile only) */}
      {items.length > 1 && (
        <div className="carousel-dots-row">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`carousel-dot ${activeIndex === idx ? 'active' : ''}`}
              onClick={() => scrollToSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MobileAnalyticsCarousel);
