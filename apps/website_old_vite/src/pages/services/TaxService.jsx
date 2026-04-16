import { useOutletContext } from 'react-router-dom';
import ServicePageTemplate from '../../components/ServicePageTemplate';

export default function TaxService() {
  const { t } = useOutletContext();

  const faqs = [
    { q: "What documents do I need for tax preparation?", a: "You'll need W-2 forms, 1099 forms, Social Security numbers, previous year's tax return, and any deduction receipts. We'll provide a complete checklist at your consultation." },
    { q: "Can you file taxes for someone with an ITIN?", a: "Yes! We regularly help individuals with ITINs file their taxes and can also assist with ITIN applications." },
    { q: "How long does LLC setup take?", a: "LLC formation in Texas typically takes 1-3 business days for standard processing. We handle all paperwork including EIN registration." },
    { q: "Do you offer tax preparation in Vietnamese?", a: "Absolutely. Our team is fully bilingual in Vietnamese and English. We can explain everything in your preferred language." },
    { q: "What is the deadline for filing taxes?", a: "The standard deadline is April 15th. If you need more time, we can file an extension (Form 4868) to give you until October 15th." },
  ];

  return (
    <ServicePageTemplate
      title={t('tax_title')}
      desc={t('tax_desc')}
      services={[t('tax_s1'), t('tax_s2'), t('tax_s3'), t('tax_s4')]}
      pricing={[
        { service: t('tax_pricing_1'), price: t('tax_price_1') },
        { service: t('tax_pricing_2'), price: t('tax_price_2') },
        { service: t('tax_pricing_3'), price: t('tax_price_3') },
        { service: t('tax_pricing_4'), price: t('tax_price_4') },
        { service: t('tax_pricing_5'), price: t('tax_price_5') },
      ]}
      faqs={faqs}
      badgeText="EFIN Licensed"
      ctaText={t('services_cta')}
      t={t}
    />
  );
}