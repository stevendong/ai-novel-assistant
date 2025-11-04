import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

const messages = {
  zh,
  en
}

type SupportedLocale = keyof typeof messages
const FALLBACK_LOCALE: SupportedLocale = 'zh'
const SUPPORTED_LOCALES = Object.keys(messages)

const normalizeLocale = (locale: string | null | undefined): SupportedLocale => {
  if (!locale) {
    return FALLBACK_LOCALE
  }
  const lowered = locale.toLowerCase()

  const exactMatch = SUPPORTED_LOCALES.find(item => item.toLowerCase() === lowered)
  if (exactMatch) {
    return exactMatch as SupportedLocale
  }

  if (lowered.startsWith('zh')) {
    return 'zh'
  }

  if (lowered.startsWith('en')) {
    return 'en'
  }

  return FALLBACK_LOCALE
}

const detectSystemLocale = (): SupportedLocale => {
  if (typeof navigator !== 'undefined') {
    return normalizeLocale(navigator.language)
  }
  return FALLBACK_LOCALE
}

const savedLocale = typeof window !== 'undefined' ? localStorage.getItem('app-locale') : null
let followSystemLanguage = !savedLocale

const initialLocale = normalizeLocale(savedLocale || detectSystemLocale())

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages,
  globalInjection: true
})

const applyLocale = (locale: string, options?: { persist?: boolean }) => {
  const normalized = normalizeLocale(locale)
  i18n.global.locale.value = normalized as any
  if (options?.persist === false) {
    return
  }
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem('app-locale', normalized)
    followSystemLanguage = false
  } catch {
    // ignore storage errors
  }
}

export default i18n

export function setLocale(locale: string) {
  applyLocale(locale, { persist: true })
}

export function getCurrentLocale() {
  return i18n.global.locale.value as SupportedLocale
}

export function resetLocaleToSystem() {
  followSystemLanguage = true
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('app-locale')
    } catch {
      // ignore storage errors
    }
  }
  applyLocale(detectSystemLocale(), { persist: false })
}

if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (!followSystemLanguage) {
      return
    }
    const systemLocale = detectSystemLocale()
    applyLocale(systemLocale, { persist: false })
  })
}
