"use client"

import { HelpCircle, Mail, Phone } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion"
import Navbar from "@/components/navbar"

export default function Component() {
  const faqData = [
    {
      question: "¿Hacen envíos a todo el país?",
      answer:
        "Sí, realizamos envíos a todas las ciudades y localidades del país. Trabajamos con las principales empresas de mensajería para garantizar que tu pedido llegue de forma segura. Los costos de envío varían según la ubicación y el peso del producto.",
    },
    {
      question: "¿Cuánto tiempo demora el envío?",
      answer:
        "Los tiempos de entrega dependen de tu ubicación. Para ciudades principales, el envío demora entre 2-4 días hábiles. Para localidades más alejadas, puede tomar entre 5-8 días hábiles. Te enviaremos un código de seguimiento para que puedas rastrear tu pedido en tiempo real.",
    },
    {
      question: "¿Los productos tienen garantía?",
      answer:
        "Todos nuestros productos cuentan con garantía oficial del fabricante. Las computadoras y laptops tienen garantía de 1-3 años dependiendo de la marca y modelo. Los accesorios tienen garantía de 6 meses a 2 años. Además, ofrecemos 30 días de garantía por defectos de fábrica desde la fecha de compra.",
    },
    {
      question: "¿Puedo pagar con tarjeta de crédito o débito?",
      answer:
        "Sí, aceptamos todas las tarjetas de crédito y débito (Visa, Mastercard, American Express). También puedes pagar mediante transferencia bancaria, PayPal, y en algunas zonas ofrecemos pago contra entrega. Todos los pagos son procesados de forma segura con encriptación SSL.",
    },
    {
      question: "¿Qué hago si el producto llega dañado?",
      answer:
        "Si tu producto llega dañado, contáctanos inmediatamente a través de nuestro servicio al cliente. Necesitarás proporcionar fotos del daño y el número de pedido. Procesaremos un reemplazo gratuito o reembolso completo según tu preferencia. Tienes 48 horas desde la recepción para reportar daños.",
    },
    {
      question: "¿Tienen tienda física?",
      answer:
        "Sí, contamos con una tienda física ubicada en el centro de la ciudad donde puedes ver y probar los productos antes de comprar. También ofrecemos servicio técnico especializado. Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM, y sábados de 9:00 AM a 2:00 PM.",
    },
    {
      question: "¿Cómo puedo hacer seguimiento a mi pedido?",
      answer:
        "Una vez confirmado tu pedido, recibirás un email con el número de seguimiento. Puedes rastrear tu envío en nuestra página web ingresando este código, o directamente en la página de la empresa de mensajería. También te enviaremos notificaciones por SMS sobre el estado de tu pedido.",
    },
    {
      question: "¿Ofrecen financiamiento o pagos en cuotas?",
      answer:
        "Sí, ofrecemos planes de financiamiento sin interés hasta 12 cuotas con tarjetas de crédito participantes. También tenemos convenios con entidades financieras para créditos de consumo. Consulta las opciones disponibles al momento de realizar tu compra.",
    },
    {
      question: "¿Puedo cambiar o devolver un producto?",
      answer:
        "Tienes 15 días calendario desde la recepción del producto para solicitar un cambio o devolución, siempre que el artículo esté en perfectas condiciones, con su empaque original y todos los accesorios. Los productos personalizados o de software no son elegibles para devolución.",
    },
    {
      question: "¿Qué marcas manejan?",
      answer:
        "Trabajamos con las mejores marcas del mercado: HP, Dell, Lenovo, ASUS, Acer, MSI, Apple, Samsung, Logitech, Razer, Corsair, entre otras. Todos nuestros productos son originales y cuentan con garantía oficial del fabricante.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-celeste-50 to-white dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-soft-blue-100 dark:bg-blue-800 p-4 rounded-full">
              <HelpCircle className="w-12 h-12 text-soft-blue-600 dark:text-blue-300" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6">Preguntas Frecuentes</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Aquí encontrarás respuestas a las consultas más comunes sobre nuestros productos y servicios. Si no
            encuentras lo que buscas, no dudes en contactarnos y te ayudaremos con gusto.
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card className="mb-12 shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border rounded-lg px-6 py-2 bg-white/50 dark:bg-card/50 hover:bg-soft-blue-50/50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                >
                  <AccordionTrigger className="text-left hover:no-underline group py-6">
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-lg pr-4 group-hover:text-soft-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="bg-gradient-to-r from-soft-blue-100 to-soft-blue-200 dark:from-blue-800 dark:to-blue-900 text-gray-800 dark:text-white shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">¿Aún tienes preguntas?</h3>
            <p className="text-gray-700 dark:text-blue-200 mb-6 text-lg">
              Nuestro equipo de atención al cliente está listo para ayudarte
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="bg-white text-soft-blue-600 hover:bg-soft-blue-50 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-600 font-semibold px-8 py-3 rounded-full transition-all duration-200 hover:scale-105"
              >
                <Link href="/contact">
                  <Mail className="w-5 h-5 mr-2" />
                  Contáctanos aquí
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-soft-blue-600 dark:border-blue-200 dark:text-blue-200 dark:hover:bg-blue-800 dark:hover:text-white font-semibold px-8 py-3 rounded-full transition-all duration-200 hover:scale-105 bg-transparent"
              >
                <Link href="https://wa.me/51949426294" target="_blank" rel="noopener noreferrer">
                  <Phone className="w-5 h-5 mr-2" />
                  Llamar ahora
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
