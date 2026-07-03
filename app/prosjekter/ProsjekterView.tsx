'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { Project } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS_SOFT, EMPLOYEE_COLORS } from '@/lib/types'
import { updateProject, deleteProject, addProject } from './actions'

const TEAM = ['Øyvin', 'Marcel', 'Roar', 'Nick', 'Roger']
const STATUSES = Object.keys(STATUS_LABELS)

interface Props {
  projects: Project[]
  userEmail: string
}

function EmployeeMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const dotColor = selected.length > 0 ? (EMPLOYEE_COLORS[selected[0]] || '#aaa') : '#aaa'
  const labelText = selected.length === 0 ? 'Ikke tildelt'
    : selected.length === 1 ? selected[0]
    : selected[0] + ' +' + (selected.length - 1)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="p-input"
        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flex: 1, color: selected.length === 0 ? '#9aa09d' : '#191d1c' }}>
          {selected.length > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />}
          {labelText}
        </span>
        <span style={{ fontSize: 9, color: '#9aa09d', flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 100, top: 'calc(100% + 4px)', left: 0,
          background: '#fff', border: '1px solid #d9d6cd', borderRadius: 9,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 160, padding: '5px 0'
        }}>
          {TEAM.map(emp => {
            const checked = selected.includes(emp)
            return (
              <label key={emp} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 13px', cursor: 'pointer', fontSize: 13,
                background: checked ? '#f2f8f7' : 'transparent',
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? selected.filter(e => e !== emp) : [...selected, emp]
                    onChange(next)
                  }}
                  style={{ width: 14, height: 14, accentColor: '#1f4b4a' }}
                />
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: EMPLOYEE_COLORS[emp] || '#aaa' }} />
                {emp}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ProsjekterView({ projects: initial, userEmail }: Props) {
  const [rows, setRows] = useState<Project[]>(initial)
  const [filter, setFilter] = useState('alle')
  const [sort, setSort] = useState<'nr' | 'start' | 'sum' | 'status' | 'kunde'>('nr')
  const [, startTransition] = useTransition()
  const router = useRouter()
  const [showArchived, setShowArchived] = useState(false)

  const totalSum = rows.reduce((s, p) => s + (p.agreed_price ?? 0), 0)
  const withSum = rows.filter(p => p.agreed_price != null).length
  const active = rows.filter(p => p.status === 'pågår').length
  const done = rows.filter(p => p.status === 'ferdig').length

  const archivedCount = rows.filter(p => p.archived).length
  const sorted = [...rows]
    .filter(p => (showArchived || !p.archived) && (filter === 'alle' || p.status === filter))
    .sort((a, b) => {
      if (sort === 'nr') return a.project_number.localeCompare(b.project_number, 'nb', { numeric: true })
      if (sort === 'sum') return (b.agreed_price ?? 0) - (a.agreed_price ?? 0)
      if (sort === 'status') return (a.status ?? '').localeCompare(b.status ?? '', 'nb')
      if (sort === 'start') return (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999')
      if (sort === 'kunde') return (a.customer_name ?? '').localeCompare(b.customer_name ?? '', 'nb')
      return 0
    })

  function handleField(nr: string, field: string, value: string | number | string[] | boolean | null) {
    setRows(prev => prev.map(r => r.project_number === nr ? { ...r, [field]: value } : r))
    startTransition(() => updateProject(nr, field, value))
  }

  function handleLogout() {
    const supabase = createClient()
    supabase.auth.signOut().then(() => router.push('/login'))
  }

  function exportCSV() {
    const cols = ['Nr', 'Kunde', 'E-post', 'Telefon', 'Adresse', 'Ansvarlige', 'Kontraktssum', 'Start', 'Slutt', 'Status', 'Notater']
    const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const lines = [cols.join(';'), ...rows.map(p =>
      [
        p.project_number, p.customer_name, p.customer_email, p.customer_phone,
        p.address, (p.assigned_employees ?? []).join(', '),
        p.agreed_price ?? '', p.start_date, p.estimated_end_date,
        STATUS_LABELS[p.status] ?? p.status, p.notes,
      ].map(esc).join(';')
    )]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'prosjektoversikt.csv'
    a.click()
  }

  return (
    <div style={{ background: '#f2f0ea', minHeight: '100vh' }}>
      <style>{`
        .p-card { background:#fff; border:1px solid #e7e4db; border-radius:12px; box-shadow:0 1px 2px rgba(20,25,24,.06),0 8px 24px rgba(20,25,24,.06); }
        .p-th { font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#4a534f; font-weight:600; padding:11px 12px; border-bottom:1.5px solid #d9d6cd; white-space:nowrap; background:#faf9f5; position:sticky; top:0; z-index:2; text-align:left; }
        .p-td { padding:4px 12px; border-bottom:1px solid #e7e4db; vertical-align:middle; }
        .p-input { width:100%; border:1px solid transparent; background:transparent; border-radius:6px; padding:7px 8px; font-size:13.5px; color:#191d1c; font-family:inherit; box-sizing:border-box; }
        .p-input:hover { border-color:#d9d6cd; }
        .p-input:focus { outline:none; border-color:#1f4b4a; background:#fff; box-shadow:0 0 0 3px rgba(31,75,74,.10); }
        .p-input-num { text-align:right; font-variant-numeric:tabular-nums; }
        .p-select { font-size:13px; color:#191d1c; background:#fff; border:1px solid #d9d6cd; border-radius:8px; padding:7px 11px; cursor:pointer; font-family:inherit; }
        .p-btn { font-size:13px; font-weight:600; color:#191d1c; background:#fff; border:1px solid #d9d6cd; border-radius:8px; padding:7px 13px; cursor:pointer; font-family:inherit; }
        .p-btn:hover { border-color:#1f4b4a; }
        .p-btn-ghost { color:#4a534f; }
        .p-addrow { color:#1f4b4a; font-weight:600; background:none; border:1px dashed #d9d6cd; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:13px; font-family:inherit; }
        .p-addrow:hover { border-color:#1f4b4a; background:#f5f8f7; }
        .p-del { border:0; background:transparent; color:#ccc; cursor:pointer; font-size:17px; padding:6px 8px; border-radius:6px; }
        .p-del:hover { color:#c1483c; background:#f8dedb; }
        .p-nr { font-weight:600; color:#1f4b4a; font-variant-numeric:tabular-nums; }
        tbody tr:hover td { background:#faf9f4; }
        .p-st-pick { border:0; border-radius:999px; padding:5px 10px; font-weight:600; font-size:12px; cursor:pointer; appearance:none; font-family:inherit; }
        .p-arch { border:0; background:transparent; color:#aaa; cursor:pointer; font-size:15px; padding:5px 6px; border-radius:6px; }
        .p-arch:hover { color:#1f4b4a; background:#e8f0ef; }
        tr.archived-row td { opacity: 0.45; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '22px 20px 60px' }}>

        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#1f4b4a', color: '#f2f0ea', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>RS</div>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 20, margin: 0, letterSpacing: '-.2px', color: '#191d1c' }}>Prosjektoversikt</h1>
              <p style={{ margin: '1px 0 0', color: '#4a534f', fontSize: 12.5 }}>R. Samdal Snekkeri · Kontraktsfestede jobber &amp; fremdrift</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#4a534f' }}>{userEmail}</span>
            <button className="p-btn p-btn-ghost" onClick={handleLogout}>Logg ut</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Prosjekter</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{rows.length}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>kontraktsfestede jobber</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px', background: '#1f4b4a', borderColor: '#143332', color: '#eef2f0' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#b9cccb', fontWeight: 600 }}>Total kontraktssum</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{totalSum ? totalSum.toLocaleString('nb-NO') : '0'} kr</div>
            <div style={{ fontSize: 11.5, color: '#b9cccb', marginTop: 1 }}>{withSum} av {rows.length} med beløp</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Pågår nå</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{active}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>aktive byggeplasser</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Fullført</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{done}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>{rows.filter(p => p.status === 'tapt').length} tapt · {rows.filter(p => p.status === 'tilbud sendt').length} tilbud sendt</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#4a534f' }}>
            {filter !== 'alle' && <span style={{ fontWeight: 600, color: '#191d1c' }}>{sorted.length}</span>}{filter !== 'alle' ? ' prosjekter vises' : rows.length + ' prosjekter totalt'}
          </div>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 12, color: '#4a534f', fontWeight: 500 }}>Status</label>
          <select className="p-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="alle">Alle</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <label style={{ fontSize: 12, color: '#4a534f', fontWeight: 500 }}>Sorter</label>
          <select className="p-select" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
            <option value="nr">Nummer</option>
            <option value="start">Startdato</option>
            <option value="sum">Kontraktssum</option>
            <option value="status">Status</option>
            <option value="kunde">Kunde</option>
          </select>
          <button className="p-btn" onClick={exportCSV}>Eksporter CSV</button>
          <button
            className="p-btn"
            style={{ color: showArchived ? '#1f4b4a' : '#4a534f', borderColor: showArchived ? '#1f4b4a' : '#d9d6cd' }}
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? 'Skjul arkiverte' : 'Vis arkiverte'}{archivedCount > 0 ? ' (' + archivedCount + ')' : ''}
          </button>
        </div>

        <div className="p-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead>
                <tr>
                  <th className="p-th" style={{ width: 56 }}>Nr</th>
                  <th className="p-th" style={{ minWidth: 150 }}>Kunde</th>
                  <th className="p-th" style={{ minWidth: 170 }}>E-post</th>
                  <th className="p-th" style={{ width: 130 }}>Telefon</th>
                  <th className="p-th" style={{ minWidth: 160 }}>Adresse</th>
                  <th className="p-th" style={{ width: 145 }}>Ansvarlig</th>
                  <th className="p-th" style={{ width: 145, textAlign: 'right' }}>Kontraktssum</th>
                  <th className="p-th" style={{ width: 136 }}>Start</th>
                  <th className="p-th" style={{ width: 136 }}>Slutt</th>
                  <th className="p-th" style={{ width: 135 }}>Status</th>
                  <th className="p-th" style={{ minWidth: 180 }}>Notater</th>
                  <th className="p-th" style={{ width: 74 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.project_number} className={p.archived ? 'archived-row' : ''}>
                    <td className="p-td p-nr">{p.project_number}</td>
                    <td className="p-td">
                      <input className="p-input" defaultValue={p.customer_name ?? ''} onBlur={e => handleField(p.project_number, 'customer_name', e.target.value)} />
                    </td>
                    <td className="p-td">
                      <input className="p-input" type="email" defaultValue={p.customer_email ?? ''} placeholder="e-post" onBlur={e => handleField(p.project_number, 'customer_email', e.target.value)} />
                    </td>
                    <td className="p-td">
                      <input className="p-input" type="tel" defaultValue={p.customer_phone ?? ''} placeholder="tlf" onBlur={e => handleField(p.project_number, 'customer_phone', e.target.value)} />
                    </td>
                    <td className="p-td">
                      <input className="p-input" defaultValue={p.address ?? ''} placeholder="Adresse" onBlur={e => handleField(p.project_number, 'address', e.target.value)} />
                    </td>
                    <td className="p-td">
                      <EmployeeMultiSelect
                        selected={p.assigned_employees ?? []}
                        onChange={emps => handleField(p.project_number, 'assigned_employees', emps)}
                      />
                    </td>
                    <td className="p-td">
                      <input
                        className="p-input p-input-num"
                        defaultValue={p.agreed_price != null ? p.agreed_price.toLocaleString('nb-NO') : ''}
                        placeholder="0 kr"
                        onBlur={e => {
                          const n = parseFloat(e.target.value.replace(/[^\d.-]/g, ''))
                          const val = isNaN(n) ? null : n
                          handleField(p.project_number, 'agreed_price', val)
                          e.target.value = val != null ? val.toLocaleString('nb-NO') : ''
                        }}
                      />
                    </td>
                    <td className="p-td">
                      <input type="date" className="p-input" style={{ minWidth: 120 }} defaultValue={p.start_date ?? ''} onChange={e => handleField(p.project_number, 'start_date', e.target.value || null)} />
                    </td>
                    <td className="p-td">
                      <input type="date" className="p-input" style={{ minWidth: 120 }} defaultValue={p.estimated_end_date ?? ''} onChange={e => handleField(p.project_number, 'estimated_end_date', e.target.value || null)} />
                    </td>
                    <td className="p-td">
                      <select
                        className="p-st-pick"
                        value={p.status}
                        style={{ background: STATUS_COLORS_SOFT[p.status] ?? '#e7e4db', color: '#191d1c' }}
                        onChange={e => handleField(p.project_number, 'status', e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="p-td">
                      <input className="p-input" defaultValue={p.notes ?? ''} placeholder="Notater" onBlur={e => handleField(p.project_number, 'notes', e.target.value)} />
                    </td>
                    <td className="p-td" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="p-arch"
                        title={p.archived ? 'Gjenopprett' : 'Arkiver'}
                        onClick={() => handleField(p.project_number, 'archived', !p.archived)}
                      >{p.archived ? '↩' : '⊡'}</button>
                      <button className="p-del" title="Slett" onClick={() => {
                        if (confirm('Slett prosjekt ' + p.project_number + ' permanent?')) {
                          setRows(prev => prev.filter(r => r.project_number !== p.project_number))
                          startTransition(() => deleteProject(p.project_number))
                        }
                      }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={12} style={{ padding: 12 }}>
                  <button className="p-addrow" onClick={() => {
                    startTransition(async () => {
                      const newRow = await addProject(rows)
                      if (newRow) setRows(prev => [...prev, newRow as Project])
                    })
                  }}>+ Nytt prosjekt</button>
                </td></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: '#4a534f' }}>
          <strong style={{ color: '#191d1c' }}>Tips:</strong> Klikk rett i cellene for å fylle inn kontraktssum og datoer. Alt lagres direkte til den felles prosjekttabellen.
        </p>
      </div>
    </div>
  )
}