'use client';

import type React from 'react';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Package,
  Shield,
  Clock,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';
import Navbar from '@/components/navbar';

export default function WarrantyPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderNumber: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar/>
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-slate-900 dark:via-blue-950 dark:to-slate-800">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Política de Devoluciones y Garantías
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-6 leading-tight">
              Tu tranquilidad es nuestra
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text">
                {' '}
                prioridad
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Conoce todos los detalles sobre nuestros procesos de devolución y
              garantía. Estamos aquí para asegurar tu satisfacción con cada
              compra de tecnología.
            </p>
          </div>
        </section>

        {/* Returns Process Section */}
        <section className="py-16 px-4 bg-white/50 dark:bg-slate-800/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <ArrowLeft className="w-4 h-4" />
                Proceso de Devoluciones
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Devoluciones Fáciles y Rápidas
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Proceso simple en 4 pasos para devolver cualquier producto que
                no cumpla tus expectativas
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                {
                  step: '1',
                  title: 'Solicita la Devolución',
                  description:
                    'Contacta con nosotros dentro de los 30 días posteriores a la compra',
                  icon: <MessageSquare className="w-6 h-6" />,
                },
                {
                  step: '2',
                  title: 'Prepara el Producto',
                  description:
                    'Empaca el producto en su caja original con todos los accesorios',
                  icon: <Package className="w-6 h-6" />,
                },
                {
                  step: '3',
                  title: 'Envía el Producto',
                  description:
                    'Utiliza la etiqueta de envío prepagada que te proporcionamos',
                  icon: <ArrowLeft className="w-6 h-6" />,
                },
                {
                  step: '4',
                  title: 'Recibe tu Reembolso',
                  description:
                    'Procesamos tu reembolso en 3-5 días hábiles tras recibir el producto',
                  icon: <CheckCircle className="w-6 h-6" />,
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-slate-800/80 hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white mx-auto mb-3">
                      {item.icon}
                    </div>
                    <Badge variant="secondary" className="w-fit mx-auto mb-2">
                      Paso {item.step}
                    </Badge>
                    <CardTitle className="text-lg text-slate-800 dark:text-slate-100">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300 text-center">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-slate-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Criterios de Elegibilidad y Plazos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
                      Productos Elegibles:
                    </h4>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Computadoras y laptops
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Accesorios tecnológicos
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Productos sin daños físicos
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Embalaje original completo
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
                      Documentación Requerida:
                    </h4>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Factura de compra original
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Número de pedido
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Motivo de la devolución
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Fotos del producto (si aplica)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Warranty Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                Proceso de Garantías
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Garantía Completa y Confiable
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Protección integral para todos tus productos tecnológicos con
                soporte especializado
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="border-cyan-100 dark:border-cyan-900/50 bg-white/80 dark:bg-slate-800/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Shield className="w-5 h-5 text-cyan-600" />
                    Cobertura de Garantía
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        Computadoras
                      </span>
                      <Badge variant="secondary">2 años</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        Laptops
                      </span>
                      <Badge variant="secondary">2 años</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        Accesorios
                      </span>
                      <Badge variant="secondary">1 año</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-cyan-100 dark:border-cyan-900/50">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      Incluye:
                    </h5>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-sm">
                      <li>• Defectos de fabricación</li>
                      <li>• Fallas de hardware</li>
                      <li>• Problemas de software preinstalado</li>
                      <li>• Soporte técnico especializado</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-100 dark:border-orange-900/50 bg-white/80 dark:bg-slate-800/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Exclusiones de Garantía
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Daños por uso inadecuado o negligencia</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Daños por líquidos o humedad</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Modificaciones no autorizadas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Daños por virus o malware</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Desgaste normal por uso</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-slate-800/80">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-100">
                  Procedimiento para Reclamar Garantía
                </CardTitle>
                <CardDescription>
                  Sigue estos pasos para activar tu garantía de forma rápida y
                  eficiente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white mx-auto mb-3">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      1. Contacta
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      Llama a nuestro centro de soporte técnico especializado
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white mx-auto mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      2. Documenta
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      Proporciona número de serie, factura y descripción del
                      problema
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white mx-auto mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      3. Resuelve
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      Recibe reparación, reemplazo o reembolso según corresponda
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-white/50 dark:bg-slate-800/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Preguntas Frecuentes
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Respuestas a las consultas más comunes sobre devoluciones y
                garantías
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-blue-100 dark:border-blue-900/50 rounded-lg px-6 bg-white/80 dark:bg-slate-800/80"
              >
                <AccordionTrigger className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  ¿Puedo devolver un producto después de 30 días?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300">
                  Nuestro período estándar de devolución es de 30 días. Sin
                  embargo, para productos con defectos de fabricación, puedes
                  utilizar la garantía que puede extenderse hasta 2 años
                  dependiendo del producto.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-blue-100 dark:border-blue-900/50 rounded-lg px-6 bg-white/80 dark:bg-slate-800/80"
              >
                <AccordionTrigger className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  ¿Qué pasa si perdí la factura original?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300">
                  Podemos buscar tu compra en nuestro sistema usando tu email,
                  número de teléfono o número de pedido. También aceptamos
                  estados de cuenta bancarios como comprobante de compra.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-blue-100 dark:border-blue-900/50 rounded-lg px-6 bg-white/80 dark:bg-slate-800/80"
              >
                <AccordionTrigger className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  ¿Cuánto tiempo toma procesar un reembolso?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300">
                  Una vez que recibimos y verificamos el producto devuelto,
                  procesamos el reembolso en 3-5 días hábiles. El tiempo para
                  que aparezca en tu cuenta depende de tu banco o método de pago
                  original.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-blue-100 dark:border-blue-900/50 rounded-lg px-6 bg-white/80 dark:bg-slate-800/80"
              >
                <AccordionTrigger className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  ¿La garantía cubre daños accidentales?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300">
                  La garantía estándar cubre defectos de fabricación y fallas de
                  hardware, pero no daños accidentales. Ofrecemos planes de
                  protección extendida que sí cubren daños accidentales por una
                  tarifa adicional.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="border border-blue-100 dark:border-blue-900/50 rounded-lg px-6 bg-white/80 dark:bg-slate-800/80"
              >
                <AccordionTrigger className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  ¿Puedo cambiar un producto por otro modelo?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300">
                  Sí, dentro del período de 30 días puedes cambiar tu producto
                  por otro modelo. Si hay diferencia de precio, puedes pagar la
                  diferencia o recibir un reembolso parcial según corresponda.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Contacto y Soporte
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Nuestro equipo está aquí para ayudarte con cualquier consulta
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-slate-800/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Phone className="w-5 h-5 text-blue-600" />
                      Teléfono de Soporte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      +34 900 123 456
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Lunes a Viernes: 9:00 - 18:00
                      <br />
                      Sábados: 10:00 - 14:00
                    </p>
                    <Badge variant="secondary">
                      Soporte técnico especializado
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-cyan-100 dark:border-cyan-900/50 bg-white/80 dark:bg-slate-800/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Mail className="w-5 h-5 text-cyan-600" />
                      Correo Electrónico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                      soporte@techstore.es
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Respuesta en menos de 24 horas
                    </p>
                    <Badge variant="secondary">Consultas por escrito</Badge>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-slate-800/80">
                <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-100">
                    Formulario de Consulta
                  </CardTitle>
                  <CardDescription>
                    Envíanos tu consulta y te responderemos lo antes posible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Nombre completo
                        </label>
                        <Input
                          placeholder="Tu nombre"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="border-blue-200 dark:border-blue-800"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Correo electrónico
                        </label>
                        <Input
                          type="email"
                          placeholder="tu@email.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="border-blue-200 dark:border-blue-800"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Número de pedido (opcional)
                      </label>
                      <Input
                        placeholder="TS-2024-001234"
                        value={formData.orderNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            orderNumber: e.target.value,
                          })
                        }
                        className="border-blue-200 dark:border-blue-800"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Mensaje
                      </label>
                      <Textarea
                        placeholder="Describe tu consulta o problema..."
                        rows={4}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        className="border-blue-200 dark:border-blue-800"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      Enviar Consulta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}