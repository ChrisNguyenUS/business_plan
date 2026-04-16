import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingButtons from './FloatingButtons';
import { useLanguage } from '../lib/i18n';

export default function Layout() {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar t={t} lang={lang} toggleLang={toggleLang} />
      <main className="flex-1 pt-16 lg:pt-20">
        <Outlet context={{ t, lang }} />
      </main>
      <Footer t={t} />
      <FloatingButtons />
    </div>
  );
}