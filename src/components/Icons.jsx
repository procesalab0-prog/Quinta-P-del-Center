// Íconos SVG tomados del diseño (stroke 1.8, linecap/linejoin round)
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IconHome = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9.5h12V10" /><path d="M10 19.5v-6h4v6" /></svg>
)
export const IconCard = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="2.5" y="6" width="19" height="13" rx="2.5" /><path d="M2.5 10.5h19" /><path d="M6 14.5h4" /></svg>
)
export const IconCalendar = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /><path d="M7.5 13.5h2.5M11 13.5h2.5M14.5 13.5h2.5M7.5 16.8h2.5M11 16.8h2.5" /></svg>
)
export const IconTrophy = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M7 4h10v4.2c0 3-2.2 5.4-5 5.4s-5-2.4-5-5.4V4z" /><path d="M7 5.5H4.2C4 8 5.4 10 7.4 10.4M17 5.5h2.8c.2 2.5-1.2 4.5-3.2 4.9" /><path d="M12 13.6v3.4M9 20.5h6M9.5 20.5c0-1.6.7-2.7 2.5-3 1.8.3 2.5 1.4 2.5 3" /></svg>
)
export const IconUser = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6" /></svg>
)
export const IconScan = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ flexShrink: 0 }}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><rect x="8.5" y="9" width="7" height="6" rx="1.2" /></svg>
)
export const IconCalendarSm = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ flexShrink: 0 }}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /><path d="M7.5 13.5h2.5M11 13.5h2.5M14.5 13.5h2.5" /></svg>
)
export const IconUsers = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ flexShrink: 0 }}><circle cx="9" cy="8" r="3" /><path d="M2.8 19c0-3 2.7-5 6.2-5s6.2 2 6.2 5" /><path d="M15.5 6.2c1.4.3 2.4 1.4 2.4 2.8s-1 2.5-2.4 2.8" /><path d="M17 14.3c2 .5 3.2 1.9 3.2 3.9" /></svg>
)
export const IconChart = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ flexShrink: 0 }}><path d="M4 20V10M11 20V4M18 20v-7" /></svg>
)
export const IconGear = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
)
