"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { MapPin, Phone, Mail, Facebook, Instagram, Music2, MessageCircle } from "lucide-react"
import type { MenuConfigData } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
}

export function FooterSection({ config, onChange }: Props) {
  const { contact, socialLinks } = config

  const setContact = (field: keyof MenuConfigData["contact"], value: string) => {
    onChange({ contact: { ...contact, [field]: value } })
  }

  const setSocial = (field: keyof MenuConfigData["socialLinks"], value: string) => {
    onChange({ socialLinks: { ...socialLinks, [field]: value } })
  }

  return (
    <div className="space-y-6 w-full min-w-0 overflow-hidden">
      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion de Contacto</CardTitle>
          <CardDescription>
            Estos datos se muestran en el footer de tu carta digital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-address" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Direccion
            </Label>
            <Input
              id="contact-address"
              value={contact.address}
              onChange={(e) => setContact("address", e.target.value)}
              placeholder="Av. Principal 123, Lima - Peru"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telefono
              </Label>
              <Input
                id="contact-phone"
                value={contact.phone}
                onChange={(e) => setContact("phone", e.target.value)}
                placeholder="+51 999 999 999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Correo electronico
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={contact.email}
                onChange={(e) => setContact("email", e.target.value)}
                placeholder="contacto@mirestaurante.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-maps" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Google Maps (URL del embed)
            </Label>
            <Input
              id="contact-maps"
              value={contact.googleMapsUrl}
              onChange={(e) => setContact("googleMapsUrl", e.target.value)}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-xs text-muted-foreground">
              Abre Google Maps, busca tu local, haz click en &quot;Compartir&quot; → &quot;Incorporar un mapa&quot; y copia la URL del src del iframe
            </p>
            {contact.googleMapsUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border aspect-video">
                <iframe
                  src={contact.googleMapsUrl}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicacion en Google Maps"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociales */}
      <Card>
        <CardHeader>
          <CardTitle>Redes Sociales</CardTitle>
          <CardDescription>
            Agrega los enlaces a tus redes sociales para el footer de la carta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="social-facebook" className="flex items-center gap-2">
              <Facebook className="h-3.5 w-3.5 text-blue-600" />
              Facebook
            </Label>
            <Input
              id="social-facebook"
              value={socialLinks.facebook}
              onChange={(e) => setSocial("facebook", e.target.value)}
              placeholder="https://facebook.com/mirestaurante"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-instagram" className="flex items-center gap-2">
              <Instagram className="h-3.5 w-3.5 text-pink-500" />
              Instagram
            </Label>
            <Input
              id="social-instagram"
              value={socialLinks.instagram}
              onChange={(e) => setSocial("instagram", e.target.value)}
              placeholder="https://instagram.com/mirestaurante"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-tiktok" className="flex items-center gap-2">
              <Music2 className="h-3.5 w-3.5 text-foreground" />
              TikTok
            </Label>
            <Input
              id="social-tiktok"
              value={socialLinks.tiktok}
              onChange={(e) => setSocial("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@mirestaurante"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
              WhatsApp
            </Label>
            <Input
              id="social-whatsapp"
              value={socialLinks.whatsapp}
              onChange={(e) => setSocial("whatsapp", e.target.value)}
              placeholder="https://wa.me/51999999999"
            />
            <p className="text-xs text-muted-foreground">
              Formato: https://wa.me/51XXXXXXXXX (codigo de pais + numero sin espacios)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
