import Vue from 'vue'

export const state = () => ({
  country: null,
  magazine: null,
  issuenumbers: [],
  steps: {},
  photoUrls: {},
  contributors: {
    designers: [],
    photographers: [],
  },

  width: 15,
  height: 200,

  edgesBefore: [],
  edgesAfter: [],

  publicationElements: [],
  publicationPhotos: [],

  stepColors: {},
})

export const mutations = {
  setCountry(state, country) {
    state.country = country
  },
  setMagazine(state, magazine) {
    state.magazine = magazine
  },
  setIssuenumbers(state, issuenumbers) {
    state.issuenumbers = issuenumbers
  },
  setSteps(state, { issuenumber, steps }) {
    Vue.set(state.steps, issuenumber, steps)
  },
  addStep(state, step) {
    Object.keys(state.steps).forEach((issuenumber) => {
      Vue.set(state.steps[issuenumber], state.steps[issuenumber].length, step)
    })
  },
  removeStep(state, stepNumber) {
    Object.keys(state.steps).forEach((issuenumber) => {
      state.steps[issuenumber].splice(stepNumber, 1)
    })
  },
  duplicateStep(state, stepNumber) {
    Object.keys(state.steps).forEach((issuenumber) => {
      state.steps[issuenumber].splice(stepNumber, 0, state.steps[issuenumber][stepNumber])
    })
  },
  swapSteps(state, stepNumbers) {
    Object.keys(state.steps).forEach((issuenumber) => {
      const steps = state.steps[issuenumber]
      const stepsToSwap = [steps[stepNumbers[0]], steps[stepNumbers[1]]]
      state.steps[issuenumber].splice(stepNumbers[0], 2, stepsToSwap[1], stepsToSwap[0])
    })
  },
  setPhotoUrl(state, { issuenumber, filename }) {
    Vue.set(state.photoUrls, issuenumber, filename)
  },
  addContributor(state, { contributionType, user }) {
    Vue.set(state.contributors[contributionType], state.contributors[contributionType].length, user)
  },
  removeContributor(state, { contributionType, index }) {
    state.contributors[contributionType].splice(index, 1)
  },
  setDimensions(state, { width, height }) {
    state.width = parseFloat(width)
    state.height = parseFloat(height)
  },
  setEdgesBefore(state, { edges: edgesBefore }) {
    state.edgesBefore = edgesBefore
  },
  setEdgesAfter(state, { edges: edgesAfter }) {
    state.edgesAfter = edgesAfter
  },
  setPublicationElements(state, { items: publicationElements }) {
    state.publicationElements = publicationElements
  },
  setPublicationPhotos(state, { items: publicationPhotos }) {
    state.publicationPhotos = publicationPhotos
  },
  setStepColors(state, { stepNumber, colors }) {
    Vue.set(state.stepColors, stepNumber, colors)
  },
}

export const getters = {
  colors: (state) => {
    return Object.values(state.stepColors).reduce((acc, colors) => {
      return [...new Set(acc.concat(colors))].sort()
    }, [])
  },
}

const numericSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export const actions = {
  setIssuenumbersFromMinMax({ state, commit }, { min, max }) {
    if (max === undefined) {
      commit('setIssuenumbers', [min])
    } else {
      const firstIssueIndex = state.publicationIssues.findIndex((issue) => issue === min)
      const lastIssueIndex = state.publicationIssues.findIndex((issue) => issue === max)
      if (lastIssueIndex === -1) {
        commit('setIssuenumbers', [min])
      } else {
        commit(
          'setIssuenumbers',
          state.publicationIssues.filter(
            (unused, index) => index >= firstIssueIndex && index <= lastIssueIndex
          )
        )
      }
    }
  },
  async loadItems({ state, commit }, { itemType }) {
    commit(itemType === 'elements' ? 'setPublicationElements' : 'setPublicationPhotos', {
      items: (
        await this.$axios.$get(`/fs/browse/${itemType}/${state.country}/${state.magazine}`)
      ).sort(numericSortCollator.compare),
    })
  },
  async loadPublicationIssues({ state }) {
    state.publicationIssues = await this.$axios.$get(
      `/api/coa/list/issues/${state.country}/${state.magazine}`
    )
  },
  async loadSurroundingEdges({ state, commit }) {
    const firstIssueIndex = state.publicationIssues.findIndex(
      (issue) => issue === state.issuenumbers[0]
    )
    const lastIssueIndex = state.publicationIssues.findIndex(
      (issue) => issue === state.issuenumbers[state.issuenumbers.length - 1]
    )
    const issuesBefore = state.publicationIssues.filter(
      (unused, index) =>
        firstIssueIndex !== -1 && index >= firstIssueIndex - 10 && index < firstIssueIndex
    )
    const issuesAfter = state.publicationIssues.filter(
      (unused, index) =>
        lastIssueIndex !== -1 && index > lastIssueIndex && index <= lastIssueIndex + 10
    )

    if (issuesBefore.length) {
      commit('setEdgesBefore', {
        edges: await this.$axios.$get(
          `/api/edges/${state.country}/${state.magazine}/${issuesBefore.join(',')}`
        ),
      })
    }

    if (issuesAfter.length) {
      commit('setEdgesAfter', {
        edges: await this.$axios.$get(
          `/api/edges/${state.country}/${state.magazine}/${issuesAfter.join(',')}`
        ),
      })
    }
  },
}
