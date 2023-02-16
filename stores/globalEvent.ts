import { defineStore } from 'pinia'

export const globalEvent = defineStore('globalEvent', {
  state: () => ({
    options: {} as {
      issuenumbers?: string[]
      stepNumber?: number
      [key: string]: any
    },
  }),
})
