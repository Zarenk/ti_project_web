'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, FileText, Plus, Trash2, Edit, Copy } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  displayName: string;
  content: string;
  description?: string;
  category?: string;
  variables: string[];
  usageCount: number;
}

export default function TemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        toast.error('Error al cargar plantillas');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = text.matchAll(regex);
    return Array.from(new Set(Array.from(matches, (m) => m[1])));
  };

  const handleCreate = async () => {
    if (!name || !displayName || !content) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const variables = extractVariables(content);

      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          displayName,
          content,
          description,
          category,
          variables,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plantilla creada correctamente');
        setIsDialogOpen(false);
        resetForm();
        loadTemplates();
      } else {
        toast.error('Error al crear plantilla', {
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      const response = await fetch(`/api/whatsapp/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plantilla eliminada');
        loadTemplates();
      } else {
        toast.error('Error al eliminar plantilla');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Contenido copiado al portapapeles');
  };

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setContent('');
    setDescription('');
    setCategory('');
  };

  const variables = extractVariables(content);

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Plantillas de Mensajes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Crea plantillas reutilizables con variables dinámicas
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer self-start sm:self-auto h-8 sm:h-9 text-xs sm:text-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Nueva Plantilla
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Crear Plantilla</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Usa variables con el formato {"{{nombreVariable}}"} para contenido dinámico
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="name" className="text-xs sm:text-sm">Nombre Técnico *</Label>
                      <Input
                        id="name"
                        placeholder="sale_confirmation"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="displayName" className="text-xs sm:text-sm">Nombre para Mostrar *</Label>
                      <Input
                        id="displayName"
                        placeholder="Confirmación de Pedido"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="category" className="text-xs sm:text-sm">Categoría</Label>
                      <Input
                        id="category"
                        placeholder="ventas"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="description" className="text-xs sm:text-sm">Descripción</Label>
                      <Input
                        id="description"
                        placeholder="Breve descripción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido *</Label>
                    <Textarea
                      id="content"
                      placeholder="Hola {{clientName}}, tu pedido #{{saleId}} está listo..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                    />
                  </div>
                  {variables.length > 0 && (
                    <div className="space-y-2">
                      <Label>Variables Detectadas</Label>
                      <div className="flex flex-wrap gap-2">
                        {variables.map((v) => (
                          <Badge key={v} variant="secondary">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
                      'Crear Plantilla'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="text-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Cargando plantillas...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay plantillas creadas</p>
              <p className="text-xs sm:text-sm">Crea tu primera plantilla para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors w-full min-w-0 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-medium break-words">{template.displayName}</h4>
                        {template.category && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                            {template.category}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                          {template.usageCount} usos
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyContent(template.content)}
                        className="cursor-pointer h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="cursor-pointer h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 sm:p-3">
                    <p className="text-xs sm:text-sm whitespace-pre-wrap font-mono break-words">{template.content}</p>
                  </div>
                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-[10px] sm:text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
