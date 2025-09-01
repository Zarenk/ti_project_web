'use client'

import React, { useEffect, useState } from 'react'
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
import { BACKEND_URL } from '@/lib/utils'

interface TrialBalanceRow {
  account: string
  debit: number
  credit: number
}

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
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
      const url = `${BACKEND_URL}/api/accounting/reports/trial-balance${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setRows(data)
    } catch (err) {
      console.error('Failed to load trial balance', err)
      setError('Failed to load trial balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(dateRange)
  }, [dateRange])

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (dateRange?.from) params.set('start', dateRange.from.toISOString().split('T')[0])
      if (dateRange?.to) params.set('end', dateRange.to.toISOString().split('T')[0])
      const res = await fetch(`${BACKEND_URL}/api/accounting/reports/trial-balance?${params.toString()}`)
      const blob = await res.blob()
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

  return (
    <Card className='shadow-sm'>
      <CardHeader className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <CardTitle>Trial Balance</CardTitle>
        <div className='flex items-center gap-2'>
          <CalendarDatePicker
            className='h-9 w-[250px]'
            variant='outline'
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={setDateRange}
          />
          <Button size='sm' onClick={exportCsv}>
            <FileDown className='mr-2 h-4 w-4' /> Export CSV
          </Button>
        </div>
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
                  <TableHead>Account</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
                </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
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
