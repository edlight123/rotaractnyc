import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import NewsletterConfirmBanner from '@/components/public/NewsletterConfirmBanner';
import SandraChat from '@/components/SandraChat';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <NewsletterConfirmBanner />
      <main id="main-content" className="min-h-screen">{children}</main>
      <Footer />
      <SandraChat />
    </>
  );
}
