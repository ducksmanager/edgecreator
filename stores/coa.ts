import axios from 'axios'
import { defineStore } from 'pinia'
import {
  GET_CALL_COA_LIST_ISSUES_BY_PUBLICATION_CODES,
  GET_CALL_COA_LIST_PUBLICATIONS,
  GET__coa__list__countries__$locale,
  GET__coa__list__issues__by_publication_codes,
  GET__coa__list__publications,
} from 'ducksmanager/types/routes'

import { main } from '~/stores/main'

const coaApi = axios.create({})

const URL_PREFIX_PUBLICATIONS = '/api/coa/list/publications/'

export const coa = defineStore('coa', {
  state: () => ({
    countryNames: null as { [countrycode: string]: string } | null,
    publicationNames: {} as { [publicationcode: string]: string | null },
    publicationNamesFullCountries: [] as string[],
    personNames: null as { [personcode: string]: string } | null,
    issueNumbers: {} as { [publicationcode: string]: string[] },
    issueDetails: {} as { [issuecode: string]: any },
    isLoadingCountryNames: false as boolean,
    issueCounts: null,
  }),

  actions: {
    addPublicationNames(publicationNames: {
      [publicationcode: string]: string | null
    }) {
      this.publicationNames = {
        ...this.publicationNames,
        ...publicationNames,
      }
    },
    addIssueNumbers(issueNumbers: { [publicationcode: string]: string[] }) {
      this.issueNumbers = { ...this.issueNumbers, ...issueNumbers }
    },

    async fetchCountryNames(locale: string) {
      if (!this.isLoadingCountryNames && !this.countryNames) {
        this.isLoadingCountryNames = true
        this.countryNames = (
          await GET__coa__list__countries__$locale(axios, {
            urlParams: { locale: locale || localStorage.getItem('locale')! },
            params: { countryCodes: '' },
          })
        ).data
        this.isLoadingCountryNames = false
      }
    },
    async fetchPublicationNames(publicationCodes: string[]) {
      const newPublicationCodes = [
        ...new Set(
          publicationCodes.filter(
            (publicationcode) =>
              !Object.keys(this.publicationNames).includes(publicationcode)
          )
        ),
      ]
      return (
        newPublicationCodes.length &&
        this.addPublicationNames(
          await main().getChunkedRequestsTyped<GET_CALL_COA_LIST_PUBLICATIONS>({
            callFn: (chunk) =>
              GET__coa__list__publications(coaApi, {
                params: { publicationCodes: chunk },
              }),
            valuesToChunk: newPublicationCodes,
            chunkSize: 20,
          })
        )
      )
    },
    async fetchPublicationNamesFromCountry(countryCode: string) {
      if (this.publicationNamesFullCountries.includes(countryCode)) {
        return
      }
      return coaApi
        .get(URL_PREFIX_PUBLICATIONS + countryCode)
        .then(({ data }) => {
          this.addPublicationNames({
            ...(this.publicationNames || {}),
            ...data,
          })
          this.publicationNamesFullCountries = [
            ...this.publicationNamesFullCountries,
            countryCode,
          ]
        })
    },

    fetchIssueNumbers: async function (publicationCodes: string[]) {
      const newPublicationCodes = [
        ...new Set(
          publicationCodes.filter(
            (publicationcode) =>
              !Object.keys(this.issueNumbers || {}).includes(publicationcode)
          )
        ),
      ]
      if (newPublicationCodes.length) {
        const data =
          await main().getChunkedRequestsTyped<GET_CALL_COA_LIST_ISSUES_BY_PUBLICATION_CODES>(
            {
              callFn: async (chunk) =>
                GET__coa__list__issues__by_publication_codes(coaApi, {
                  params: { publicationCodes: chunk },
                }),
              valuesToChunk: newPublicationCodes,
              chunkSize: 50,
            }
          )

        this.addIssueNumbers(
          data.reduce(
            (acc, issue) => ({
              ...acc,
              [issue.publicationcode]: [
                ...(acc[issue.publicationcode] || []),
                issue.issuenumber,
              ],
            }),
            {} as typeof this.issueNumbers
          )
        )
      }
    },
  },
})
