"use client";

import {
  Users,
  CreditCard,
  ScanLine,
  CalendarDays,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTenantSelection } from "@/context/tenant-selection-context";
import {
  type GymOverview,
  type MembershipDistItem,
  type CheckinTrendItem,
  type PopularClassItem,
  type CheckinByHourItem,
  type NewMembersMonthlyItem,
  type GymRevenueSummary,
  getGymOverview,
  getMembershipDistribution,
  getCheckinTrend,
  getPopularClasses,
  getCheckinsByHour,
  getNewMembersMonthly,
  getGymRevenue,
} from "./gym.api";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  TRIAL: "#3b82f6",
  FROZEN: "#06b6d4",
  PAST_DUE: "#f59e0b",
  PENDING_CANCEL: "#f97316",
  CANCELLED: "#ef4444",
  EXPIRED: "#6b7280",
  PROSPECT: "#a855f7",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  TRIAL: "Prueba",
  FROZEN: "Congelada",
  PAST_DUE: "Morosa",
  PENDING_CANCEL: "Cancelación pendiente",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  PROSPECT: "Prospecto",
};

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = value >= 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function GymDashboardPage() {
  const { selection } = useTenantSelection();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: queryKeys.gym.overview(selection.orgId, selection.companyId),
    queryFn: async () => {
      const [ov, dist, trend, popular, hours, members, rev] = await Promise.all([
        getGymOverview(),
        getMembershipDistribution(),
        getCheckinTrend(30),
        getPopularClasses(),
        getCheckinsByHour(),
        getNewMembersMonthly(),
        getGymRevenue(),
      ]);
      return {
        overview: ov,
        membershipDist: dist,
        checkinTrend: trend,
        popularClasses: popular,
        checkinsByHour: hours,
        newMembers: members,
        revenue: rev,
      };
    },
    enabled: selection.orgId !== null,
  });

  const overview = dashboardData?.overview ?? null;
  const membershipDist = dashboardData?.membershipDist ?? [];
  const checkinTrend = dashboardData?.checkinTrend ?? [];
  const popularClasses = dashboardData?.popularClasses ?? [];
  const checkinsByHour = dashboardData?.checkinsByHour ?? [];
  const newMembers = dashboardData?.newMembers ?? [];
  const revenue = dashboardData?.revenue ?? null;

  if (loading || !overview) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  const filteredHours = checkinsByHour.filter((h) => {
    const hour = parseInt(h.hour);
    return hour >= 5 && hour <= 23;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Gimnasio</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de actividad y métricas clave
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeMembers}</div>
            <GrowthBadge value={overview.memberGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membresías Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeMemberships}</div>
            <span className="text-xs text-muted-foreground">
              de {overview.activeMembers} miembros
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Hoy</CardTitle>
            <ScanLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.todayCheckins}</div>
            <GrowthBadge value={overview.checkinGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {(revenue?.currentMonth ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <GrowthBadge value={revenue?.growth ?? null} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clases Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.todayClasses}</div>
            <span className="text-xs text-muted-foreground">programadas</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrenadores</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeTrainers}</div>
            <span className="text-xs text-muted-foreground">activos</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {(revenue?.total ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-muted-foreground">acumulado</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Check-in Trend + Membership Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendencia de Check-ins</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {checkinTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={checkinTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v + "T00:00:00");
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => {
                      const d = new Date(v + "T00:00:00");
                      return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
                    }}
                    formatter={(v: number) => [v, "Check-ins"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[280px] items-center justify-center text-muted-foreground">
                Sin datos de check-ins
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Membresías</CardTitle>
            <CardDescription>Distribución actual</CardDescription>
          </CardHeader>
          <CardContent>
            {membershipDist.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={membershipDist}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {membershipDist.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _name: string, props: any) => [
                        v,
                        STATUS_LABELS[props.payload.status] || props.payload.status,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {membershipDist.map((d) => (
                    <div key={d.status} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[d.status] || "#6b7280" }}
                      />
                      <span className="text-muted-foreground">
                        {STATUS_LABELS[d.status] || d.status} ({d.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="flex h-[200px] items-center justify-center text-muted-foreground">
                Sin membresías registradas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Peak Hours + Popular Classes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horas Pico</CardTitle>
            <CardDescription>Check-ins por hora (últimos 30 días)</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHours.some((h) => h.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={filteredHours}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Check-ins"]} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[250px] items-center justify-center text-muted-foreground">
                Sin datos de horas pico
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clases Populares</CardTitle>
            <CardDescription>Top 10 por reservas</CardDescription>
          </CardHeader>
          <CardContent>
            {popularClasses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={popularClasses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="className"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip formatter={(v: number) => [v, "Reservas"]} />
                  <Bar dataKey="bookings" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[250px] items-center justify-center text-muted-foreground">
                Sin reservas de clases
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: New Members Monthly */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevos Miembros por Mes</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {newMembers.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={newMembers}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "Nuevos miembros"]} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[250px] items-center justify-center text-muted-foreground">
              Sin datos de nuevos miembros
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
