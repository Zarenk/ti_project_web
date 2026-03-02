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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automatizaciones
              </CardTitle>
              <CardDescription>
                Configura mensajes automáticos para eventos del sistema
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Automatización
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Automatización</DialogTitle>
                  <DialogDescription>
                    Configura un mensaje automático que se enviará cuando ocurra un evento específico
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      placeholder="Notificación de venta"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      placeholder="Breve descripción"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="triggerEvent">Evento Disparador *</Label>
                      <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                        <SelectTrigger id="triggerEvent">
                          <SelectValue placeholder="Selecciona un evento" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_EVENTS.map((event) => (
                            <SelectItem key={event.value} value={event.value}>
                              {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="templateId">Plantilla (Opcional)</Label>
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger id="templateId">
                          <SelectValue placeholder="Sin plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin plantilla</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipients">
                      Destinatarios * <span className="text-xs text-muted-foreground">(uno por línea o separados por comas)</span>
                    </Label>
                    <Textarea
                      id="recipients"
                      placeholder={`client (para enviar al cliente de la venta/cotización)\nadmin (para enviar a administradores)\n987654321 (número específico)`}
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delayMinutes">Retraso (minutos, opcional)</Label>
                    <Input
                      id="delayMinutes"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={delayMinutes}
                      onChange={(e) => setDelayMinutes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Crear Automatización'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Cargando automatizaciones...</p>
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No hay automatizaciones configuradas</p>
              <p className="text-sm">Crea tu primera automatización para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => (
                <Collapsible key={automation.id}>
                  <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{automation.name}</h4>
                          <Badge variant={automation.isActive ? 'default' : 'secondary'} className="text-xs">
                            {automation.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {automation.usageCount} ejecuciones
                          </Badge>
                        </div>
                        {automation.description && (
                          <p className="text-sm text-muted-foreground mb-2">{automation.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {TRIGGER_EVENTS.find((e) => e.value === automation.triggerEvent)?.label || automation.triggerEvent}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {automation.recipients.length} destinatario(s)
                          </div>
                          {automation.template && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {automation.template.displayName}
                            </div>
                          )}
                          {automation.delayMinutes !== undefined && automation.delayMinutes > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {automation.delayMinutes} min
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={automation.isActive}
                            onCheckedChange={(checked) => handleToggleActive(automation.id, checked)}
                          />
                          <Power className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(automation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Ver destinatarios
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-xs font-medium mb-2">Destinatarios:</p>
                        <div className="flex flex-wrap gap-1">
                          {automation.recipients.map((recipient, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
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
