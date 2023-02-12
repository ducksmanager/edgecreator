import { set } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { main } from '~/stores/main'

const URL_PREFIX_STEPS = '/api/edgecreator/v2/model/'

export const edgeCatalog = defineStore('edgeCatalog', {
  state: () => ({
    currentEdges: {} as {
      [publicationcode: string]: { country: string; magazine: string }
    },
    publishedEdges: {} as {
      [publicationcode: string]: { [issuenumber: string]: object }
    },
    publishedEdgesSteps: {} as { [publicationcode: string]: object },
  }),

  actions: {
    addCurrentEdges(edges: {
      [publicationcode: string]: { country: string; magazine: string }
    }) {
      this.currentEdges = { ...this.currentEdges, ...edges }
    },
    addPublishedEdges(publishedEdges: {
      [publicationcode: string]: { [issuenumber: string]: object }
    }) {
      Object.keys(publishedEdges).forEach((publicationcode) => {
        const publicationEdges = publishedEdges[publicationcode]
        if (!this.publishedEdges[publicationcode]) {
          set(this.publishedEdges, publicationcode, {})
        }
        Object.keys(publicationEdges).forEach((issueNumber) => {
          const edgeStatus = publicationEdges[issueNumber]
          if (!this.publishedEdges[publicationcode][issueNumber]) {
            set(this.publishedEdges[publicationcode], issueNumber, edgeStatus)
          } else {
            set(this.publishedEdges[publicationcode], issueNumber, {
              ...this.publishedEdges[publicationcode][issueNumber],
            })
          }
        })
      })
    },
    addPublishedEdgesSteps({
      publicationcode,
      publishedEdgesSteps,
    }: {
      publicationcode: string
      publishedEdgesSteps: { [publicationcode: string]: object }
    }) {
      if (!this.publishedEdgesSteps[publicationcode]) {
        this.publishedEdgesSteps[publicationcode] = {}
      }
      this.publishedEdgesSteps[publicationcode] = {
        ...this.publishedEdgesSteps[publicationcode],
        ...publishedEdgesSteps,
      }
    },
    async getPublishedEdgesSteps({
      publicationcode,
      edgeModelIds,
    }: {
      publicationcode: string
      edgeModelIds: number[]
    }) {
      const newModelIds = edgeModelIds
      return (
        newModelIds.length &&
        this.addPublishedEdgesSteps({
          publicationcode,
          publishedEdgesSteps: await main()
            .getChunkedRequests({
              api: axios.create({}),
              url: URL_PREFIX_STEPS,
              parametersToChunk: newModelIds,
              chunkSize: 10,
              suffix: '/steps',
            })
            .then((data) =>
              data.reduce((acc, result) => ({ ...acc, ...result.data }), {})
            ),
        })
      )
    },
  },
})
