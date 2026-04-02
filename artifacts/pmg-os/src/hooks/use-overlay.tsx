import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";

type OverlayType = "modal" | "drawer" | "sheet" | "command";

interface OverlayEntry {
  id: string;
  type: OverlayType;
  component: ReactNode;
  props?: Record<string, any>;
  onClose?: () => void;
}

interface OverlayContextType {
  overlays: OverlayEntry[];
  open: (entry: Omit<OverlayEntry, "id"> & { id?: string }) => string;
  close: (id: string) => void;
  closeAll: () => void;
  closeTop: () => void;
  isOpen: (id: string) => boolean;
  topOverlay: OverlayEntry | null;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

let overlayCounter = 0;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<OverlayEntry[]>([]);

  const open = useCallback((entry: Omit<OverlayEntry, "id"> & { id?: string }): string => {
    const id = entry.id ?? `overlay-${++overlayCounter}`;
    setOverlays(prev => {
      const existing = prev.findIndex(o => o.id === id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...entry, id };
        return updated;
      }
      return [...prev, { ...entry, id }];
    });
    return id;
  }, []);

  const close = useCallback((id: string) => {
    setOverlays(prev => {
      const entry = prev.find(o => o.id === id);
      entry?.onClose?.();
      return prev.filter(o => o.id !== id);
    });
  }, []);

  const closeAll = useCallback(() => {
    setOverlays(prev => {
      prev.forEach(o => o.onClose?.());
      return [];
    });
  }, []);

  const closeTop = useCallback(() => {
    setOverlays(prev => {
      if (prev.length === 0) return prev;
      const top = prev[prev.length - 1];
      top.onClose?.();
      return prev.slice(0, -1);
    });
  }, []);

  const isOpen = useCallback((id: string) => overlays.some(o => o.id === id), [overlays]);

  const topOverlay = overlays.length > 0 ? overlays[overlays.length - 1] : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && overlays.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        closeTop();
      }
    }

    if (overlays.length > 0) {
      document.addEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (overlays.length === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [overlays.length, closeTop]);

  return (
    <OverlayContext.Provider value={{ overlays, open, close, closeAll, closeTop, isOpen, topOverlay }}>
      {children}
      {overlays.length > 0 && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {overlays.map((overlay, index) => (
            <div
              key={overlay.id}
              className="absolute inset-0 pointer-events-auto"
              style={{ zIndex: 100 + index }}
            >
              {index === overlays.length - 1 && (
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => close(overlay.id)}
                />
              )}
              <div className="relative z-10 flex items-center justify-center h-full">
                {overlay.component}
              </div>
            </div>
          ))}
        </div>
      )}
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayContextType {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}
