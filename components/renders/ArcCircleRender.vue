<!--suppress RequiredAttributes -->
<template>
  <ellipse ref="ellipse" v-bind="attributes">
    <metadata>{{ options }}</metadata>
  </ellipse>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from '@nuxtjs/composition-api'
import { useStepOptions } from '~/composables/stepOptions'
import type { baseProps } from '~/composables/stepOptions'
import { globalEvent } from '~/stores/globalEvent'
import { ui } from '~/stores/ui'

const uiStore = ui()

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        cx: number
        cy: number
        rx: number
        ry: number
        fill: string
        stroke: string
      }
    }
  >(),
  {
    options: () => ({
      cx: 10,
      cy: 50,
      rx: 10,
      ry: 20,
      fill: '#bb0000',
      stroke: 'transparent',
    }),
    attributeKeys: () => ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
  }
)

const ellipse = ref(null as HTMLElement | null)

const stepOptions = useStepOptions(props)
const attributes = computed(() => stepOptions.attributes)

onMounted(() => {
  stepOptions.enableDragResize(ellipse.value!, {
    onmove: ({ dx, dy }) => {
      globalEvent().options = {
        cx: props.options.cx + dx / uiStore.zoom,
        cy: props.options.cy + dy / uiStore.zoom,
      }
    },
    onresizemove: ({ rect }) => {
      globalEvent().options = {
        rx: rect.width / 2 / uiStore.zoom,
        ry: rect.height / 2 / uiStore.zoom,
      }
    },
  })
})
</script>

<style scoped></style>
