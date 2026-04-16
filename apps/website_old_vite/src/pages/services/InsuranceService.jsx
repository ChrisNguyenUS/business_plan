import { useOutletContext } from 'react-router-dom';
import ServicePageTemplate from '../../components/ServicePageTemplate';

export default function InsuranceService() {
  const { t } = useOutletContext();

  const faqs = [
    { q: "How much does a life insurance consultation cost?", a: "Consultations are completely free. We help you understand your options before you make any decisions." },
    { q: "What types of life insurance do you offer?", a: "We offer term life, whole life, universal life, and indexed universal life insurance from top-rated carriers." },
    { q: "Can I get insurance with pre-existing conditions?", a: "Yes, many carriers offer policies for people with pre-existing conditions. We'll help you find the best option for your situation." },
    { q: "Do you explain policies in Vietnamese?", a: "Yes! We provide full bilingual service so you can understand every detail of your policy in Vietnamese or English." },
    { q: "What is an annuity and is it right for me?", a: "An annuity is a financial product that provides guaranteed income, typically for retirement. We'll assess your financial goals to determine if it's a good fit." },
  ];

  return (
    <ServicePageTemplate
      title={t('insurance_title')}
      desc={t('insurance_desc')}
      services={[t('insurance_s1'), t('insurance_s2'), t('insurance_s3')]}
      pricingNote={t('insurance_pricing_note')}
      faqs={faqs}
      badgeText="Licensed Insurance Agent"
      ctaText={t('insurance_cta')}
      t={t}
    />
  );
}