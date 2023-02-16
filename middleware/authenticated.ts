import { defineNuxtMiddleware } from '@nuxtjs/composition-api'

export default defineNuxtMiddleware(({ app, redirect }) => {
  if (!app.$cookies.get('dm-user')) {
    return redirect('/login', { hash: '#401' })
  }
})
