"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  SunatEnvironment,
  SunatStoredPdf,
  SunatTransmission,
} from "../../../tenancy.api";
import {
  getCompanySunatTransmissions,
  getSunatStoredPdfs,
  retrySunatTransmission,
} from "../../../tenancy.api";
import { getErrorMessage } from "./use-company-form";

const LOGS_PAGE_SIZE = 5;
const PDF_PAGE_SIZE = 10;

export function useSunatHistory(companyId: number) {
  // ── Logs state ─────────────────────────────────────────────
  const [sunatLogs, setSunatLogs] = useState<SunatTransmission[]>([]);
  const [sunatLogsLoading, setSunatLogsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [sunatLogQuery, setSunatLogQuery] = useState("");
  const [sunatLogStatusFilter, setSunatLogStatusFilter] = useState<"ALL" | string>("ALL");
  const [sunatLogEnvironmentFilter, setSunatLogEnvironmentFilter] = useState<"ALL" | SunatEnvironment>("ALL");
  const [sunatLogPage, setSunatLogPage] = useState(1);

  // ── PDFs state ─────────────────────────────────────────────
  const [sunatPdfs, setSunatPdfs] = useState<SunatStoredPdf[]>([]);
  const [sunatPdfsLoading, setSunatPdfsLoading] = useState(true);
  const [sunatPdfQuery, setSunatPdfQuery] = useState("");
  const [sunatPdfTypeFilter, setSunatPdfTypeFilter] = useState("ALL");
  const [sunatPdfPage, setSunatPdfPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchSunatLogs = useCallback(async () => {
    setSunatLogsLoading(true);
    try {
      const data = await getCompanySunatTransmissions(companyId);
      setSunatLogs(data);
    } catch (error) {
      console.error("No se pudieron cargar los envíos SUNAT", error);
      toast.error("No se pudieron cargar los envíos SUNAT");
      setSunatLogs([]);
    } finally {
      setSunatLogsLoading(false);
    }
  }, [companyId]);

  const fetchSunatPdfs = useCallback(async () => {
    setSunatPdfsLoading(true);
    try {
      const list = await getSunatStoredPdfs();
      setSunatPdfs(list.filter((item) => item.companyId === companyId));
    } catch (error) {
      console.error("No se pudieron cargar los PDF almacenados", error);
      toast.error("No se pudieron cargar los PDF almacenados");
      setSunatPdfs([]);
    } finally {
      setSunatPdfsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSunatLogs();
  }, [fetchSunatLogs]);

  useEffect(() => {
    fetchSunatPdfs();
  }, [fetchSunatPdfs]);

  // ── Filtering / pagination ─────────────────────────────────
  const availableLogStatuses = useMemo(() => {
    const unique = new Set<string>();
    for (const log of sunatLogs) {
      if (log.status) unique.add(log.status);
    }
    return Array.from(unique).sort();
  }, [sunatLogs]);

  const availablePdfTypes = useMemo(() => {
    const unique = new Set<string>();
    for (const pdf of sunatPdfs) {
      if (pdf.type) unique.add(pdf.type);
    }
    return Array.from(unique).sort();
  }, [sunatPdfs]);

  const filteredSunatLogs = useMemo(() => {
    const query = sunatLogQuery.trim().toLowerCase();
    return sunatLogs.filter((log) => {
      const matchesQuery =
        !query ||
        [log.documentType, log.serie, log.correlativo, log.ticket, log.status, log.zipFilePath]
          .filter(Boolean)
          .some((v) => v!.toString().toLowerCase().includes(query));
      const matchesStatus = sunatLogStatusFilter === "ALL" || log.status === sunatLogStatusFilter;
      const matchesEnv = sunatLogEnvironmentFilter === "ALL" || log.environment === sunatLogEnvironmentFilter;
      return matchesQuery && matchesStatus && matchesEnv;
    });
  }, [sunatLogEnvironmentFilter, sunatLogQuery, sunatLogStatusFilter, sunatLogs]);

  const totalLogPages = Math.max(1, Math.ceil(filteredSunatLogs.length / LOGS_PAGE_SIZE) || 1);

  const paginatedSunatLogs = useMemo(
    () => filteredSunatLogs.slice((sunatLogPage - 1) * LOGS_PAGE_SIZE, sunatLogPage * LOGS_PAGE_SIZE),
    [filteredSunatLogs, sunatLogPage],
  );

  const filteredSunatPdfs = useMemo(() => {
    const query = sunatPdfQuery.trim().toLowerCase();
    return sunatPdfs.filter((pdf) => {
      const matchesQuery =
        !query ||
        [pdf.type, pdf.filename].filter(Boolean).some((v) => v!.toString().toLowerCase().includes(query));
      const matchesType = sunatPdfTypeFilter === "ALL" || pdf.type === sunatPdfTypeFilter;
      return matchesQuery && matchesType;
    });
  }, [sunatPdfQuery, sunatPdfTypeFilter, sunatPdfs]);

  const totalPdfPages = Math.max(1, Math.ceil(filteredSunatPdfs.length / PDF_PAGE_SIZE) || 1);

  const paginatedSunatPdfs = useMemo(
    () => filteredSunatPdfs.slice((sunatPdfPage - 1) * PDF_PAGE_SIZE, sunatPdfPage * PDF_PAGE_SIZE),
    [filteredSunatPdfs, sunatPdfPage],
  );

  // Reset pages on filter change
  useEffect(() => {
    setSunatLogPage(1);
  }, [sunatLogEnvironmentFilter, sunatLogQuery, sunatLogStatusFilter]);

  useEffect(() => {
    if (sunatLogPage > totalLogPages) setSunatLogPage(totalLogPages);
  }, [sunatLogPage, totalLogPages]);

  useEffect(() => {
    setSunatPdfPage(1);
  }, [sunatPdfQuery, sunatPdfTypeFilter]);

  useEffect(() => {
    if (sunatPdfPage > totalPdfPages) setSunatPdfPage(totalPdfPages);
  }, [sunatPdfPage, totalPdfPages]);

  // ── Retry ──────────────────────────────────────────────────
  const handleRetry = async (transmissionId: number) => {
    setRetryingId(transmissionId);
    try {
      await retrySunatTransmission(transmissionId);
      toast.success("Reintento iniciado.");
      fetchSunatLogs();
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      toast.error(msg || "No se pudo reintentar el envío.");
    } finally {
      setRetryingId(null);
    }
  };

  return {
    // Logs
    sunatLogs,
    sunatLogsLoading,
    filteredSunatLogs,
    paginatedSunatLogs,
    sunatLogQuery,
    setSunatLogQuery,
    sunatLogStatusFilter,
    setSunatLogStatusFilter,
    sunatLogEnvironmentFilter,
    setSunatLogEnvironmentFilter,
    sunatLogPage,
    setSunatLogPage,
    totalLogPages,
    availableLogStatuses,
    retryingId,
    handleRetry,
    fetchSunatLogs,
    // PDFs
    sunatPdfs,
    sunatPdfsLoading,
    filteredSunatPdfs,
    paginatedSunatPdfs,
    sunatPdfQuery,
    setSunatPdfQuery,
    sunatPdfTypeFilter,
    setSunatPdfTypeFilter,
    sunatPdfPage,
    setSunatPdfPage,
    totalPdfPages,
    availablePdfTypes,
    fetchSunatPdfs,
    // Page sizes (for ManualPagination)
    logsPageSize: LOGS_PAGE_SIZE,
    pdfPageSize: PDF_PAGE_SIZE,
  };
}