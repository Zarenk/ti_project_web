"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

export function useSalePayment(cartTotal: number) {
  const [selectedPayment, setSelectedPayment] = useState<{
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)
  const [splitPayments, setSplitPayments] = useState<
    { paymentMethodId: number; amount: number; currency: string }[]
  >([])
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)

  // Auto-sync quick payment with cart total
  useEffect(() => {
    if (selectedPayment && splitPayments.length === 0) {
      const newTotal = Number(cartTotal.toFixed(2))
      if (
        newTotal > 0 &&
        Math.abs(selectedPayment.amount - newTotal) > 0.001
      ) {
        setSelectedPayment((prev) =>
          prev ? { ...prev, amount: newTotal } : null,
        )
      }
    }
  }, [cartTotal, selectedPayment, splitPayments.length])

  const handleQuickPay = useCallback(
    (methodId: number) => {
      const total = Number(cartTotal.toFixed(2))
      if (total <= 0) {
        toast.error("Agrega productos al carrito primero")
        return
      }
      setSelectedPayment({
        paymentMethodId: methodId,
        amount: total,
        currency: "PEN",
      })
      setSplitPayments([])
    },
    [cartTotal],
  )

  const handleSplitPayClick = useCallback(() => {
    const total = Number(cartTotal.toFixed(2))
    if (total <= 0) {
      toast.error("Agrega productos al carrito primero")
      return
    }
    setSplitDialogOpen(true)
  }, [cartTotal])

  const handleSplitPayConfirm = useCallback(
    (payments: { paymentMethodId: number; amount: number; currency: string }[]) => {
      setSplitPayments(payments)
      setSelectedPayment(null)
    },
    [],
  )

  // Reset (for store change)
  const resetPayment = useCallback(() => {
    setSelectedPayment(null)
    setSplitPayments([])
  }, [])

  return {
    selectedPayment,
    splitPayments,
    splitDialogOpen,
    setSplitDialogOpen,
    handleQuickPay,
    handleSplitPayClick,
    handleSplitPayConfirm,
    resetPayment,
  }
}
