/** A student's profile, stored in Firestore at users/{uid}. */
export interface UserProfile {
  /** The astronaut nickname shown around the app. Not a real name. */
  displayName: string;
  /** When the profile was first created. */
  createdAt: Date | null;
}
