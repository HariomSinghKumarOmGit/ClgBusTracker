// client/src/utils/deviceProfile.ts
// Handles persistent unique device identity, code generation, and profile management

import { UserProfile } from '../types';

export const AVATAR_EMOJIS = [
  '😎', '🤠', '🦊', '🚀', '⚡', '🦁', '🐼', '🐯', 
  '🌟', '🎧', '🎒', '🧢', '🦄', '🐶', '🐱', '🤖'
];

/**
 * Generate a unique 4-character alphanumeric device code (e.g., DEV-7K9B)
 */
export function generateDeviceCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DEV-${code}`;
}

/**
 * Generate a random avatar emoji
 */
export function getRandomAvatarEmoji(): string {
  const idx = Math.floor(Math.random() * AVATAR_EMOJIS.length);
  return AVATAR_EMOJIS[idx];
}

/**
 * Generate a fresh new user profile with a unique device code
 */
export function createNewDeviceProfile(overrideCode?: string): UserProfile {
  const deviceCode = overrideCode || generateDeviceCode();
  const rawCode = deviceCode.replace('DEV-', '');
  const emoji = getRandomAvatarEmoji();

  const profile: UserProfile = {
    id: `usr_${rawCode.toLowerCase()}`,
    device_code: deviceCode,
    name: `Rider #${rawCode}`,
    phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
    avatar_emoji: emoji,
    role: 'commuter',
    is_logged_in: true,
    preferred_stop_id: 'STOP-01',
    preferred_stop_name: 'Saket',
    home_stop: 'Saket Metro',
    work_campus_stop: 'Delhi Technical Campus',
    saved_routes: ['01'],
    notifications_enabled: true,
    chime_alerts: true,
    vibration_alerts: true
  };

  saveDeviceProfile(profile);
  return profile;
}

/**
 * Retrieve existing profile from localStorage or create a new unique one for this device
 */
export function getOrCreateDeviceProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return createNewDeviceProfile('DEV-DEFAULT');
  }

  try {
    const saved = localStorage.getItem('bustracker_user_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure the profile has a valid device_code
      if (!parsed.device_code) {
        const existingDeviceId = localStorage.getItem('clg_bus_device_id');
        parsed.device_code = existingDeviceId || generateDeviceCode();
        saveDeviceProfile(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading device profile from localStorage', e);
  }

  return createNewDeviceProfile();
}

/**
 * Persist device profile and sync deviceId + emoji
 */
export function saveDeviceProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('bustracker_user_profile', JSON.stringify(profile));
    localStorage.setItem('clg_bus_device_id', profile.device_code);
    localStorage.setItem('clg_bus_user_emoji', profile.avatar_emoji);
  } catch (e) {
    console.error('Failed to save device profile', e);
  }
}
