import { useRoute, watch } from '@nuxtjs/composition-api'
import { useToast } from '~/composables/useToast'

const route = useRoute()

export default () => {
  watch(
    () => route.value.hash,
    (newValue) => {
      const toastError = (message: string) => {
        useToast().toast(message, {
          title: 'Error',
          autoHideDelay: 3000,
        })
      }
      switch (newValue) {
        case '#401':
          toastError('You are not logged in')
          break
        case '#403':
          toastError(
            "You don't have enough rights to access the requested page"
          )
          break
      }
    },
    { immediate: true }
  )
}
