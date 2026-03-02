"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  Clock,
  Users,
  Trash2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantSelection } from "@/context/tenant-selection-context";
import {
  GymClass,
  GymClassSchedule,
  GymTrainer,
  getClasses,
  createClass,
  updateClass,
  getSchedules,
  createSchedule,
  deleteSchedule,
  getTrainers,
} from "../gym.api";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const EMPTY_CLASS_FORM = {
  name: "",
  description: "",
  category: "",
  durationMin: 60,
  maxCapacity: 20,
};

const EMPTY_SCHEDULE_FORM = {
  classId: 0,
  trainerId: 0,
  dayOfWeek: 1,
  startTime: "08:00",
  endTime: "09:00",
};

export default function GymClassesPage() {
  const { selection } = useTenantSelection();
  const queryClient = useQueryClient();

  // Search + pagination state
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(debouncedSearch), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  // Class dialog
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [classForm, setClassForm] = useState(EMPTY_CLASS_FORM);
  const [savingClass, setSavingClass] = useState(false);

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Active tab
  const [tab, setTab] = useState<"classes" | "schedule">("classes");

  const { data: classesData, isLoading: loading } = useQuery({
    queryKey: [...queryKeys.gym.classes(selection.orgId, selection.companyId), "list", { search, page }],
    queryFn: async () => {
      return getClasses({
        search: search || undefined,
        page,
      });
    },
    enabled: selection.orgId !== null,
  });

  const classes = classesData?.items ?? [];
  const total = classesData?.total ?? 0;

  const { data: schedules = [] } = useQuery({
    queryKey: [...queryKeys.gym.classes(selection.orgId, selection.companyId), "schedules"],
    queryFn: () => getSchedules(),
    enabled: selection.orgId !== null,
  });

  const { data: trainersData } = useQuery({
    queryKey: [...queryKeys.gym.trainers(selection.orgId, selection.companyId), { status: "ACTIVE" }],
    queryFn: async () => {
      const data = await getTrainers({ status: "ACTIVE" });
      return data.items;
    },
    enabled: selection.orgId !== null,
  });

  const trainers = trainersData ?? [];

  const invalidateClasses = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gym.classes(selection.orgId, selection.companyId) });
  };

  // ── Class handlers ──

  function openNewClass() {
    setEditingClassId(null);
    setClassForm(EMPTY_CLASS_FORM);
    setClassDialogOpen(true);
  }

  function openEditClass(c: GymClass) {
    setEditingClassId(c.id);
    setClassForm({
      name: c.name,
      description: c.description ?? "",
      category: c.category ?? "",
      durationMin: c.durationMin,
      maxCapacity: c.maxCapacity,
    });
    setClassDialogOpen(true);
  }

  async function handleSaveClass() {
    setSavingClass(true);
    try {
      if (editingClassId) {
        await updateClass(editingClassId, classForm);
      } else {
        await createClass(classForm);
      }
      setClassDialogOpen(false);
      invalidateClasses();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingClass(false);
    }
  }

  // ── Schedule handlers ──

  function openNewSchedule() {
    setScheduleForm({
      ...EMPTY_SCHEDULE_FORM,
      classId: classes[0]?.id ?? 0,
    });
    setScheduleDialogOpen(true);
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    try {
      await createSchedule({
        classId: scheduleForm.classId,
        trainerId: scheduleForm.trainerId || undefined,
        dayOfWeek: scheduleForm.dayOfWeek,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
      });
      setScheduleDialogOpen(false);
      invalidateClasses();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(id: number) {
    if (!confirm("¿Desactivar este horario?")) return;
    try {
      await deleteSchedule(id);
      invalidateClasses();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // Group schedules by day for the weekly view
  const schedulesByDay = DAY_NAMES.map((name, idx) => ({
    name,
    dayOfWeek: idx,
    slots: schedules.filter((s) => s.dayOfWeek === idx),
  }));

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Clases</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestión de clases grupales y horarios
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "classes" && (
            <Button onClick={openNewClass}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Clase
            </Button>
          )}
          {tab === "schedule" && (
            <Button onClick={openNewSchedule} disabled={classes.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Horario
            </Button>
          )}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === "classes" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("classes")}
        >
          Clases
        </Button>
        <Button
          variant={tab === "schedule" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("schedule")}
        >
          Horario Semanal
        </Button>
      </div>

      {/* ── Classes Tab ── */}
      {tab === "classes" && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o categoría..."
                className="pl-9"
                value={debouncedSearch}
                onChange={(e) => {
                  setDebouncedSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-center py-8 text-muted-foreground">
                Cargando...
              </p>
            ) : classes.length === 0 ? (
              <p className="col-span-full text-center py-8 text-muted-foreground">
                No se encontraron clases
              </p>
            ) : (
              classes.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{c.name}</CardTitle>
                        {c.category && (
                          <Badge variant="outline" className="mt-1">
                            {c.category}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditClass(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {c.description && (
                      <CardDescription className="mt-2">
                        {c.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {c.durationMin} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {c.maxCapacity} cupos
                      </span>
                    </div>
                    {c.schedules && c.schedules.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Horarios activos:
                        </p>
                        {c.schedules.map((s) => (
                          <div
                            key={s.id}
                            className="text-xs text-muted-foreground"
                          >
                            {DAY_NAMES[s.dayOfWeek]} {s.startTime}-{s.endTime}
                            {s.trainer &&
                              ` — ${s.trainer.firstName} ${s.trainer.lastName}`}
                          </div>
                        ))}
                      </div>
                    )}
                    <Badge
                      variant={c.isActive ? "default" : "secondary"}
                      className="mt-3"
                    >
                      {c.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Schedule Tab ── */}
      {tab === "schedule" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Día</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Entrenador</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedulesByDay
                .filter((d) => d.slots.length > 0)
                .flatMap((d) =>
                  d.slots.map((s, i) => (
                    <TableRow key={s.id}>
                      {i === 0 ? (
                        <TableCell
                          rowSpan={d.slots.length}
                          className="font-medium align-top"
                        >
                          {d.name}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {s.gymClass?.name ?? `Clase #${s.classId}`}
                      </TableCell>
                      <TableCell>
                        {s.startTime} - {s.endTime}
                      </TableCell>
                      <TableCell>
                        {s.trainer
                          ? `${s.trainer.firstName} ${s.trainer.lastName}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteSchedule(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              {schedules.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay horarios configurados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Create / Edit Class Dialog ── */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClassId ? "Editar Clase" : "Nueva Clase"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={classForm.name}
                onChange={(e) =>
                  setClassForm({ ...classForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input
                  placeholder="Yoga, Spinning, CrossFit..."
                  value={classForm.category}
                  onChange={(e) =>
                    setClassForm({ ...classForm, category: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={classForm.durationMin}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      durationMin: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacidad máxima</Label>
              <Input
                type="number"
                min={1}
                value={classForm.maxCapacity}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    maxCapacity: parseInt(e.target.value) || 20,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={classForm.description}
                onChange={(e) =>
                  setClassForm({ ...classForm, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClassDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClass}
              disabled={savingClass || !classForm.name}
            >
              {savingClass
                ? "Guardando..."
                : editingClassId
                  ? "Guardar"
                  : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Schedule Dialog ── */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Horario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Clase *</Label>
              <Select
                value={String(scheduleForm.classId)}
                onValueChange={(v) =>
                  setScheduleForm({ ...scheduleForm, classId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase" />
                </SelectTrigger>
                <SelectContent>
                  {classes
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entrenador</Label>
              <Select
                value={String(scheduleForm.trainerId)}
                onValueChange={(v) =>
                  setScheduleForm({ ...scheduleForm, trainerId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin asignar</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.firstName} {t.lastName}
                      {t.specialty ? ` — ${t.specialty}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Día de la semana *</Label>
              <Select
                value={String(scheduleForm.dayOfWeek)}
                onValueChange={(v) =>
                  setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicio *</Label>
                <Input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Hora fin *</Label>
                <Input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      endTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={
                savingSchedule ||
                !scheduleForm.classId ||
                !scheduleForm.startTime ||
                !scheduleForm.endTime
              }
            >
              {savingSchedule ? "Guardando..." : "Crear Horario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
