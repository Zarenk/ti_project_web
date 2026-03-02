import WhatsAppClient from './whatsapp-client';

export const metadata = {
  title: 'WhatsApp Business | Dashboard',
  description: 'Conecta WhatsApp y envía mensajes a tus clientes',
};

export default function WhatsAppPage() {
  return <WhatsAppClient />;
}
