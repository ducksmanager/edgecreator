import { defineStore } from 'pinia'

export const globalEvent = defineStore('globalEvent', {
  state: () => ({
    options: {} as { [key: string]: any },
  }),
})
