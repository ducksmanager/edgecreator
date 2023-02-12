import axios from 'axios'

export default () => {
  const removeVueMarkup = (element: HTMLElement) => {
    Object.values(element.attributes || {})
      .filter((attribute) => attribute.name.startsWith('data-v-'))
      .forEach(({ name: attributeName }) => {
        element.removeAttribute(attributeName)
      })
    for (const childNode of Object.values(element.childNodes)) {
      removeVueMarkup(childNode as HTMLElement)
    }
    return element
  }
  const saveEdgeSvg = async (
    country: string,
    magazine: string,
    issuenumber: string,
    contributors: any,
    withExport = false,
    withSubmit = false
  ) => {
    const svgElementId = `edge-canvas-${issuenumber}`
    const cleanSvg = removeVueMarkup(
      document.getElementById(svgElementId)!.cloneNode(true) as HTMLElement
    )
    if (!cleanSvg) {
      return Promise.reject(
        new Error(`Couldn't save SVG : empty content for ID ${svgElementId}`)
      )
    }
    return (
      await axios.put('/fs/save', {
        runExport: withExport,
        runSubmit: withSubmit,
        country,
        magazine,
        issuenumber,
        contributors,
        content: cleanSvg.outerHTML,
      })
    ).data
  }

  return {
    removeVueMarkup,
    saveEdgeSvg,
  }
}
