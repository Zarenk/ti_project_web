'use client'

import React, { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { PlusCircle, Check, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { BACKEND_URL } from '@/lib/utils'

interface Entry {
  id: string
  provider?: string
  date: string
  serie?: string
  correlativo?: string
  invoiceUrl?: string
  description?: string
  status: 'draft' | 'posted' | 'void'
}

export default function AccountingEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [description, setDescription] = useState('')
  const [period, setPeriod] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [voidId, setVoidId] = useState<string | null>(null)
  const size = 25

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString()
      })
      if (period) params.append('period', period)
      const res = await fetch(`${BACKEND_URL}/api/accounting/entries?${params.toString()}`)
      if (res.ok) {
        const { data, total }: { data: Entry[]; total: number } = await res.json()
        setEntries(Array.isArray(data) ? data : [])
        setTotal(total ?? 0)
      }
    } catch (err) {
      console.error('Failed to load entries', err)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [page, period])

  const createDraft = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await fetch(`${BACKEND_URL}/api/accounting/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      setDescription('')
      fetchEntries()
    } catch (err) {
      console.error('Failed to create draft', err)
    }
  }

  const postEntry = async (id: string) => {
    try {
      // Use the `/post` endpoint to post an entry.
      await fetch(`${BACKEND_URL}/api/accounting/entries/${id}/post`, { method: 'POST' })
      fetchEntries()
    } catch (err) {
      console.error('Failed to post entry', err)
    }
  }

  const voidEntry = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounting/entries/${id}/void`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to void entry')
      fetchEntries()
      toast.success('Entry voided successfully')
    } catch (err) {
      console.error('Failed to void entry', err)
      toast.error('Failed to void entry')
    }
  }

  const badgeVariant: Record<Entry['status'], 'secondary' | 'default' | 'destructive'> = {
    draft: 'secondary',
    posted: 'default',
    void: 'destructive'
  }

  return (
    <Card className='shadow-sm'>
      <CardHeader className='space-y-4'>
        <CardTitle>Accounting Entries</CardTitle>
        <div className='flex flex-col md:flex-row md:items-center gap-2'>
          <Input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder='Period'
            className='md:w-40'
          />
          <form onSubmit={createDraft} className='flex w-full gap-2'>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Description'
              className='flex-1'
            />
            <Button type='submit' size='sm'>
              <PlusCircle className='mr-2 h-4 w-4' /> Create Draft
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Link href={`/dashboard/accounting/entries/${entry.id}`}>{entry.id}</Link>
                  </TableCell>
                  <TableCell>{entry.provider ?? '-'}</TableCell>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {entry.serie && entry.correlativo ? `${entry.serie}-${entry.correlativo}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant[entry.status]}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell className='space-x-2 text-right'>
                    {entry.status === 'draft' && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => postEntry(entry.id)}
                        aria-label='Post'
                      >
                        <Check className='h-4 w-4' />
                      </Button>
                    )}
                    {entry.status !== 'void' && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setVoidId(entry.id)}
                        aria-label='Void'
                      >
                        <XCircle className='h-4 w-4' />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className='flex items-center justify-between mt-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className='mr-2 h-4 w-4' /> Previous
          </Button>
          <span className='text-sm'>Page {page} of {Math.max(1, Math.ceil(total / size))}</span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / size)}
          >
            Next <ChevronRight className='ml-2 h-4 w-4' />
          </Button>
        </div>
        <AlertDialog open={!!voidId} onOpenChange={(open) => !open && setVoidId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void entry?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (voidId) voidEntry(voidId)
                  setVoidId(null)
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}