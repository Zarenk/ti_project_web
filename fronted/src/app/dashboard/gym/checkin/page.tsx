"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ScanLine,
  LogIn,
  LogOut,
  Clock,
  UserCheck,
  Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTenantSelection } from "@/context/tenant-selection-context";

import {
  getActiveCheckins,
  getMembers,
  registerCheckin,
  registerCheckout,
  type GymCheckin,
  type GymMember,
} from "../gym.api";

export default function GymCheckinPage() {
  const { selection } = useTenantSelection();
  const queryClient = useQueryClient();

  // Quick check-in dialog
  const [showCheckin, setShowCheckin] = useState(false);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [checkinMethod, setCheckinMethod] = useState("MANUAL");
  const [submitting, setSubmitting] = useState(false);

  const { data: activeCheckins = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.gym.checkins(selection.orgId, selection.companyId),
    queryFn: () => getActiveCheckins(),
    enabled: selection.orgId !== null,
    refetchInterval: 30_000,
  });

  const invalidateCheckins = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gym.checkins(selection.orgId, selection.companyId) });
  };

  // ── Quick Check-in ─────────────────────────────────────────────────────

  const openCheckin = async () => {
    setShowCheckin(true);
    setSelectedMemberId("");
    setMemberSearch("");
    try {
      const res = await getMembers({ pageSize: 500, status: "ACTIVE" });
      setMembers(res.items);
    } catch {
      toast.error("Error al cargar miembros");
    }
  };

  const filteredMembers = memberSearch
    ? members.filter((m) => {
        const term = memberSearch.toLowerCase();
        return (
          m.firstName.toLowerCase().includes(term) ||
          m.lastName.toLowerCase().includes(term) ||
          (m.dni && m.dni.includes(term))
        );
      })
    : members;

  const handleCheckin = async () => {
    if (!selectedMemberId) {
      toast.error("Selecciona un miembro");
      return;
    }
    setSubmitting(true);
    try {
      await registerCheckin({
        memberId: parseInt(selectedMemberId, 10),
        method: checkinMethod,
      });
      toast.success("Check-in registrado");
      setShowCheckin(false);
      invalidateCheckins();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al registrar check-in",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Checkout ───────────────────────────────────────────────────────────

  const handleCheckout = async (checkin: GymCheckin) => {
    try {
      await registerCheckout(checkin.id);
      toast.success(
        `Checkout: ${checkin.member?.firstName} ${checkin.member?.lastName}`,
      );
      invalidateCheckins();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al registrar checkout",
      );
    }
  };

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = (checkinAt: string) => {
    const diff = Date.now() - new Date(checkinAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Check-in</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Registro de ingreso y salida de miembros
          </p>
        </div>
        <Button onClick={openCheckin} size="lg">
          <LogIn className="mr-2 h-5 w-5" />
          Registrar Check-in
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En el gimnasio ahora</CardDescription>
            <CardTitle className="text-4xl">{activeCheckins.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <UserCheck className="mr-1 inline h-3 w-3" />
              Miembros con check-in activo hoy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Check-ins hoy</CardDescription>
            <CardTitle className="text-4xl">{activeCheckins.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              Total de ingresos registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hora pico</CardDescription>
            <CardTitle className="text-4xl">
              {activeCheckins.length > 0
                ? formatTime(
                    activeCheckins[activeCheckins.length - 1].checkinAt,
                  )
                : "--:--"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Primer check-in del día
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Check-ins Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Miembros en el gimnasio
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Hora ingreso</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && activeCheckins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : activeCheckins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay miembros en el gimnasio en este momento.
                  </TableCell>
                </TableRow>
              ) : (
                activeCheckins.map((ck) => (
                  <TableRow key={ck.id}>
                    <TableCell className="font-medium">
                      {ck.member
                        ? `${ck.member.firstName} ${ck.member.lastName}`
                        : `ID ${ck.memberId}`}
                    </TableCell>
                    <TableCell>
                      {ck.membership ? (
                        <Badge variant="outline">
                          {ck.membership.planName}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{formatTime(ck.checkinAt)}</TableCell>
                    <TableCell>{getDuration(ck.checkinAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ck.method || "MANUAL"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckout(ck)}
                      >
                        <LogOut className="mr-1 h-4 w-4" />
                        Checkout
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Check-in Dialog */}
      <Dialog open={showCheckin} onOpenChange={setShowCheckin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Check-in</DialogTitle>
            <DialogDescription>
              Selecciona un miembro para registrar su ingreso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar miembro</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nombre o DNI..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Miembro *</Label>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un miembro" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMembers.slice(0, 50).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.firstName} {m.lastName}
                      {m.dni ? ` — ${m.dni}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={checkinMethod} onValueChange={setCheckinMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="QR">Código QR</SelectItem>
                  <SelectItem value="BARCODE">Código de barras</SelectItem>
                  <SelectItem value="NFC">NFC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckin(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleCheckin} disabled={submitting}>
              {submitting ? "Registrando..." : "Registrar Ingreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
