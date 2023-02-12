import { defineStore } from 'pinia'
import axios from 'axios'
import { user } from './user'

type SimpleIssue = {
  countryCode: string
  magazineCode: string
  issueNumber: string
}

type SimpleIssueWithPopularity = SimpleIssue & { popularity: number | null }

export const collection = defineStore('collectionEC', {
  state: () => ({
    bookcase: null as SimpleIssue[] | null,
    popularIssuesInCollection: null,
  }),

  getters: {
    isSharedBookcase: () => false,

    bookcaseWithPopularities: ({
      bookcase,
      isSharedBookcase,
      popularIssuesInCollection,
    }): SimpleIssueWithPopularity[] | undefined | null =>
      (isSharedBookcase ? true : popularIssuesInCollection) &&
      bookcase?.map((issue) => {
        const publicationCode = `${issue.countryCode}/${issue.magazineCode}`
        const issueCode = `${publicationCode} ${issue.issueNumber}`
        return {
          ...issue,
          publicationCode,
          issueCode,
          popularity: isSharedBookcase
            ? null
            : popularIssuesInCollection![issueCode] || 0,
        }
      }),

    popularIssuesInCollectionWithoutEdge: ({ bookcaseWithPopularities }) =>
      bookcaseWithPopularities &&
      bookcaseWithPopularities
        .filter(({ edgeId, popularity }) => !edgeId && popularity > 0)
        .sort(
          ({ popularity: popularity1 }, { popularity: popularity2 }) =>
            popularity2 - popularity1
        ),
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
