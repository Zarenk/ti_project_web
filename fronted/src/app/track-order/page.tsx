"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import TemplateNavbar from "@/templates/TemplateNavbar";
import { useActiveTemplate } from "@/templates/use-active-template";
import { useTemplateComponents } from "@/templates/use-store-template";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWebOrderByCode } from "@/app/dashboard/sales/sales.api";
import { Loader2 } from "lucide-react";

export default function TrackOrderPage() {
  const templateId = useActiveTemplate();
  const { TrackOrderLayout } = useTemplateComponents(templateId);

  if (templateId !== "classic") {
    return (
      <>
        <TemplateNavbar />
        <TrackOrderLayout />
      </>
    );
  }
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      await getWebOrderByCode(code.trim());
      router.push(`/track-order/${code.trim()}`);
    } catch (err) {
      toast.error("Orden no encontrada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <TemplateNavbar />
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-blue-900 dark:text-blue-200">
          Seguimiento de Pedido
        </h1>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Ingresa tu código de pedido"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? "Buscando" : "Buscar"}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Buscar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}