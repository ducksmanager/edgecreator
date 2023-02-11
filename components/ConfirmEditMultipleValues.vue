<template>
  <span v-if="values.length > 1 && !edit">
    {{ $t('Multiple values.') }}
    <b-btn
      size="sm"
      pill
      @click="
        edit = true
        $emit('change', values[0])
      "
      >{{ $t('Edit') }}</b-btn
    >
  </span>
  <span v-else><slot /></span>
</template>
<script lang="ts" setup>
import { ref } from '@nuxtjs/composition-api'

defineProps<{
  values: any[]
}>()

const edit = ref(false as boolean)
</script>
