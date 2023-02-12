import { set } from 'vue'
import axios from 'axios'
import { defineStore } from 'pinia'
import { main } from '~/stores/main'

const coaApi = axios.create({})

const URL_PREFIX_COUNTRIES = `/api/coa/list/countries/LOCALE`
const URL_PREFIX_PUBLICATIONS = '/api/coa/list/publications/'
const URL_PREFIX_ISSUES = '/api/coa/list/issues/'
const URL_PREFIX_AUTHORS = '/api/coa/authorsfullnames/'
const URL_PREFIX_URLS = '/api/coa/list/details/'
const URL_ISSUE_COUNTS = '/api/coa/list/issues/count'

export const coa = defineStore('coa', {
  state: () => ({
    countryNames: null as { [countrycode: string]: string } | null,
    publicationNames: {} as { [publicationcode: string]: string },
    publicationNamesFullCountries: [] as string[],
    personNames: null as { [personcode: string]: string } | null,
    issueNumbers: {} as { [publicationcode: string]: string[] },
    issueDetails: {} as { [issuecode: string]: any },
    isLoadingCountryNames: false as boolean,
    issueCounts: null,
  }),

  actions: {
    addPublicationNames(publicationNames: {
      [publicationcode: string]: string
    }) {
      this.publicationNames = {
        ...this.publicationNames,
        ...publicationNames,
      }
    },
    setPersonNames(personNames: { [personcode: string]: string }) {
      this.personNames = Object.keys(personNames).reduce(
        (acc, personCode) => ({
          ...acc,
          [personCode]: personNames[personCode],
        }),
        {}
      )
    },
    addIssueNumbers(issueNumbers: { [publicationcode: string]: string[] }) {
      this.issueNumbers = { ...this.issueNumbers, ...issueNumbers }
    },

    async fetchCountryNames(locale: string) {
      if (!this.isLoadingCountryNames && !this.countryNames) {
        this.isLoadingCountryNames = true
        this.countryNames = (
          await coaApi.get(
            URL_PREFIX_COUNTRIES.replace(
              'LOCALE',
              locale || localStorage.getItem('locale')!
            )
          )
        ).data
        this.isLoadingCountryNames = false
      }
    },
    async fetchPublicationNames(publicationCodes: string[]) {
      const newPublicationCodes = [
        ...new Set(
          publicationCodes.filter(
            (publicationCode) =>
              !Object.keys(this.publicationNames).includes(publicationCode)
          )
        ),
      ]
      return (
        newPublicationCodes.length &&
        this.addPublicationNames(
          await main()
            .getChunkedRequests({
              api: coaApi,
              url: URL_PREFIX_PUBLICATIONS,
              parametersToChunk: newPublicationCodes,
              chunkSize: 10,
            })
            .then((data) =>
              data.reduce((acc, result) => ({ ...acc, ...result.data }), {})
            )
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
    async fetchPersonNames(personCodes: string[]) {
      const newPersonNames = [
        ...new Set(
          personCodes.filter(
            (personCode) =>
              !Object.keys(this.personNames || {}).includes(personCode)
          )
        ),
      ]
      const data = (
        await main().getChunkedRequests({
          api: coaApi,
          url: URL_PREFIX_AUTHORS,
          parametersToChunk: newPersonNames,
          chunkSize: 10,
        })
      ).reduce((acc, result) => ({ ...acc, ...result.data }), {})
      return (
        newPersonNames.length &&
        this.setPersonNames({
          ...(this.personNames || {}),
          ...data,
        })
      )
    },

    async fetchIssueNumbers(publicationCodes: string[]) {
      const newPublicationCodes = [
        ...new Set(
          publicationCodes.filter(
            (publicationCode) =>
              !Object.keys(this.issueNumbers || {}).includes(publicationCode)
          )
        ),
      ]
      const data = (
        await main().getChunkedRequests({
          api: coaApi,
          url: URL_PREFIX_ISSUES,
          parametersToChunk: newPublicationCodes,
          chunkSize: 1,
        })
      ).reduce(
        (acc, result) => ({
          ...acc,
          [result.config.url.replace(URL_PREFIX_ISSUES, '')]: result.data.map(
            (issueNumber: string) => issueNumber.replace(/ /g, '')
          ),
        }),
        {}
      )

      return newPublicationCodes.length && this.addIssueNumbers(data)
    },

    async fetchIssueCounts() {
      if (!this.issueCounts) {
        this.issueCounts = (await coaApi.get(URL_ISSUE_COUNTS)).data
      }
    },

    async fetchIssueUrls({
      publicationCode,
      issueNumber,
    }: {
      publicationCode: string
      issueNumber: string
    }) {
      const issueCode = `${publicationCode} ${issueNumber}`
      if (!this.issueDetails[issueCode]) {
        set(this.issueDetails, issueCode, {
          issueCode,
          issueDetails: (
            await coaApi.get(
              `${URL_PREFIX_URLS + publicationCode}/${issueNumber}`
            )
          ).data,
        })
      }
    },
  },
})
