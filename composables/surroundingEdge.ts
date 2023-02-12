import { computed } from '@nuxtjs/composition-api'
import { ui } from '~/stores/ui'
import { main } from '~/stores/main'

const uiStore = ui()
const mainStore = main()

export default () => {
  const showPreviousEdge = computed({
    get: (): boolean =>
      uiStore.showPreviousEdge && mainStore.edgesBefore.length > 0,
    set: (value): void => {
      uiStore.$patch({ showPreviousEdge: value })
    },
  })
  const showNextEdge = computed({
    get: (): boolean => uiStore.showNextEdge && mainStore.edgesAfter.length > 0,
    set: (value): void => {
      uiStore.$patch({ showNextEdge: value })
    },
  })
  return {
    showPreviousEdge,
    showNextEdge,
  }
}
