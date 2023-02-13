<template>
  <rect
    ref="rect"
    v-bind="attributes"
    x="0"
    y="0"
    :width="width"
    :height="height"
  >
    <metadata>{{ options }}</metadata>
  </rect>
</template>

<script setup lang="ts">
import { baseProps, useStepOptions } from '~/composables/stepOptions'

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        fill: string
      }
    }
  >(),
  {
    options: () => ({
      fill: '#ff0000',
    }),
    attributeKeys: () => ['fill'],
  }
)

const { attributes, width, height } = useStepOptions(props)
</script>

<style scoped></style>
