import { mapActions, mapMutations, mapState } from 'vuex'
import svgUtilsMixin from '@/mixins/svgUtilsMixin'

export default {
  computed: {
    ...mapState('edgeCatalog', ['currentEdges', 'publishedEdges']),
    ...mapState('coa', ['publicationNames']),
    ...mapState('user', ['allUsers']),
  },
  mixins: [svgUtilsMixin],

  methods: {
    ...mapMutations('edgeCatalog', ['addCurrentEdges']),
    ...mapActions('coa', ['fetchPublicationNames']),
    ...mapActions('user', ['fetchAllUsers']),

    getEdgeFromApi(
      { pays: country, magazine, numero: issuenumber, contributeurs: contributors },
      status
    ) {
      const vm = this
      const getContributorsOfType = (contributionType) =>
        (contributors || [])
          .filter(({ contribution }) => contribution === contributionType)
          .map(({ idUtilisateur }) => vm.allUsers.find(({ id }) => id === idUtilisateur).username)
      return {
        country,
        magazine,
        issuenumber,
        v3: false,
        designers: getContributorsOfType('createur'),
        photographers: getContributorsOfType('photographe'),
        status,
      }
    },
    getEdgeFromSvg(edge) {
      return {
        ...edge,
        v3: true,
        status: edge.designers.length
          ? edge.designers.includes(this.$cookies.get('dm-user'))
            ? 'ongoing'
            : 'ongoing_by_other_user'
          : 'pending',
      }
    },
    getEdgesByStatus(status) {
      return (this.currentEdges || []).filter(({ status: edgeStatus }) => edgeStatus === status)
    },
    getEdgeStatus({ country, issuenumber, magazine }) {
      const isPublished = (this.publishedEdges[`${country}/${magazine}`] || []).some(
        (publishedEdge) => publishedEdge.issuenumber === issuenumber
      )

      return (
        this.currentEdges.find(
          (currentEdge) =>
            currentEdge.country === country &&
            currentEdge.magazine === magazine &&
            currentEdge.issuenumber === issuenumber
        ) || { status: isPublished ? 'published' : 'none' }
      ).status
    },
  },

  watch: {
    currentEdges: {
      immediate: true,
      async handler(newValue) {
        if (newValue) {
          await this.fetchPublicationNames([
            ...new Set(newValue.map(({ country, magazine }) => `${country}/${magazine}`)),
          ])
        }
      },
    },
  },

  async mounted() {
    await this.fetchAllUsers()
    const vm = this
    let newEdges = []

    const apiCalls = [
      { status: 'ongoing', url: '/api/edgecreator/v2/model' },
      { status: 'ongoing_by_other_user', url: '/api/edgecreator/v2/model/editedbyother/all' },
      { status: 'pending', url: '/api/edgecreator/v2/model/unassigned/all' },
    ]
    for (const { status, url } of apiCalls) {
      const data = await this.$axios.$get(url)
      newEdges = [...newEdges, ...data.map((edge) => this.getEdgeFromApi(edge, status))]
    }

    this.$axios.$get('/fs/browseCurrentEdges').then(async (currentEdges) => {
      for (const fileName of currentEdges) {
        const [, country, magazine, issuenumber] = fileName.match(
          /\/([^/]+)\/gen\/_([^.]+)\.(.+).svg$/
        )
        if ([country, magazine, issuenumber].includes(undefined)) {
          console.error(`Invalid SVG file name : ${fileName}`)
          continue
        }
        const { svgChildNodes } = await this.loadSvgFromString(country, magazine, issuenumber)
        const designers = vm.getSvgMetadata(svgChildNodes, 'contributor-designer')
        const photographers = vm.getSvgMetadata(svgChildNodes, 'contributor-photographer')

        newEdges.push(
          vm.getEdgeFromSvg({ country, magazine, issuenumber, designers, photographers })
        )
      }

      this.addCurrentEdges(newEdges)
    })
  },
}