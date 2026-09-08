/** Temporary settings feature gates — set to `true` to re-enable a section. */
export const SETTINGS_FEATURES = {
  /** Push notifications, sound alerts, and quiet hours. */
  notifications: false,
  /** Push alert keyword/zone management ("Push management"). */
  pushManagement: false,
} as const;
