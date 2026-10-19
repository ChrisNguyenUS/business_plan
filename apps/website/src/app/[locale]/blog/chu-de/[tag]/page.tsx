import { TagPageView, tagPageMetadata } from "@/components/blog/TagPageView";

type Props = { params: Promise<{ locale: string; tag: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, tag } = await params;
  return tagPageMetadata(locale, tag, "vi");
}

export default async function VietnameseTagPage({ params }: Props) {
  const { locale, tag } = await params;
  return <TagPageView localeParam={locale} slug={tag} expected="vi" />;
}
