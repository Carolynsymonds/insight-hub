import { useEffect, useRef, useState } from "react";

interface StickyScrollTableProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyScrollTable = ({ children, className }: StickyScrollTableProps) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const updateScrollbar = () => {
      const hasHorizontalScroll = tableElement.scrollWidth > tableElement.clientWidth;
      setShowScrollbar(hasHorizontalScroll);
      setScrollWidth(tableElement.scrollWidth);
    };

    // Initial update
    updateScrollbar();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(tableElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  const syncScrollFromTable = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (tableRef.current && scrollbarRef.current) {
      scrollbarRef.current.scrollLeft = tableRef.current.scrollLeft;
    }

    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  const syncScrollFromScrollbar = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (tableRef.current && scrollbarRef.current) {
      tableRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    }

    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  return (
    <div className="relative">
      <div
        ref={tableRef}
        className={className}
        onScroll={syncScrollFromTable}
      >
        {children}
      </div>

      {showScrollbar && (
        <div
          ref={scrollbarRef}
          className="sticky bottom-0 left-0 right-0 overflow-x-auto overflow-y-hidden bg-background/80 backdrop-blur-sm border-t z-10"
          onScroll={syncScrollFromScrollbar}
          style={{ height: '12px' }}
        >
          <div style={{ width: scrollWidth, height: '1px' }} />
        </div>
      )}
    </div>
  );
};
