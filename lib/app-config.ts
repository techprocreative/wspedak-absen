const getEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export const APP_NAME = getEnvVar(process.env.NEXT_PUBLIC_APP_NAME, 'Sistem Absensi')
export const COMPANY_NAME = getEnvVar(process.env.NEXT_PUBLIC_COMPANY_NAME, 'PT. Teknologi Maju')
export const APP_DESCRIPTION = getEnvVar(
  process.env.NEXT_PUBLIC_APP_DESCRIPTION,
  'Sistem absensi karyawan dengan teknologi pengenalan wajah'
)

const officeTimezone = getEnvVar(process.env.NEXT_PUBLIC_OFFICE_TIMEZONE, 'Asia/Jakarta')

export const OFFICE_INFO = {
  name: getEnvVar(process.env.NEXT_PUBLIC_OFFICE_NAME, 'Jakarta Pusat'),
  timezone: officeTimezone,
  timezoneLabel: officeTimezone === 'Asia/Jakarta' ? 'WIB (Waktu Indonesia Barat)' : officeTimezone,
  workStart: getEnvVar(process.env.NEXT_PUBLIC_OFFICE_WORK_START, '08:00'),
  workEnd: getEnvVar(process.env.NEXT_PUBLIC_OFFICE_WORK_END, '17:00'),
  breakStart: getEnvVar(process.env.NEXT_PUBLIC_OFFICE_BREAK_START, '12:00'),
  breakEnd: getEnvVar(process.env.NEXT_PUBLIC_OFFICE_BREAK_END, '13:00'),
}

export const SITE_METADATA = {
  title: `${APP_NAME} - ${COMPANY_NAME}`,
  description: APP_DESCRIPTION,
}
