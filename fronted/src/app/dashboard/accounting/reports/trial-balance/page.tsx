'use client'

import React, { useEffect, useState } from 'react'

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
        const res = await fetch('/api/accounting/reports/trial-balance')
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
      const res = await fetch('/api/accounting/reports/trial-balance?format=csv')
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
    <section className='container mx-auto p-4'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4'>
        <h1 className='text-2xl font-bold'>Trial Balance</h1>
        <button
          onClick={exportCsv}
          className='bg-blue-600 text-white px-4 py-2 rounded'
        >
          Export CSV
        </button>
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='p-2'>Account</th>
              <th className='p-2'>Debit</th>
              <th className='p-2'>Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className='border-b'>
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
