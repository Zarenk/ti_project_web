'use client'

import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/accounting/reports/ledger`)
        if (res.ok) {
          const data: LedgerResponse = await res.json()
          // API returns an object with a `data` array and `total` count
          setRows(Array.isArray(data.data) ? data.data : [])
        }
      } catch (err) {
        console.error('Failed to load ledger', err)
        setRows([])
      }
    }
    load()
  }, [])

  return (
    <Card className='shadow-sm'>
      <CardHeader>
        <CardTitle>Ledger</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}