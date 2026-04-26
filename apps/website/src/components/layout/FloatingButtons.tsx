"use client";

import { Phone, MessageCircle } from "lucide-react";
import { trackFbq, trackGa } from "@/lib/analytics/events";

export default function FloatingButtons() {
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

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      {/* Zalo */}
      <a
        href="https://zalo.me/3468524454"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onZalo}
        className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-xs font-bold"
        aria-label="Zalo"
      >
        Zalo
      </a>
      {/* Facebook Messenger */}
      <a
        href="https://m.me/mannaonesolution"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onMessenger}
        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Facebook Messenger"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
      {/* Phone */}
      <a
        href="tel:3468524454"
        onClick={onPhone}
        className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Call us"
      >
        <Phone className="h-5 w-5" />
      </a>
    </div>
  );
}
