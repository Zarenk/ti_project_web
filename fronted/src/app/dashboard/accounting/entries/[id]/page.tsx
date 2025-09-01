'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

interface EntryLine {
  account: string
  description?: string
  debit: number
  credit: number
}

interface Entry {
  id: string
  provider?: string
  date: string
  serie?: string
  correlativo?: string
  invoiceUrl?: string
  status: 'draft' | 'posted' | 'void'
  lines: EntryLine[]
}

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // `params` is provided as a Promise in Next.js 15+. Use the React `use()` hook
  // to unwrap the value before accessing its properties.
  const { id } = use(params)
  const [entry, setEntry] = useState<Entry | null>(null)

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/accounting/entries/${id}`)
        if (res.ok) {
          const data: Entry = await res.json()
          setEntry(data)
        }
      } catch (err) {
        console.error('Failed to load entry', err)
      }
    }
    fetchEntry()
  }, [id])

  if (!entry) return <section className='p-4'>Loading...</section>

  return (
    <div className='p-4 space-y-4'>
      <Button variant='ghost' size='sm' asChild>
        <Link href='/dashboard/accounting/entries'>
          <ArrowLeft className='mr-2 h-4 w-4' /> Back
        </Link>
      </Button>
      <Card className='shadow-sm'>
        <CardHeader>
          <CardTitle>Entry {entry.id}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2 sm:grid-cols-2'>
            <div><strong>Proveedor:</strong> {entry.provider ?? '-'}</div>
            <div><strong>Fecha:</strong> {new Date(entry.date).toLocaleDateString()}</div>
            <div><strong>Comprobante:</strong> {entry.serie && entry.correlativo ? `${entry.serie}-${entry.correlativo}` : '-'} </div>
            <div><strong>Status:</strong> <Badge variant='secondary'>{entry.status}</Badge></div>
          </div>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Débito</TableHead>
                  <TableHead>Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{line.account}</TableCell>
                    <TableCell>{line.description ?? '-'}</TableCell>
                    <TableCell>{line.debit}</TableCell>
                    <TableCell>{line.credit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}