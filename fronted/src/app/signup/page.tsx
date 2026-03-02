import Header from "./components/header";
import Hero from "./components/hero";
import SocialProof from "./components/social-proof";
import Features from "./components/features";
import VideoDemo from "./components/video-demo";
import HowItWorks from "./components/how-it-works";
import Pricing from "./components/pricing";
import Testimonials from "./components/testimonials";
import Faq from "./components/faq";
import MiniCta from "./components/mini-cta";
import Footer from "./components/footer";
import { FloatingWhatsAppButton } from "./components/floating-whatsapp-button";

export const metadata = {
  title: "Factura Cloud | Facturacion Electronica SUNAT",
  description:
    "Genera comprobantes electronicos SUNAT, gestiona inventarios y clientes con nuestra plataforma cloud.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <SocialProof />
      <Features />
      <VideoDemo />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <Faq />
      <MiniCta />
      <FloatingWhatsAppButton />
      <Footer />
    </main>
  );
}
