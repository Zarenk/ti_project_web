"use client"

import type React from "react"

import { useState } from "react"
import { Mail, MapPin, Phone, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Navbar from "@/components/navbar"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "",
    mensaje: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Here you would typically send the data to your backend
  }

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
    <Navbar />
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 py-16 px-4">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">Contáctanos</h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Estamos aquí para ayudarte. Ponte en contacto con nosotros para cualquier consulta, propuesta comercial o
            solicitud de soporte técnico.
          </p>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-20 bg-gradient-to-t from-blue-50 to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  Envíanos un mensaje
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Completa el formulario y nos pondremos en contacto contigo lo antes posible.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 group">
                      <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                        Nombre completo *
                      </Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={handleInputChange}
                        className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg transition-all duration-200 group-hover:border-blue-300"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Correo electrónico *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg transition-all duration-200 group-hover:border-blue-300"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 group">
                      <Label htmlFor="telefono" className="text-sm font-medium text-gray-700">
                        Teléfono
                      </Label>
                      <Input
                        id="telefono"
                        name="telefono"
                        type="tel"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg transition-all duration-200 group-hover:border-blue-300"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="asunto" className="text-sm font-medium text-gray-700">
                        Asunto *
                      </Label>
                      <Input
                        id="asunto"
                        name="asunto"
                        type="text"
                        required
                        value={formData.asunto}
                        onChange={handleInputChange}
                        className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg transition-all duration-200 group-hover:border-blue-300"
                        placeholder="¿En qué podemos ayudarte?"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="mensaje" className="text-sm font-medium text-gray-700">
                      Mensaje *
                    </Label>
                    <Textarea
                      id="mensaje"
                      name="mensaje"
                      required
                      value={formData.mensaje}
                      onChange={handleInputChange}
                      rows={6}
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg transition-all duration-200 group-hover:border-blue-300 resize-none"
                      placeholder="Cuéntanos más detalles sobre tu consulta..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar mensaje
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information Sidebar */}
          <div className="space-y-6">
            {/* Contact Details Card */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">Información de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Dirección</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Av. Tecnología 123, Piso 15
                      <br />
                      Ciudad Empresarial
                      <br />
                      CP 12345, México
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-cyan-50/50 hover:bg-cyan-50 transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Teléfono</h3>
                    <p className="text-gray-600 text-sm">+52 (55) 1234-5678</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Correo de atención</h3>
                    <p className="text-gray-600 text-sm">contacto@empresa.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-cyan-50/50 hover:bg-cyan-50 transition-colors duration-200 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Horario de atención</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Lunes a Viernes
                      <br />
                      9:00 AM - 6:00 PM
                      <br />
                      <span className="text-xs text-gray-500">(Hora del Centro)</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Response Card */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3">Respuesta rápida</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">
                  Nuestro equipo de soporte responde en un promedio de 2 horas durante horario laboral.
                </p>
                <div className="flex items-center gap-2 text-blue-100 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Disponible ahora
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer Wave */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        <svg className="relative w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            className="fill-blue-50"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5"
            className="fill-blue-50"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className="fill-blue-50"
          ></path>
        </svg>
      </div>
    </div>
  )
}