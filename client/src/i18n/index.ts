import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

const messages = {
  zh,
  en
}

const savedLocale = localStorage.getItem('app-locale') || 'zh'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh',
  messages,
  globalInjection: true
})

export default i18n

export function setLocale(locale: string) {
  i18n.global.locale.value = locale as any
  localStorage.setItem('app-locale', locale)
}

export function getCurrentLocale() {
  return i18n.global.locale.value
}