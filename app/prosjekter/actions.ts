'use server'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'

const COMPANY_ID = 'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'

export async function updateProject(projectNumber: string, field: string, value: string | number | null) {
  const supabase = await createClient()
  await supabase
    .from('projects')
    .update({ [field]: value })
    .eq('project_number', projectNumber)
    .eq('company_id', COMPANY_ID)
}

export async function deleteProject(projectNumber: string) {
  const supabase = await createClient()
  await supabase
    .from('projects')
    .delete()
    .eq('project_number', projectNumber)
    .eq('company_id', COMPANY_ID)
}

export async function addProject(existing: Project[]): Promise<Project | null> {
  const supabase = await createClient()
  const maxNr = existing.reduce((m, p) => Math.max(m, parseInt(p.project_number) || 0), 0)
  const nextNr = String(maxNr + 1)
  const { data, error } = await supabase
    .from('projects')
    .insert({
      project_number: nextNr,
      name: '',
      customer_name: '',
      address: '',
      status: 'innkommende',
      company_id: COMPANY_ID,
    })
    .select()
    .single()
  if (error) return null
  return data as Project
}
