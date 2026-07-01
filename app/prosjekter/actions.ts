'use server'
import { createClient } from '@/lib/supabase-server'
import type { Prosjekt } from '@/lib/types'

export async function updateProsjekt(id: string, field: keyof Prosjekt, value: string | number | null) {
  const supabase = await createClient()
  await supabase.from('prosjekter').update({ [field]: value }).eq('id', id)
}

export async function deleteProsjekt(id: string) {
  const supabase = await createClient()
  await supabase.from('prosjekter').delete().eq('id', id)
}

export async function addProsjekt(existing: Prosjekt[]): Promise<Prosjekt | null> {
  const supabase = await createClient()
  const maxNr = existing.reduce((m, p) => Math.max(m, parseInt(p.nr) || 0), 0)
  const { data, error } = await supabase
    .from('prosjekter')
    .insert({ nr: String(maxNr + 1), kunde: '', adresse: '', ansvarlig: '', status: 'Planlagt' })
    .select()
    .single()
  if (error) return null
  return data as Prosjekt
}
