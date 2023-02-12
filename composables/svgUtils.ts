import { DOMParser } from 'xmldom'
import axios from 'axios'

export default () => {
  const getSvgMetadata = (svgChildNodes: SVGElement[], metadataType: string) =>
    svgChildNodes
      .filter(
        (node) =>
          node.nodeName === 'metadata' &&
          node.attributes.getNamedItem('type')!.nodeValue === metadataType
      )
      .map((metadataNode) => metadataNode.textContent!.trim())

  const loadSvgFromString = async (
    country: string,
    magazine: string,
    issuenumber: string,
    publishedVersion = false
  ) => {
    const edgeUrl = getEdgeUrl(
      country,
      magazine,
      issuenumber,
      'svg?' + new Date().toISOString(),
      publishedVersion
    )
    const svgString = (await axios.get(edgeUrl)).data
    if (!svgString) {
      throw new Error(`No SVG found : ${edgeUrl}`)
    }
    const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
    const svgElement = doc.getElementsByTagName('svg')[0]
    const svgChildNodes = Object.values(svgElement.childNodes) as SVGElement[]

    return { svgElement, svgChildNodes }
  }
  const getEdgeUrl = (
    country: string,
    magazine: string,
    issuenumber: string,
    extension: string,
    publishedVersion: boolean
  ) =>
    `/edges/${country}/gen/${
      publishedVersion ? '' : '_'
    }${magazine}.${issuenumber}.${extension}`

  return {
    getSvgMetadata,
    loadSvgFromString,
    getEdgeUrl,
  }
}
