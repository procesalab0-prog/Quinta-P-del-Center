import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DAY_SHORT, ymd, dayRangeISO, buildSlots, slotConfig } from '../lib/util'
import { useAuth } from '../lib/auth.jsx'

export default function Dashboard() {
  const { settings } = useAuth()
  const [kpis, setKpis] = useState(null)
  const [weekBars, setWeekBars] = useState([])
  const [heatmap, setHeatmap] = useState([])

  useEffect(() => {
    const { openHour, closeHour, slotMinutes } = slotConfig(settings)
    const slotsPerCourt = buildSlots(openHour, closeHour, slotMinutes).length || 1
    async function load() {
      const [hoyDesde, hoyHasta] = dayRangeISO(ymd(new Date()))
      const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6); hace7.setHours(0, 0, 0, 0)
      const hace28 = new Date(); hace28.setDate(hace28.getDate() - 28)
      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)

      const [visHoy, socios, courts, resHoy, canjes, visSemana, res28] = await Promise.all([
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', hoyDesde).lt('created_at', hoyHasta),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('courts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('reservations').select('id', { count: 'exact', head: true })
          .gte('starts_at', hoyDesde).lt('starts_at', hoyHasta).in('status', ['confirmed', 'pending']),
        supabase.from('redemptions').select('id', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()),
        supabase.from('visits').select('created_at').gte('created_at', hace7.toISOString()),
        supabase.from('reservations').select('starts_at').gte('starts_at', hace28.toISOString()).neq('status', 'cancelled'),
      ])

      const totalSlots = (courts.count || 1) * slotsPerCourt
      setKpis([
        { label: 'Visitas hoy', value: visHoy.count ?? 0 },
        { label: 'Socios activos', value: socios.count ?? 0 },
        { label: 'Ocupación hoy', value: `${Math.round(((resHoy.count ?? 0) / totalSlots) * 100)}%` },
        { label: 'Premios este mes', value: canjes.count ?? 0 },
      ])

      // Barras: visitas por día, últimos 7 días
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hace7); d.setDate(d.getDate() + i); return d
      })
      const counts = days.map(d => (visSemana.data ?? []).filter(v => ymd(v.created_at) === ymd(d)).length)
      const max = Math.max(1, ...counts)
      setWeekBars(days.map((d, i) => ({ day: DAY_SHORT[d.getDay()], count: counts[i], pct: Math.round((counts[i] / max) * 100) })))

      // Mapa de calor: reservas por día de semana × bloque de 2h (últimos 28 días)
      const buckets = [8, 10, 12, 16, 18, 20]
      const grid = Array.from({ length: 7 }, () => Array(buckets.length).fill(0))
      for (const r of res28.data ?? []) {
        const d = new Date(r.starts_at)
        const dow = (d.getDay() + 6) % 7 // lunes = 0
        const h = d.getHours()
        let bi = buckets.findIndex((b, i) => h >= b && h < (buckets[i + 1] ?? 23))
        if (bi >= 0) grid[dow][bi]++
      }
      const maxCell = Math.max(1, ...grid.flat())
      setHeatmap({ grid, maxCell, labels: buckets.map(b => `${b}h`) })
    }
    load()
  }, [settings])

  return (
    <div>
      <div className="h-page" style={{ fontSize: 22, marginBottom: 18 }}>Dashboard</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {(kpis ?? Array(4).fill({ label: '…', value: '—' })).map((k, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Visitas · últimos 7 días</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
            {weekBars.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div title={`${w.count} visitas`} style={{ width: '100%', maxWidth: 22, height: `${Math.max(3, w.pct)}%`, background: 'var(--lime)', borderRadius: '6px 6px 0 0' }} />
                <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 6 }}>{w.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ocupación por horario</div>
          <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 12 }}>Reservas de los últimos 28 días (Lun → Dom)</div>
          {heatmap.grid && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${heatmap.labels.length}, 1fr)`, gap: 5 }}>
                {heatmap.grid.flatMap((row, ri) => row.map((v, ci) => (
                  <div key={`${ri}-${ci}`} title={`${v} reservas`} style={{
                    aspectRatio: '1/1', borderRadius: 4,
                    background: `rgba(215,242,60,${(0.1 + (v / heatmap.maxCell) * 0.8).toFixed(2)})`,
                  }} />
                )))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${heatmap.labels.length}, 1fr)`, gap: 5, marginTop: 6 }}>
                {heatmap.labels.map(l => <div key={l} style={{ fontSize: 9, color: 'var(--faint)', textAlign: 'center' }}>{l}</div>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
