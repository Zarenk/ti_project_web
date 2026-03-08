"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"

// ── Input sanitization by field type ──

export function sanitizeInput(id: string, value: string) {
  let newValue = value
  switch (id) {
    case "firstName":
    case "lastName":
    case "invoiceName":
    case "razonSocial":
    case "cardName":
    case "shipFirstName":
    case "shipLastName":
      newValue = newValue.replace(/[^a-zA-Z\sÁÉÍÓÚáéíóúñÑ]/g, "")
      break
    case "phone":
      newValue = newValue.replace(/[^0-9+]/g, "")
      break
    case "dni":
    case "personalDni":
      newValue = newValue.replace(/\D/g, "").slice(0, 8)
      break
    case "ruc":
      newValue = newValue.replace(/\D/g, "").slice(0, 11)
      break
    case "postalCode":
    case "shipPostalCode":
    case "cvv":
      newValue = newValue.replace(/\D/g, "")
      break
    case "cardNumber":
      newValue = newValue.replace(/\D/g, "").slice(0, 16)
      break
    case "expiry":
      newValue = newValue.replace(/[^0-9/]/g, "").slice(0, 5)
      if (newValue.length === 2 && !newValue.includes("/")) newValue += "/"
      break
    default:
      break
  }
  return newValue
}

// ── Form validation ──

export type FormData = {
  firstName: string
  lastName: string
  email: string
  personalDni: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  shipFirstName: string
  shipLastName: string
  shipAddress: string
  shipCity: string
  shipPostalCode: string
  cardNumber: string
  expiry: string
  cvv: string
  cardName: string
  invoiceType: string
  dni: string
  invoiceName: string
  ruc: string
  razonSocial: string
  invoiceAddress: string
}

export const INITIAL_FORM_DATA: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  personalDni: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  shipFirstName: "",
  shipLastName: "",
  shipAddress: "",
  shipCity: "",
  shipPostalCode: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
  cardName: "",
  invoiceType: "BOLETA",
  dni: "",
  invoiceName: "",
  ruc: "",
  razonSocial: "",
  invoiceAddress: "",
}

const NAME_REGEX = /^[a-zA-Z\sÁÉÍÓÚáéíóúñÑ]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?\d{6,15}$/

export function validateCheckoutForm(
  formData: FormData,
  paymentMethod: string,
  sameAsShipping: boolean,
  pickupInStore: boolean,
): Record<string, string> {
  const e: Record<string, string> = {}

  if (!formData.firstName.trim()) e.firstName = "Ingrese sus nombres completos"
  else if (!NAME_REGEX.test(formData.firstName.trim())) e.firstName = "El nombre solo debe contener letras"

  if (!formData.lastName.trim()) e.lastName = "Ingrese sus apellidos"
  else if (!NAME_REGEX.test(formData.lastName.trim())) e.lastName = "El apellido solo debe contener letras"

  if (!formData.email.trim()) e.email = "Ingrese su email"
  else if (!EMAIL_REGEX.test(formData.email.trim())) e.email = "Ingrese un email valido"

  if (!formData.phone.trim()) e.phone = "Ingrese su telefono"
  else if (!PHONE_REGEX.test(formData.phone.trim())) e.phone = "Ingrese un telefono valido"

  if (!formData.personalDni.trim()) e.personalDni = "Ingrese su DNI"
  else if (!/^\d{8}$/.test(formData.personalDni)) e.personalDni = "El DNI debe tener 8 digitos"

  if (!formData.address.trim()) e.address = "Ingrese su direccion de facturacion"
  if (!formData.city.trim()) e.city = "Ingrese su ciudad"
  if (!formData.state.trim()) e.state = "Ingrese su estado o region"
  if (!formData.postalCode.trim()) e.postalCode = "Ingrese su codigo postal"
  else if (!/^\d+$/.test(formData.postalCode)) e.postalCode = "Codigo postal invalido"

  if (formData.invoiceType === "BOLETA") {
    if (!formData.dni.trim()) e.dni = "Ingrese su DNI"
    else if (!/^\d{8}$/.test(formData.dni)) e.dni = "El DNI debe tener 8 digitos"
    if (!formData.invoiceName.trim()) e.invoiceName = "Ingrese su nombre completo"
    else if (!NAME_REGEX.test(formData.invoiceName.trim())) e.invoiceName = "El nombre solo debe contener letras"
  } else if (formData.invoiceType === "FACTURA") {
    if (!formData.ruc.trim()) e.ruc = "Ingrese su RUC"
    else if (!/^\d{11}$/.test(formData.ruc)) e.ruc = "El RUC debe tener 11 digitos"
    if (!formData.razonSocial.trim()) e.razonSocial = "Ingrese la razon social"
    else if (!NAME_REGEX.test(formData.razonSocial.trim())) e.razonSocial = "La razon social solo debe contener letras"
    if (!formData.invoiceAddress.trim()) e.invoiceAddress = "Ingrese la direccion"
  }

  if (!sameAsShipping && !pickupInStore) {
    if (!formData.shipFirstName.trim()) e.shipFirstName = "Ingrese los nombres de envio"
    else if (!NAME_REGEX.test(formData.shipFirstName.trim())) e.shipFirstName = "El nombre solo debe contener letras"
    if (!formData.shipLastName.trim()) e.shipLastName = "Ingrese los apellidos de envio"
    else if (!NAME_REGEX.test(formData.shipLastName.trim())) e.shipLastName = "El apellido solo debe contener letras"
    if (!formData.shipAddress.trim()) e.shipAddress = "Ingrese la direccion de envio"
    if (!formData.shipCity.trim()) e.shipCity = "Ingrese la ciudad de envio"
    else if (!NAME_REGEX.test(formData.shipCity.trim())) e.shipCity = "La ciudad solo debe contener letras"
    if (!formData.shipPostalCode.trim()) e.shipPostalCode = "Ingrese el codigo postal de envio"
  }

  if (!paymentMethod) e.paymentMethod = "Seleccione un metodo de pago"
  if (paymentMethod === "visa") {
    const cardNum = formData.cardNumber.replace(/\s+/g, "")
    if (!cardNum) e.cardNumber = "Ingrese el numero de tarjeta"
    else if (!/^\d{16}$/.test(cardNum)) e.cardNumber = "Numero de tarjeta invalido"
    if (!formData.expiry.trim()) e.expiry = "Ingrese la fecha de expiracion"
    else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiry)) e.expiry = "Formato MM/YY invalido"
    if (!formData.cvv.trim()) e.cvv = "Ingrese el CVV"
    else if (!/^\d{3,4}$/.test(formData.cvv)) e.cvv = "CVV invalido"
    if (!formData.cardName.trim()) e.cardName = "Ingrese el nombre de la tarjeta"
    else if (!NAME_REGEX.test(formData.cardName.trim())) e.cardName = "El nombre solo debe contener letras"
  }

  return e
}

// ── Debounced callback hook ──

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay],
  )
}

// ── Payment method map ──

export const PAYMENT_METHOD_MAP: Record<string, number> = {
  visa: -3,
  transfer: -2,
  yape: -4,
}
