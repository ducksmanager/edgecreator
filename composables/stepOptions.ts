import interact from 'interactjs'
import { computed, onMounted } from '@nuxtjs/composition-api'
import { useI18n } from 'nuxt-i18n-composable'
import { ui } from '~/stores/ui'
import { globalEvent } from '~/stores/globalEvent'
import { useToast } from '~/composables/useToast'

const i18n = useI18n()
const uiStore = ui()

export type baseProps = {
  issuenumber: string
  dimensions: { width: number; height: number }
  stepNumber: number

  attributeKeys: string[]
  options: { [key: string]: any }
}

type Interactive = {
  onmove: (params: { dx: number; dy: number }) => void
  onresizemove: (params: { rect: { width: number; height: number } }) => void
}

const shownTips: string[] = []

export const useStepOptions = (props: baseProps) => {
  const zoom = computed(() => uiStore.zoom)
  const width = computed(() => props.dimensions.width)
  const height = computed(() => props.dimensions.height)
  const attributes = computed(() =>
    Object.keys(props.options)
      .filter((optionKey) => props.attributeKeys.includes(optionKey))
      .reduce(
        (acc, optionKey) => ({
          ...acc,
          [optionKey]: props.options[optionKey],
        }),
        {}
      )
  )

  const showMoveResizeToast = (
    type: string,
    options?: { edges: { right: number; bottom: number } } | null
  ) => {
    if (shownTips.includes(type)) {
      return
    }
    let text
    switch (type) {
      case 'move':
        text = i18n.t(
          `You can make your selection snap to the top left corner of the edge by holding Shift while you drag it`
        )
        break
      case 'resize':
        text = i18n.t(
          `You can make your selection match the {dimension} of the edge by holding Shift while you resize it`,
          {
            dimension: i18n.t(
              options!.edges.bottom && options!.edges.right
                ? 'width and height'
                : options!.edges.bottom
                ? 'height'
                : 'width'
            ),
          }
        )
    }
    useToast().toast(text, {
      title: i18n.t('Tip').toString(),
      id: 'move-resize-tip-toast',
      toaster: 'b-toaster-top-center',
      noCloseButton: true,
      autoHideDelay: 5000,
    })
    shownTips.push(type)
  }
  const isColorOption = (optionName: string) =>
    optionName.toLowerCase().includes('color') ||
    ['fill', 'stroke'].includes(optionName)
  const enableDragResize = (
    element: HTMLElement | SVGElement,
    callbacks: {
      onmove:
        | null
        | ((params: {
            currentTarget: SVGElement | HTMLElement
            dx: number
            dy: number
          }) => void)
      onresizemove:
        | null
        | ((params: { rect: { width: number; height: number } }) => void)
    } = {
      onmove: null,
      onresizemove: null,
    }
  ) => {
    interact(element)
      .draggable({
        onmove: (e) => {
          document.body.classList.add('interacting')
          if (callbacks.onmove) {
            callbacks.onmove(e)
          } else {
            const { dx, dy, shiftKey } = e
            showMoveResizeToast('move')
            if (shiftKey) {
              globalEvent().options = {
                x: 0,
                y: 0,
              }
            } else {
              globalEvent().options = {
                x: props.options.x + dx / uiStore.zoom / 3,
                y: props.options.y + dy / uiStore.zoom / 3,
              }
            }
          }
        },
        onend: () => document.body.classList.remove('interacting'),
      })
      .resizable({
        edges: { right: true, bottom: true },
      })
      .on('resizemove', (e) => {
        document.body.classList.add('interacting')
        if (callbacks.onresizemove) {
          callbacks.onresizemove(e)
        } else {
          const { rect, shiftKey, edges } = e
          showMoveResizeToast('resize', { edges })
          rect.width /= uiStore.zoom
          rect.height /= uiStore.zoom
          if (shiftKey) {
            if (edges.bottom) {
              rect.height = height.value
            }
            if (edges.right) {
              rect.width = width.value
            }
          }
          globalEvent().options = rect
        }
      })

      .on('resizeend', () => document.body.classList.remove('interacting'))
  }

  onMounted(() => {
    globalEvent().options = {
      ...props.options,
      issuenumbers: [props.issuenumber],
      stepNumber: props.stepNumber,
    }
  })

  return {
    zoom,
    width,
    height,
    attributes,
    showMoveResizeToast,
    isColorOption,
    enableDragResize,
  }
}
