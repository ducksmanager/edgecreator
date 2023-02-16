<template>
  <div v-show="$gates.getRoles().length">
    <session-info />
    <h1>{{ $t('Dashboard') }}</h1>

    <b-alert v-if="!isCatalogLoaded" show variant="info">{{
      $t('Loading...')
    }}</b-alert>

    <template v-else>
      <h3>{{ $t('Edge creation') }}</h3>

      <b-container v-if="isUploadableEdgesCarouselReady" align="center">
        <b-alert show variant="info">
          <template v-if="mostPopularIssuesInCollectionWithoutEdge.length">
            <uploadable-edges-carousel
              :user-points="userStore.userPhotographerPoints"
              :issues="mostPopularIssuesInCollectionWithoutEdge"
              :publication-names="publicationNames"
            >
              <template #header>
                {{
                  $t(
                    'Send us photos of magazine edges that you own and earn up to {0} Edge photographer points per edge!',
                    [mostPopularIssuesInCollectionWithoutEdge[0].popularity]
                  )
                }}
              </template>
            </uploadable-edges-carousel>
            <div>
              <div class="position-absolute px-2 separation-text">
                {{ $t('or') }}
              </div>
              <hr />
            </div>
          </template>
          <uploadable-edges-carousel
            :user-points="userStore.userPhotographerPoints"
            :issues="mostWantedEdges"
            :publication-names="publicationNames"
          >
            <template #header>
              {{
                $t(
                  'Send us photos of magazine edges that you find on the Internet and earn up to {0} Edge photographer points per edge!',
                  [mostWantedEdges[0].popularity]
                )
              }}
            </template>
          </uploadable-edges-carousel>
          <b-button to="/upload" class="mt-1">{{
            $t('Send edge photos')
          }}</b-button>
        </b-alert>
      </b-container>

      <b-container v-role:unless="'display'" class="mt-3" align="center">
        <b-button to="/edit/new">{{
          $t('Create or edit an edge model')
        }}</b-button>
      </b-container>

      <hr />

      <template v-for="{ status, l10n } in edgeCategories">
        <h3 :key="`${status}-title`">{{ $t(l10n) }}</h3>

        <b-container
          v-if="Object.keys(edgesByStatus[status]).length"
          :key="`status-${status}`"
        >
          <template v-for="(edges, publicationcode) in edgesByStatus[status]">
            <b-row :key="`${status}-${publicationcode}-title`">
              <b-link
                class="mx-3"
                :to="`edit/${publicationcode} ${edges
                  .map((edge) => edge.issuenumber)
                  .join(',')}`"
                ><b-btn
                  v-if="canEditEdge(status)"
                  size="sm"
                  variant="outline-secondary"
                  >Tout éditer ({{ edges.length }})</b-btn
                ></b-link
              ><publication
                :publicationname="publicationNames[publicationcode]"
                :publicationcode="publicationcode"
            /></b-row>
            <b-row :key="`${status}-${publicationcode}-edges`">
              <b-col
                v-for="(edge, i) in edges"
                :key="`${status}-${i}`"
                align-self="center"
                cols="12"
                md="6"
                lg="3"
              >
                <b-card class="text-center">
                  <b-link
                    :to="`edit/${edge.country}/${edge.magazine} ${edge.issuenumber}`"
                    :disabled="!canEditEdge(status)"
                  >
                    <b-card-text>
                      <img
                        v-if="edge.v3 || status === 'pending'"
                        :alt="`${edge.country}/${edge.magazine} ${edge.issuenumber}`"
                        class="edge-preview"
                        :src="
                          edge.v3
                            ? getEdgeUrl(
                                edge.country,
                                edge.magazine,
                                edge.issuenumber,
                                'svg',
                                false
                              )
                            : getPhotoUrl(edge.country, edge.photo)
                        "
                      /><edge-link
                        :publicationcode="`${edge.country}/${edge.magazine}`"
                        :issuenumber="edge.issuenumber"
                        :designers="edge.designers"
                        :photographers="edge.photographers"
                        :published="edge.published === 'Published'"
                      />
                    </b-card-text>
                  </b-link>
                </b-card>
              </b-col>
            </b-row>
          </template>
        </b-container>
        <div v-else :key="`no-edge-${status}`" align="center">
          {{ $t('No edge in this category') }}
        </div>
      </template>
    </template>

    <b-container align="center" class="m-5">&nbsp;</b-container>

    <b-container
      id="footer"
      class="position-fixed text-center w-100 bg-light p-2"
      >{{
        $t(
          'EdgeCreator is a tool allowing to create edges for the DucksManager bookcase.'
        )
      }}<br /><a href="https://ducksmanager.net">{{
        $t('Go to DucksManager')
      }}</a></b-container
    >
  </div>
</template>
<script lang="ts">
export default {
  middleware: 'authenticated',
}
</script>
<script setup lang="ts">
import UploadableEdgesCarousel from 'ducksmanager/src/components/UploadableEdgesCarousel.vue'
import Publication from 'ducksmanager/src/components/Publication.vue'
import { computed, onMounted, ref } from '@nuxtjs/composition-api'
import axios from 'axios'
import edgeCatalog from '~/composables/edgeCatalog'
import EdgeLink from '@/components/EdgeLink'
import SessionInfo from '@/components/SessionInfo'
import { collection } from '~/stores/collection'
import { user } from '~/stores/user'
import svgUtils from '~/composables/svgUtils'
import { edgeCatalog as edgeCatalogStore } from '~/stores/edgeCatalog'
import { coa } from '~/stores/coa'

const { getEdgeUrl } = svgUtils()
const publicationNames = computed(() => coa().publicationNames)

const { edgesByStatus, canEditEdge, loadCatalog } = edgeCatalog()
const userStore = user()
const collectionStore = collection()

const isUploadableEdgesCarouselReady = ref(false as boolean)
const mostWantedEdges = ref(
  null as
    | { publicationCode: string; issuenumber: string; numberOfIssues: number }[]
    | null
)

const mostPopularIssuesInCollectionWithoutEdge = computed(() =>
  collectionStore.popularIssuesInCollectionWithoutEdge
    ?.sort(
      (
        { popularity: popularity1 }: { popularity: number },
        { popularity: popularity2 }: { popularity: number }
      ) => popularity2 - popularity1
    )
    .filter((_, index) => index < 10)
)

onMounted(async () => {
  await userStore.fetchUserPoints()
  await collectionStore.loadPopularIssuesInCollection()
  await collectionStore.loadBookcase()
  await loadMostWantedEdges()
  await loadCatalog(true)
  await coa().fetchPublicationNames([
    ...new Set([
      ...collectionStore.bookcase!.map(
        ({ countryCode, magazineCode }) => `${countryCode}/${magazineCode}`
      ),
      ...mostWantedEdges.value!.map(({ publicationCode }) => publicationCode),
      ...Object.values(edgeCatalogStore().currentEdges).map(
        ({ country, magazine }) => `${country}/${magazine}`
      ),
    ]),
  ])
  isUploadableEdgesCarouselReady.value = true
})

const getPhotoUrl = (country: string, fileName: string) =>
  `/edges/${country}/photos/${fileName}`

const loadMostWantedEdges = async () => {
  mostWantedEdges.value = (await axios.get('/wanted-edges')).data.wantedEdges
    .slice(0, 10)
    .map(
      ({
        publicationcode,
        issuenumber,
        numberOfIssues,
      }: {
        publicationcode: string
        issuenumber: string
        numberOfIssues: number
      }) => ({
        issueCode: `${publicationcode} ${issuenumber}`,
        publicationCode: publicationcode,
        issueNumber: issuenumber,
        popularity: numberOfIssues,
      })
    )
}
</script>
<style scoped lang="scss">
::v-deep .carousel {
  height: 100px;
  * {
    line-height: 10px;
    font-size: 11px !important;
    a span {
      color: #666;
    }
  }
}
.card {
  margin: 15px 0;

  .edge-preview {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
  }
}
.disabled {
  pointer-events: none;
}

.separation-text {
  margin-top: -12px !important;
  background: #d1ecf1;
  left: 50%;
}

#footer {
  bottom: 0;
  max-width: 100%;
}
</style>
