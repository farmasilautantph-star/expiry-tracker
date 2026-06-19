"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Portal-based modal. Renders into document.body to escape any z-index
 * or stacking-context surprises in the page tree. Closes on Escape and
 * backdrop click. Consumers are responsible for styling the inner card —
 * the wrapping container handles backdrop, centering, and click-to-close.
 *
 * The card MUST be a single child and is wrapped with stopPropagation so
 * clicks inside don't close the modal.
 */
export default function Modal({ isOpen, onClose, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
