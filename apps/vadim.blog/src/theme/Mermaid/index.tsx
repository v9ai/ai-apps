import React, {type ReactNode, useRef, useEffect, useCallback, useState} from 'react';
import Mermaid from '@theme-original/Mermaid';
import type MermaidType from '@theme/Mermaid';
import type {WrapperProps} from '@docusaurus/types';
import BrowserOnly from '@docusaurus/BrowserOnly';

type Props = WrapperProps<typeof MermaidType>;

function PanZoomControls({containerRef}: {containerRef: React.RefObject<HTMLDivElement | null>}) {
  const stateRef = useRef({scale: 1, panX: 0, panY: 0, isPanning: false, startX: 0, startY: 0});
  const [scale, setScale] = useState(1);

  const applyTransform = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const {scale, panX, panY} = stateRef.current;
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    svg.style.transformOrigin = 'center center';
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Only zoom if hovering over mermaid
      e.preventDefault();
      const s = stateRef.current;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      s.scale = Math.min(5, Math.max(0.5, s.scale + delta));
      setScale(s.scale);
      applyTransform();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const s = stateRef.current;
      s.isPanning = true;
      s.startX = e.clientX - s.panX;
      s.startY = e.clientY - s.panY;
      container.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s.isPanning) return;
      s.panX = e.clientX - s.startX;
      s.panY = e.clientY - s.startY;
      applyTransform();
    };

    const onMouseUp = () => {
      stateRef.current.isPanning = false;
      container.style.cursor = 'grab';
    };

    const initSvg = () => {
      const svg = container.querySelector('svg');
      if (!svg) return;
      svg.style.transition = 'transform 0.1s ease-out';
      svg.style.cursor = 'grab';
      container.style.overflow = 'hidden';
    };

    const observer = new MutationObserver(() => initSvg());
    observer.observe(container, {childList: true, subtree: true});
    initSvg();

    container.addEventListener('wheel', onWheel, {passive: false});
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      observer.disconnect();
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [containerRef, applyTransform]);

  const handleReset = useCallback(() => {
    const s = stateRef.current;
    s.scale = 1;
    s.panX = 0;
    s.panY = 0;
    setScale(1);
    applyTransform();
  }, [applyTransform]);

  const handleZoomIn = useCallback(() => {
    const s = stateRef.current;
    s.scale = Math.min(5, s.scale + 0.25);
    setScale(s.scale);
    applyTransform();
  }, [applyTransform]);

  const handleZoomOut = useCallback(() => {
    const s = stateRef.current;
    s.scale = Math.max(0.5, s.scale - 0.25);
    setScale(s.scale);
    applyTransform();
  }, [applyTransform]);

  const isZoomed = scale > 1.05 || stateRef.current.panX !== 0 || stateRef.current.panY !== 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 4,
        opacity: 0.7,
        transition: 'opacity 0.2s',
        zIndex: 10,
      }}
      className="mermaid-controls"
    >
      <button onClick={handleZoomIn} title="Zoom in" style={btnStyle}>+</button>
      <button onClick={handleZoomOut} title="Zoom out" style={btnStyle}>−</button>
      {isZoomed && (
        <button onClick={handleReset} title="Reset view" style={btnStyle}>⟲</button>
      )}
    </div>
  );
}

export default function MermaidWrapper(props: Props): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{position: 'relative'}} className="mermaid-panzoom-container">
      <Mermaid {...props} />
      <BrowserOnly>
        {() => <PanZoomControls containerRef={containerRef} />}
      </BrowserOnly>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 4,
  background: 'var(--ifm-background-color)',
  color: 'var(--ifm-font-color-base)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 'bold',
  lineHeight: 1,
  padding: 0,
};
