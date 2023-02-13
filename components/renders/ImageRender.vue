<!--suppress RequiredAttributes, HtmlUnknownAttribute -->
<template>
  <svg>
    <image
      ref="image"
      v-bind="options"
      :xlink:href="image.base64"
      preserveAspectRatio="none"
    >
      <metadata>{{ options }}</metadata>
    </image>
  </svg>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from '@nuxtjs/composition-api'
import { main } from '~/stores/main'
import { loadImage } from '~/composables/base64'
import textTemplate from '~/composables/textTemplate'
import { baseProps, useStepOptions } from '~/composables/stepOptions'

const { resolveStringTemplates } = textTemplate()

const image = ref(null)

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        x: number
        y: number
        width: number
        height: number
        src: string | null
      }
    }
  >(),
  {
    options: () => ({
      x: 5,
      y: 5,
      width: 15,
      height: 15,
      src: null,
    }),
    attributeKeys: () => ['x', 'y', 'width', 'height'],
  }
)

const effectiveSource = computed(() =>
  resolveStringTemplates(props.options.src)
)

watch(
  () => props.options.src,
  async () => {
    if (effectiveSource.value) {
      loadImage(
        `${process.env.EDGES_URL_PUBLIC}/${main().country}/elements/${
          effectiveSource.value
        }`
      )
    }
  },
  { immediate: true }
)

onMounted(async () => {
  enableDragResize(image.value!)
})

const { enableDragResize } = useStepOptions(props)
</script>

<style scoped>
image {
  touch-action: none;
}
</style>
