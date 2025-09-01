'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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
  status: 'draft' | 'posted' | 'void'
  lines: EntryLine[]
}

export default function EntryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
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

  if (!entry) return <section className='container mx-auto p-4'>Loading...</section>

  return (
    <section className='container mx-auto p-4'>
      <Link href='/dashboard/accounting/entries' className='text-blue-600 underline'>
        &larr; Back
      </Link>
      <h1 className='text-2xl font-bold mb-4'>Entry {entry.id}</h1>
      <div className='mb-4 space-y-1'>
        <div><strong>Proveedor:</strong> {entry.provider ?? '-'}</div>
        <div><strong>Fecha:</strong> {new Date(entry.date).toLocaleDateString()}</div>
        <div><strong>Comprobante:</strong> {entry.serie && entry.correlativo ? `${entry.serie}-${entry.correlativo}` : '-'}</div>
        <div><strong>Status:</strong> <Badge variant='secondary'>{entry.status}</Badge></div>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='p-2'>Cuenta</th>
              <th className='p-2'>Descripción</th>
              <th className='p-2'>Débito</th>
              <th className='p-2'>Crédito</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line, idx) => (
              <tr key={idx} className='border-b'>
                <td className='p-2'>{line.account}</td>
                <td className='p-2'>{line.description ?? '-'}</td>
                <td className='p-2'>{line.debit}</td>
                <td className='p-2'>{line.credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}