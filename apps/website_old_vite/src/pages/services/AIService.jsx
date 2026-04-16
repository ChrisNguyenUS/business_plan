import { useOutletContext } from 'react-router-dom';
import ServicePageTemplate from '../../components/ServicePageTemplate';

export default function AIService() {
  const { t } = useOutletContext();

  const faqs = [
    { q: "What kind of automation can you build for my business?", a: "We build custom automations including appointment scheduling, invoice processing, customer follow-ups, data entry automation, and more — all tailored to your specific workflow." },
    { q: "Do I need technical knowledge to use AI tools?", a: "Not at all! We build everything to be user-friendly. We also provide training and ongoing support so you can use the tools confidently." },
    { q: "How much does a typical automation project cost?", a: "Projects vary based on complexity. Simple automations start at a few hundred dollars, while comprehensive digital transformation projects are priced based on scope. We provide free estimates." },
    { q: "Can you help my Vietnamese business go digital?", a: "Absolutely. We specialize in helping Vietnamese-owned businesses adopt modern technology. We understand your business culture and needs." },
    { q: "What is a monthly retainer?", a: "A monthly retainer gives you ongoing access to our AI and automation team. We maintain your systems, add new features, and provide priority support." },
  ];

  return (
    <ServicePageTemplate
      title={t('ai_title')}
      desc={t('ai_desc')}
      services={[t('ai_s1'), t('ai_s2'), t('ai_s3'), t('ai_s4')]}
      faqs={faqs}
      ctaText={t('ai_cta')}
      t={t}
    />
  );
}