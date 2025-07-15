import { Progress } from "@/components/progress"

interface CheckoutStepsProps {
  step: number
}

export default function CheckoutSteps({ step }: CheckoutStepsProps) {
  const steps = ["Carrito", "Envío", "Pago", "Confirmación"]
  const progress = ((step - 1) / (steps.length - 1)) * 100

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {steps.map((label, index) => {
          const active = index + 1 <= step
          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-100 text-sky-400'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  active ? 'text-sky-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <Progress
        value={progress}
        className="h-2 bg-sky-100"
        indicatorClassName="bg-sky-600"
      />
    </div>
  )
}