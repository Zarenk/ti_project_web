'use client'

import React, { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BACKEND_URL } from '@/lib/utils'

interface Entry {
  id: string
  provider?: string
  date: string
  serie?: string
  correlativo?: string
  description?: string
  status: 'draft' | 'posted' | 'void'
}

export default function AccountingEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [description, setDescription] = useState('')
  const [period, setPeriod] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
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
      await fetch(`${BACKEND_URL}/api/accounting/entries/${id}/void`, { method: 'POST' })
      fetchEntries()
    } catch (err) {
      console.error('Failed to post entry', err)
    }
  }

  const voidEntry = async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/accounting/entries/${id}/void`, { method: 'POST' })
      fetchEntries()
    } catch (err) {
      console.error('Failed to void entry', err)
    }
  }

  const badgeVariant: Record<Entry['status'], 'secondary' | 'default' | 'destructive'> = {
    draft: 'secondary',
    posted: 'default',
    void: 'destructive'
  }

  return (
    <section className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Accounting Entries</h1>
      <div className='mb-4 flex flex-col sm:flex-row gap-2'>
        <input
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder='Period'
          className='border rounded p-2'
        />
        <form onSubmit={createDraft} className='flex flex-1 gap-2'>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Description'
            className='border rounded p-2 flex-1'
          />
          <button
            type='submit'
            className='bg-blue-600 text-white px-4 py-2 rounded'
          >
            Create Draft
          </button>
        </form>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='p-2'>ID</th>
              <th className='p-2'>Proveedor</th>
              <th className='p-2'>Fecha</th>
              <th className='p-2'>Comprobante</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className='border-b'>
                <td className='p-2'>
                  <Link href={`/dashboard/accounting/entries/${entry.id}`}>{entry.id}</Link>
                </td>
                <td className='p-2'>{entry.provider ?? '-'}</td>
                <td className='p-2'>{new Date(entry.date).toLocaleDateString()}</td>
                <td className='p-2'>{entry.serie && entry.correlativo ? `${entry.serie}-${entry.correlativo}` : '-'}</td>
                <td className='p-2'>
                  <Badge variant={badgeVariant[entry.status]}>{entry.status}</Badge>
                </td>
                <td className='p-2 space-x-2'>
                  {entry.status === 'draft' && (
                    <button
                      onClick={() => postEntry(entry.id)}
                      className='bg-green-600 text-white px-2 py-1 rounded'
                    >
                      Post
                    </button>
                  )}
                  {entry.status !== 'void' && (
                    <button
                      onClick={() => voidEntry(entry.id)}
                      className='bg-red-600 text-white px-2 py-1 rounded'
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='flex justify-between mt-4'>
        <button
          className='px-3 py-1 border rounded'
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {Math.max(1, Math.ceil(total / size))}</span>
        <button
          className='px-3 py-1 border rounded'
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.ceil(total / size)}
        >
          Next
        </button>
      </div>
    </section>
  )
}