<template>
  <g>
    <metadata>{{ options }}</metadata>
    <rect
      ref="rect1"
      v-bind="{
        ...attributes,
        width: 0.5,
        stroke: 'black',
        x: dimensions.width / 2 - 0.25,
        y: dimensions.height / 2 - options.yDistanceFromCenter - options.height,
      }"
    >
    </rect>
    <rect
      ref="rect2"
      v-bind="{
        ...attributes,
        width: 0.5,
        stroke: 'black',
        x: dimensions.width / 2 - 0.25,
        y: dimensions.height / 2 + options.yDistanceFromCenter,
      }"
    >
    </rect>
  </g>
</template>

<script setup lang="ts">
import { onMounted, ref } from '@nuxtjs/composition-api'
import textTemplate from '~/composables/textTemplate'
import { baseProps, useStepOptions } from '~/composables/stepOptions'
import { ui } from '~/stores/ui'
import { globalEvent } from '~/stores/globalEvent'

const { resolveHeightTemplate } = textTemplate()
const rect1 = ref(null as SVGRectElement | null)
const rect2 = ref(null as SVGRectElement | null)

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        yDistanceFromCenter?: number | undefined
        height: number | string
      }
    }
  >(),
  {
    options: () => ({
      yDistanceFromCenter: 5,
      height: 15,
    }),
    attributeKeys: () => ['height'],
  }
)

onMounted(() => {
  const onmove = ({
    currentTarget,
    dy,
  }: {
    currentTarget: SVGElement | HTMLElement
    dx: number
    dy: number
  }) => {
    const stapleHeight =
      typeof props.options.height === 'string'
        ? parseInt(props.options.height)
        : props.options.height
    const isStaple2 = rect2.value === currentTarget
    const yDistanceFromCenter = Math.min(
      Math.max(
        stapleHeight,
        (props.options.yDistanceFromCenter || 0) +
          ((isStaple2 ? 1 : -1) * dy) / ui().zoom
      ),
      height.value / 2 - stapleHeight * 2
    )
    globalEvent().options = {
      yDistanceFromCenter,
    }
  }

  if (props.options.yDistanceFromCenter === undefined) {
    globalEvent().options = {
      yDistanceFromCenter:
        parseInt(resolveHeightTemplate(props.options.y2, height.value)) -
        height.value / 2,
    }
  }
  if (typeof props.options.height === 'string') {
    globalEvent().options = {
      height: parseInt(
        resolveHeightTemplate(props.options.height, height.value)
      ),
    }
  }
  enableDragResize(rect1.value!, { onmove, onresizemove: () => {} })
  enableDragResize(rect2.value!, { onmove, onresizemove: () => {} })
})

const { enableDragResize, height, attributes } = useStepOptions(props)
</script>

<style scoped></style>
