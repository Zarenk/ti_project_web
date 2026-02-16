"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getAuthToken } from "@/utils/auth-token";
import { getUserDataFromToken } from "@/lib/auth";
import { useDebounce } from "@/app/hooks/useDebounce";

import { DataTable } from "./data-table";
import { activityColumns, type Activity } from "./activity-columns";
import { columns, type History } from "./columns";
import {
  getActivitySummary,
  getUserActivity,
  getUserHistory,
  getUserActivitySummary,
  getUserActivityTimeSeries,
  getUserActivityHeatmap,
  getUserActivityBreakdown,
  getUserActivityOptions,
  getUserActivityActors,
  getOrganizationHistory,
  getOrganizationActivity,
  getOrganizationActivitySummary,
  getOrganizationActivityTimeSeries,
  getOrganizationActivityHeatmap,
  getOrganizationActivityBreakdown,
  getOrganizationActivityOptions,
} from "./history.api";
import { ActivityCharts } from "./activity-charts";
import { GlobalActivityTable } from "./global-activity-table";
import { UserActivityCharts } from "./user-activity-charts";

interface HistoryEntry {
  id: number;
  action: string;
  stockChange: number;
  previousStock: number | null;
  newStock: number | null;
  createdAt: string;
  user: { username: string };
  inventory: {
    product: { name: string };
    storeOnInventory: {
      store: { name: string };
      stock: number;
    }[];
  };
}

async function getUserContextFromToken(): Promise<{
  id: number | null;
  role: string | null;
}> {
  const user = await getUserDataFromToken();
  if (user?.id) {
    return { id: user.id, role: user.role ?? null };
  }
  const token = await getAuthToken();
  if (!token) {
    return { id: null, role: null };
  }

  try {
    const decoded: { sub: string | number; role?: string } = jwtDecode(token);
    const id = Number(decoded.sub);
    if (Number.isNaN(id)) return { id: null, role: decoded.role ?? null };
    return { id, role: decoded.role ?? null };
  } catch (error) {
    console.error("Error decoding token:", error);
    return { id: null, role: null };
  }
}

export default function UserHistory(): React.ReactElement {
  const [history, setHistory] = useState<History[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userSummary, setUserSummary] = useState<any | null>(null);
  const [userDaily, setUserDaily] = useState<
    Array<{ date: string; displayDate: string; total: number }>
  >([]);
  const [userBreakdown, setUserBreakdown] = useState<{
    actions: Array<{ action: string | null; count: number }>;
    entities: Array<{ entityType: string | null; count: number }>;
  } | null>(null);
  const [userHeatmap, setUserHeatmap] = useState<
    Array<{ dow: number; hour: number; count: number }>
  >([]);
  const [userOptions, setUserOptions] = useState<{
    actions: string[];
    entities: string[];
  } | null>(null);
  const [userActors, setUserActors] = useState<
    Array<{ actorId: number; actorEmail: string | null; actorRole?: string }>
  >([]);
  const [userActorsLoading, setUserActorsLoading] = useState(false);
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [userDashLoading, setUserDashLoading] = useState(false);
  const [userDashError, setUserDashError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userScope, setUserScope] = useState<"USER" | "ALL">("USER");
  const [userSelectedAction, setUserSelectedAction] = useState("ALL");
  const [userSelectedEntity, setUserSelectedEntity] = useState("ALL");
  const [userSelectedSeverity, setUserSelectedSeverity] = useState("ALL");
  const [excludeContextUpdates, setExcludeContextUpdates] = useState(true);
  const { version } = useTenantSelection();
  const filtersReadyRef = useRef(false);
  const lastUserSearchRef = useRef<string>("");
  const lastUserResultsRef = useRef<
    Array<{ actorId: number; actorEmail: string | null; actorRole?: string }>
  >([]);
  const userSearchCacheRef = useRef(
    new Map<
      string,
      Array<{ actorId: number; actorEmail: string | null; actorRole?: string }>
    >(),
  );
  const userSearchAbortRef = useRef<AbortController | null>(null);
  const userSearchRef = useRef<HTMLDivElement | null>(null);
  const ALL_USERS_LABEL = "Todos los usuarios";
  const isAllUsers = userScope === "ALL";
  const [selectedUserLabel, setSelectedUserLabel] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string | null>(null);
  const debouncedUserAction = useDebounce(userSelectedAction, 400);
  const debouncedUserEntity = useDebounce(userSelectedEntity, 400);
  const debouncedUserSeverity = useDebounce(userSelectedSeverity, 400);
  const debouncedExcludeContext = useDebounce(excludeContextUpdates, 400);
  const debouncedUserSearchTerm = useDebounce(userSearchTerm, 1000);
  const deferredUserSearchTerm = useDeferredValue(userSearchTerm);

  useEffect(() => {
    let cancelled = false;

    const loadContext = async () => {
      const context = await getUserContextFromToken();
      if (cancelled) return;
      setCurrentRole(context.role);
      if (context.id) {
        setCurrentUserId(context.id);
        const normalizedRole = (context.role ?? "").toUpperCase();
        if (!userId && normalizedRole !== "SUPER_ADMIN_GLOBAL") {
          setUserScope("USER");
          setUserId(context.id);
          setSelectedUserLabel(null);
          setSelectedUserRole(null);
        }
        if (normalizedRole === "SUPER_ADMIN_GLOBAL" && !userId && userScope !== "USER") {
          setUserScope("ALL");
          setUserId(null);
          setUserSearchTerm(ALL_USERS_LABEL);
          setSelectedUserLabel(ALL_USERS_LABEL);
          setSelectedUserRole(null);
        }
      } else {
        const message =
          "No se pudo obtener el ID del usuario. Inicia sesion nuevamente.";
        setError(message);
        toast.error(message);
        setHistory([]);
        setActivity([]);
      }
    };

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [version, userId, userScope]);

  useEffect(() => {
    let cancelled = false;
    if (!userId && !isAllUsers) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [historyData, activityData] = await Promise.all(
          isAllUsers
            ? [
                getOrganizationHistory(),
                getOrganizationActivity({
                  excludeContextUpdates: debouncedExcludeContext,
                }),
              ]
            : [getUserHistory(userId as number), getUserActivity(userId as number)],
        );

        if (cancelled) return;

        const mappedHistory = historyData.map((entry: HistoryEntry) => ({
          id: entry.id,
          username: entry.user.username,
          action: entry.action,
          product: entry.inventory.product.name,
          stores: entry.inventory.storeOnInventory
            .map((s) => s.store.name)
            .join(", "),
          previousStock: entry.previousStock ?? 0,
          stockChange: entry.stockChange,
          newStock: entry.inventory.storeOnInventory
            .map((s) => s.stock)
            .join(", "),
          createdAt: entry.createdAt,
        })) as History[];

        const mappedActivity = activityData.map((entry: any) => ({
          id: entry.id,
          username: entry.actorEmail ?? "",
          action: entry.action,
          entityType: entry.entityType,
          summary: entry.summary,
          createdAt: entry.createdAt,
        })) as Activity[];

        setHistory(mappedHistory);
        setActivity(mappedActivity);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el historial del usuario.";
        setError(message);
        toast.error(message);
        setHistory([]);
        setActivity([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [userId, isAllUsers, version, debouncedExcludeContext]);


  useEffect(() => {
    let cancelled = false;

    setUserOptionsLoading(true);

    const loadOptions = async () => {
      try {
        const options = await getOrganizationActivityOptions({
          excludeContextUpdates: debouncedExcludeContext,
          actionLimit: 50,
          entityLimit: 50,
        });
        if (!cancelled) {
          setUserOptions({
            actions: Array.isArray(options?.actions) ? options.actions : [],
            entities: Array.isArray(options?.entities) ? options.entities : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setUserOptions({ actions: [], entities: [] });
        }
      } finally {
        if (!cancelled) {
          setUserOptionsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [debouncedExcludeContext, version]);

  useEffect(() => {
    let cancelled = false;

    setUserActorsLoading(true);

    const loadActors = async () => {
      try {
        const searchTerm = debouncedUserSearchTerm.trim();
        if (searchTerm.length > 0 && searchTerm.length < 2) {
          if (!cancelled) {
            setUserActors([]);
            setUserActorsLoading(false);
          }
          return;
        }
        const isAllUsersLabel =
          searchTerm.toLowerCase() === ALL_USERS_LABEL.toLowerCase();
        if (!searchTerm || isAllUsersLabel) {
          if (!cancelled) {
            setUserActors([]);
            setUserActorsLoading(false);
          }
          return;
        }
        if (userSearchCacheRef.current.has(searchTerm)) {
          if (!cancelled) {
            startTransition(() => {
              setUserActors(userSearchCacheRef.current.get(searchTerm) ?? []);
            });
            setUserActorsLoading(false);
          }
          return;
        }
        if (userSearchAbortRef.current) {
          userSearchAbortRef.current.abort();
        }
        const controller = new AbortController();
        userSearchAbortRef.current = controller;
        if (lastUserSearchRef.current === searchTerm) {
          if (!cancelled) {
            startTransition(() => {
              setUserActors(lastUserResultsRef.current);
            });
            setUserActorsLoading(false);
          }
          return;
        }
        const actors = await getUserActivityActors({
          q: searchTerm,
          excludeContextUpdates: debouncedExcludeContext,
        }, controller.signal);
        if (!cancelled) {
          const nextResults = Array.isArray(actors) ? actors : [];
          lastUserSearchRef.current = searchTerm;
          lastUserResultsRef.current = nextResults;
          const cache = userSearchCacheRef.current;
          cache.set(searchTerm, nextResults);
          if (cache.size > 20) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
          }
          startTransition(() => {
            setUserActors(nextResults);
          });
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setUserActors([]);
        }
      } finally {
        if (!cancelled) {
          setUserActorsLoading(false);
        }
      }
    };

    void loadActors();

    return () => {
      cancelled = true;
      if (userSearchAbortRef.current) {
        userSearchAbortRef.current.abort();
      }
    };
  }, [debouncedExcludeContext, debouncedUserSearchTerm, version]);

  useEffect(() => {
    if (!userSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!userSearchRef.current) return;
      const target = event.target as Node | null;
      if (target && userSearchRef.current.contains(target)) {
        return;
      }
      setUserSearchOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userSearchOpen]);

  useEffect(() => {
    if (!userId) return;
    if (isAllUsers) return;
    if (userSearchTerm.trim().length > 0) return;
    const match = userActors.find((actor) => actor.actorId === userId);
    if (match) {
      setUserSearchTerm(match.actorEmail ?? `Usuario ${match.actorId}`);
      setUserSearchOpen(false);
    }
  }, [userId, isAllUsers, userActors, userSearchTerm]);

  useEffect(() => {
    let cancelled = false;
    if (!userId && !isAllUsers) return;

    setUserDashLoading(true);
    setUserDashError(null);

    const fetchUserDash = async () => {
      try {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const to = now;
        const [summaryData, seriesData, breakdownData, heatmapData] =
          await Promise.all(
          isAllUsers
            ? [
                getOrganizationActivitySummary({
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getOrganizationActivityTimeSeries({
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getOrganizationActivityBreakdown({
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getOrganizationActivityHeatmap({
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
              ]
            : [
                getUserActivitySummary(userId as number, {
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getUserActivityTimeSeries(userId as number, {
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getUserActivityBreakdown(userId as number, {
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
                getUserActivityHeatmap(userId as number, {
                  dateFrom: from.toISOString(),
                  dateTo: to.toISOString(),
                  excludeContextUpdates: debouncedExcludeContext,
                  action:
                    debouncedUserAction !== "ALL" ? debouncedUserAction : undefined,
                  entityType:
                    debouncedUserEntity !== "ALL" ? debouncedUserEntity : undefined,
                  severity:
                    debouncedUserSeverity !== "ALL"
                      ? debouncedUserSeverity
                      : undefined,
                }),
              ],
        );

        if (cancelled) return;

        const interval = eachDayOfInterval({ start: from, end: to });
        const dailyPoints = interval.map((date) => ({
          date: format(date, "yyyy-MM-dd"),
          displayDate: format(date, "dd MMM", { locale: es }),
          total: 0,
        }));

        const seriesMap = new Map<string, number>();
        if (Array.isArray(seriesData)) {
          seriesData.forEach((entry: { date: string; count: number }) => {
            if (!entry?.date) return;
            seriesMap.set(entry.date.slice(0, 10), Number(entry.count) || 0);
          });
        }
        dailyPoints.forEach((point) => {
          point.total = seriesMap.get(point.date) ?? 0;
        });

        setUserSummary(summaryData ?? null);
        setUserDaily(dailyPoints);
        setUserBreakdown(breakdownData ?? null);
        setUserHeatmap(Array.isArray(heatmapData) ? heatmapData : []);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el resumen del usuario.";
        setUserDashError(message);
        setUserSummary(null);
        setUserDaily([]);
        setUserBreakdown(null);
        setUserHeatmap([]);
      } finally {
        if (!cancelled) {
          setUserDashLoading(false);
        }
      }
    };

    void fetchUserDash();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    isAllUsers,
    version,
    debouncedUserAction,
    debouncedUserEntity,
    debouncedUserSeverity,
    debouncedExcludeContext,
  ]);

  useEffect(() => {
    let cancelled = false;
    const normalizedRole = currentRole?.toUpperCase() ?? "";
    const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL";

    if (!isGlobalSuperAdmin) {
      setSummaryLoading(false);
      setSummary(null);
      return () => {
        cancelled = true;
      };
    }
    setSummaryLoading(true);
    setSummaryError(null);

    const fetchSummary = async () => {
      try {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const data = await getActivitySummary({
          dateFrom: from.toISOString(),
          dateTo: now.toISOString(),
          excludeContextUpdates: true,
        });
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el resumen global.";
        setSummaryError(message);
        setSummary(null);
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    void fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [version, currentRole]);

  const topAction = summary?.byAction?.[0];
  const topEntity = summary?.byEntity?.[0];
  const userTopAction = userSummary?.byAction?.[0];
  const userTopEntity = userSummary?.byEntity?.[0];
  const topEntities = (userSummary?.byEntity ?? []).slice(0, 5);
  const topUsers = (userSummary?.topUsers ?? []).slice(0, 5);

  const severityBreakdown = useMemo(() => {
    const totals = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byAction = userSummary?.byAction ?? [];
    byAction.forEach((entry: { action: string; count: number }) => {
      const normalized = entry.action?.toUpperCase?.() ?? "";
      if (normalized === "DELETED") totals.HIGH += entry.count;
      else if (normalized === "CREATED" || normalized === "UPDATED")
        totals.MEDIUM += entry.count;
      else totals.LOW += entry.count;
    });
    const result = [];
    if (totals.HIGH > 0) result.push({ name: "Alta", value: totals.HIGH });
    if (totals.MEDIUM > 0) result.push({ name: "Media", value: totals.MEDIUM });
    if (totals.LOW > 0) result.push({ name: "Baja", value: totals.LOW });
    return result;
  }, [userSummary]);

  const now = new Date();
  const rangeFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const normalizedUserSearch = debouncedUserSearchTerm.trim().toLowerCase();
  const normalizedDeferredSearch = deferredUserSearchTerm.trim().toLowerCase();
  const isAllUsersSearch =
    userScope === "ALL" &&
    normalizedDeferredSearch === ALL_USERS_LABEL.toLowerCase();
  const userSearchResults = useMemo(() => {
    if (!normalizedUserSearch) return [];
    if (
      normalizedUserSearch === ALL_USERS_LABEL.toLowerCase() &&
      userScope === "ALL"
    ) {
      return [];
    }
    return userActors
      .filter((actor) => {
        const label =
          actor.actorEmail ?? `Usuario ${actor.actorId}`;
        return label.toLowerCase().includes(normalizedUserSearch);
      })
      .slice(0, 8);
  }, [normalizedUserSearch, userActors]);

  const formatUserLabel = (actorId: number, actorEmail?: string | null) =>
    actorEmail ?? `Usuario ${actorId}`;
  const resolveRoleLabel = (role?: string | null) => {
    const normalized = (role ?? "").toUpperCase();
    if (normalized === "ADMIN") return "Administrador";
    if (normalized === "SUPER_ADMIN_ORG") return "Super admin org";
    if (normalized === "EMPLOYEE") return "Empleado";
    if (normalized === "CLIENT") return "Cliente";
    return role ?? "";
  };
  const formatActionLabel = (action: string) => {
    const normalized = action.toUpperCase();
    if (normalized === "CREATED") return "Creacion";
    if (normalized === "UPDATED") return "Edicion";
    if (normalized === "DELETED") return "Eliminacion";
    if (normalized === "LOGIN") return "Inicio de sesion";
    if (normalized === "LOGOUT") return "Cierre de sesion";
    if (normalized === "OTHER") return "Otro";
    return action.replace(/_/g, " ");
  };
  const formatEntityLabel = (entity: string) => {
    const normalized = entity.toLowerCase();
    const map: Record<string, string> = {
      product: "Producto",
      provider: "Proveedor",
      store: "Tienda",
      category: "Categoria",
      brand: "Marca",
      inventoryitem: "Inventario",
      sale: "Venta",
      order: "Pedido",
      user: "Usuario",
      chatmessage: "Chat",
      exchangerate: "Tipo de cambio",
      organization: "Organizacion",
      subscription: "Suscripcion",
      subscription_invoice: "Factura de suscripcion",
      template: "Plantilla",
    };
    if (map[normalized]) return map[normalized];
    return entity.replace(/_/g, " ");
  };
  const defaultActions = [
    "CREATED",
    "UPDATED",
    "DELETED",
    "LOGIN",
    "LOGOUT",
    "OTHER",
  ];
  const defaultEntities = [
    "Product",
    "Provider",
    "Store",
    "Category",
    "Brand",
    "InventoryItem",
    "Sale",
    "Order",
    "User",
    "ChatMessage",
    "ExchangeRate",
    "organization",
    "subscription",
    "subscription_invoice",
    "template",
  ];
  const resolvedActions =
    userOptions?.actions && userOptions.actions.length > 0
      ? userOptions.actions
      : defaultActions;
  const resolvedEntities =
    userOptions?.entities && userOptions.entities.length > 0
      ? userOptions.entities
      : defaultEntities;
  const userFilters = (
    <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <div className="relative flex flex-col gap-2" ref={userSearchRef}>
        <Label htmlFor="user-search" className="text-xs uppercase text-muted-foreground">
          Usuario
        </Label>
        <Input
          id="user-search"
          placeholder="Buscar usuario..."
          value={userSearchTerm}
          onChange={(event) => {
            if (userScope === "ALL") {
              setUserScope("USER");
              setUserId(null);
              setUserSearchTerm("");
              setSelectedUserLabel(null);
              setSelectedUserRole(null);
            }
            setUserSearchTerm(event.target.value);
            if (userScope === "ALL") {
              setUserScope("USER");
            }
            setUserSearchOpen(true);
          }}
          onFocus={() => {
            if (userScope === "ALL") {
              setUserScope("USER");
              setUserId(null);
              setUserSearchTerm("");
              setSelectedUserLabel(null);
              setSelectedUserRole(null);
            }
            setUserSearchOpen(true);
          }}
          disabled={userActorsLoading}
        />
        {userSearchOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-52 overflow-auto rounded-md border bg-background shadow-lg">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm font-medium hover:bg-accent"
              onClick={() => {
                setUserScope("ALL");
                setUserId(null);
                setUserSearchTerm(ALL_USERS_LABEL);
                setSelectedUserLabel(ALL_USERS_LABEL);
                setSelectedUserRole(null);
                setUserSearchOpen(false);
              }}
            >
              <span>{ALL_USERS_LABEL}</span>
              <span className="text-xs text-muted-foreground">Org</span>
            </button>
            {userSearchResults.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {userActorsLoading
                  ? "Buscando usuarios..."
                  : isAllUsersSearch
                    ? "Selecciona un usuario o escribe para buscar."
                    : normalizedDeferredSearch.length === 0
                      ? "Escribe para buscar usuarios."
                      : "No se encontraron usuarios."}
              </div>
            ) : (
              userSearchResults.map((actor) => (
                <button
                  key={`actor-${actor.actorId}`}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setUserScope("USER");
                    setUserId(actor.actorId);
                    setUserSearchTerm(
                      formatUserLabel(actor.actorId, actor.actorEmail),
                    );
                    setSelectedUserLabel(
                      formatUserLabel(actor.actorId, actor.actorEmail),
                    );
                    setSelectedUserRole(actor.actorRole ?? null);
                    setUserSearchOpen(false);
                  }}
                >
                  <span>{formatUserLabel(actor.actorId, actor.actorEmail)}</span>
                  <span className="text-xs text-muted-foreground">
                    {actor.actorRole ? resolveRoleLabel(actor.actorRole) : `#${actor.actorId}`}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase text-muted-foreground">Accion</Label>
        <Select
          value={userSelectedAction}
          onValueChange={(value) => {
            setUserSelectedAction(value);
          }}
          disabled={userDashLoading || userOptionsLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Accion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las acciones</SelectItem>
            {resolvedActions.map((action) => (
              <SelectItem key={`action-${action}`} value={action}>
                {formatActionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase text-muted-foreground">Modulo</Label>
        <Select
          value={userSelectedEntity}
          onValueChange={(value) => {
            setUserSelectedEntity(value);
          }}
          disabled={userDashLoading || userOptionsLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los modulos</SelectItem>
            {resolvedEntities.map((entity) => (
              <SelectItem key={`entity-${entity}`} value={entity}>
                {formatEntityLabel(entity)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase text-muted-foreground">Severidad</Label>
        <Select
          value={userSelectedSeverity}
          onValueChange={(value) => {
            setUserSelectedSeverity(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las severidades</SelectItem>
            <SelectItem value="HIGH">Alta (eliminaciones)</SelectItem>
            <SelectItem value="MEDIUM">Media (creaciones/ediciones)</SelectItem>
            <SelectItem value="LOW">Baja (login/otros)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase text-muted-foreground">Contexto</Label>
        <div className="flex h-9 items-center gap-2 rounded-md border px-3">
          <Checkbox
            checked={excludeContextUpdates}
            onCheckedChange={(value) => setExcludeContextUpdates(Boolean(value))}
            id="exclude-context-updates"
          />
          <Label htmlFor="exclude-context-updates" className="text-sm text-muted-foreground">
            Excluir actualizaciones
          </Label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase text-muted-foreground">Accion rapida</Label>
        <Button
          variant="ghost"
          className="h-9 w-full justify-start px-3"
          onClick={() => {
            setUserSelectedAction("ALL");
            setUserSelectedEntity("ALL");
            setUserSelectedSeverity("ALL");
            setExcludeContextUpdates(true);
            if (isAllUsers) {
              setUserSearchTerm(ALL_USERS_LABEL);
              setSelectedUserLabel(ALL_USERS_LABEL);
              setSelectedUserRole(null);
              setUserSearchOpen(false);
              return;
            }
            if (userId) {
              const match = userActors.find((actor) => actor.actorId === userId);
              const label = match
                ? formatUserLabel(match.actorId, match.actorEmail)
                : `Usuario ${userId}`;
              setUserSearchTerm(label);
              setSelectedUserLabel(label);
              setSelectedUserRole(match?.actorRole ?? selectedUserRole);
              setUserSearchOpen(false);
            }
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const resolveSeverity = (action?: string | null) => {
    const normalized = (action ?? "").toUpperCase();
    if (normalized === "DELETED") return "HIGH";
    if (normalized === "CREATED" || normalized === "UPDATED") return "MEDIUM";
    if (normalized === "LOGIN" || normalized === "LOGOUT" || normalized === "OTHER")
      return "LOW";
    return null;
  };

  const contextNeedles = [
    "actualizo el contexto",
    "actualiz?~ el contexto",
    "contexto a org",
  ];

  const filteredActivity = useMemo(() => {
    return activity.filter((entry) => {
      if (excludeContextUpdates) {
        const summary = entry.summary?.toLowerCase?.() ?? "";
        if (contextNeedles.some((needle) => summary.includes(needle))) return false;
      }
      if (userSelectedAction !== "ALL" && entry.action !== userSelectedAction) {
        return false;
      }
      if (
        userSelectedEntity !== "ALL" &&
        entry.entityType !== userSelectedEntity
      ) {
        return false;
      }
      if (userSelectedSeverity !== "ALL") {
        const severity = resolveSeverity(entry.action);
        if (!severity || severity !== userSelectedSeverity) return false;
      }
      return true;
    });
  }, [
    activity,
    excludeContextUpdates,
    userSelectedAction,
    userSelectedEntity,
    userSelectedSeverity,
  ]);

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      if (userSelectedAction !== "ALL" && entry.action !== userSelectedAction) {
        return false;
      }
      return true;
    });
  }, [history, userSelectedAction]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("userAction");
    const entity = params.get("userEntity");
    const severity = params.get("userSeverity");
    const exclude = params.get("userExcludeContext");

    if (action) setUserSelectedAction(action);
    if (entity) setUserSelectedEntity(entity);
    if (severity) setUserSelectedSeverity(severity);
    if (exclude !== null) setExcludeContextUpdates(exclude === "true");

    filtersReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!filtersReadyRef.current) return;
    const params = new URLSearchParams(window.location.search);

    if (userSelectedAction !== "ALL") {
      params.set("userAction", userSelectedAction);
    } else {
      params.delete("userAction");
    }

    if (userSelectedEntity !== "ALL") {
      params.set("userEntity", userSelectedEntity);
    } else {
      params.delete("userEntity");
    }

    if (userSelectedSeverity !== "ALL") {
      params.set("userSeverity", userSelectedSeverity);
    } else {
      params.delete("userSeverity");
    }

    params.set("userExcludeContext", String(excludeContextUpdates));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    userSelectedAction,
    userSelectedEntity,
    userSelectedSeverity,
    excludeContextUpdates,
  ]);

  const normalizedRole = currentRole?.toUpperCase() ?? "";
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      {isGlobalSuperAdmin ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Resumen global de movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryError ? (
                <p className="mb-4 text-sm text-destructive">{summaryError}</p>
              ) : null}
              {summaryLoading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-md" />
                  ))}
                </div>
              ) : summary ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Total movimientos (30 dias)</p>
                    <p className="mt-2 text-2xl font-semibold">{summary.total ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Usuarios activos</p>
                    <p className="mt-2 text-2xl font-semibold">{summary.usersActive ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Accion principal</p>
                    <p className="mt-2 text-lg font-semibold">
                      {topAction?.action ?? "Sin datos"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {topAction?.count ?? 0} movimientos
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Modulo principal</p>
                    <p className="mt-2 text-lg font-semibold">
                      {topEntity?.entityType ?? "Sin datos"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {topEntity?.count ?? 0} movimientos
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No hay datos globales disponibles.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Tendencias globales</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityCharts fallbackFrom={rangeFrom} fallbackTo={now} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Movimientos globales</CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalActivityTable />
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Resumen del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 hidden md:block">{userFilters}</div>
          <div className="mb-4 md:hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Filtros de usuario
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">{userFilters}</CollapsibleContent>
            </Collapsible>
          </div>
          {selectedUserLabel ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {selectedUserLabel}
              </span>
              {selectedUserRole ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {resolveRoleLabel(selectedUserRole)}
                </span>
              ) : null}
            </div>
          ) : null}
          {userDashError ? (
            <p className="mb-4 text-sm text-destructive">{userDashError}</p>
          ) : null}
          {userDashLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-md" />
              ))}
            </div>
          ) : userSummary ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Total movimientos (30 dias)</p>
                  <p className="mt-2 text-2xl font-semibold">{userSummary.total ?? 0}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Accion principal</p>
                  <p className="mt-2 text-lg font-semibold">
                    {userTopAction?.action ?? "Sin datos"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userTopAction?.count ?? 0} movimientos
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Modulo principal</p>
                  <p className="mt-2 text-lg font-semibold">
                    {userTopEntity?.entityType ?? "Sin datos"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userTopEntity?.count ?? 0} movimientos
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Dias activos</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {userDaily.filter((entry) => entry.total > 0).length}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Entidades mas afectadas</p>
                  {topEntities.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">Sin datos.</p>
                  ) : (
                    <div className="mt-2 space-y-2 text-sm">
                      {topEntities.map((entity: { entityType: string; count: number }) => (
                        <div key={`entity-${entity.entityType}`} className="flex items-center justify-between">
                          <span>{formatEntityLabel(entity.entityType)}</span>
                          <span className="text-muted-foreground">{entity.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isAllUsers ? (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Top usuarios</p>
                    {topUsers.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Sin datos.</p>
                    ) : (
                      <div className="mt-2 space-y-2 text-sm">
                        {topUsers.map(
                          (entry: { actorId: number; actorEmail: string | null; count: number }) => (
                            <div key={`top-user-${entry.actorId}`} className="flex items-center justify-between">
                              <span>{entry.actorEmail ?? `Usuario ${entry.actorId}`}</span>
                              <span className="text-muted-foreground">{entry.count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No hay datos del usuario disponibles. Ajusta los filtros o selecciona otro usuario.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Tendencias del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <UserActivityCharts
            loading={userDashLoading}
            daily={userDaily}
            actions={(userBreakdown?.actions ?? []).map((entry) => ({
              name: String(entry.action ?? "Sin dato").replace(/_/g, " "),
              value: entry.count,
            }))}
            entities={(userBreakdown?.entities ?? []).map((entry) => ({
              name: String(entry.entityType ?? "Sin dato").replace(/_/g, " "),
              value: entry.count,
            }))}
            severity={severityBreakdown}
            heatmap={userHeatmap}
          />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Actividad del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : filteredActivity.length === 0 ? (
            <p className="text-muted-foreground">
              No hay actividad disponible para este usuario. Ajusta los filtros o selecciona otro usuario.
            </p>
          ) : (
            <div className="overflow-auto">
              <DataTable columns={activityColumns} data={filteredActivity} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
