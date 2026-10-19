import { TagPageView, tagPageMetadata } from "@/components/blog/TagPageView";

type Props = { params: Promise<{ locale: string; tag: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, tag } = await params;
  return tagPageMetadata(locale, tag, "en");
}

export default async function EnglishTagPage({ params }: Props) {
  const { locale, tag } = await params;
  return <TagPageView localeParam={locale} slug={tag} expected="en" />;
}
