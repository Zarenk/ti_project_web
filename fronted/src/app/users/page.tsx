"use client"

import { useState } from "react"
import { Camera, Edit, Eye, Package, User, Calendar, Clock, Mail, Phone, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export default function UserPanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    nombre: "María González",
    email: "maria.gonzalez@email.com",
    telefono: "+34 612 345 678",
    direccion: "Calle Mayor 123, 28001 Madrid, España",
  })

  const orderHistory = [
    { numero: "#ORD-2024-001", fecha: "15/01/2024", estado: "Entregado", total: "€89.99" },
    { numero: "#ORD-2024-002", fecha: "28/01/2024", estado: "En tránsito", total: "€156.50" },
    { numero: "#ORD-2024-003", fecha: "05/02/2024", estado: "Procesando", total: "€234.75" },
    { numero: "#ORD-2024-004", fecha: "12/02/2024", estado: "Entregado", total: "€67.25" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregado":
        return "bg-green-100 text-green-800 border-green-200"
      case "En tránsito":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Procesando":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleSave = () => {
    setIsEditing(false)
    // Aquí iría la lógica para guardar los datos
  }

  const handleImageChange = () => {
    // Aquí iría la lógica para cambiar la imagen de perfil
    console.log("Cambiar imagen de perfil")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Panel de Usuario</h1>
          <p className="text-blue-600">Gestiona tu información personal y revisa tu actividad</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mis Datos */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mis Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-blue-900 font-medium">
                      Nombre
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                      <Input
                        id="nombre"
                        value={userData.nombre}
                        onChange={(e) => setUserData({ ...userData, nombre: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-blue-900 font-medium">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                      <Input
                        id="email"
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-blue-900 font-medium">
                      Teléfono
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                      <Input
                        id="telefono"
                        value={userData.telefono}
                        onChange={(e) => setUserData({ ...userData, telefono: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direccion" className="text-blue-900 font-medium">
                      Dirección
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                      <Input
                        id="direccion"
                        value={userData.direccion}
                        onChange={(e) => setUserData({ ...userData, direccion: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                        Guardar
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Historial de Pedidos */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Historial de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-900 font-semibold">Número de pedido</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Fecha</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Estado</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Total</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderHistory.map((order, index) => (
                        <TableRow key={index} className="hover:bg-blue-50/50">
                          <TableCell className="font-medium text-blue-800">{order.numero}</TableCell>
                          <TableCell className="text-gray-700">{order.fecha}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.estado)}>{order.estado}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-700">{order.total}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Imagen de Perfil */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Imagen de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-32 w-32 border-4 border-blue-200 shadow-lg">
                    <AvatarImage src="/placeholder.svg?height=128&width=128" alt="Foto de perfil" />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-2xl font-bold">MG</AvatarFallback>
                  </Avatar>
                  <Button onClick={handleImageChange} className="bg-cyan-600 hover:bg-cyan-700 text-white w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Cambiar imagen de perfil
                  </Button>
                  <p className="text-sm text-gray-600">
                    Formatos permitidos: JPG, PNG, GIF
                    <br />
                    Tamaño máximo: 5MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Otros Datos */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Otros Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-900 font-medium">Fecha de registro</span>
                    </div>
                    <span className="text-gray-700">15/03/2023</span>
                  </div>
                  <Separator className="bg-blue-200" />
                  <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-600" />
                      <span className="text-blue-900 font-medium">Último acceso</span>
                    </div>
                    <span className="text-gray-700">Hoy, 14:30</span>
                  </div>
                  <Separator className="bg-blue-200" />
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-900 font-medium">Total de pedidos</span>
                    </div>
                    <span className="text-gray-700 font-semibold">24</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
