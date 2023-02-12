import { getCurrentInstance } from 'vue'
export const useCookies = (): any =>
  getCurrentInstance()?.proxy.$ssrContext.cookies
