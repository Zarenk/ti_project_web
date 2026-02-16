import { memo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  X,
  Save,
  Send,
  MoreHorizontal,
  Eye,
  Printer,
  Mail,
  History,
} from "lucide-react"
import { toast } from "sonner"
import type { QuoteActionButtonsProps } from "../types/quote-types"

export const QuoteActionButtons = memo(function QuoteActionButtons({
  quoteNumber,
  serverQuoteStatus,
  hasProducts,
  hasClient,
  storeId,
  isSavingDraft,
  isIssuingQuote,
  sendingWhatsApp,
  onClear,
  onSaveDraft,
  onPreviewPdf,
  onPrintPdf,
  onSendWhatsApp,
  onIssueQuote,
  isReadOnly,
}: QuoteActionButtonsProps) {
  const canIssue = hasProducts && hasClient

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onClear}
        disabled={isReadOnly || !hasProducts}
      >
        <X className="mr-1.5 h-4 w-4" />
        Limpiar
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onSaveDraft}
        disabled={isSavingDraft || isReadOnly}
      >
        <Save className="mr-1.5 h-4 w-4" />
        {isSavingDraft ? "Guardando..." : "Borrador"}
      </Button>

      <Button
        size="sm"
        className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={onIssueQuote}
        disabled={isIssuingQuote || isReadOnly || !canIssue}
      >
        <Send className="mr-1.5 h-4 w-4" />
        {isIssuingQuote ? "Emitiendo..." : "Emitir"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onPreviewPdf} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            Previsualizar PDF
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onPrintPdf} className="cursor-pointer">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={onSendWhatsApp}
            disabled={sendingWhatsApp}
            className="cursor-pointer"
          >
            <svg
              viewBox="0 0 32 32"
              aria-hidden="true"
              className="mr-2 h-4 w-4"
              fill="currentColor"
            >
              <path d="M16.04 2.004c-7.732 0-14.02 6.203-14.02 13.83 0 2.44.66 4.82 1.91 6.91L2 30l7.42-1.94c2.01 1.08 4.28 1.65 6.62 1.65 7.73 0 14.02-6.2 14.02-13.83 0-7.63-6.29-13.88-14-13.88Zm0 25.17c-2.17 0-4.26-.6-6.09-1.73l-.44-.26-4.4 1.15 1.17-4.2-.29-.42a11.18 11.18 0 0 1-1.79-6.02c0-6.24 5.16-11.32 11.5-11.32 6.33 0 11.5 5.08 11.5 11.32 0 6.24-5.17 11.48-11.46 11.48Zm6.5-8.63c-.36-.18-2.13-1.04-2.46-1.16-.33-.12-.57-.18-.8.18-.23.36-.92 1.16-1.13 1.4-.2.24-.4.27-.76.09-.36-.18-1.51-.55-2.88-1.76-1.07-.94-1.79-2.1-2-2.45-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.62.18-.2.24-.35.36-.58.12-.24.06-.45-.03-.63-.09-.18-.8-1.9-1.1-2.6-.29-.7-.59-.6-.8-.6h-.68c-.24 0-.63.09-.96.45s-1.26 1.23-1.26 3.01 1.29 3.5 1.47 3.74c.18.24 2.54 3.88 6.16 5.44.86.37 1.53.59 2.05.76.86.27 1.64.23 2.26.14.69-.1 2.13-.86 2.43-1.70.3-.84.3-1.56.21-1.7-.09-.15-.33-.24-.69-.42Z" />
            </svg>
            {sendingWhatsApp ? "Enviando..." : "WhatsApp"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => toast("Envío por Email (mock)")}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/quotes/history">
              <History className="mr-2 h-4 w-4" />
              Historial
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
