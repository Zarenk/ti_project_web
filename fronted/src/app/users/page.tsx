"use client"

import { useState, useEffect } from "react"
import { Camera, Edit, Eye, Package, User, Calendar, Clock, Mail, Phone, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { getUserProfile, updateUser } from "../dashboard/users/users.api"
import { getClients, updateClient } from "../dashboard/clients/clients.api"
import { getSales } from "../dashboard/sales/sales.api"
import Navbar from "@/components/navbar"

export default function UserPanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [clientId, setClientId] = useState<number | null>(null)
  const [userData, setUserData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    tipoDocumento: "",
    numeroDocumento: "",
  })

  const [orderHistory, setOrderHistory] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await getUserProfile()
        const clients = await getClients()
        const client = clients.find((c: any) => c.userId === profile.userId)
        if (client) {
          setClientId(client.id)
          setUserData({
            nombre: client.name || profile.username,
            email: client.email || '',
            telefono: client.phone || '',
            direccion: client.adress || '',
            tipoDocumento: client.type || '',
            numeroDocumento: client.typeNumber || '',
          })
        } else {
          setUserData((d) => ({ ...d, nombre: profile.username }))
        }

        const sales = await getSales()
        const userSales = sales.filter((s: any) => s.client?.userId === profile.userId)
        const history = userSales.map((s: any) => ({
          id: s.id,
          numero: s.invoices && s.invoices[0] ? `${s.invoices[0].serie}-${s.invoices[0].nroCorrelativo}` : `#${s.id}`,
          fecha: new Date(s.createdAt).toLocaleDateString('es-ES'),
          estado: 'Completado',
          total: `S/. ${s.total.toFixed(2)}`,
        }))
        setOrderHistory(history)
      } catch (error) {
        console.error('Error loading user panel:', error)
      }
    }
    loadData()
  }, [])

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

  const handleSave = async () => {
    setIsEditing(false)
    // Aquí iría la lógica para guardar los datos
    try {
      await updateUser({ email: userData.email, username: userData.nombre })
    } catch (error) {
      console.error('Error saving user info:', error)
    }
    if (clientId) {
      try {
        await updateClient(String(clientId), {
          name: userData.nombre,
          email: userData.email,
          phone: userData.telefono,
          adress: userData.direccion,
          type: userData.tipoDocumento,
          typeNumber: userData.numeroDocumento,
        })
      } catch (error) {
        console.error('Error saving client info:', error)
      }
    }
  }

  const handleImageChange = () => {
    // Aquí iría la lógica para cambiar la imagen de perfil
    console.log("Cambiar imagen de perfil")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
      <Navbar />
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="tipoDocumento" className="text-blue-900 font-medium">
                      Tipo de documento
                    </Label>
                    <Input
                      id="tipoDocumento"
                      value={userData.tipoDocumento}
                      onChange={(e) => setUserData({ ...userData, tipoDocumento: e.target.value })}
                      disabled={!isEditing}
                      className="border-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroDocumento" className="text-blue-900 font-medium">
                      Número de documento
                    </Label>
                    <Input
                      id="numeroDocumento"
                      value={userData.numeroDocumento}
                      onChange={(e) => setUserData({ ...userData, numeroDocumento: e.target.value })}
                      disabled={!isEditing}
                      className="border-blue-200 focus:border-blue-500"
                    />
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg p-4">
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
                      {orderHistory.map((order) => (
                        <TableRow key={order.id} className="hover:bg-blue-50/50">
                          <TableCell className="font-medium text-blue-800">{order.numero}</TableCell>
                          <TableCell className="text-gray-700">{order.fecha}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.estado)}>{order.estado}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-700">{order.total}</TableCell>
                          <TableCell>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                            >
                              <Link href={`/orders/${order.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Link>
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg p-4">
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
                    <span className="text-gray-700 font-semibold">{orderHistory.length}</span>
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
