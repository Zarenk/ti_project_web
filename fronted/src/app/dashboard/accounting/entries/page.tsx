'use client'

import React, { useEffect, useState, FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { BACKEND_URL } from '@/lib/utils'

interface Entry {
  id: string
  description: string
  status: 'draft' | 'posted' | 'void'
}

export default function AccountingEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [description, setDescription] = useState('')

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounting/entries`)
      if (res.ok) {
        const { data }: { data: Entry[] } = await res.json()
        setEntries(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load entries', err)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const createDraft = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/accounting/entries', {
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
      await fetch(`/api/accounting/entries/${id}/post`, { method: 'POST' })
      fetchEntries()
    } catch (err) {
      console.error('Failed to post entry', err)
    }
  }

  const voidEntry = async (id: string) => {
    try {
      await fetch(`/api/accounting/entries/${id}/void`, { method: 'POST' })
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
      <form onSubmit={createDraft} className='mb-6 flex flex-col sm:flex-row gap-2'>
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
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='p-2'>ID</th>
              <th className='p-2'>Description</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className='border-b'>
                <td className='p-2'>{entry.id}</td>
                <td className='p-2'>{entry.description}</td>
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
    </section>
  )
}