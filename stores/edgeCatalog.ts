import { set } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import {
  GET_CALL_EDGECREATOR_V2_MODEL__MODELIDS_STEPS,
  GET__edgecreator__v2__model__$modelIds__steps,
} from 'ducksmanager/types/routes'
import { ModelSteps } from 'ducksmanager/types/ModelSteps'
import { main } from '~/stores/main'
import { EdgeWithVersionAndStatus } from '~/composables/edgeCatalog'

export const edgeCatalog = defineStore('edgeCatalog', {
  state: () => ({
    currentEdges: {} as {
      [issuecode: string]: EdgeWithVersionAndStatus
    },
    publishedEdges: {} as {
      [publicationcode: string]: {
        [issuenumber: string]: { issuenumber: string; v3: boolean }
      }
    },
    publishedEdgesSteps: {} as {
      [publicationcode: string]: ModelSteps
    },
  }),

  actions: {
    addCurrentEdges(edges: { [issuecode: string]: EdgeWithVersionAndStatus }) {
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
      publishedEdgesSteps: ModelSteps
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
          publishedEdgesSteps:
            await main().getChunkedRequestsTyped<GET_CALL_EDGECREATOR_V2_MODEL__MODELIDS_STEPS>(
              {
                callFn: (chunk) =>
                  GET__edgecreator__v2__model__$modelIds__steps(axios, {
                    params: { publicationCodes: chunk },
                  }),
                valuesToChunk: newModelIds.map((modelId) => String(modelId)),
                chunkSize: 10,
              }
            ),
        })
      )
    },
  },
})
