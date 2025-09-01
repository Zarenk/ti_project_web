'use client'

import React, { useEffect, useState } from 'react'
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
import { BACKEND_URL } from '@/lib/utils'

interface LedgerRow {
  date: string
  account: string
  debit: number
  credit: number
}

interface LedgerResponse {
  data: LedgerRow[]
  total: number
}

export default function LedgerReportPage() {
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (range?: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (range?.from) params.set('start', range.from.toISOString().split('T')[0])
      if (range?.to) params.set('end', range.to.toISOString().split('T')[0])
      const url = `${BACKEND_URL}/api/accounting/reports/ledger${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Request failed')
      const data: LedgerResponse = await res.json()
      setRows(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      console.error('Failed to load ledger', err)
      setError('Failed to load ledger')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(dateRange)
  }, [dateRange])

  return (
    <Card className='shadow-sm'>
      <CardHeader className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <CardTitle>Ledger</CardTitle>
        <CalendarDatePicker
          className='h-9 w-[250px]'
          variant='outline'
          date={dateRange || { from: undefined, to: undefined }}
          onDateSelect={setDateRange}
        />
      </CardHeader>
      <CardContent>
        {error && <p className='text-sm text-red-500 mb-2'>{error}</p>}
        {loading ? (
          <p className='text-muted-foreground'>Loading...</p>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
                </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell>{row.debit}</TableCell>
                    <TableCell>{row.credit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}