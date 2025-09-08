'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarDatePicker } from '@/components/calendar-date-picker'
import { DateRange } from 'react-day-picker'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { BACKEND_URL, formatCurrency } from '@/lib/utils'

interface TrialBalanceRow {
  account: string
  debit: number
  credit: number
}

type LedgerLine = {
  accountCode: string
  debit?: number
  credit?: number
  date: string
}

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const totals = useMemo(() => {
    const debit = rows.reduce((s, r) => s + (r.debit || 0), 0)
    const credit = rows.reduce((s, r) => s + (r.credit || 0), 0)
    return { debit, credit, equal: Math.abs(debit - credit) < 0.005 }
  }, [rows])

  const exportCsv = () => {
    try {
      const header = 'Account,Debit,Credit\n'
      const content = rows
        .map((r) => `${JSON.stringify(r.account)},${r.debit.toFixed(2)},${r.credit.toFixed(2)}`)
        .join('\n')
      const totalLine = `Totals,${totals.debit.toFixed(2)},${totals.credit.toFixed(2)}`
      const csv = header + content + '\n' + totalLine
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'trial-balance.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export CSV', err)
    }
  }

  async function fetchAccountsMap(): Promise<Record<string, string>> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounting/accounts`)
      if (!res.ok) throw new Error('Failed accounts')
      const data: any[] = await res.json()
      const map: Record<string, string> = {}
      const walk = (node: any) => {
        map[node.code] = node.name
        node.children?.forEach(walk)
      }
      data.forEach(walk)
      return map
    } catch (e) {
      console.warn('No se pudo cargar cuentas. Se mostrará solo el código.')
      return {}
    }
  }

  async function fetchLedger(range?: DateRange): Promise<LedgerLine[]> {
    const params = new URLSearchParams()
    if (range?.from) params.set('from', range.from.toISOString().split('T')[0])
    if (range?.to) params.set('to', range.to.toISOString().split('T')[0])
    params.set('size', '10000')
    params.set('page', '1')
    const url = `${BACKEND_URL}/api/accounting/reports/ledger?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed ledger')
    const data = await res.json()
    return (data?.data || []) as LedgerLine[]
  }

  const load = async (range?: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const [accountsMap, lines] = await Promise.all([
        fetchAccountsMap(),
        fetchLedger(range),
      ])

      const grouped = new Map<string, { debit: number; credit: number }>()
      for (const l of lines) {
        const key = l.accountCode
        const prev = grouped.get(key) || { debit: 0, credit: 0 }
        grouped.set(key, {
          debit: prev.debit + (l.debit || 0),
          credit: prev.credit + (l.credit || 0),
        })
      }

      const computed: TrialBalanceRow[] = Array.from(grouped.entries())
        .map(([code, sums]) => ({
          account: accountsMap[code] ? `${code} - ${accountsMap[code]}` : code,
          debit: Number(sums.debit.toFixed(2)),
          credit: Number(sums.credit.toFixed(2)),
        }))
        .sort((a, b) => a.account.localeCompare(b.account))

      setRows(computed)
    } catch (err) {
      console.error('Failed to load trial balance', err)
      setError('No se pudo cargar el Balance de Comprobación')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(dateRange)
  }, [dateRange])

  useEffect(() => {
    // Polling para actualizaciones en tiempo real
    intervalRef.current = window.setInterval(() => {
      load(dateRange)
    }, 5000)
    const onFocus = () => load(dateRange)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [dateRange])

  return (
    <Card className='shadow-sm border border-blue-100/40 dark:border-blue-900/20'>
      <CardHeader className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-900 dark:to-slate-900 rounded-t-lg'>
        <div className='flex items-center gap-2'>
          <span aria-hidden>📊</span>
          <CardTitle className='text-blue-700 dark:text-sky-300'>Trial Balance</CardTitle>
          {!totals.equal && (
            <Badge variant='destructive' className='ml-1'>Descuadre</Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <CalendarDatePicker
            className='h-9 w-[260px]'
            variant='outline'
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={setDateRange}
          />
          <Button size='sm' onClick={exportCsv} variant='secondary' className='border-blue-200 dark:border-sky-800'>
            <FileDown className='mr-2 h-4 w-4' /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className='pt-4'>
        {error && (
          <Alert variant='destructive' className='mb-3'>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className='text-muted-foreground'>Cargando...</p>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='rounded-md border border-border'>
              <TableHeader className='bg-blue-50/60 dark:bg-slate-950'>
                <TableRow>
                  <TableHead className='text-blue-700 dark:text-sky-300'>Cuenta</TableHead>
                  <TableHead className='text-blue-700 dark:text-sky-300 text-right'>Debe</TableHead>
                  <TableHead className='text-blue-700 dark:text-sky-300 text-right'>Haber</TableHead>
                </TableRow>
                </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} className='hover:bg-blue-50/40 dark:hover:bg-slate-900/50'>
                    <TableCell className='whitespace-nowrap'>{row.account}</TableCell>
                    <TableCell className='text-right font-medium'>{formatCurrency(row.debit, 'PEN')}</TableCell>
                    <TableCell className='text-right font-medium'>{formatCurrency(row.credit, 'PEN')}</TableCell>
                  </TableRow>
                ))}
                {/* Totales */}
                <TableRow className={`font-semibold border-t-2 ${totals.equal ? 'bg-blue-100/50 dark:bg-slate-900' : 'bg-rose-50/60 dark:bg-rose-950/40'}`}>
                  <TableCell className='whitespace-nowrap'>Totales</TableCell>
                  <TableCell className='text-right'>{formatCurrency(totals.debit, 'PEN')}</TableCell>
                  <TableCell className='text-right'>{formatCurrency(totals.credit, 'PEN')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {!totals.equal && (
              <p className='text-sm text-red-600 dark:text-red-400 mt-2'>Atención: los débitos y créditos no cuadran.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
