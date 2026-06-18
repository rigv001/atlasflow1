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

  return {
    user,
    profile: buildProfileFromUser(user),
  }
}

export const loadCurrentUserRole = async (): Promise<User['role'] | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return user.email?.toLowerCase() === 'admin1@atlasflow.edu.au' ? 'admin' : 'client'
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

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: savedProfile.name,
      site: savedProfile.site,
      job_title: savedProfile.title,
      team_name: savedProfile.team,
      focus_area: savedProfile.focusArea,
      timezone: savedProfile.timezone,
      avatar_emoji: savedProfile.avatar,
    },
  })

  return {
    data,
    error,
    profile: savedProfile,
  }
}
