'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Bot,
  MessageCircle,
  Sparkles,
  Search,
  AlertCircle,
  BookOpen,
  Brain,
  HelpCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

interface AutoReplyConfig {
  id: number;
  isEnabled: boolean;
  greetingMessage: string;
  fallbackMessage: string;
  maxRepliesPerContactPerDay: number;
  aiEnabled: boolean;
}

interface AutoReplyRule {
  id: number;
  keywords: string[];
  answer: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

interface AutoReplyLog {
  id: number;
  contactPhone: string;
  incomingMessage: string;
  replyMessage: string;
  matchType: string;
  matchScore?: number;
  ruleId?: number;
  createdAt: string;
}

// ============================================================================
// MATCH TYPE BADGE
// ============================================================================

const MATCH_TYPE_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  greeting: {
    label: 'Saludo',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: <MessageCircle className="h-3 w-3" />,
  },
  rule: {
    label: 'Regla',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <BookOpen className="h-3 w-3" />,
  },
  kb: {
    label: 'Base de conocimiento',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Search className="h-3 w-3" />,
  },
  ai: {
    label: 'IA',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: <Brain className="h-3 w-3" />,
  },
  fallback: {
    label: 'Sin respuesta',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <HelpCircle className="h-3 w-3" />,
  },
};

function MatchTypeBadge({ type }: { type: string }) {
  const style = MATCH_TYPE_STYLES[type] || MATCH_TYPE_STYLES.fallback;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.icon}
      {style.label}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AutoReplyPanel() {
  // Config state
  const [config, setConfig] = useState<AutoReplyConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  // Rules state
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Rule form
  const [ruleKeywords, setRuleKeywords] = useState('');
  const [ruleAnswer, setRuleAnswer] = useState('');
  const [rulePriority, setRulePriority] = useState('0');

  // Logs state
  const [logs, setLogs] = useState<AutoReplyLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // ============================================================================
  // LOADERS
  // ============================================================================

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-reply/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch {
      toast.error('Error al cargar configuracion');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-reply/rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch {
      toast.error('Error al cargar reglas');
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-reply/logs?limit=30');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch {
      // Silent fail for logs
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadRules();
    loadLogs();
  }, [loadConfig, loadRules, loadLogs]);

  // ============================================================================
  // CONFIG HANDLERS
  // ============================================================================

  const updateConfigField = <K extends keyof AutoReplyConfig>(
    field: K,
    value: AutoReplyConfig[K],
  ) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setConfigDirty(true);
  };

  const saveConfig = async () => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/whatsapp/auto-reply/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: config.isEnabled,
          greetingMessage: config.greetingMessage,
          fallbackMessage: config.fallbackMessage,
          maxRepliesPerContactPerDay: config.maxRepliesPerContactPerDay,
          aiEnabled: config.aiEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setConfigDirty(false);
        toast.success('Configuracion guardada');
      } else {
        toast.error('Error al guardar');
      }
    } catch {
      toast.error('Error al guardar configuracion');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ============================================================================
  // RULE HANDLERS
  // ============================================================================

  const createRule = async () => {
    const keywords = ruleKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      toast.warning('Agrega al menos una palabra clave');
      return;
    }
    if (!ruleAnswer.trim()) {
      toast.warning('La respuesta no puede estar vacia');
      return;
    }

    setIsSavingRule(true);
    try {
      const res = await fetch('/api/whatsapp/auto-reply/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          answer: ruleAnswer.trim(),
          priority: parseInt(rulePriority, 10) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Regla creada');
        setIsRuleDialogOpen(false);
        setRuleKeywords('');
        setRuleAnswer('');
        setRulePriority('0');
        loadRules();
      } else {
        toast.error('Error al crear regla');
      }
    } catch {
      toast.error('Error al crear regla');
    } finally {
      setIsSavingRule(false);
    }
  };

  const toggleRule = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch(`/api/whatsapp/auto-reply/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)),
        );
      }
    } catch {
      toast.error('Error al actualizar regla');
    }
  };

  const deleteRule = async (ruleId: number) => {
    try {
      const res = await fetch(`/api/whatsapp/auto-reply/rules/${ruleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        toast.success('Regla eliminada');
      }
    } catch {
      toast.error('Error al eliminar regla');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingConfig) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Cargando auto-respuestas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* ================================================================== */}
      {/* CONFIG CARD                                                        */}
      {/* ================================================================== */}
      <Card className="border shadow-md w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-5 w-5 text-primary flex-shrink-0" />
              <CardTitle className="text-lg">Asistente Virtual</CardTitle>
            </div>
            {config && (
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(checked) => updateConfigField('isEnabled', checked)}
                className="cursor-pointer"
              />
            )}
          </div>
          <CardDescription>
            {config?.isEnabled
              ? 'El asistente responde automaticamente a los mensajes entrantes'
              : 'Activa el asistente para responder automaticamente por WhatsApp'}
          </CardDescription>
        </CardHeader>

        {config && (
          <CardContent className="space-y-5 overflow-hidden">
            {/* Greeting message */}
            <div className="space-y-1.5">
              <Label htmlFor="greeting" className="text-sm font-medium">
                Mensaje de bienvenida
              </Label>
              <p className="text-xs text-muted-foreground">
                Se envia cuando el cliente dice &quot;hola&quot; o un saludo similar
              </p>
              <Textarea
                id="greeting"
                value={config.greetingMessage}
                onChange={(e) => updateConfigField('greetingMessage', e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {config.greetingMessage.length}/500
              </p>
            </div>

            {/* Fallback message */}
            <div className="space-y-1.5">
              <Label htmlFor="fallback" className="text-sm font-medium">
                Mensaje cuando no hay respuesta
              </Label>
              <p className="text-xs text-muted-foreground">
                Se envia cuando ni las reglas, ni la base de conocimiento, ni la IA pueden responder
              </p>
              <Textarea
                id="fallback"
                value={config.fallbackMessage}
                onChange={(e) => updateConfigField('fallbackMessage', e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {config.fallbackMessage.length}/500
              </p>
            </div>

            {/* Max replies + AI toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="maxReplies" className="text-sm font-medium">
                  Max respuestas por contacto/dia
                </Label>
                <Input
                  id="maxReplies"
                  type="number"
                  min={1}
                  max={50}
                  value={config.maxRepliesPerContactPerDay}
                  onChange={(e) =>
                    updateConfigField(
                      'maxRepliesPerContactPerDay',
                      parseInt(e.target.value, 10) || 10,
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Evita spam si un contacto envia muchos mensajes
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Respuestas con IA</Label>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={config.aiEnabled}
                    onCheckedChange={(checked) => updateConfigField('aiEnabled', checked)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.aiEnabled ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                        IA activada como respaldo
                      </span>
                    ) : (
                      'Solo reglas y base de conocimiento'
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Usa IA cuando las reglas y KB no tienen respuesta
                </p>
              </div>
            </div>

            {/* Save button */}
            {configDirty && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={saveConfig}
                  disabled={isSavingConfig}
                  className="cursor-pointer gap-1.5"
                >
                  {isSavingConfig ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar configuracion
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ================================================================== */}
      {/* RULES CARD                                                         */}
      {/* ================================================================== */}
      <Card className="border shadow-md w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <CardTitle className="text-lg">Reglas personalizadas</CardTitle>
            </div>
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer gap-1.5 flex-shrink-0">
                  <Plus className="h-4 w-4" />
                  Nueva regla
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva regla de auto-respuesta</DialogTitle>
                  <DialogDescription>
                    Cuando un mensaje contenga alguna de las palabras clave, se enviara la respuesta automaticamente.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="keywords">
                      Palabras clave <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="keywords"
                      placeholder="horario, hora, abierto, atencion"
                      value={ruleKeywords}
                      onChange={(e) => setRuleKeywords(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separadas por comas. Si el mensaje contiene alguna, se activa la regla.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ruleAnswer">
                      Respuesta <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="ruleAnswer"
                      placeholder="Nuestro horario de atencion es de lunes a viernes de 9am a 6pm."
                      value={ruleAnswer}
                      onChange={(e) => setRuleAnswer(e.target.value)}
                      rows={4}
                      maxLength={4096}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {ruleAnswer.length}/4096
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Input
                      id="priority"
                      type="number"
                      min={0}
                      max={100}
                      value={rulePriority}
                      onChange={(e) => setRulePriority(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mayor numero = se evalua primero. Util cuando varias reglas pueden coincidir.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsRuleDialogOpen(false)}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={createRule}
                    disabled={isSavingRule}
                    className="cursor-pointer gap-1.5"
                  >
                    {isSavingRule ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Crear regla
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Define respuestas automaticas basadas en palabras clave
          </CardDescription>
        </CardHeader>

        <CardContent className="overflow-hidden">
          {isLoadingRules ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay reglas configuradas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Agrega tu primera regla para responder automaticamente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-lg border p-3 sm:p-4 transition-colors w-full min-w-0 overflow-hidden ${
                    rule.isActive
                      ? 'bg-card hover:bg-accent/30'
                      : 'bg-muted/30 opacity-60'
                  }`}
                >
                  {/* Keywords */}
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {rule.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        P:{rule.priority}
                      </Badge>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule)}
                        className="cursor-pointer"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Answer preview */}
                  <p className="text-sm text-muted-foreground mt-2 break-words whitespace-pre-wrap line-clamp-3">
                    {rule.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* LOGS CARD                                                          */}
      {/* ================================================================== */}
      <Card className="border shadow-md w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-lg">Historial de auto-respuestas</CardTitle>
          </div>
          <CardDescription>
            Ultimas respuestas automaticas enviadas
          </CardDescription>
        </CardHeader>

        <CardContent className="overflow-hidden">
          {isLoadingLogs ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay respuestas automaticas registradas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Las respuestas apareceran aqui cuando el asistente responda mensajes
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border p-3 space-y-1.5 w-full min-w-0 overflow-hidden hover:bg-accent/20 transition-colors"
                >
                  {/* Header: phone + badge + time */}
                  <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                        {log.contactPhone}
                      </span>
                      <MatchTypeBadge type={log.matchType} />
                      {log.matchScore != null && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {(log.matchScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>

                  {/* Incoming message */}
                  <div className="flex items-start gap-1.5 w-full min-w-0">
                    <AlertCircle className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground break-words line-clamp-2">
                      {log.incomingMessage}
                    </p>
                  </div>

                  {/* Reply */}
                  <div className="flex items-start gap-1.5 w-full min-w-0">
                    <Bot className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <p className="text-xs break-words line-clamp-2">
                      {log.replyMessage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* HOW IT WORKS INFO                                                  */}
      {/* ================================================================== */}
      <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 w-full min-w-0 overflow-hidden">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3 w-full min-w-0">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Como funciona el asistente
              </p>
              <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5 list-decimal list-inside">
                <li>Un cliente envia un mensaje por WhatsApp</li>
                <li>Si es un saludo, responde con el mensaje de bienvenida</li>
                <li>Si coincide con una regla personalizada, envia esa respuesta</li>
                <li>Si no, busca en la base de conocimiento del sistema</li>
                <li>Si la IA esta activada, genera una respuesta inteligente</li>
                <li>Si nada funciona, envia el mensaje de respaldo</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
