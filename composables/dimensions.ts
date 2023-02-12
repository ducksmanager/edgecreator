import { set } from 'vue'
import { ref } from '@nuxtjs/composition-api'
import { editingStep } from '~/stores/editingStep'

export default () => {
  const dimensions = ref(
    {} as { [issuenumber: string]: { width: number; height: number } }
  )

  const setDimensions = (
    newDimensions: { width: string | number; height: string | number },
    issuenumber: string
  ) => {
    const issuenumbers = issuenumber
      ? [issuenumber]
      : editingStep().issuenumbers
    for (const issuenumber of issuenumbers) {
      set(dimensions.value, issuenumber, {
        width:
          typeof newDimensions.width === 'string'
            ? parseInt(newDimensions.width)
            : newDimensions.width,
        height:
          typeof newDimensions.height === 'string'
            ? parseInt(newDimensions.height)
            : newDimensions.height,
      })
    }
  }

  return {
    dimensions,
    setDimensions,
  }
}
