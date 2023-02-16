<template>
  <b-alert v-if="error" align="center" variant="danger" show>
    {{ error }}
  </b-alert>
  <b-container
    v-else-if="Object.keys(steps).length && Object.keys(dimensions).length"
    id="wrapper"
    fluid
  >
    <b-alert
      v-for="(warning, idx) in mainStore.warnings"
      :key="`warning-${idx}`"
      align="center"
      dismissible
      variant="warning"
      show
      @dismissed="mainStore.removeWarning(idx)"
    >
      {{ warning }}
    </b-alert>
    <top-bar
      :dimensions="editingDimensions"
      @overwrite-model="overwriteModel"
      @set-dimensions="overwriteDimensions"
    />
    <position-helper />
    <b-row class="flex-grow-1 pt-2" align-h="end">
      <b-col class="d-flex align-items-end flex-column overflow-auto h-100">
        <table class="edges">
          <tr v-if="showIssueNumbers">
            <th
              v-if="showPreviousEdge && edgesBefore.length"
              class="surrounding-edge"
            >
              {{ edgesBefore[edgesBefore.length - 1].issuenumber }}
            </th>
            <template v-for="issuenumber in issuenumbers">
              <th
                :key="`issuenumber-${issuenumber}`"
                :class="{
                  clickable: true,
                  published: isPublished(issuenumber),
                  pending: isPending(issuenumber),
                }"
                @click.exact="replaceEditIssuenumber(issuenumber)"
                @click.shift="toggleEditIssuenumber(issuenumber)"
                @dblclick="addEditIssuenumbers(issuenumbers)"
              >
                <div v-if="editingIssuenumbers.includes(issuenumber)">
                  <b-icon-pencil />
                </div>
                <div>
                  {{ issuenumber }}
                </div>
              </th>
              <th
                v-if="uiStore.showEdgePhotos && photoUrls[issuenumber]"
                :key="`photo-icon-${issuenumber}`"
              >
                <b-icon-camera />
              </th>
            </template>
            <th
              v-if="showNextEdge && edgesAfter.length"
              class="surrounding-edge"
            >
              {{ edgesAfter[0].issuenumber }}
            </th>
          </tr>
          <tr>
            <td v-if="showPreviousEdge && edgesBefore.length">
              <published-edge
                :issuenumber="edgesBefore[edgesBefore.length - 1].issuenumber"
                @load="showPreviousEdge = true"
                @error="showPreviousEdge = null"
              />
            </td>
            <template v-for="issuenumber in issuenumbers">
              <td :key="`canvas-${issuenumber}`">
                <edge-canvas
                  v-if="dimensions[issuenumber]"
                  :issuenumber="issuenumber"
                  :dimensions="dimensions[issuenumber]"
                  :steps="steps[issuenumber]"
                  :photo-url="photoUrls[issuenumber]"
                  :contributors="contributors[issuenumber] || {}"
                />
              </td>
              <td
                v-if="uiStore.showEdgePhotos && photoUrls[issuenumber]"
                :key="`photo-${issuenumber}`"
              >
                <img
                  :alt="photoUrls[issuenumber]"
                  :src="getImageUrl('photos', photoUrls[issuenumber])"
                  :class="{ picker: !!colorPickerOption }"
                  :style="{
                    height: `${zoom * dimensions[issuenumber].height}px`,
                  }"
                  crossorigin
                  @click="setColorFromPhoto"
                  @load="uiStore.showEdgePhotos = true"
                  @error="uiStore.showEdgePhotos = null"
                />
              </td>
            </template>
            <td v-if="showNextEdge && edgesAfter.length">
              <published-edge
                :issuenumber="edgesAfter[0].issuenumber"
                @load="showNextEdge = true"
                @error="showNextEdge = null"
              />
            </td>
          </tr>
        </table>
      </b-col>
      <b-col sm="10" md="8" lg="6">
        <model-edit
          :dimensions="editingDimensions"
          :steps="editingSteps"
          :all-step-colors="stepColors"
          @add-step="addStep($event)"
          @remove-step="removeStep($event)"
          @duplicate-step="duplicateStep($event)"
          @swap-steps="swapSteps($event)"
        />
      </b-col>
    </b-row>
  </b-container>
</template>
<script lang="ts">
export default {
  middleware: ['authenticated', 'is-editor'],
}
</script>
<script setup lang="ts">
import { BIconCamera, BIconPencil } from 'bootstrap-vue'
import {
  computed,
  onMounted,
  ref,
  useFetch,
  useRoute,
  watch,
} from '@nuxtjs/composition-api'
import { main } from '~/stores/main'
import { user } from '~/stores/user'
import { editingStep } from '~/stores/editingStep'
import { ui } from '~/stores/ui'
import { edgeCatalog } from '~/stores/edgeCatalog'
import TopBar from '@/components/TopBar'
import EdgeCanvas from '@/components/EdgeCanvas'
import PublishedEdge from '@/components/PublishedEdge'
import ModelEdit from '@/components/ModelEdit'
import PositionHelper from '@/components/PositionHelper'
import dimensions from '~/composables/dimensions'
import surroundingEdge from '~/composables/surroundingEdge'
import stepList from '~/composables/stepList'
import modelLoad from '~/composables/modelLoad'
import { globalEvent } from '~/stores/globalEvent'

const uiStore = ui()
const mainStore = main()
const { showPreviousEdge, showNextEdge } = surroundingEdge()
const { addStep, removeStep, duplicateStep, swapSteps, steps } = stepList()
const { loadModel } = modelLoad()
const route = useRoute()

const error = ref(null as string | null)
useFetch(async () => await user().fetchAllUsers())

const editingDimensions = computed(() =>
  editingStep().issuenumbers.reduce(
    (acc, issuenumber) => ({
      ...acc,
      [issuenumber]: dimensions().dimensions.value[issuenumber],
    }),
    {}
  )
)

const editingSteps = computed(() =>
  editingStep().issuenumbers.reduce(
    (acc, issuenumber) => ({
      ...acc,
      [issuenumber]: steps.value[issuenumber],
    }),
    {}
  )
)
const isColorOption = (optionName: string) =>
  optionName.toLowerCase().includes('color') ||
  ['fill', 'stroke'].includes(optionName)

const stepColors = computed(() =>
  Object.keys(steps.value).reduce(
    (acc, issuenumber) => ({
      ...acc,
      [issuenumber]: steps.value[issuenumber].map((step) => [
        ...new Set(
          Object.keys(step.options || {})
            .filter(
              (optionName) =>
                isColorOption(optionName) &&
                step.options[optionName] !== 'transparent'
            )
            .reduce(
              (acc, optionName) => [...acc, step.options[optionName]],
              [] as any[]
            )
        ),
      ]),
    }),
    {}
  )
)

watch(
  () => editingStep().issuenumbers,
  async (newValue) => {
    if (newValue) {
      await mainStore.loadItems({ itemType: 'elements' })
      await mainStore.loadItems({ itemType: 'photos' })
      await mainStore.loadSurroundingEdges()
    }
  }
)
watch(
  () => error.value,
  (newValue) => {
    if (newValue) {
      console.trace(newValue)
    }
  }
)

onMounted(async () => {
  let country, magazine, issuenumberMin, issuenumberMax, issuenumberOthers
  try {
    ;[, country, magazine, issuenumberMin, issuenumberMax, issuenumberOthers] =
      route.value.params.pathMatch.match(
        /^([^/]+)\/([^ ]+) ([^, ]+)(?: to (.+))?(?:,([^$]+))?$/
      )!
    magazine = magazine.replaceAll(/ +/g, '')
  } catch (_) {
    error.value = 'Invalid URL'
    return
  }
  mainStore.country = country
  mainStore.magazine = magazine
  editingStep().addIssuenumber(issuenumberMin)

  await mainStore.loadPublicationIssues()

  try {
    mainStore.setIssuenumbers({
      min: issuenumberMin,
      max: issuenumberMax,
      others: issuenumberOthers,
    })

    for (let idx = 0; idx < mainStore.issuenumbers.length; idx++) {
      if (!Object.prototype.hasOwnProperty.call(mainStore.issuenumbers, idx)) {
        continue
      }
      const issuenumber = mainStore.issuenumbers[idx]
      try {
        await loadModel(country, magazine, issuenumber, issuenumber)
      } catch {
        if (mainStore.issuenumbers[idx - 1]) {
          stepList().copyDimensionsAndSteps(
            issuenumber,
            mainStore.issuenumbers[idx - 1]
          )
        } else {
          dimensions().setDimensions({ width: 15, height: 200 }, issuenumber)
          stepList().setSteps(issuenumber, [])
        }
      }
    }
  } catch (e) {
    error.value = e as string
  }
})

const overwriteModel = async ({
  publicationCode,
  issueNumber,
}: {
  publicationCode: string
  issueNumber: string
}) => {
  const [country, magazine] = publicationCode.split('/')
  for (const targetIssuenumber of editingStep().issuenumbers) {
    try {
      await loadModel(country, magazine, issueNumber, targetIssuenumber)
    } catch (e) {
      mainStore.addWarning(e as string)
    }
  }
}
const overwriteDimensions = ({
  width,
  height,
}: {
  width: number
  height: number
}) => {
  for (const targetIssuenumber of editingStep().issuenumbers) {
    dimensions().setDimensions(
      {
        width,
        height,
      },
      targetIssuenumber
    )
  }
}

const getImageUrl = (fileType: string, fileName: string) =>
  `/edges/${mainStore.country}/${
    fileType === 'elements' ? fileType : 'photos'
  }/${fileName}`

const setColorFromPhoto = ({
  target: imgElement,
  offsetX,
  offsetY,
}: {
  target: HTMLImageElement
  offsetX: number
  offsetY: number
}) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = imgElement.width
  canvas.height = imgElement.height
  context.drawImage(imgElement, 0, 0, imgElement.width, imgElement.height)
  const color = context.getImageData(offsetX, offsetY, 1, 1).data
  globalEvent().options = {
    [uiStore.colorPickerOption!]: rgbToHex(color[0], color[1], color[2]),
  }
}

const isPending = (issuenumber: string) =>
  !!edgeCatalog().currentEdges[
    `${mainStore.country}/${mainStore.magazine} ${issuenumber}`
  ]
const isPublished = (issuenumber: string) =>
  !!(edgeCatalog().publishedEdges[
    `${mainStore.country}/${mainStore.magazine}`
  ] || {})[issuenumber]

const rgbToHex = (r: number, g: number, b: number) =>
  `#${((r << 16) | (g << 8) | b).toString(16)}`
</script>
<style lang="scss" scoped>
#wrapper {
  display: flex;
  flex-direction: column;
  user-select: none;
}

.alert-warning {
  margin-left: 350px;
  margin-right: 150px;
}

.picker {
  cursor: crosshair;
}

.clickable {
  cursor: pointer;
}

table.edges {
  margin-left: auto !important; /* https://stackoverflow.com/a/37515194/2847079 */
  tr {
    > * {
      text-align: center;
      vertical-align: bottom;
    }
    td {
      padding: 0;
    }
    th {
      padding: 1px 2px;

      &.published {
        background: green;
      }

      &.pending {
        background: orange;
      }

      &.surrounding-edge {
        font-weight: normal;
      }
    }
  }
}
</style>
