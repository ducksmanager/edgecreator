import { set } from 'vue'
import { defineStore } from 'pinia'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Call } from 'ducksmanager-api/types/Call'
import { coa } from './coa'

const numericSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})
export const main = defineStore('main', {
  state: () => ({
    country: null as string | null,
    magazine: null as string | null,
    issuenumbers: [] as string[],
    isRange: false as boolean,
    photoUrls: {} as { [issuenumber: string]: string[] },
    contributors: {} as {
      [issuenumber: string]: { [contributionType: string]: [] }
    },

    edgesBefore: [],
    edgesAfter: [],

    publicationElements: [],
    publicationPhotos: [],

    warnings: [] as string[],
  }),

  getters: {
    publicationcode(): string {
      return `${this.country}/${this.magazine}`
    },

    publicationIssues(): string[] {
      return coa().issueNumbers[this.publicationcode] || []
    },

    publicationElementsForGallery: ({ country, publicationElements }) =>
      publicationElements &&
      publicationElements.map((elementFileName) => ({
        name: elementFileName,
        url: `/edges/${country}/elements/${elementFileName}`,
      })),

    publicationPhotosForGallery: ({ country, publicationPhotos }) =>
      publicationPhotos &&
      publicationPhotos.map((elementFileName) => ({
        name: elementFileName,
        url: `/edges/${country}/photos/${elementFileName}`,
      })),
  },

  actions: {
    setPhotoUrl({
      issuenumber,
      filename,
    }: {
      issuenumber: string
      filename: string
    }) {
      set(this.photoUrls, issuenumber, filename)
    },
    addContributor({
      issuenumber,
      contributionType,
      user,
    }: {
      issuenumber: string
      contributionType: string
      user: string
    }) {
      const contributors = this.contributors[issuenumber] || {
        designers: [],
        photographers: [],
      }
      set(this.contributors, issuenumber, {
        ...contributors,
        [contributionType]: [
          ...new Set([...contributors[contributionType], user]),
        ],
      })
    },
    removeContributor({
      contributionType,
      userToRemove,
    }: {
      contributionType: string
      userToRemove: string
    }) {
      Object.keys(this.contributors).forEach((issuenumber) => {
        const issueContributors = this.contributors[issuenumber]
        const index = issueContributors[contributionType].findIndex((user) => {
          return user === userToRemove
        })
        issueContributors[contributionType].splice(index, 1)
        set(this.contributors, issuenumber, issueContributors)
      })
    },
    addWarning(warning: string) {
      this.warnings = [...this.warnings, warning]
    },
    removeWarning(idx: number) {
      this.warnings.splice(idx, 1)
    },

    setIssuenumbers({
      min,
      max,
      others,
    }: {
      min: string
      max: string
      others: string | null
    }) {
      const firstIssueIndex = this.publicationIssues.findIndex(
        (issue) => issue === min
      )
      if (firstIssueIndex === -1) {
        throw new Error(`Issue ${min} doesn't exist`)
      }
      if (max === undefined) {
        this.issuenumbers = [min, ...(others ? others.split(',') : [])]
      } else {
        this.isRange = true
        let lastIssueIndex = this.publicationIssues.findIndex(
          (issue) => issue === max
        )
        if (lastIssueIndex === -1) {
          lastIssueIndex = this.publicationIssues.length - 1
          console.warn(
            `Issue ${max} doesn't exist, falling back to ${this.publicationIssues[lastIssueIndex]}`
          )
        }

        this.issuenumbers = this.publicationIssues.filter(
          (_, index) => index >= firstIssueIndex && index <= lastIssueIndex
        )
      }
    },
    async loadItems({ itemType }: { itemType: string }) {
      const items = (
        await axios.get(`/fs/browse/${itemType}/${this.publicationcode}`)
      ).data.sort(numericSortCollator.compare)
      if (itemType === 'elements') {
        this.publicationElements = items
      } else {
        this.publicationPhotos = items
      }
    },
    async loadPublicationIssues() {
      return coa().fetchIssueNumbers([this.publicationcode])
    },
    async loadSurroundingEdges() {
      const firstIssueIndex = this.publicationIssues.findIndex(
        (issue) => issue === this.issuenumbers[0]
      )
      const lastIssueIndex = this.publicationIssues.findIndex(
        (issue) => issue === this.issuenumbers[this.issuenumbers.length - 1]
      )
      const issuesBefore = this.publicationIssues.filter(
        (_, index) =>
          firstIssueIndex !== -1 &&
          index >= firstIssueIndex - 10 &&
          index < firstIssueIndex
      )
      const issuesAfter = this.publicationIssues.filter(
        (_, index) =>
          lastIssueIndex !== -1 &&
          index > lastIssueIndex &&
          index <= lastIssueIndex + 10
      )

      const getEdgePublicationStates = async (edges: string[]) =>
        (
          await axios.get(
            `/api/edges/${this.publicationcode}/${edges.join(',')}`
          )
        ).data.sort(
          (
            { issuenumber: issuenumber1 }: { issuenumber: string },
            { issuenumber: issuenumber2 }: { issuenumber: string }
          ) =>
            Math.sign(edges.indexOf(issuenumber1) - edges.indexOf(issuenumber2))
        )

      if (issuesBefore.length) {
        this.edgesBefore = await getEdgePublicationStates(issuesBefore)
      }

      if (issuesAfter.length) {
        this.edgesAfter = await getEdgePublicationStates(issuesAfter)
      }
    },

    getChunkedRequests: async ({
      api,
      url,
      parametersToChunk,
      chunkSize,
      suffix = '',
    }: {
      api: AxiosInstance
      url: string
      parametersToChunk: (string | number)[]
      chunkSize: number
      suffix?: string
    }) =>
      await Promise.all(
        await Array.from(
          { length: Math.ceil(parametersToChunk.length / chunkSize) },
          (_, i) =>
            parametersToChunk.slice(i * chunkSize, i * chunkSize + chunkSize)
        ).reduce(
          async (acc, codeChunk) =>
            (
              await acc
            ).concat(await api.get(`${url}${codeChunk.join(',')}${suffix}`)),
          Promise.resolve([])
        )
      ),

    async getChunkedRequestsTyped<MyCall extends Call<unknown, unknown>>({
      callFn,
      valuesToChunk,
      chunkSize,
    }: {
      callFn: (chunk: string) => Promise<AxiosResponse<MyCall['resBody']>>
      valuesToChunk: string[]
      chunkSize: number
      chunkOnQueryParam?: boolean
      parameterName?: string
    }): Promise<MyCall['resBody']> {
      const slices = Array.from(
        { length: Math.ceil(valuesToChunk.length / chunkSize) },
        (_, i) => valuesToChunk.slice(i * chunkSize, i * chunkSize + chunkSize)
      )
      let acc: MyCall['resBody'] = (await callFn(slices[0].join(','))).data
      for (const slice of slices.slice(1)) {
        acc = Array.isArray(acc)
          ? [
              ...(acc as never[]),
              ...((await callFn(slice.join(','))).data as never[]),
            ]
          : {
              ...(acc as { [key: string]: never }),
              ...((await callFn(slice.join(','))).data as {
                [key: string]: never
              }),
            }
      }
      return acc
    },
  },
})
