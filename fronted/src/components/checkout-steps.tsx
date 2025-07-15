import { Progress } from "@/components/progress"

interface CheckoutStepsProps {
  step: number
}

export default function CheckoutSteps({ step }: CheckoutStepsProps) {
  const steps = ["Carrito", "Envío", "Pago", "Confirmación"]
  const progress = ((step - 1) / (steps.length - 1)) * 100

  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs font-medium mb-2">
        {steps.map((label, index) => (
          <span
            key={label}
            className={index + 1 <= step ? "text-sky-600" : "text-gray-400"}
          >
            {label}
          </span>
        ))}
      </div>
      <Progress value={progress} />
    </div>
  )
}