import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import ProsjekterView from './ProsjekterView'

export const dynamic = 'force-dynamic'

const COMPANY_ID = 'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'

export default async function ProsjekterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .order('project_number', { ascending: true })

  return <ProsjekterView projects={(data ?? []) as Project[]} userEmail={user.email ?? ''} />
}
