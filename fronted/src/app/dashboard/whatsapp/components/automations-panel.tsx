'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Loader2, Zap, Plus, Trash2, ChevronDown, Power, Clock, Users, FileText } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  displayName: string;
}

interface Automation {
  id: number;
  name: string;
  description?: string;
  triggerEvent: string;
  recipients: string[];
  templateId?: number;
  template?: Template;
  delayMinutes?: number;
  isActive: boolean;
  usageCount: number;
}

const TRIGGER_EVENTS = [
  { value: 'sale.created', label: 'Venta Creada' },
  { value: 'payment.overdue', label: 'Pago Vencido' },
  { value: 'inventory.low-stock', label: 'Stock Bajo' },
  { value: 'quote.created', label: 'Cotización Creada' },
];

export default function AutomationsPanel() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [recipients, setRecipients] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadAutomations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/automations');
      const data = await response.json();

      if (data.success) {
        setAutomations(data.automations || []);
      } else {
        toast.error('Error al cargar automatizaciones');
      }
    } catch (error) {
      console.error('Error loading automations:', error);
      toast.error('Error al cargar automatizaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/whatsapp/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  useEffect(() => {
    loadAutomations();
    loadTemplates();
  }, []);

  const handleCreate = async () => {
    if (!name || !triggerEvent || !recipients) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const recipientsList = recipients
        .split(/[\n,]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const response = await fetch('/api/whatsapp/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          triggerEvent,
          recipients: recipientsList,
          templateId: templateId && templateId !== 'none' ? parseInt(templateId) : undefined,
          delayMinutes: delayMinutes ? parseInt(delayMinutes) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Automatización creada correctamente');
        setIsDialogOpen(false);
        resetForm();
        loadAutomations();
      } else {
        toast.error('Error al crear automatización', {
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Error creating automation:', error);
      toast.error('Error al crear automatización');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/whatsapp/automations/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isActive ? 'Automatización activada' : 'Automatización desactivada');
        loadAutomations();
      } else {
        toast.error('Error al actualizar automatización');
      }
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error('Error al actualizar automatización');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta automatización?')) return;

    try {
      const response = await fetch(`/api/whatsapp/automations/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Automatización eliminada');
        loadAutomations();
      } else {
        toast.error('Error al eliminar automatización');
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Error al eliminar automatización');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerEvent('');
    setRecipients('');
    setTemplateId('');
    setDelayMinutes('');
  };

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Automatizaciones
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Mensajes automáticos para eventos del sistema
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer self-start sm:self-auto h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
                  <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Nueva
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Automatización</DialogTitle>
                  <DialogDescription>
                    Configura un mensaje automático que se enviará cuando ocurra un evento específico
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs sm:text-sm">Nombre *</Label>
                    <Input
                      id="name"
                      placeholder="Notificación de venta"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 sm:h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs sm:text-sm">Descripción</Label>
                    <Input
                      id="description"
                      placeholder="Breve descripción"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 sm:h-9 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="triggerEvent" className="text-xs sm:text-sm">Evento Disparador *</Label>
                      <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                        <SelectTrigger id="triggerEvent" className="h-8 sm:h-9 text-sm cursor-pointer">
                          <SelectValue placeholder="Selecciona evento" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_EVENTS.map((event) => (
                            <SelectItem key={event.value} value={event.value} className="cursor-pointer">
                              {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="templateId" className="text-xs sm:text-sm">Plantilla (Opcional)</Label>
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger id="templateId" className="h-8 sm:h-9 text-sm cursor-pointer">
                          <SelectValue placeholder="Sin plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="cursor-pointer">Sin plantilla</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()} className="cursor-pointer">
                              {template.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipients" className="text-xs sm:text-sm">
                      Destinatarios * <span className="text-[10px] sm:text-xs text-muted-foreground">(uno por línea o comas)</span>
                    </Label>
                    <Textarea
                      id="recipients"
                      placeholder={`client\nadmin\n987654321`}
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="delayMinutes" className="text-xs sm:text-sm">Retraso (minutos, opcional)</Label>
                    <Input
                      id="delayMinutes"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={delayMinutes}
                      onChange={(e) => setDelayMinutes(e.target.value)}
                      className="h-8 sm:h-9 text-sm"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={isSaving} className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Crear'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {isLoading ? (
            <div className="text-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Cargando automatizaciones...</p>
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Zap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay automatizaciones configuradas</p>
              <p className="text-xs sm:text-sm">Crea tu primera automatización</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {automations.map((automation) => (
                <Collapsible key={automation.id}>
                  <div className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors w-full min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-sm sm:text-base break-words">{automation.name}</h4>
                          <Badge variant={automation.isActive ? 'default' : 'secondary'} className="text-[10px] sm:text-xs flex-shrink-0">
                            {automation.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                            {automation.usageCount}×
                          </Badge>
                        </div>
                        {automation.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 break-words">{automation.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 flex-shrink-0" />
                            {TRIGGER_EVENTS.find((e) => e.value === automation.triggerEvent)?.label || automation.triggerEvent}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            {automation.recipients.length}
                          </div>
                          {automation.template && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[100px] sm:max-w-none">{automation.template.displayName}</span>
                            </div>
                          )}
                          {automation.delayMinutes !== undefined && automation.delayMinutes > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              {automation.delayMinutes} min
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <Switch
                          checked={automation.isActive}
                          onCheckedChange={(checked) => handleToggleActive(automation.id, checked)}
                          className="cursor-pointer"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer"
                          onClick={() => handleDelete(automation.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full mt-1.5 sm:mt-2 cursor-pointer text-xs sm:text-sm h-7 sm:h-8">
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        Ver destinatarios
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/50 rounded p-2.5 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2">Destinatarios:</p>
                        <div className="flex flex-wrap gap-1">
                          {automation.recipients.map((recipient, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
