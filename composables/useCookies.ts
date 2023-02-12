import { getCurrentInstance } from 'vue'
export const useGates = (): any =>
  getCurrentInstance()?.proxy.$ssrContext.cookies
