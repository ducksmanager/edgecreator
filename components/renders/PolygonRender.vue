<template>
  <polygon
    ref="polygon"
    :points="options.points.join(' ')"
    :style="{ fill: options.fill }"
  >
    <metadata>{{ options }}</metadata>
  </polygon>
</template>

<script setup lang="ts">
import { onMounted, ref } from '@nuxtjs/composition-api'
import { baseProps, useStepOptions } from '~/composables/stepOptions'
import { globalEvent } from '~/stores/globalEvent'
import { ui } from '~/stores/ui'

const polygon = ref(null)

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        points: [number, number][]
        fill: string
      }
    }
  >(),
  {
    options: () => ({
      points: [
        [1, 5],
        [4, 25],
        [7, 14],
        [14, 12],
      ],
      fill: '#000000',
    }),
    attributeKeys: () => [],
  }
)

onMounted(() => {
  enableDragResize(polygon.value!, {
    onmove: ({ dy, dx }): void => {
      globalEvent().options = {
        points: props.options.points.map(([x, y]) => [
          x + dx / ui().zoom,
          y + dy / ui().zoom,
        ]),
      }
    },
    onresizemove: ({ rect: { width, height } }): void => {
      const heightMaxGrowth = height / ui().zoom
      const widthMaxGrowth = width / ui().zoom

      const { points } = props.options
      const minX = Math.min(...points.map(([x]) => x))
      const maxX = Math.max(...points.map(([x]) => x))
      const minY = Math.min(...points.map(([, y]) => y))
      const maxY = Math.max(...points.map(([, y]) => y))
      const currentWidth = maxX - minX
      const currentHeight = maxY - minY
      globalEvent().options = {
        points: points.map(([x, y]) => [
          x + widthMaxGrowth * ((x - minX) / currentWidth),
          y + heightMaxGrowth * ((y - minY) / currentHeight),
        ]),
      }
    },
  })
})

const { enableDragResize } = useStepOptions(props)
</script>

<style scoped></style>
