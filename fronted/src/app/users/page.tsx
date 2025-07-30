"use client"

import React, { useState, useEffect, useRef } from "react"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Edit, Eye, Package, User, Calendar, Clock, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { getUserProfile, updateUser } from "../dashboard/users/users.api"
import { getLastAccessFromToken, getUserDataFromToken, isTokenValid } from "@/lib/auth"
import {
  getClients,
  updateClient,
  uploadClientImage,
  createClient,
  selfRegisterClient,
} from "../dashboard/clients/clients.api"
import { getOrdersByUser } from "../dashboard/sales/sales.api"
import Navbar from "@/components/navbar"
import { useRouter } from "next/navigation"
import SimplePagination from "@/components/simple-pagination"

export default function UserPanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [clientId, setClientId] = useState<number | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [registrationDate, setRegistrationDate] = useState<string>('')
  const [lastAccess, setLastAccess] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const data = await getUserDataFromToken()
      if (!data || !(await isTokenValid())) {
        router.replace('/login')
        return
      }
      if (data.role?.toUpperCase().trim() !== 'CLIENT') {
        router.replace('/dashboard')
        return
      }
    }
    check()
  }, [router])

  const documentTypes = ["DNI", "CARNET DE EXTRANJERIA", "OTRO"] as const

  const userSchema = z
    .object({
      nombre: z
        .string()
        .min(1, "El nombre es obligatorio")
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "El nombre solo puede contener letras y espacios"),
      email: z.string().email("Correo electrónico inválido"),
      telefono: z
        .string()
        .regex(/^\d+$/, "El teléfono solo puede contener números"),
      direccion: z
        .string()
        .max(200, "La dirección no puede tener más de 200 caracteres"),
      tipoDocumento: z
        .union([z.enum(documentTypes), z.literal("")])
        .refine((val) => val !== "", {
          message: "Selecciona un tipo de documento",
        }),
      numeroDocumento: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.tipoDocumento === "DNI") {
        if (!/^\d{8}$/.test(values.numeroDocumento)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["numeroDocumento"],
            message: "Número de documento inválido",
          })
        }
  } else {
        if (!/^\d{1,20}$/.test(values.numeroDocumento)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["numeroDocumento"],
            message: "Número de documento inválido",
          })
        }
      }
  })

  type UserFormType = z.infer<typeof userSchema>

  const [userData, setUserData] = useState<UserFormType>({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
  })
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const displayedOrders = orderHistory.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  useEffect(() => {
    setPage(1)
  }, [pageSize, orderHistory.length])

  const form = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
    defaultValues: userData,
  })

  const watchNombre = form.watch('nombre')

  useEffect(() => {
    form.reset(userData)
  }, [userData])

  useEffect(() => {
    async function loadData() {
      const session = await getUserDataFromToken()
      if (!session || !(await isTokenValid())) {
        router.replace('/login')
        return
      }
      if (session.role?.toUpperCase().trim() !== 'CLIENT') {
        router.replace('/dashboard')
        return
      }
      try {
        const profile = await getUserProfile()
        setRegistrationDate(
          new Date(profile.createdAt).toLocaleDateString('es-ES')
        )
        const last = getLastAccessFromToken()
        if (last) {
          setLastAccess(last.toLocaleString('es-ES'))
        }
        setUserId(profile.id)
        const clients = await getClients()
        const client = clients.find((c: any) => c.userId === profile.id)
        if (client) {
          setClientId(client.id)
          setImageUrl(client.image || null)
          setUserData({
            nombre: client.name || profile.username,
            email: client.email || profile.email || '',
            telefono: client.phone || '',
            direccion: client.adress || '',
            tipoDocumento: client.type || '',
            numeroDocumento: client.typeNumber || '',
          })
        } else {
          setUserData({
            nombre: profile.username,
            email: profile.email || '',
            telefono: '',
            direccion: '',
            tipoDocumento: 'DNI',
            numeroDocumento: '',
          })
        }

        const orders = await getOrdersByUser(profile.id)
        const historyOrders = orders.map((o: any) => {
          const payload = o.payload as any
          return {
            id: o.id,
            numero: `#${o.code}`,
            fecha: new Date(o.createdAt).toLocaleDateString('es-ES'),
            date: new Date(o.createdAt),
            estado: o.status === 'PENDING' ? 'Pendiente' : 'Completado',
            total: `S/. ${(payload.total ?? 0).toFixed(2)}`,
            link: `/pending-orders/${o.id}`,
          }
        })

        setOrderHistory(historyOrders)
      } catch (error: any) {
        if (error.message === 'Unauthorized') {
          router.push('/unauthorized')
        } else {
          console.error('Error loading user panel:', error)
        }
      }
    }
    loadData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregado":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
      case "En tránsito":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
      case "Procesando":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
      case "Completado":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
    }
  }

  const handleSave = form.handleSubmit(async (values) => {
    // Aquí iría la lógica para guardar los datos
    try {
      await updateUser({ email: values.email, username: values.nombre })
    } catch (error) {
      console.error('Error saving user info:', error)
    }
    try {
      if (clientId) {
        await updateClient(String(clientId), {
          name: values.nombre,
          email: values.email,
          phone: values.telefono,
          adress: values.direccion,
          type: values.tipoDocumento || null,
          typeNumber: values.numeroDocumento || null,
        })
      } else if (userId) {
        const newClient = await createClient({
          name: values.nombre,
          email: values.email,
          phone: values.telefono,
          adress: values.direccion,
          type: values.tipoDocumento || null,
          typeNumber: values.numeroDocumento || null,
          userId,
        })

        // Guarda el resto de datos que no se manejan en create
        await updateClient(String(newClient.id), {
          email: values.email,
          phone: values.telefono,
          adress: values.direccion,
          type: values.tipoDocumento || null,
          typeNumber: values.numeroDocumento || null,
        })
        setClientId(newClient.id)
      }
      setUserData(values)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving client info:', error)
    }
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Mostrar una vista previa inmediata mientras se sube la imagen
    const previewUrl = URL.createObjectURL(file)
    // Mantenemos la vista previa hasta confirmar que la subida fue exitosa
    setImageUrl(previewUrl)

    try {
      const { url } = await uploadClientImage(file)
      let currentId = clientId
      if (!currentId && userId) {
        // Crea el cliente si aún no existe
        const created = await selfRegisterClient({
          name: userData.nombre || 'Cliente',
          userId,
          type: userData.tipoDocumento || undefined,
          typeNumber: userData.numeroDocumento || undefined,
        })
        currentId = created.id
        setClientId(created.id)
      }

      if (!currentId) return

      await updateClient(String(currentId), { image: url })
      // Liberamos la URL previa y actualizamos con la definitiva
      URL.revokeObjectURL(previewUrl)
      setImageUrl(url)
    } catch (error) {
      console.error('Error uploading image', error)
      // Si ocurre un error, mantenemos la vista previa para que el usuario vea la imagen seleccionada
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCancel = () => {
    form.reset(userData)
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 dark:text-blue-200 mb-2">Panel de Usuario</h1>
          <p className="text-blue-600 dark:text-blue-300">Gestiona tu información personal y revisa tu actividad</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mis Datos */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-800 dark:to-cyan-800 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mis Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-blue-900 dark:text-blue-100 font-medium">
                      Nombre
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <Input
                        id="nombre"
                        {...form.register('nombre')}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                      />
                      {form.formState.errors.nombre && (
                        <p className="text-red-500 text-sm">{form.formState.errors.nombre.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-blue-900 dark:text-blue-100 font-medium">
                      Correo electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <Input
                        id="email"
                        {...form.register('email')}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-blue-900 dark:text-blue-100 font-medium">
                      Teléfono
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <Input
                        id="telefono"
                        {...form.register('telefono')}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                      />
                      {form.formState.errors.telefono && (
                        <p className="text-red-500 text-sm">{form.formState.errors.telefono.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direccion" className="text-blue-900 dark:text-blue-100 font-medium">
                      Dirección
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <Input
                        id="direccion"
                        {...form.register('direccion')}
                        disabled={!isEditing}
                        className="pl-10 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                      />
                      {form.formState.errors.direccion && (
                        <p className="text-red-500 text-sm">{form.formState.errors.direccion.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoDocumento" className="text-blue-900 dark:text-blue-100 font-medium">
                      Tipo de documento
                    </Label>
                    <Select
                      value={form.watch('tipoDocumento')}
                      onValueChange={(value) =>
                        form.setValue(
                          'tipoDocumento',
                          value as (typeof documentTypes)[number]
                        )
                      }
                      disabled={!isEditing}
                    >
                     <SelectTrigger className="border-blue-200 dark:border-blue-700 focus:border-blue-500 w-full">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="CARNET DE EXTRANJERIA">CARNET DE EXTRANJERIA</SelectItem>
                        <SelectItem value="OTRO">OTRO</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tipoDocumento && (
                      <p className="text-red-500 text-sm">{form.formState.errors.tipoDocumento.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroDocumento" className="text-blue-900 dark:text-blue-100 font-medium">
                      Número de documento
                    </Label>
                    <Input
                      id="numeroDocumento"
                      {...form.register('numeroDocumento')}
                      disabled={!isEditing}
                      className="border-blue-200 dark:border-blue-700 focus:border-blue-500"
                    />
                    {form.formState.errors.numeroDocumento && (
                      <p className="text-red-500 text-sm">
                        {form.formState.errors.numeroDocumento.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  {!isEditing ? (
                    <Button
                      onClick={() => {
                        form.reset(userData)
                        setIsEditing(true)
                      }}
                      className="bg-blue-600 dark:bg-blue-800 hover:bg-blue-700 dark:hover:bg-blue-900 text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                        Guardar
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-800"
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Historial de Pedidos */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-800 dark:to-blue-800 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Historial de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50 dark:bg-blue-900/50">
                        <TableHead className="text-blue-900 dark:text-blue-100 font-semibold">Número de pedido</TableHead>
                        <TableHead className="text-blue-900 dark:text-blue-100 font-semibold">Fecha</TableHead>
                        <TableHead className="text-blue-900 dark:text-blue-100 font-semibold">Estado</TableHead>
                        <TableHead className="text-blue-900 dark:text-blue-100 font-semibold">Total</TableHead>
                        <TableHead className="text-blue-900 dark:text-blue-100 font-semibold">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-800/50">
                          <TableCell className="font-medium text-blue-800 dark:text-blue-200">{order.numero}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{order.fecha}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.estado)}>{order.estado}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-700 dark:text-green-300">{order.total}</TableCell>
                          <TableCell>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-800 bg-transparent"
                            >
                              <Link href={order.link} className="flex items-center">
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
                <div className="py-4">
                  <SimplePagination
                    page={page}
                    pageSize={pageSize}
                    totalItems={orderHistory.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Imagen de Perfil */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-800 dark:to-cyan-800 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Imagen de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-32 w-32 border-4 border-blue-200 dark:border-blue-700 shadow-lg">
                    <AvatarImage
                      src={imageUrl || '/placeholder.svg?height=128&width=128'}
                      alt="Foto de perfil"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg?height=128&width=128'
                      }}
                    />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-2xl font-bold">
                      {(watchNombre || '')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                     className="bg-cyan-600 dark:bg-cyan-800 hover:bg-cyan-700 dark:hover:bg-cyan-900 text-white w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Cambiar imagen de perfil
                  </Button>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Formatos permitidos: JPG, PNG, GIF
                    <br />
                    Tamaño máximo: 5MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Otros Datos */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm p-0">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-800 dark:to-blue-800 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Otros Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-900 dark:text-blue-100 font-medium">Fecha de registro</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{registrationDate}</span>
                  </div>
                  <Separator className="bg-blue-200 dark:bg-blue-700" />
                  <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-blue-900 dark:text-blue-100 font-medium">Último acceso</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{lastAccess}</span>
                  </div>
                  <Separator className="bg-blue-200 dark:bg-blue-700" />
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-900 dark:text-blue-100 font-medium">Total de pedidos</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">{orderHistory.length}</span>
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
