export interface MermaidWheelEvent {
  deltaY: number;
  preventDefault: () => void;
}

export interface MermaidWheelTarget {
  addEventListener(
    type: "wheel",
    listener: (event: MermaidWheelEvent) => void,
    options: { passive: false },
  ): void;
  removeEventListener(
    type: "wheel",
    listener: (event: MermaidWheelEvent) => void,
  ): void;
}

/** Bind diagram zoom without allowing the browser to scroll its page. */
export function installMermaidWheelZoom(
  target: MermaidWheelTarget,
  onZoom: (factor: number) => void,
): () => void {
  const onWheel = (event: MermaidWheelEvent) => {
    event.preventDefault();
    onZoom(event.deltaY > 0 ? 0.9 : 1.1);
  };

  target.addEventListener("wheel", onWheel, { passive: false });
  return () => target.removeEventListener("wheel", onWheel);
}
