import type { AccessibilitySettings } from '../features/accessibility/settings';
import type { AvatarConfig } from '../features/profile/avatarOptions';

/**
 * A student's profile, stored in Firestore at users/{uid}.
 *
 * Planned layout of each student's private data (see README):
 *   users/{uid}                    profile, avatar, accessibility settings
 *   users/{uid}/academy/{moduleId} lesson progress and quiz results
 *   users/{uid}/achievements/{id}  earned badges
 *   users/{uid}/simulation/{slot}  saved game state
 */
export interface UserProfile {
  /** The astronaut nickname shown around the app. Not a real name. */
  displayName: string;
  /** When the profile was first created. */
  createdAt: Date | null;
  avatar: AvatarConfig;
  /** Null until the student first changes a setting while signed in. */
  settings: AccessibilitySettings | null;
}
