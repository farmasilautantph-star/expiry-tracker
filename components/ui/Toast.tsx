"use client";
import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(
      () => {
        setVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
      },
      toast.type === "error" ? 4000 : 3000,
    );
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  const styles = {
    success: { wrap: "bg-[#dcfce7] border-[#16a34a] text-[#166534]", icon: <CheckCircleIcon className="w-4 h-4 flex-shrink-0 text-[#16a34a]" /> },
    error:   { wrap: "bg-[#fee2e2] border-[#dc2626] text-[#991b1b]", icon: <XCircleIcon className="w-4 h-4 flex-shrink-0 text-[#dc2626]" /> },
    info:    { wrap: "bg-[#eff6ff] border-[#2563eb] text-[#1e40af]", icon: <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-[#2563eb]" /> },
  };
  const s = styles[toast.type];
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      } ${s.wrap}`}
    >
      {s.icon}
      {toast.message}
    </div>
  );
}
