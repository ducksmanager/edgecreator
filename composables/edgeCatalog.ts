import { computed, onMounted, ref, useContext } from '@nuxtjs/composition-api'
import axios from 'axios'
import { NuxtCookies } from 'cookie-universal-nuxt'
import { edgeCatalog } from '~/stores/edgeCatalog'
import { coa } from '~/stores/coa'
import { user } from '~/stores/user'
import svgUtils from '~/composables/svgUtils'
import { useGates } from '~/composables/useGates'

const { getSvgMetadata, loadSvgFromString } = svgUtils()

const gates = useGates()

type Edge = {
  country: string
  magazine: string
  issuenumber: string
  designers: any[]
  photographers: any[]
}

const {
  $cookies: cookies,
}: {
  $cookies: NuxtCookies
} = useContext() as any

export default () => {
  const isCatalogLoaded = ref(false)
  const edgeCategories = ref([
    {
      status: 'ongoing',
      l10n: 'Ongoing edges',
      apiUrl: '/api/edgecreator/v2/model',
      svgCheckFn: (edge: Edge, currentUser: string) =>
        edge.designers.includes(currentUser),
    },
    {
      status: 'ongoing by another user',
      l10n: 'Ongoing edges handled by other users',
      apiUrl: '/api/edgecreator/v2/model/editedbyother/all',
      svgCheckFn: (edge: Edge) => edge.designers.length,
    },
    {
      status: 'pending',
      l10n: 'Pending edges',
      apiUrl: '/api/edgecreator/v2/model/unassigned/all',
      svgCheckFn: () => true,
    },
  ])

  const edgesByStatus = computed(() => {
    const edgesByStatus: {
      [status: string]: { [publicationcode: string]: any[] }
    } = Object.values(edgeCategories.value).reduce(
      (acc, { status }) => ({
        ...acc,
        [status]: {},
      }),
      {}
    )
    if (!edgeCatalog().currentEdges) {
      return edgesByStatus
    }
    return Object.values(edgeCatalog().currentEdges).reduce(
      (acc: typeof edgesByStatus, edge) => {
        const publicationcode = `${edge.country}/${edge.magazine}`
        if (!acc[edge.status][publicationcode]) {
          acc[edge.status][publicationcode] = []
        }
        acc[edge.status][publicationcode].push(edge)
        return acc
      },
      edgesByStatus
    )
  })

  const getEdgeFromApi = (
    {
      pays: country,
      magazine,
      numero: issuenumber,
      contributeurs: contributors,
      photos,
    }: {
      pays: string
      magazine: string
      numero: string
      contributeurs: any[]
      photos: any[]
    },
    status: string
  ) => {
    const issuecode = `${country}/${magazine} ${issuenumber}`
    const getContributorsOfType = (contributionType: string) =>
      (contributors || [])
        .filter(({ contribution }) => contribution === contributionType)
        .map(
          ({ idUtilisateur: userId }) =>
            user().allUsers!.find(({ id }) => id === userId).username
        )
    const photo =
      photos &&
      photos.find(({ estphotoprincipale: isMainPhoto }) => isMainPhoto)
    return {
      country,
      magazine,
      issuenumber,
      issuecode,
      v3: false,
      designers: getContributorsOfType('createur'),
      photographers: getContributorsOfType('photographe'),
      photo: photo && photo.idImage.nomfichier,
      status,
    }
  }

  const getEdgeFromSvg = (edge: Edge) => ({
    ...edge,
    v3: true,
    status: edgeCategories.value.reduce(
      (acc, { status, svgCheckFn }) =>
        acc || (svgCheckFn(edge, user().username) ? status : null),
      null
    ),
  })

  const canEditEdge = (status: string) =>
    !gates.hasRole('display') &&
    (gates.hasRole('admin') || status !== 'ongoing by another user')

  const getEdgeStatus = ({
    country,
    magazine,
    issuenumber,
  }: {
    country: string
    magazine: string
    issuenumber: string
  }) => {
    let isPublished = false
    const publicationcode = `${country}/${magazine}`
    const publishedEdgesForPublication =
      edgeCatalog().publishedEdges[publicationcode] || {}
    if (publishedEdgesForPublication[issuenumber]) {
      isPublished = true
    }
    const issuecode = `${publicationcode} ${issuenumber}`

    return (
      edgeCatalog().currentEdges[issuecode] || {
        status: isPublished ? 'Published' : 'none',
      }
    ).status
  }

  const loadCatalog = async (withDetails: boolean) => {
    if (isCatalogLoaded.value) {
      return
    }
    let currentEdges: { [issuecode: string]: Edge & { published?: true } } = {}
    const publishedSvgEdges = {}

    for (const { status, apiUrl } of edgeCategories.value) {
      const data = (await axios.get(apiUrl)).data
      currentEdges = data.reduce((acc, edgeData) => {
        const edge = getEdgeFromApi(edgeData, status)
        return { ...acc, [edge.issuecode]: edge }
      }, currentEdges)
    }

    const edges = (await axios.get('/fs/browseEdges')).data
    for (const edgeStatus in edges) {
      for (const fileName of edges[edgeStatus]) {
        const [, country, magazine, issuenumber] = fileName.match(
          /\/([^/]+)\/gen\/_?([^.]+)\.(.+).svg$/
        )
        if ([country, magazine, issuenumber].includes(undefined)) {
          console.error(`Invalid SVG file name : ${fileName}`)
          continue
        }
        const publicationcode = `${country}/${magazine}`
        const issuecode = `${publicationcode} ${issuenumber}`
        try {
          if (edgeStatus === 'published') {
            if (!publishedSvgEdges[publicationcode]) {
              publishedSvgEdges[publicationcode] = {}
            }
            publishedSvgEdges[publicationcode][issuenumber] = {
              issuenumber,
              v3: true,
            }
          } else if (withDetails) {
            const { svgChildNodes } = await loadSvgFromString(
              country,
              magazine,
              issuenumber,
              edgeStatus === 'published'
            )
            const designers = getSvgMetadata(
              svgChildNodes,
              'contributor-designer'
            )
            const photographers = getSvgMetadata(
              svgChildNodes,
              'contributor-photographer'
            )

            currentEdges[issuecode] = getEdgeFromSvg({
              country,
              magazine,
              issuenumber,
              designers,
              photographers,
            })
          } else {
            currentEdges[issuecode] = getEdgeFromSvg({
              country,
              magazine,
              issuenumber,
              designers: [],
              photographers: [],
            })
          }
        } catch (e) {
          console.error(`No SVG found : ${country}/${magazine} ${issuenumber}`)
        }
      }
    }

    if (Object.keys(currentEdges).length) {
      await coa().fetchPublicationNames([
        ...new Set(
          Object.values(currentEdges).map(
            ({ country, magazine }) => `${country}/${magazine}`
          )
        ),
      ])

      for (const edgeIssueCode of Object.keys(currentEdges)) {
        currentEdges[edgeIssueCode].published = getEdgeStatus(
          currentEdges[edgeIssueCode]
        )
      }

      edgeCatalog().addCurrentEdges(currentEdges)
    }

    edgeCatalog().addPublishedEdges(publishedSvgEdges)

    isCatalogLoaded.value = true
  }
  onMounted(async () => {
    await user().fetchAllUsers()
    user().username = cookies.get('dm-user')
  })

  return {
    edgesByStatus,
    getEdgeFromApi,
    getEdgeFromSvg,
    canEditEdge,
    getEdgeStatus,
    loadCatalog,
    isCatalogLoaded,
  }
}
