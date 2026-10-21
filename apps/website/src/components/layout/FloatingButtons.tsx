"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, MessageCircle, MessagesSquare, X } from "lucide-react";
import { trackFbq, trackGa } from "@/lib/analytics/events";

export interface FloatingLabels {
  menu: string;
  close: string;
  zalo: string;
  messenger: string;
  call: string;
}

// One contact button that opens Zalo / Messenger / phone, instead of three stacked circles.
export default function FloatingButtons({ labels }: { labels: FloatingLabels }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const onZalo = () => {
    trackFbq("Contact", { method: "zalo" });
    trackGa("zalo_click", {});
  };
  const onMessenger = () => {
    trackFbq("Contact", { method: "messenger" });
    trackGa("messenger_click", {});
  };
  const onPhone = () => {
    trackFbq("Contact", { method: "phone" });
    trackGa("phone_click", { number: "3468524454", source: "floating" });
  };

  const item =
    "flex items-center gap-3 rounded-full bg-white pl-2 pr-4 py-2 text-sm font-medium text-charcoal shadow-lg border border-border hover:bg-teal-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  // Each option rises out of the contact button when the menu opens (@starting-style).
  const enter =
    "origin-bottom-right transition-[opacity,translate,scale] duration-200 ease-out starting:translate-y-2 starting:scale-95 starting:opacity-0";
  // The two icons are stacked and crossfade instead of swapping abruptly.
  const icon = "absolute h-6 w-6 transition-[opacity,scale,rotate,filter] duration-200 ease-out";

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <ul id="floating-contact-menu" className="flex flex-col items-end gap-2">
          <li className={enter} style={{ transitionDelay: "80ms" }}>
            <a href="https://zalo.me/3468524454" target="_blank" rel="noopener noreferrer" onClick={onZalo} className={item}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white" aria-hidden="true">
                Zalo
              </span>
              {labels.zalo}
            </a>
          </li>
          <li className={enter} style={{ transitionDelay: "40ms" }}>
            <a href="https://m.me/mannaonesolution" target="_blank" rel="noopener noreferrer" onClick={onMessenger} className={item}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white" aria-hidden="true">
                <MessageCircle className="h-4 w-4" />
              </span>
              {labels.messenger}
            </a>
          </li>
          <li className={enter}>
            <a href="tel:3468524454" onClick={onPhone} className={item}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                <Phone className="h-4 w-4" />
              </span>
              {labels.call} 346-852-4454
            </a>
          </li>
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="floating-contact-menu"
        aria-label={open ? labels.close : labels.menu}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:bg-teal-dark transition-[background-color,scale] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <X className={`${icon} ${open ? "opacity-100" : "rotate-[-45deg] scale-75 opacity-0 blur-[2px]"}`} aria-hidden="true" />
        <MessagesSquare className={`${icon} ${open ? "scale-75 opacity-0 blur-[2px]" : "opacity-100"}`} aria-hidden="true" />
      </button>
    </div>
  );
}
