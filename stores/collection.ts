import { defineStore } from 'pinia'
import axios from 'axios'
import { BookcaseEdge } from 'ducksmanager/types/BookcaseEdge'
import { user } from './user'

export interface BookcaseEdgeWithPopularity extends BookcaseEdge {
  publicationcode: string
  issueCode: string
  popularity: number | null
}
export const collection = defineStore('collectionEC', {
  state: () => ({
    bookcase: null as BookcaseEdge[] | null,
    popularIssuesInCollection: null,
  }),

  getters: {
    isSharedBookcase: () => false,

    bookcaseWithPopularities(): BookcaseEdgeWithPopularity[] | null {
      const isSharedBookcase = this.isSharedBookcase
      const popularIssuesInCollection = this.popularIssuesInCollection
      return (
        ((isSharedBookcase ? true : popularIssuesInCollection) &&
          this.bookcase?.map((issue) => {
            const publicationcode = `${issue.countryCode}/${issue.magazineCode}`
            const issueCode = `${publicationcode} ${issue.issuenumber}`
            return {
              ...issue,
              publicationcode,
              issueCode,
              popularity: isSharedBookcase
                ? null
                : popularIssuesInCollection?.[issueCode] || 0,
            }
          })) ||
        null
      )
    },

    popularIssuesInCollectionWithoutEdge() {
      return this.bookcaseWithPopularities
        ?.filter(({ edgeId, popularity }) => !edgeId && popularity > 0)
        .sort(
          ({ popularity: popularity1 }, { popularity: popularity2 }) =>
            popularity2 - popularity1
        )
    },
  },

  actions: {
    async loadBookcase() {
      this.bookcase = (await axios.get(`/api/bookcase/${user().username}`)).data
    },
    async loadPopularIssuesInCollection() {
      if (!this.popularIssuesInCollection) {
        this.popularIssuesInCollection = (
          await axios.get('/api/collection/popular')
        ).data.reduce(
          (
            acc: { [issuecode: string]: number },
            issue: {
              country: string
              magazine: string
              issueNumber: string
              popularity: number
            }
          ) => ({
            ...acc,
            [`${issue.country}/${issue.magazine} ${issue.issueNumber}`]:
              issue.popularity,
          }),
          {}
        )
      }
    },
  },
})
