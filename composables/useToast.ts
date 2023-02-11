import { getCurrentInstance } from 'vue'
export const useToast = (): any => getCurrentInstance()?.proxy.$root.$bvToast
