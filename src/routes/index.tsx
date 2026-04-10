import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { ref, onValue, set, get } from 'firebase/database'
import { db } from '@/lib/firebase'

export const Route = createFileRoute('/')({
  component: SamitiDashboard,
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FESTIVALS = ['Ganesh', 'Krishna', 'Laxmi', 'Navratri', 'Hanuman']

const MEMBERS = [
  { name: 'RAMESH PAL', post: 'Adhyaksha' },
  { name: 'Arvind Sahu', post: 'Upadhyaksh' },
  { name: 'Mukesh Sahu', post: 'Sachiv' },
  { name: 'Vinod Sahu', post: 'Lekhakar' },
  { name: 'Chhotu Sahu', post: 'Sadasya' },
  { name: 'Ashok', post: 'Sadasya' },
  { name: 'Bihari Pal', post: 'Sadasya' },
  { name: 'Bhola Pal', post: 'Sadasya' },
  { name: 'Pankaj Sahu', post: 'Sadasya' },
  { name: 'Rishi Sahu', post: 'Sadasya' },
  { name: 'Rajkumar Sahu', post: 'Sadasya' },
  { name: 'Horilal Sahu', post: 'Sadasya' },
  { name: 'Sohan Pal', post: 'Sadasya' },
  { name: 'Netram Sahu', post: 'Sadasya' },
  { name: 'Vishnu Pal', post: 'Sadasya' },
  { name: 'Murlee Pal', post: 'Sadasya' },
  { name: 'Lokesh Pal (SP)', post: 'Sadasya' },
  { name: 'Lokesh Pal', post: 'Sadasya' },
  { name: 'Suraj Yadav', post: 'Sadasya' },
  { name: 'Rahul Yadav', post: 'Sadasya' },
  { name: 'Kamta Pal', post: 'Sadasya' },
  { name: 'Komal Sahu', post: 'Sadasya' },
  { name: 'Devraj Sahu', post: 'Sadasya' },
  { name: 'Ravishankar Sahu', post: 'Sadasya' },
]

type MonthData = { amount: number; date: string } // date = 'YYYY-MM-DD'
type FestivalData = { amount: number }
type MemberData = {
  months: Record<string, MonthData>
  festivals: Record<string, FestivalData>
}
type IncomeEntry = { id: string; description: string; amount: number }
type ExpenseEntry = { id: string; description: string; amount: number }

type AppData = {
  openingBalance: number
  members: Record<string, MemberData>
  income: Record<string, IncomeEntry>
  expenses: Record<string, ExpenseEntry>
}

const emptyAppData: AppData = {
  openingBalance: 0,
  members: {},
  income: {},
  expenses: {},
}

function calcPenalty(dateStr: string): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const day = d.getDate()
  return Math.max(0, (day - 1)) * 10
}

function formatAmount(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

export default function SamitiDashboard() {
  const [data, setData] = useState<AppData>(emptyAppData)
  const [editMode, setEditMode] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(true)

  // Opening balance edit state
  const [obInput, setObInput] = useState('')

  // Income form
  const [incomeDesc, setIncomeDesc] = useState('')
  const [incomeAmt, setIncomeAmt] = useState('')

  // Expense form
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseAmt, setExpenseAmt] = useState('')

  useEffect(() => {
    const dbRef = ref(db, 'samitiData')
    const unsub = onValue(dbRef, (snap) => {
      if (snap.exists()) {
        setData(snap.val() as AppData)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const saveData = useCallback(async (updated: AppData) => {
    await set(ref(db, 'samitiData'), updated)
  }, [])

  // Derived totals
  const masikTotal = Object.values(data.members || {}).reduce((acc, m) => {
    return acc + Object.values(m.months || {}).reduce((s, mo) => s + (mo.amount || 0) + calcPenalty(mo.date), 0)
  }, 0)

  const festivalTotal = Object.values(data.members || {}).reduce((acc, m) => {
    return acc + Object.values(m.festivals || {}).reduce((s, f) => s + (f.amount || 0), 0)
  }, 0)

  const otherIncome = Object.values(data.income || {}).reduce((s, e) => s + (e.amount || 0), 0)
  const totalExpense = Object.values(data.expenses || {}).reduce((s, e) => s + (e.amount || 0), 0)
  const balance = (data.openingBalance || 0) + masikTotal + festivalTotal + otherIncome - totalExpense

  function handleLogin() {
    if (password === 'jsr001') {
      setEditMode(true)
      setLoginOpen(false)
      setPassword('')
      setLoginError('')
    } else {
      setLoginError('Incorrect password')
    }
  }

  function handleLogout() {
    setEditMode(false)
  }

  async function handleSaveOB() {
    const val = parseFloat(obInput)
    if (isNaN(val)) return
    const updated = { ...data, openingBalance: val }
    setData(updated)
    await saveData(updated)
    setObInput('')
  }

  async function handleAddIncome() {
    const amt = parseFloat(incomeAmt)
    if (!incomeDesc || isNaN(amt)) return
    const id = Date.now().toString()
    const updated = {
      ...data,
      income: { ...(data.income || {}), [id]: { id, description: incomeDesc, amount: amt } },
    }
    setData(updated)
    await saveData(updated)
    setIncomeDesc('')
    setIncomeAmt('')
  }

  async function handleRemoveIncome(id: string) {
    const updated = { ...data, income: { ...(data.income || {}) } }
    delete updated.income[id]
    setData(updated)
    await saveData(updated)
  }

  async function handleAddExpense() {
    const amt = parseFloat(expenseAmt)
    if (!expenseDesc || isNaN(amt)) return
    const id = Date.now().toString()
    const updated = {
      ...data,
      expenses: { ...(data.expenses || {}), [id]: { id, description: expenseDesc, amount: amt } },
    }
    setData(updated)
    await saveData(updated)
    setExpenseDesc('')
    setExpenseAmt('')
  }

  async function handleRemoveExpense(id: string) {
    const updated = { ...data, expenses: { ...(data.expenses || {}) } }
    delete updated.expenses[id]
    setData(updated)
    await saveData(updated)
  }

  async function handleMemberMonth(memberIdx: number, month: string, field: 'amount' | 'date', value: string) {
    const key = `member_${memberIdx}`
    const memberData: MemberData = data.members?.[key] || { months: {}, festivals: {} }
    const existing = memberData.months?.[month] || { amount: 0, date: '' }
    const updated: AppData = {
      ...data,
      members: {
        ...(data.members || {}),
        [key]: {
          ...memberData,
          months: {
            ...(memberData.months || {}),
            [month]: {
              ...existing,
              [field]: field === 'amount' ? (parseFloat(value) || 0) : value,
            },
          },
        },
      },
    }
    setData(updated)
    await saveData(updated)
  }

  async function handleMemberFestival(memberIdx: number, festival: string, value: string) {
    const key = `member_${memberIdx}`
    const memberData: MemberData = data.members?.[key] || { months: {}, festivals: {} }
    const updated: AppData = {
      ...data,
      members: {
        ...(data.members || {}),
        [key]: {
          ...memberData,
          festivals: {
            ...(memberData.festivals || {}),
            [festival]: { amount: parseFloat(value) || 0 },
          },
        },
      },
    }
    setData(updated)
    await saveData(updated)
  }

  const cardStyle = 'bg-white rounded-2xl shadow p-5 flex flex-col gap-1'
  const inputStyle = 'border border-orange-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-full'
  const btnStyle = 'bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-700 transition'
  const thStyle = 'px-2 py-2 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200 whitespace-nowrap'
  const tdStyle = 'px-2 py-1.5 text-sm border-b border-orange-100 text-center'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fff3e0' }}>
        <div className="text-orange-600 text-lg font-semibold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#fff3e0' }}>
      {/* Header */}
      <header style={{ background: '#ff6f00' }} className="text-white px-4 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide">🏛️ JAI SHREE RAM NAVYUVAK SAMITI</h1>
            <p className="text-orange-100 text-xs mt-0.5">समिति प्रबंधन डैशबोर्ड</p>
          </div>
          <div className="flex items-center gap-3">
            {editMode ? (
              <button onClick={handleLogout} className="bg-white text-orange-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-50 transition">
                🔓 Logout Edit Mode
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="bg-white text-orange-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-50 transition">
                🔐 Login to Edit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {loginOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-bold text-orange-700 mb-4">Admin Login</h2>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className={inputStyle + ' mb-3'}
            />
            {loginError && <p className="text-red-500 text-sm mb-2">{loginError}</p>}
            <div className="flex gap-2">
              <button onClick={handleLogin} className={btnStyle + ' flex-1'}>Login</button>
              <button onClick={() => { setLoginOpen(false); setPassword(''); setLoginError('') }} className="flex-1 border border-gray-300 rounded-lg px-4 py-1.5 text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryCard label="Masik Collection" value={masikTotal} color="#ff6f00" icon="💰" />
          <SummaryCard label="Festival Collection" value={festivalTotal} color="#e65100" icon="🎉" />
          <SummaryCard label="Other Income" value={otherIncome} color="#2e7d32" icon="📈" />
          <SummaryCard label="Total Expense" value={totalExpense} color="#c62828" icon="📉" />
          <SummaryCard label="Overall Balance" value={balance} color={balance >= 0 ? '#1565c0' : '#b71c1c'} icon="🏦" highlight />
        </div>

        {/* Opening Balance */}
        <div className={cardStyle}>
          <h2 className="text-base font-bold text-orange-700 mb-2">Opening Balance (प्रारंभिक बैलेंस)</h2>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(data.openingBalance || 0)}</p>
          {editMode && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="Set opening balance"
                value={obInput}
                onChange={e => setObInput(e.target.value)}
                className={inputStyle}
              />
              <button onClick={handleSaveOB} className={btnStyle + ' whitespace-nowrap'}>Save</button>
            </div>
          )}
        </div>

        {/* Income & Expense */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Other Income */}
          <div className={cardStyle}>
            <h2 className="text-base font-bold text-green-700 mb-2">Other Income (अन्य आय)</h2>
            {editMode && (
              <div className="flex flex-col gap-2 mb-3">
                <input type="text" placeholder="Description" value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} className={inputStyle} />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount (₹)" value={incomeAmt} onChange={e => setIncomeAmt(e.target.value)} className={inputStyle} />
                  <button onClick={handleAddIncome} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 whitespace-nowrap transition">Add</button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {Object.values(data.income || {}).length === 0 ? (
                <p className="text-gray-400 text-sm italic">No entries yet</p>
              ) : Object.values(data.income || {}).map(e => (
                <div key={e.id} className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-700">{e.description}</span>
                  <span className="font-semibold text-green-700">{formatAmount(e.amount)}</span>
                  {editMode && <button onClick={() => handleRemoveIncome(e.id)} className="ml-2 text-red-400 hover:text-red-600 text-xs">✕</button>}
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-green-100 text-sm font-semibold text-green-700">Total: {formatAmount(otherIncome)}</div>
          </div>

          {/* Expenses */}
          <div className={cardStyle}>
            <h2 className="text-base font-bold text-red-700 mb-2">Expenses (व्यय)</h2>
            {editMode && (
              <div className="flex flex-col gap-2 mb-3">
                <input type="text" placeholder="Description" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className={inputStyle} />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount (₹)" value={expenseAmt} onChange={e => setExpenseAmt(e.target.value)} className={inputStyle} />
                  <button onClick={handleAddExpense} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700 whitespace-nowrap transition">Add</button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {Object.values(data.expenses || {}).length === 0 ? (
                <p className="text-gray-400 text-sm italic">No entries yet</p>
              ) : Object.values(data.expenses || {}).map(e => (
                <div key={e.id} className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-700">{e.description}</span>
                  <span className="font-semibold text-red-700">{formatAmount(e.amount)}</span>
                  {editMode && <button onClick={() => handleRemoveExpense(e.id)} className="ml-2 text-red-400 hover:text-red-600 text-xs">✕</button>}
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-red-100 text-sm font-semibold text-red-700">Total: {formatAmount(totalExpense)}</div>
          </div>
        </div>

        {/* Member Collection Table */}
        <div className={cardStyle + ' overflow-hidden'}>
          <h2 className="text-base font-bold text-orange-700 mb-3">Member Collection Table (सदस्य संग्रह)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className={thStyle + ' text-left sticky left-0 bg-orange-50 z-10 min-w-[40px]'}>#</th>
                  <th className={thStyle + ' text-left sticky left-9 bg-orange-50 z-10 min-w-[130px]'}>Name</th>
                  <th className={thStyle + ' text-left min-w-[80px]'}>Post</th>
                  {MONTHS.map(m => (
                    <th key={m} className={thStyle + ' min-w-[90px]'}>{m}</th>
                  ))}
                  {FESTIVALS.map(f => (
                    <th key={f} className={thStyle + ' min-w-[80px]'}>{f}</th>
                  ))}
                  <th className={thStyle + ' min-w-[80px]'}>Total</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((member, idx) => {
                  const key = `member_${idx}`
                  const memberData = data.members?.[key] || { months: {}, festivals: {} }
                  const memberMonthTotal = Object.values(memberData.months || {}).reduce((s, mo) => s + (mo.amount || 0) + calcPenalty(mo.date), 0)
                  const memberFestTotal = Object.values(memberData.festivals || {}).reduce((s, f) => s + (f.amount || 0), 0)
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/40'}>
                      <td className={tdStyle + ' sticky left-0 bg-inherit font-semibold text-orange-600'}>{idx + 1}</td>
                      <td className={tdStyle + ' sticky left-9 bg-inherit text-left font-medium text-gray-800 min-w-[130px]'}>{member.name}</td>
                      <td className={tdStyle + ' text-left text-gray-500'}>{member.post}</td>
                      {MONTHS.map(m => {
                        const mo = memberData.months?.[m]
                        const penalty = mo?.date ? calcPenalty(mo.date) : 0
                        const paid = mo?.amount || 0
                        if (editMode) {
                          return (
                            <td key={m} className={tdStyle}>
                              <div className="flex flex-col gap-1">
                                <input
                                  type="number"
                                  placeholder="₹"
                                  defaultValue={paid || ''}
                                  onBlur={e => handleMemberMonth(idx, m, 'amount', e.target.value)}
                                  className="border border-orange-200 rounded px-1 py-0.5 w-full text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                                />
                                <input
                                  type="date"
                                  defaultValue={mo?.date || ''}
                                  onBlur={e => handleMemberMonth(idx, m, 'date', e.target.value)}
                                  className="border border-orange-200 rounded px-1 py-0.5 w-full text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                                />
                              </div>
                            </td>
                          )
                        }
                        return (
                          <td key={m} className={tdStyle}>
                            {paid > 0 ? (
                              <div>
                                <span className="text-green-700 font-semibold">₹{paid}</span>
                                {penalty > 0 && <span className="text-orange-600 text-xs block">+₹{penalty} pen</span>}
                              </div>
                            ) : (
                              <span className="text-red-500 font-semibold">Pending</span>
                            )}
                          </td>
                        )
                      })}
                      {FESTIVALS.map(f => {
                        const fData = memberData.festivals?.[f]
                        const amt = fData?.amount || 0
                        if (editMode) {
                          return (
                            <td key={f} className={tdStyle}>
                              <input
                                type="number"
                                placeholder="₹"
                                defaultValue={amt || ''}
                                onBlur={e => handleMemberFestival(idx, f, e.target.value)}
                                className="border border-orange-200 rounded px-1 py-0.5 w-full text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                              />
                            </td>
                          )
                        }
                        return (
                          <td key={f} className={tdStyle}>
                            {amt > 0 ? (
                              <span className="text-blue-700 font-semibold">₹{amt}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className={tdStyle + ' font-bold text-orange-700'}>
                        {formatAmount(memberMonthTotal + memberFestTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#ff6f00' }} className="text-white">
                  <td colSpan={3} className="px-2 py-2 font-bold text-sm">Total</td>
                  {MONTHS.map(m => {
                    const monthTotal = Object.values(data.members || {}).reduce((s, md) => {
                      const mo = md.months?.[m]
                      return s + (mo?.amount || 0) + calcPenalty(mo?.date || '')
                    }, 0)
                    return <td key={m} className="px-2 py-2 text-center font-semibold text-sm">{monthTotal > 0 ? formatAmount(monthTotal) : '—'}</td>
                  })}
                  {FESTIVALS.map(f => {
                    const festTotal = Object.values(data.members || {}).reduce((s, md) => s + (md.festivals?.[f]?.amount || 0), 0)
                    return <td key={f} className="px-2 py-2 text-center font-semibold text-sm">{festTotal > 0 ? formatAmount(festTotal) : '—'}</td>
                  })}
                  <td className="px-2 py-2 text-center font-bold text-sm">{formatAmount(masikTotal + festivalTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <footer className="text-center text-xs text-orange-400 py-4">
          JAI SHREE RAM NAVYUVAK SAMITI &copy; {new Date().getFullYear()} · All Rights Reserved
        </footer>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, icon, highlight }: { label: string; value: number; color: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-4 flex flex-col gap-1 ${highlight ? 'ring-2 ring-blue-400' : ''}`}>
      <div className="text-2xl">{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{formatAmount(value)}</p>
    </div>
  )
}
