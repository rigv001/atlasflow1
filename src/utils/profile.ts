import { supabase } from '../supabase/client'
import { ClientProfileRecord, ProfileState, User } from '../types'

export const PROFILE_AVATARS = ['🌿', '🚚', '🏭', '🌏', '⚡', '🛰️']

const DEFAULT_PROFILE: ProfileState = {
  name: 'Customer',
  customerNo: 'Pending',
  site: 'Not specified',
  title: 'Sustainability Lead',
  team: 'Operations',
  focusArea: 'Supplier decarbonisation',
  timezone: 'AEST (UTC+10)',
  avatar: '🌿',
}

const formatFallbackName = (email?: string | null) => {
  const emailPrefix = email?.split('@')[0] || 'Customer'
  return (
    emailPrefix
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Customer'
  )
}

export const buildProfileFromUser = (user: any): ProfileState => ({
  name: user?.user_metadata?.full_name?.trim() || formatFallbackName(user?.email),
  customerNo: user?.id?.slice(0, 8).toUpperCase() || DEFAULT_PROFILE.customerNo,
  site: user?.user_metadata?.site?.trim() || DEFAULT_PROFILE.site,
  title: user?.user_metadata?.job_title?.trim() || DEFAULT_PROFILE.title,
  team: user?.user_metadata?.team_name?.trim() || DEFAULT_PROFILE.team,
  focusArea: user?.user_metadata?.focus_area?.trim() || DEFAULT_PROFILE.focusArea,
  timezone: user?.user_metadata?.timezone?.trim() || DEFAULT_PROFILE.timezone,
  avatar: PROFILE_AVATARS.includes(user?.user_metadata?.avatar_emoji) ? user.user_metadata.avatar_emoji : DEFAULT_PROFILE.avatar,
})

export const mapClientProfileToState = (record: ClientProfileRecord): ProfileState => ({
  name: record.full_name,
  customerNo: record.customer_no,
  site: record.site,
  title: record.job_title,
  team: record.team_name,
  focusArea: record.focus_area,
  timezone: record.timezone,
  avatar: PROFILE_AVATARS.includes(record.avatar_emoji) ? record.avatar_emoji : DEFAULT_PROFILE.avatar,
})

const buildClientProfilePayload = (user: any, profile: ProfileState): ClientProfileRecord => ({
  user_id: user.id,
  email: user.email || null,
  full_name: profile.name,
  customer_no: profile.customerNo,
  site: profile.site,
  job_title: profile.title,
  team_name: profile.team,
  focus_area: profile.focusArea,
  timezone: profile.timezone,
  avatar_emoji: profile.avatar,
  role: user.email?.toLowerCase() === 'admin1@atlasflow.edu.au' ? 'admin' : 'client',
})

export const sanitizeProfileDraft = (profileDraft: ProfileState): ProfileState => ({
  ...profileDraft,
  name: profileDraft.name.trim() || DEFAULT_PROFILE.name,
  site: profileDraft.site.trim() || DEFAULT_PROFILE.site,
  title: profileDraft.title.trim() || DEFAULT_PROFILE.title,
  team: profileDraft.team.trim() || DEFAULT_PROFILE.team,
  focusArea: profileDraft.focusArea.trim() || DEFAULT_PROFILE.focusArea,
  timezone: profileDraft.timezone.trim() || DEFAULT_PROFILE.timezone,
  avatar: PROFILE_AVATARS.includes(profileDraft.avatar) ? profileDraft.avatar : DEFAULT_PROFILE.avatar,
})

export const loadCurrentUserProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user,
      profile: DEFAULT_PROFILE,
    }
  }

  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<ClientProfileRecord>()

  if (error) {
    console.warn('Unable to load client profile record, falling back to auth metadata', error)
  }

  return {
    user,
    profile: data ? mapClientProfileToState(data) : buildProfileFromUser(user),
  }
}

export const loadCurrentUserRole = async (): Promise<User['role'] | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('client_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle<Pick<ClientProfileRecord, 'role'>>()

  if (error) {
    console.warn('Unable to load client role, falling back to email-based admin detection', error)
  }

  return data?.role || (user.email?.toLowerCase() === 'admin1@atlasflow.edu.au' ? 'admin' : 'client')
}

export const saveCurrentUserProfile = async (profileDraft: ProfileState) => {
  const trimmedProfile = sanitizeProfileDraft(profileDraft)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: new Error('Unable to save profile without an active session.'),
      profile: trimmedProfile,
    }
  }

  const savedProfile = {
    ...trimmedProfile,
    customerNo: user.id?.slice(0, 8).toUpperCase() || trimmedProfile.customerNo,
  }

  const payload = buildClientProfilePayload(user, savedProfile)
  const profileWrite = await supabase.from('client_profiles').upsert(payload)

  if (profileWrite.error) {
    return {
      data: null,
      error: profileWrite.error,
      profile: savedProfile,
    }
  }

  const { data: profileRecord, error: profileReadError } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<ClientProfileRecord>()

  const canonicalProfile = profileRecord ? mapClientProfileToState(profileRecord) : savedProfile

  if (profileReadError) {
    console.warn('Profile saved but could not be reloaded from client_profiles', profileReadError)
  }

  const { data, error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: canonicalProfile.name,
      site: canonicalProfile.site,
      job_title: canonicalProfile.title,
      team_name: canonicalProfile.team,
      focus_area: canonicalProfile.focusArea,
      timezone: canonicalProfile.timezone,
      avatar_emoji: canonicalProfile.avatar,
    },
  })

  if (authError) {
    console.warn('Profile saved to client_profiles but auth metadata sync failed', authError)
  }

  return {
    data,
    error: null,
    profile: canonicalProfile,
    warning: authError,
  }
}
