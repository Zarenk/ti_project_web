'use client'

import React, { useEffect, useState } from 'react'

interface LedgerRow {
  date: string
  account: string
  debit: number
  credit: number
}

export default function LedgerReportPage() {
  const [rows, setRows] = useState<LedgerRow[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/accounting/reports/ledger')
        if (res.ok) {
          const data = await res.json()
          setRows(data)
        }
      } catch (err) {
        console.error('Failed to load ledger', err)
      }
    }
    load()
  }, [])

  return (
    <section className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Ledger</h1>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='p-2'>Date</th>
              <th className='p-2'>Account</th>
              <th className='p-2'>Debit</th>
              <th className='p-2'>Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className='border-b'>
                <td className='p-2'>{row.date}</td>
                <td className='p-2'>{row.account}</td>
                <td className='p-2'>{row.debit}</td>
                <td className='p-2'>{row.credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}