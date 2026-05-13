export type ServiceSlug = "tax" | "insurance" | "immigration" | "ai";
export type ServiceLocale = "en" | "vi";

export type ServiceContent = Partial<
  Record<
    ServiceSlug,
    {
      card_summary?: { description?: Partial<Record<ServiceLocale, string>> };
      detail_intro?: { description?: Partial<Record<ServiceLocale, string>> };
    }
  >
>;

export function resolveLocalizedServiceText(
  serviceContent: ServiceContent | undefined,
  service: ServiceSlug,
  group: "card_summary" | "detail_intro",
  locale: ServiceLocale,
  fallback: string,
): string {
  const value = serviceContent?.[service]?.[group]?.description?.[locale];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function updateServiceContentDescription(
  serviceContent: ServiceContent | undefined,
  service: ServiceSlug,
  group: "card_summary" | "detail_intro",
  locale: ServiceLocale,
  value: string,
): ServiceContent {
  return {
    ...(serviceContent ?? {}),
    [service]: {
      ...(serviceContent?.[service] ?? {}),
      [group]: {
        ...(serviceContent?.[service]?.[group] ?? {}),
        description: {
          ...(serviceContent?.[service]?.[group]?.description ?? {}),
          [locale]: value,
        },
      },
    },
  };
}
