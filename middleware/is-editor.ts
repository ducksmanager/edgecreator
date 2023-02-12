import { defineNuxtMiddleware } from '@nuxtjs/composition-api'

export default defineNuxtMiddleware(({ $gates, redirect }: any) => {
  if (!$gates.unlessRole('display')) {
    return redirect({ path: '/login', hash: '#403' })
  }
})
