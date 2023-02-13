import { ref } from '@nuxtjs/composition-api'
import { useStepOptions } from '~/composables/stepOptions'

export const base64 = () => {
  const image = ref(
    null as {
      base64: string | null
      width: number | null
      height: number | null
    } | null
  )
  const loadImage = (src: string) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas: HTMLCanvasElement = document.createElement('canvas')
      const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
      canvas.height = img.naturalHeight
      canvas.width = img.naturalWidth
      ctx!.drawImage(img, 0, 0)
      image.value = {
        base64: canvas.toDataURL('png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
      }
      useStepOptions().enableDragResize(img)
    }
    img.onerror = (e) => {
      console.error(`Base64 image could not be retrieved : ${src} : ${e}`)
      image.value = { base64: null, width: null, height: null }
    }
    img.src = src
  }

  return { image, loadImage }
}
