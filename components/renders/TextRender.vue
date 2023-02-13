<!--suppress RequiredAttributes, HtmlUnknownAttribute -->
<template>
  <svg v-if="options.x !== undefined">
    <image
      ref="imageRef"
      preserveAspectRatio="none"
      v-bind="attributes"
      :xlink:href="image.base64"
      :transform="
        !options.width
          ? null
          : `rotate(${options.rotation}, ${options.x + options.width / 2}, ${
              options.y + options.height / 2
            })`
      "
    >
      <metadata>{{ options }}</metadata>
    </image>
  </svg>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from '@nuxtjs/composition-api'
import axios from 'axios'
import textTemplate from '~/composables/textTemplate'
import { baseProps, useStepOptions } from '~/composables/stepOptions'
import { ui } from '~/stores/ui'
import { globalEvent } from '~/stores/globalEvent'
import { base64 } from '~/composables/base64'

const { resolveStringTemplates } = textTemplate()

const imageRef = ref(null as SVGImageElement | null)

const props = withDefaults(
  defineProps<
    baseProps & {
      options?: {
        x: number
        y: number
        width: number | null
        height: number | null
        src: string | null
        rotation: number
        fgColor: string
        bgColor: string
        font: string
        text: string
        internalWidth: number
        isHalfHeight: true
      }
    }
  >(),
  {
    options: () => ({
      x: -25,
      y: 50,
      width: null,
      height: null,
      src: null,
      rotation: 270,
      fgColor: '#000000',
      bgColor: '#ffffff',
      font: 'redrooster/block-gothic-rr/demi-extra-condensed',
      text: 'Le journal de mickey',
      internalWidth: 700,
      isHalfHeight: true,
    }),
    attributeKeys: () => ['x', 'y', 'width', 'height'],
  }
)

const textImage = ref(
  null as {
    base64: string | null
    width: number | null
    height: number | null
    url: string
  } | null
)
const textImageOptions = ref(null as typeof props | null)

const effectiveText = computed(() => {
  return resolveStringTemplates(props.options.text)
})

watch(
  () => textImage.value,
  async (newValue) => {
    if (newValue) {
      loadImage(textImage.value!.url)
    }
  },
  { immediate: true }
)

watch(
  () => image.value,
  (newValue) => {
    if (newValue?.base64) {
      waitUntil(
        () => imageRef.value,
        () => {
          enableDragResize(imageRef.value!, {
            onmove: () => {},
            onresizemove: ({ rect }) => {
              let { width, height } = rect
              const isVertical = [90, 270].includes(props.options.rotation)
              if (isVertical) {
                ;[width, height] = [height, width]
              }
              const options: {
                x?: number
                y?: number
                width: number
                height: number
              } = {
                width: width / ui().zoom,
                height: height / ui().zoom,
              }

              // Correct coordinates due to rotation center moving after resize
              if (isVertical) {
                options.y =
                  props.options.y - (options.height - props.options.height!) / 2
                options.x =
                  props.options.x - (options.width - props.options.width!) / 2
              }
              globalEvent().options = options
            },
          })
          applyTextImageDimensions()
        },
        2000,
        100
      )
    }
  },
  {
    immediate: true,
  }
)

watch(
  () => props.options.fgColor,
  () => {
    refreshPreview()
  }
)
watch(
  () => props.options.bgColor,
  () => {
    refreshPreview()
  }
)
watch(
  () => props.options.internalWidth,
  () => {
    refreshPreview()
  }
)
watch(
  () => props.options.text,
  () => {
    refreshPreview()
  }
)
watch(
  () => props.options.font,
  () => {
    refreshPreview()
  }
)

onMounted(async () => {
  await refreshPreview()
})

const refreshPreview = async () => {
  if (
    JSON.stringify(textImageOptions.value) === JSON.stringify(props.options)
  ) {
    return
  }
  textImageOptions.value = { ...props.options }
  const { fgColor, bgColor, internalWidth, font } = props.options
  const url = `/fs/text/${[
    fgColor.replace('#', ''),
    bgColor.replace('#', ''),
    Math.round(internalWidth * 100) / 100,
    'font',
    font,
    'text',
    effectiveText.value,
  ].join('/')}`
  try {
    textImage.value = (
      await axios.get(url, {
        headers: {
          imageWidth: width.value,
          'Content-Type': 'application/json',
        },
      })
    ).data.value
  } catch (e) {
    console.error(`Text image could not be retrieved : ${url}`)
  }
}
const waitUntil = (
  condition: () => SVGImageElement | null,
  okCallback: () => void,
  timeout: number,
  loopEvery: number
) => {
  let iterations = 0
  const interval = setInterval(() => {
    if (condition()) {
      okCallback()
      clearInterval(interval)
    }
    if (++iterations > timeout / loopEvery) {
      clearInterval(interval)
    }
  }, loopEvery)
}

const applyTextImageDimensions = () => {
  const naturalAspectRatio = textImage.value!.height! / textImage.value!.width!
  const options = {
    ...props.options,
    stepNumber: props.stepNumber,
    issuenumbers: [props.issuenumber],
  }
  if (options.height === null) {
    // By default, with a 270° rotation,
    // the text shouldn't be larger than the width of the edge
    // noinspection JSSuspiciousNameCombination
    options.height = 0.8 * width.value
    options.width = options.height / naturalAspectRatio
  } else if (options.heightCompression) {
    if (props.options.rotation === 90 || options.rotation === 270) {
      options.height = options.widthCompression * width.value
      options.width =
        (options.heightCompression * width.value) / naturalAspectRatio
      options.x -= options.width / 2 - options.height / 2
      options.y += options.width / 2
    } else {
      options.height =
        options.heightCompression * width.value * naturalAspectRatio
      options.width = options.widthCompression * width.value
    }
    options.heightCompression = undefined
    options.widthCompression = undefined
  }
  options.aspectRatio = options.height / options.width!
  globalEvent().options = options
}

const { width, attributes, enableDragResize } = useStepOptions(props)
const { image, loadImage } = base64()
</script>

<style scoped lang="scss">
image {
  touch-action: none;
  visibility: hidden;

  &[width] {
    visibility: visible;
  }
}
</style>
