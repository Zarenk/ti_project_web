'use client'

import React, { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/accounting/reports/trial-balance`)
        if (res.ok) {
          const data = await res.json()
          setRows(data)
        }
      } catch (err) {
        console.error('Failed to load trial balance', err)
      }
    }
    load()
  }, [])

  const exportCsv = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounting/reports/trial-balance?format=csv`)
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
        <Button size='sm' onClick={exportCsv}>
          <FileDown className='mr-2 h-4 w-4' /> Export CSV
        </Button>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
