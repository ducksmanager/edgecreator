import { ref } from '@nuxtjs/composition-api'

export const loadImage = (src: string) => {
  const image = ref(
    null as {
      base64: string | null
      width: number | null
      height: number | null
    } | null
  )
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = function () {
    const canvas: HTMLCanvasElement = document.createElement('canvas')
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
    canvas.height = this.naturalHeight
    canvas.width = this.naturalWidth
    ctx!.drawImage(this, 0, 0)
    image.value = {
      base64: canvas.toDataURL('png'),
      width: this.naturalWidth,
      height: this.naturalHeight,
    }
    enableDragResize(this)
  }
  img.onerror = (e) => {
    console.error(`Base64 image could not be retrieved : ${src} : ${e}`)
    image.value = { base64: null, width: null, height: null }
  }
  img.src = src

  return { image }
}
