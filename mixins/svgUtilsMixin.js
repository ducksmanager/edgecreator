import { DOMParser } from 'xmldom'

export default {
  methods: {
    getSvgMetadata(svgChildNodes, metadataType) {
      return svgChildNodes
        .filter(
          (node) =>
            node.nodeName === 'metadata' &&
            node.attributes.getNamedItem('type').nodeValue === metadataType
        )
        .map((metadataNode) => metadataNode.textContent.trim())
    },
    async loadSvgFromString(
      country,
      magazine,
      issuenumber,
      publishedVersion = false
    ) {
      const edgeUrl = this.getEdgeUrl(
        country,
        magazine,
        issuenumber,
        'svg?' + new Date().toISOString(),
        publishedVersion
      )
      const svgString = await this.$axios.$get(edgeUrl)
      if (!svgString) {
        throw new Error(`No SVG found : ${edgeUrl}`)
      }
      const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
      const svgElement = doc.getElementsByTagName('svg')[0]
      const svgChildNodes = Object.values(svgElement.childNodes)

      return { svgElement, svgChildNodes }
    },
    getEdgeUrl(country, magazine, issuenumber, extension, publishedVersion) {
      return (
        `/edges/${country}/gen/` +
        `${publishedVersion ? '' : '_'}${magazine}.${issuenumber}.${extension}`
      )
    },
  },
}
