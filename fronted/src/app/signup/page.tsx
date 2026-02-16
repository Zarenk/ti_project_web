import Header from "./components/header";
import Hero from "./components/hero";
import Features from "./components/features";
import HowItWorks from "./components/how-it-works";
import Pricing from "./components/pricing";
import Testimonials from "./components/testimonials";
import CTA from "./components/cta";
import Footer from "./components/footer";
import Support from "./components/support";
import Faq from "./components/faq";
import Compliance from "./components/compliance";
import { TrialSignupSection } from "@/components/home/TrialSignupSection";
import { FloatingWhatsAppButton } from "./components/floating-whatsapp-button";

export const metadata = {
  title: "Factura Cloud | Facturación Electrónica SUNAT",
  description:
    "Genera comprobantes electrónicos SUNAT, gestiona inventarios y clientes con nuestra plataforma cloud.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <Support />
      <Faq />
      <Compliance />
      <CTA />
      <section id="signup-form">
        <TrialSignupSection />
      </section>
      <FloatingWhatsAppButton />
      <Footer />
    </main>
  );
}
