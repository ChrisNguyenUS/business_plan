"use client";

import { MessageCircle } from "lucide-react";
import { trackFbq, trackGa } from "@/lib/analytics/events";

export const EB3_MESSENGER_URL = "https://m.me/mannaonesolution?ref=eb3";

export default function Eb3MessengerButton({ label }: { label: string }) {
  const onClick = () => {
    trackFbq("Contact", { method: "messenger", service: "eb3" });
    trackGa("messenger_click", { service: "eb3" });
  };

  return (
    <a
      href={EB3_MESSENGER_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-sm font-semibold transition-colors bg-primary hover:bg-teal-dark text-white"
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
