<template>
  <rect ref="rect" v-bind="options">
    <metadata>{{ options }}</metadata>
  </rect>
</template>

<script setup lang="ts">
import { onMounted, ref } from '@nuxtjs/composition-api'
import { baseProps, useStepOptions } from '~/composables/stepOptions'

const rect = ref(null as SVGRectElement | null)

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        x: number
        y: number
        width: number
        height: number
        fill: string
        stroke: string
      }
    }
  >(),
  {
    options: () => ({
      x: 5,
      y: 5,
      width: 15,
      height: 15,
      fill: '#ff0000',
      stroke: 'transparent',
    }),
    attributeKeys: () => ['x', 'y', 'width', 'height', 'fill', 'stroke'],
  }
)

onMounted(() => {
  enableDragResize(rect.value!)
})

const { enableDragResize } = useStepOptions(props)
</script>

<style scoped></style>
