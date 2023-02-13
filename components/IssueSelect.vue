<template>
  <div>
    <b-select
      v-model="currentCountryCode"
      :options="countriesWithSelect"
      @change="$emit('change', null)"
    />
    <b-select
      v-show="currentCountryCode"
      v-model="currentPublicationCode"
      :options="publicationsWithSelect"
      @change="$emit('change', null)"
    />
    <template v-if="currentCountryCode && currentPublicationCode">
      <template v-if="edgeGallery">
        <edge-gallery
          v-if="isCatalogLoaded"
          :publicationcode="currentPublicationCode"
          :selected="currentIssueNumber"
          :has-more-before="hasMoreIssuesToLoad.before"
          :has-more-after="hasMoreIssuesToLoad.after"
          @load-more="
            surroundingIssuesToLoad = {
              ...surroundingIssuesToLoad,
              [$event]: surroundingIssuesToLoad[$event] + 10,
            }
          "
          @change="
            currentIssueNumber = $event
            onChange({})
          "
        />
        <b-alert v-else show variant="info">{{ $t('Loading...') }} </b-alert>
      </template>
      <template v-else>
        <b-select
          v-show="currentCountryCode && currentPublicationCode"
          v-model="currentIssueNumber"
          :options="issuesWithSelect"
          @input="onChange({})"
        />
        <template v-if="canBeMultiple && currentIssueNumber !== null">
          <b-form-group class="mt-2">
            <b-form-radio v-model="editMode" name="editMode" value="single"
              >Edit a single edge</b-form-radio
            >
            <b-form-radio v-model="editMode" name="editMode" value="range"
              >Edit a range of edges (e.g. issues 1 to 3)</b-form-radio
            >
          </b-form-group>
          <b-select
            v-show="editMode === 'range'"
            v-model="currentIssueNumberEnd"
            :options="issuesWithSelect"
            @input="onChange({})"
          />
        </template>
      </template>
    </template>
    <dimensions
      v-if="dimensions && currentIssueNumber !== null"
      :width="dimensions.width"
      :height="dimensions.height"
      @change="onChange($event)"
    />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'nuxt-i18n-composable'
import { computed, onMounted, ref, watch } from '@nuxtjs/composition-api'
import axios from 'axios'
import Dimensions from '@/components/Dimensions'
import edgeCatalog from '~/composables/edgeCatalog'
import EdgeGallery from '@/components/EdgeGallery'
import { coa } from '~/stores/coa'
import { edgeCatalog as edgeCatalogStore } from '~/stores/edgeCatalog'

const i18n = useI18n()

const { getEdgeStatus, loadCatalog, isCatalogLoaded } = edgeCatalog()

const emit = defineEmits<{
  (
    e: 'change',
    value: {
      editMode: string
      countryCode: string
      publicationCode: string
      issueNumber: string
      issueNumberEnd: string
    }
  ): void
}>()

const props = withDefaults(
  defineProps<{
    countryCode?: string | null
    publicationCode?: string | null
    canBeMultiple: boolean
    dimensions?: object | null
    disableOngoingOrPublished: boolean
    disableNotOngoingNorPublished: boolean
    edgeGallery: boolean
    baseIssueNumbers: string[]
  }>(),
  {
    countryCode: null,
    publicationCode: null,
    canBeMultiple: false,
    dimensions: null,
    edgeGallery: false,
    baseIssueNumbers: () => [],
  }
)

const currentCountryCode = ref(null as string | null)
const currentPublicationCode = ref(null as string | null)
const currentIssueNumber = ref(null as string | null)
const currentIssueNumberEnd = ref(null as string | null)
const editMode = ref('single' as 'single' | 'range')
const hasMoreIssuesToLoad = ref({ before: false, after: false })
const surroundingIssuesToLoad = ref({ before: 10, after: 10 })

const countriesWithSelect = computed(
  () =>
    coa().countryNames && [
      { value: null, text: i18n.t('Select a country') },
      ...Object.keys(coa().countryNames!).map((countryName) => ({
        value: countryName,
        text: coa().countryNames![countryName],
      })),
    ]
)
const publicationsWithSelect = computed(
  () =>
    coa().publicationNames &&
    Object.keys(coa().publicationNames)
      .filter(
        (publicationCode) =>
          publicationCode.indexOf(`${currentCountryCode.value}/`) === 0
      )
      .map((publicationCode) => ({
        text: coa().publicationNames[publicationCode],
        value: publicationCode,
      }))
      .sort(({ text: text1 }, { text: text2 }) =>
        text1 < text2 ? -1 : text2 < text1 ? 1 : 0
      )
)

const publicationIssues = computed(
  () => coa().issueNumbers && coa().issueNumbers[currentPublicationCode.value!]
)

const issuesWithSelect = computed(
  () =>
    publicationIssues.value &&
    edgeCatalogStore().publishedEdges[currentPublicationCode.value!] && [
      { value: null, text: i18n.t('Select an issue number') },
      ...coa().issueNumbers[currentPublicationCode.value!].map(
        (issuenumber) => {
          const status = getEdgeStatus({
            country: currentCountryCode.value!,
            magazine: currentPublicationCode.value!.split('/')[1],
            issuenumber,
          })
          return {
            value: issuenumber,
            text: `${issuenumber}${
              status === 'none' ? '' : ` (${i18n.t(status)})`
            }`,
            disabled:
              (props.disableOngoingOrPublished && status !== 'none') ||
              (props.disableNotOngoingNorPublished && status === 'none'),
          }
        }
      ),
    ]
)

watch(
  () => currentCountryCode.value,
  async (newValue) => {
    if (newValue) {
      currentPublicationCode.value = props.publicationCode
      currentIssueNumber.value = null

      await coa().fetchPublicationNamesFromCountry(newValue)
    }
  },
  {
    immediate: true,
  }
)

watch(
  () => currentPublicationCode.value,
  async (newValue) => {
    if (newValue) {
      currentIssueNumber.value = null
      await coa().fetchIssueNumbers([newValue])
      await loadEdges()
    }
  },
  { immediate: true }
)

watch(
  () => surroundingIssuesToLoad.value,
  async () => {
    await loadEdges()
  }
)

onMounted(async () => {
  if (props.countryCode) {
    currentCountryCode.value = props.countryCode
  }
  await coa().fetchCountryNames(i18n.locale.value)
  await loadCatalog(false)
})

const loadEdges = async () => {
  let issueNumbersFilter = ''
  if (props.edgeGallery) {
    const minBaseIssueNumberIndex = publicationIssues.value.indexOf(
      props.baseIssueNumbers[0]
    )
    const maxBaseIssueNumberIndex = publicationIssues.value.indexOf(
      props.baseIssueNumbers[props.baseIssueNumbers.length - 1]
    )
    issueNumbersFilter = `/${publicationIssues.value
      .filter(
        (issueNumber, index) =>
          minBaseIssueNumberIndex - index <
            surroundingIssuesToLoad.value.before &&
          index - maxBaseIssueNumberIndex <
            surroundingIssuesToLoad.value.after &&
          !props.baseIssueNumbers.includes(issueNumber)
      )
      .join(',')}`
    hasMoreIssuesToLoad.value = {
      before: issueNumbersFilter[0] !== publicationIssues.value[0],
      after:
        issueNumbersFilter[issueNumbersFilter.length] !==
        publicationIssues.value[publicationIssues.value.length],
    }
  }
  const publishedEdges = (
    await axios.get(
      `/api/edges/${currentPublicationCode.value}${issueNumbersFilter}`
    )
  ).data
  edgeCatalogStore().addPublishedEdges({
    [currentPublicationCode.value!]: publishedEdges.reduce(
      (
        acc: { [issuenumber: string]: { id: number; modelId: number } },
        {
          issuenumber,
          id,
          modelId,
        }: { issuenumber: string; id: number; modelId: number }
      ) => ({
        ...acc,
        ...(modelId ? { [issuenumber]: { id, modelId } } : {}),
      }),
      {} as { [issuenumber: string]: { id: number; modelId: number } }
    ),
  })
}

const onChange = (data: { width: number; height: number } | {}) => {
  emit('change', {
    ...data,
    editMode: editMode.value,
    countryCode: currentCountryCode.value!,
    publicationCode: currentPublicationCode.value!,
    issueNumber: currentIssueNumber.value!,
    issueNumberEnd: currentIssueNumberEnd.value!,
  })
}
</script>
<style scoped lang="scss">
::v-deep select + div {
  overflow-x: hidden;
  overflow-y: auto;
  padding: 3px;
  margin-bottom: 10px;
}
::v-deep .custom-control-input[type='checkbox'] {
  position: static;
  width: 2rem;
}
</style>
