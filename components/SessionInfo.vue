<template>
  <div class="user-and-locale m-2">
    <div class="text-right font-weight-bold">{{ userStore.username }}</div>
    <template v-for="({ code, name }, idx) in $i18n.locales">
      <template v-if="idx > 0"> |</template>
      <span v-if="$i18n.locale === code" :key="code">{{ name }}</span>
      <nuxt-link v-else :key="code" :to="switchLocalePath(code)">{{
        name
      }}</nuxt-link>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from '@nuxtjs/composition-api'
import { useI18n } from 'nuxt-i18n-composable'
import { user } from '~/stores/user'
import { useCookies } from '~/composables/useCookies'

const userStore = user()
const i18n = useI18n()

onMounted(() => {
  userStore.username = useCookies().get('dm-user')
})
</script>
<style lang="scss">
.user-and-locale {
  position: absolute;
  right: 0;
  top: 0;
}
</style>
