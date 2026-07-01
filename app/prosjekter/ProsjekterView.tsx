'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { Prosjekt, ProsjektStatus } from '@/lib/types'
import { PROSJEKT_STATUSES, PROSJEKT_TEAM } from '@/lib/types'

// ---- Server actions for mutations ----
import { updateProsjekt, deleteProsjekt, addProsjekt } from './actions'

interface Props {
  prosjekter: Prosjekt[]
  userEmail: string
}

export default function ProsjekterView({ prosjekter: initial, userEmail }: Props) {
  const [rows, setRows] = useState<Prosjekt[]>(initial)
  const [filter, setFilter] = useState<ProsjektStatus | 'alle'>('alle')
  const [sort, setSort] = useState<'nr' | 'start' | 'sum' | 'status' | 'kunde'>('nr')
  const [view, setView] = useState<'tabell' | 'tidslinje'>('tabell')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const fmtKr = (n: number | null) =>
    n == null ? '—' : n.toLocaleString('nb-NO') + ' kr'

  const totalSum = rows.reduce((s, p) => s + (p.sum ?? 0), 0)
  const statusCount = (s: ProsjektStatus) => rows.filter(p => p.status === s).length

  const sorted = [...rows]
    .filter(p => filter === 'alle' || p.status === filter)
    .sort((a, b) => {
      if (sort === 'nr') return a.nr.localeCompare(b.nr, 'nb', { numeric: true })
      if (sort === 'sum') return (b.sum ?? 0) - (a.sum ?? 0)
      if (sort === 'status') return PROSJEKT_STATUSES.indexOf(a.status as ProsjektStatus) - PROSJEKT_STATUSES.indexOf(b.status as ProsjektStatus)
      if (sort === 'start') return (a.start_dato ?? '9999').localeCompare(b.start_dato ?? '9999')
      if (sort === 'kunde') return a.kunde.localeCompare(b.kunde, 'nb')
      return 0
    })

  function handleField(id: string, field: keyof Prosjekt, value: string | number | null) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    startTransition(() => updateProsjekt(id, field, value))
  }

  function handleLogout() {
    const supabase = createClient()
    supabase.auth.signOut().then(() => router.push('/login'))
  }

  function exportCSV() {
    const cols = ['Nr', 'Kunde', 'Adresse', 'Ansvarlig', 'Kontraktssum', 'Start', 'Slutt', 'Status']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [cols.join(';'), ...rows.map(p =>
      [p.nr, p.kunde, p.adresse, p.ansvarlig, p.sum ?? '', p.start_dato, p.slutt_dato, p.status].map(esc).join(';')
    )]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'prosjektoversikt.csv'
    a.click()
  }

  // ---- DESIGN: matching prosjektoversikt.html ----
  return (
    <div style={{ background: '#f2f0ea', minHeight: '100vh' }}>
      <style>{`
        .p-card { background:#fff; border:1px solid #e7e4db; border-radius:12px; box-shadow:0 1px 2px rgba(20,25,24,.06),0 8px 24px rgba(20,25,24,.06); }
        .p-th { font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#4a534f; font-weight:600; padding:11px 12px; border-bottom:1.5px solid #d9d6cd; white-space:nowrap; background:#faf9f5; position:sticky; top:0; z-index:2; }
        .p-td { padding:4px 12px; border-bottom:1px solid #e7e4db; vertical-align:middle; }
        .p-input { width:100%; border:1px solid transparent; background:transparent; border-radius:6px; padding:7px 8px; font-size:13.5px; color:#191d1c; }
        .p-input:hover { border-color:#d9d6cd; }
        .p-input:focus { outline:none; border-color:#1f4b4a; background:#fff; box-shadow:0 0 0 3px rgba(31,75,74,.10); }
        .p-input-num { text-align:right; font-variant-numeric:tabular-nums; }
        .p-tab { font-size:13px; font-weight:600; color:#4a534f; border:0; background:transparent; padding:7px 15px; border-radius:7px; cursor:pointer; }
        .p-tab.on { background:#1f4b4a; color:#fff; }
        .p-select { font-size:13px; color:#191d1c; background:#fff; border:1px solid #d9d6cd; border-radius:8px; padding:7px 11px; cursor:pointer; }
        .p-btn { font-size:13px; font-weight:600; color:#191d1c; background:#fff; border:1px solid #d9d6cd; border-radius:8px; padding:7px 13px; cursor:pointer; }
        .p-btn:hover { border-color:#1f4b4a; }
        .p-btn-ghost { color:#4a534f; }
        .p-addrow { color:#1f4b4a; font-weight:600; background:none; border:1px dashed #d9d6cd; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:13px; }
        .p-addrow:hover { border-color:#1f4b4a; background:#f5f8f7; }
        .p-del { border:0; background:transparent; color:#ccc; cursor:pointer; font-size:17px; padding:6px 8px; border-radius:6px; }
        .p-del:hover { color:#c1483c; background:#f8dedb; }
        .p-nr { font-weight:600; color:#1f4b4a; font-variant-numeric:tabular-nums; }
        tr:hover td { background:#faf9f4; }
        .st-Planlagt { background:#eef0f3; color:#4a5568; }
        .st-Pågår    { background:#fbf0d6; color:#8a6100; }
        .st-Fullført { background:#dff0e6; color:#1f5c3d; }
        .st-Forsinket{ background:#f8dedb; color:#8f2f26; }
        .st-pick { border:0; border-radius:999px; padding:5px 11px 5px 22px; font-weight:600; font-size:12.5px; cursor:pointer; appearance:none; }
        .st-dot { position:absolute; left:9px; width:8px; height:8px; border-radius:50%; pointer-events:none; top:50%; transform:translateY(-50%); }
        .dot-Planlagt { background:#8b93a1; }
        .dot-Pågår    { background:#d99400; }
        .dot-Fullført { background:#2f8158; }
        .dot-Forsinket{ background:#c1483c; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 20px 60px' }}>

        {/* Header */}
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

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Prosjekter</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{rows.length}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>kontraktsfestede jobber</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px', background: '#1f4b4a', borderColor: '#143332', color: '#eef2f0' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#b9cccb', fontWeight: 600 }}>Total kontraktssum</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{totalSum ? totalSum.toLocaleString('nb-NO') : '0'} kr</div>
            <div style={{ fontSize: 11.5, color: '#b9cccb', marginTop: 1 }}>{rows.filter(p => p.sum != null).length} av {rows.length} med beløp</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Pågår nå</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{statusCount('Pågår')}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>aktive byggeplasser</div>
          </div>
          <div className="p-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Fullført</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{statusCount('Fullført')}</div>
            <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>{statusCount('Forsinket')} forsinket · {statusCount('Planlagt')} planlagt</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="p-card" style={{ display: 'inline-flex', padding: 3 }}>
            <button className={`p-tab${view === 'tabell' ? ' on' : ''}`} onClick={() => setView('tabell')}>Tabell</button>
            <button className={`p-tab${view === 'tidslinje' ? ' on' : ''}`} onClick={() => setView('tidslinje')}>Tidslinje</button>
          </div>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 12, color: '#4a534f', fontWeight: 500 }}>Status</label>
          <select className="p-select" value={filter} onChange={e => setFilter(e.target.value as ProsjektStatus | 'alle')}>
            <option value="alle">Alle</option>
            {PROSJEKT_STATUSES.map(s => <option key={s}>{s}</option>)}
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
        </div>

        {/* Table view */}
        {view === 'tabell' && (
          <div className="p-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    <th className="p-th" style={{ width: 56 }}>Nr</th>
                    <th className="p-th" style={{ minWidth: 150 }}>Kunde</th>
                    <th className="p-th" style={{ minWidth: 200, color: '#8b93a1' }}>Adresse</th>
                    <th className="p-th" style={{ width: 130 }}>Ansvarlig</th>
                    <th className="p-th" style={{ width: 150, textAlign: 'right' }}>Kontraktssum</th>
                    <th className="p-th" style={{ width: 140 }}>Start</th>
                    <th className="p-th" style={{ width: 140 }}>Slutt</th>
                    <th className="p-th" style={{ width: 130 }}>Status</th>
                    <th className="p-th" style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(p => (
                    <tr key={p.id}>
                      <td className="p-td p-nr">{p.nr}</td>
                      <td className="p-td">
                        <input className="p-input" defaultValue={p.kunde} onBlur={e => handleField(p.id, 'kunde', e.target.value)} />
                      </td>
                      <td className="p-td" style={{ color: '#4a534f', fontSize: 13 }}>
                        <input className="p-input" defaultValue={p.adresse ?? ''} onBlur={e => handleField(p.id, 'adresse', e.target.value)} />
                      </td>
                      <td className="p-td">
                        <select className="p-input" defaultValue={p.ansvarlig ?? ''} onChange={e => handleField(p.id, 'ansvarlig', e.target.value)}>
                          <option value="">Ikke tildelt</option>
                          {PROSJEKT_TEAM.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="p-td">
                        <input
                          className="p-input p-input-num"
                          defaultValue={p.sum != null ? p.sum.toLocaleString('nb-NO') : ''}
                          placeholder="0 kr"
                          onBlur={e => {
                            const n = parseFloat(e.target.value.replace(/[^\d.-]/g, ''))
                            const val = isNaN(n) ? null : n
                            handleField(p.id, 'sum', val)
                            e.target.value = val != null ? val.toLocaleString('nb-NO') : ''
                          }}
                        />
                      </td>
                      <td className="p-td">
                        <input type="date" className="p-input" style={{ minWidth: 130 }} defaultValue={p.start_dato ?? ''} onChange={e => handleField(p.id, 'start_dato', e.target.value || null)} />
                      </td>
                      <td className="p-td">
                        <input type="date" className="p-input" style={{ minWidth: 130 }} defaultValue={p.slutt_dato ?? ''} onChange={e => handleField(p.id, 'slutt_dato', e.target.value || null)} />
                      </td>
                      <td className="p-td">
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          <span className={`st-dot dot-${p.status}`} />
                          <select
                            className={`st-pick st-${p.status}`}
                            value={p.status}
                            onChange={e => handleField(p.id, 'status', e.target.value)}
                          >
                            {PROSJEKT_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-td">
                        <button className="p-del" onClick={() => {
                          if (confirm(`Fjerne prosjekt ${p.nr} – ${p.kunde}?`)) {
                            setRows(prev => prev.filter(r => r.id !== p.id))
                            startTransition(() => deleteProsjekt(p.id))
                          }
                        }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={9} style={{ padding: 12 }}>
                    <button className="p-addrow" onClick={() => {
                      startTransition(async () => {
                        const newRow = await addProsjekt(rows)
                        if (newRow) setRows(prev => [...prev, newRow as Prosjekt])
                      })
                    }}>+ Nytt prosjekt</button>
                  </td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tidslinje placeholder */}
        {view === 'tidslinje' && (
          <div className="p-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#4a534f' }}>
            <p>Tidslinje-visning kommer — fyll inn start- og sluttdato i tabellen</p>
          </div>
        )}

        <p style={{ marginTop: 12, fontSize: 12, color: '#4a534f' }}>
          <strong style={{ color: '#191d1c' }}>Tips:</strong> Klikk rett i cellene for å fylle inn kontraktssum og datoer. Alt lagres automatisk til Supabase.
        </p>
      </div>
    </div>
  )
}
