import { useOutletContext } from 'react-router-dom';
import HeroSection from '../components/home/HeroSection';
import ServicesOverview from '../components/home/ServicesOverview';
import WhyManna from '../components/home/WhyManna';
import HowItWorks from '../components/home/HowItWorks';
import ContactStrip from '../components/home/ContactStrip';

export default function Home() {
  const { t } = useOutletContext();

  return (
    <>
      <HeroSection t={t} />
      <ServicesOverview t={t} />
      <WhyManna t={t} />
      <HowItWorks t={t} />
      <ContactStrip t={t} />
    </>
  );
}