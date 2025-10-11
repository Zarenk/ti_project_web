import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'El correo electrónico es obligatorio.' },
        { status: 400 },
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { message: 'El correo electrónico proporcionado no es válido.' },
        { status: 400 },
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/users/password/recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail }),
    })

    const contentType = response.headers.get('content-type') || ''
    let data: any = null
    try {
      data = contentType.includes('application/json') ? await response.json() : await response.text()
    } catch (error) {
      data = null
    }

    if (!response.ok) {
      const message = typeof data === 'string' && data ? data : data?.message || 'No fue posible iniciar la recuperación.'
      return NextResponse.json({ message }, { status: response.status })
    }

    const payload = typeof data === 'string' || data === null ? { message: 'Solicitud de recuperación enviada.' } : data
    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('Error en password-recovery:', error)
    return NextResponse.json(
      { message: 'Ocurrió un error interno al procesar la recuperación de contraseña.' },
      { status: 500 },
    )
  }
}