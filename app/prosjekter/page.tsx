import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Prosjekt } from '@/lib/types'
import ProsjekterView from './ProsjekterView'

export const dynamic = 'force-dynamic'

export default async function ProsjekterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('prosjekter')
    .select('*')
    .order('nr', { ascending: true })

  return <ProsjekterView prosjekter={(data ?? []) as Prosjekt[]} userEmail={user.email ?? ''} />
}
