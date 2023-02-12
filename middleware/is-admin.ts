import { defineNuxtMiddleware } from '@nuxtjs/composition-api'

export default defineNuxtMiddleware(({ $gates, redirect }: any) => {
  if (!$gates.hasRole('admin')) {
    return redirect({ path: '/login', hash: '#403' })
  }
})
