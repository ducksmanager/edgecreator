import { defineStore } from 'pinia'
import axios from 'axios'

import { GET__global_stats__user__$userIds } from 'ducksmanager/types/routes'

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
        await GET__global_stats__user__$userIds(axios, {
          urlParams: { userIds: userIdData },
        })
      ).data
      this.userPhotographerPoints = Object.values(userData.points).find(
        ({ contribution }) => contribution === 'Photographe'
      )!.points_total
    },
  },
})
