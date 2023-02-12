import { defineStore } from 'pinia'
import axios from 'axios'

export const user = defineStore('user', {
  state: () => ({
    allUsers: null as any[] | null,
    username: null as string | null,
    userPhotographerPoints: null as number | null,
  }),

  actions: {
    async fetchAllUsers() {
      if (!this.allUsers) {
        this.allUsers = (await axios.get(`/api/ducksmanager/users`)).data.users
      }
    },

    async fetchUserPoints() {
      const userIdData = (await axios.get(`/user-id`)).data
      const userData = (
        await axios.get(`/api/global-stats/user/${userIdData.id}`)
      ).data
      this.userPhotographerPoints = (
        userData.points as { contribution: string; points_total: number }[]
      ).find(({ contribution }) => contribution === 'Photographe')!.points_total
    },
  },
})
