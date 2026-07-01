'use server'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'

const COMPANY_ID = 'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'

export async function updateProject(projectNumber: string, field: string, value: any) {
  const supabase = await createClient()

  const EMP_MAP: Record<string, string> = {
    'Nick': '4419e67c-4299-4291-adbe-19723a2517b7',
    'Roger': '5adb51b3-c670-4357-8c82-1eaa5be617d3',
    'Roar': 'fbfae1d8-ad2e-40dd-8f53-77c74d49279a',
    'Andrii': '006d86f7-669e-4672-869a-765606e35572',
    'Marci': 'f3406bbf-04c7-4743-98c0-3899fc4fe187',
    'Øyvin': 'dcde40db-ab33-44bc-aad1-76682c1461ac'
  }

  if (field === 'assigned') {
    const empId = EMP_MAP[value as string] || null
    await supabase.from('projects').update({ assigned_to: empId }).eq('project_number', projectNumber).eq('company_id', COMPANY_ID)
    return
  }

  if (field === 'notes' || field === 'archived') {
    const { data } = await supabase.from('projects').select('description').eq('project_number', projectNumber).eq('company_id', COMPANY_ID).single()
    let parsed: any = {}
    if (data?.description) {
      try {
        parsed = JSON.parse(data.description)
      } catch {
        parsed = { notes: data.description }
      }
    }
    parsed[field] = value
    await supabase.from('projects').update({ description: JSON.stringify(parsed) }).eq('project_number', projectNumber).eq('company_id', COMPANY_ID)
    return
  }

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
