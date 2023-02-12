import { defineNuxtMiddleware } from '@nuxtjs/composition-api'

export default defineNuxtMiddleware(({ app, redirect }) => {
  if (!app.$cookies.get('dm-user')) {
    return redirect({ href: '/login', hash: '#401' })
  }
})
