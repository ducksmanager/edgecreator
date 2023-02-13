<template>
  <b-card id="edit-card" no-body>
    <b-tabs v-model="editingStepStore.stepNumber" lazy pills card vertical>
      <b-tab v-for="(step, stepNumber) in optionsPerName" :key="stepNumber">
        <template #title>
          <span
            :class="{
              'hovered-step': hoveredStepStore.stepNumber === stepNumber,
            }"
            @mouseover="hoveredStepStore.stepNumber = stepNumber"
            @mouseout="hoveredStepStore.stepNumber = null"
          >
            {{
              $t(
                rendersStore.supportedRenders.find(
                  (render) => render.component === step.component
                ).labelL10nKey
              )
            }}
          </span>
          <div class="action-icons">
            <b-icon-arrow-up-square-fill
              v-b-tooltip.hover
              :title="$t('Move up')"
              :class="{ invisible: stepNumber === 0 }"
              @click.stop="$emit('swap-steps', [stepNumber - 1, stepNumber])"
            />
            <b-icon-eye-slash-fill
              v-if="step.options.visible && step.options.visible[0] === false"
              :title="$t('Click to show')"
              @click.stop="
                globalEventStore.options = { stepNumber, visible: true }
              "
            />
            <b-icon-eye-fill
              v-else
              :title="$t('Click to hide')"
              @click.stop="
                globalEventStore.options = { stepNumber, visible: false }
              "
            />
            <b-icon-front
              :title="$t('Duplicate')"
              @click.stop="$emit('duplicate-step', stepNumber)"
            />
            <b-icon-x-square-fill
              v-b-tooltip.hover
              :title="$t('Delete')"
              @click.stop="$emit('remove-step', stepNumber)"
            />
            <b-icon-arrow-down-square-fill
              v-b-tooltip.hover
              :title="$t('Move down')"
              :class="{ invisible: stepNumber === steps.length - 1 }"
              @click.stop="$emit('swap-steps', [stepNumber, stepNumber + 1])"
            />
          </div>
        </template>
        <b-card-text v-if="step.component === 'Text'">
          <form-input-row
            option-name="text"
            :label="$t('Text').toString()"
            type="text"
            :options="step.options"
          >
            <template #alert
              >{{
                $t('You can use special text parts to make your text dynamic :')
              }}
              <ul>
                <i18n
                  tag="li"
                  path="Write {templateString} to inject in your text the current issue number"
                >
                  <template #templateString>
                    <pre class="d-inline-block">[Numero]</pre>
                  </template>
                </i18n>
                <i18n
                  tag="li"
                  path="Write {templateString1} to inject in your text the first digit of the current issue number, {templateString2} for the second digit, etc."
                >
                  <template #templateString1>
                    <pre class="d-inline-block">[Numero[0]]</pre>
                  </template>
                  <template #templateString2>
                    <pre class="d-inline-block">[Numero[1]]</pre>
                  </template>
                </i18n>
              </ul>
            </template>
          </form-input-row>
          <form-input-row
            option-name="font"
            :label="$t('Font').toString()"
            type="text"
            :options="step.options"
            ><a
              target="_blank"
              :href="fontSearchUrl"
              class="position-absolute input-extra"
              >Rechercher</a
            ></form-input-row
          >
          <form-color-input-row
            :options="step.options"
            :other-colors="otherColors[stepNumber]"
            option-name="bgColor"
            :label="$t('Background color').toString()"
          />
          <form-color-input-row
            :options="step.options"
            :other-colors="otherColors[stepNumber]"
            option-name="fgColor"
            :label="$t('Foreground color').toString()"
          />
          <form-input-row
            option-name="rotation"
            :label="
              $t('Rotation : {rotation}°', {
                rotation: step.options.rotation,
              }).toString()
            "
            type="range"
            :min="0"
            :max="270"
            :step="90"
            :options="step.options"
          />
          <b-btn
            size="sm"
            variant="outline-warning"
            class="d-block mt-3"
            @click="resetPositionAndSize(step)"
            >{{ $t('Reset position and size') }}
          </b-btn>
        </b-card-text>
        <b-card-text v-if="step.component === 'Fill'">
          <form-color-input-row
            :other-colors="otherColors[stepNumber]"
            :options="step.options"
            option-name="fill"
            :label="$t('Fill color').toString()"
          />
        </b-card-text>
        <b-card-text v-if="step.component === 'Image'">
          <b-btn
            size="sm"
            variant="outline-warning"
            class="d-block my-3 float-right"
            @click="splitImageAcrossEdges()"
            >{{
              $t(
                Object.keys(steps).length === 1
                  ? 'Fill the edge with this image'
                  : 'Split this image to fit all selected edges'
              )
            }}
          </b-btn>
          <div class="clearfix" />
          <form-input-row
            option-name="src"
            :label="$t('Image').toString()"
            type="text"
            list-id="src-list"
            :options="step.options"
          >
            <b-form-datalist
              id="src-list"
              :options="mainStore.publicationElements"
            />
            <gallery
              :items="mainStore.publicationElementsForGallery"
              image-type="elements"
              :selected="step.options.src"
              @change="globalEventStore.options = { src: $event }"
            />
          </form-input-row>
        </b-card-text>
        <b-card-text v-if="['Rectangle', 'ArcCircle'].includes(step.component)">
          <form-color-input-row
            v-for="optionName in ['fill', 'stroke']"
            :key="optionName"
            :other-colors="otherColors[stepNumber]"
            :options="step.options"
            :option-name="optionName"
            :label="$t(ucFirst(optionName + ' color')).toString()"
            can-be-transparent
          />
        </b-card-text>
        <b-card-text v-if="step.component === 'Gradient'">
          <form-color-input-row
            v-for="optionName in ['colorStart', 'colorEnd']"
            :key="optionName"
            :other-colors="otherColors[stepNumber]"
            :options="step.options"
            :option-name="optionName"
            :label="
              $t(
                optionName === 'colorStart' ? 'Start color' : 'End color'
              ).toString()
            "
          />

          <form-input-row
            type="select"
            :options="step.options"
            option-name="direction"
            :label="$t('Direction').toString()"
            :select-options="[$t('Vertical'), $t('Horizontal')]"
          />
        </b-card-text>
        <b-card-text v-if="step.component === 'Staple'">
          {{ $t('Move and resize the staples directly on the edge.') }}
        </b-card-text>
        <b-card-text v-if="step.component === 'Polygon'">
          <form-color-input-row
            :options="step.options"
            :other-colors="otherColors[stepNumber]"
            option-name="fill"
            :label="$t('Fill color').toString()"
          />
        </b-card-text>
      </b-tab>
      <b-tab
        key="99"
        :title="$t('Add step')"
        title-item-class="font-weight-bold"
      >
        <b-card-text>
          <b-dropdown :text="$t('Select a step type')">
            <b-dropdown-item
              v-for="render in rendersStore.supportedRenders"
              :key="render.component"
              @click="$emit('add-step', render.component)"
              >{{ $t(render.description) }}
            </b-dropdown-item>
          </b-dropdown>
        </b-card-text>
      </b-tab>
    </b-tabs>
  </b-card>
</template>
<script setup lang="ts">
import {
  BIconArrowDownSquareFill,
  BIconArrowUpSquareFill,
  BIconEyeFill,
  BIconEyeSlashFill,
  BIconFront,
  BIconXSquareFill,
} from 'bootstrap-vue'
import { computed } from '@nuxtjs/composition-api'
import { main } from '~/stores/main'
import { renders } from '~/stores/renders'
import FormColorInputRow from '@/components/FormColorInputRow'
import FormInputRow from '@/components/FormInputRow'
import Gallery from '@/components/Gallery'
import { editingStep } from '~/stores/editingStep'
import { hoveredStep } from '~/stores/hoveredStep'
import { globalEvent } from '~/stores/globalEvent'

const hoveredStepStore = hoveredStep()
const editingStepStore = editingStep()
const mainStore = main()
const rendersStore = renders()
const globalEventStore = globalEvent()

const props = defineProps<{
  dimensions: { [issuenumber: string]: { width: number; height: number } }
  steps: {
    [issuenumber: string]: {
      component: string
      options: { [optionName: string]: any }
    }[]
  }
  allStepColors: { [issuenumber: string]: string[] }
}>()

const issueNumbers = computed(() => Object.keys(props.steps))

const fontSearchUrl = computed(() => process.env.FONT_SEARCH_URL)
const optionsPerName = computed(() =>
  props.steps[issueNumbers.value[0]].map((step, stepNumber) => ({
    ...step,
    stepNumber,
    options: Object.keys(step.options || {}).reduce(
      (acc, optionName) => ({
        ...acc,
        [optionName]: [
          ...new Set(
            issueNumbers.value.map(
              (issuenumber) =>
                props.steps[issuenumber][stepNumber].options[optionName]
            )
          ),
        ],
      }),
      {}
    ),
  }))
)

const currentIssueNumbers = computed(() => Object.keys(props.steps))
const allIssueNumbers = computed(() => Object.keys(props.allStepColors))
const emptyColorList = computed(() =>
  Object.keys(props.allStepColors[Object.keys(props.steps)[0]]).reduce(
    (acc, stepNumber) => ({ ...acc, [stepNumber]: [] }),
    {}
  )
)

const otherColors = computed(() =>
  Object.keys(optionsPerName.value)
    .map((currentStepNumber) => parseInt(currentStepNumber))
    .map((currentStepNumber) => {
      const otherColors: {
        differentIssuenumber?: { [p: string]: any[] }
        sameIssuenumber: { [p: string]: any[] }
      } = {
        sameIssuenumber: { ...emptyColorList.value },
      }
      if (allIssueNumbers.value.length > 1) {
        otherColors.differentIssuenumber = { ...emptyColorList.value }
      }
      for (const issuenumber of allIssueNumbers.value) {
        const issueColors = props.allStepColors[issuenumber]
        issueColors.forEach((stepColors, stepNumber) => {
          const isCurrentIssueNumber =
            currentIssueNumbers.value.includes(issuenumber)
          if (!(isCurrentIssueNumber && currentStepNumber === stepNumber)) {
            const otherColorGroupKey = isCurrentIssueNumber
              ? 'sameIssuenumber'
              : 'differentIssuenumber'
            otherColors[otherColorGroupKey]![stepNumber] = [
              ...new Set([
                ...otherColors[otherColorGroupKey]![stepNumber],
                ...stepColors,
              ]),
            ]
          }
        })
      }
      return otherColors
    })
)

const ucFirst = (text: string) =>
  text[0].toUpperCase() + text.substring(1, text.length)

const resetPositionAndSize = (step: {
  options: { [optionName: string]: any }
}) => {
  for (const issuenumber of Object.keys(props.steps)) {
    globalEventStore.options = {
      x: 0,
      y: 0,
      width: props.dimensions[issuenumber].width,
      height: props.dimensions[issuenumber].width * step.options.aspectRatio,
      issuenumbers: [issuenumber],
    }
  }
}

const splitImageAcrossEdges = () => {
  let leftOffset = 0
  const widthSum = Object.keys(props.steps).reduce(
    (acc, issuenumber) => acc + props.dimensions[issuenumber].width,
    0
  )
  for (const issuenumber of Object.keys(props.steps)) {
    globalEventStore.options = {
      x: leftOffset,
      y: 0,
      width: widthSum,
      height: props.dimensions[issuenumber].height,
      issuenumbers: [issuenumber],
    }
    leftOffset -= props.dimensions[issuenumber].width
  }
}
</script>
<style lang="scss">
#edit-card {
  height: 100%;

  .tabs {
    height: 100%;

    ul {
      padding: 0;

      li {
        .action-icons {
          float: right;
        }

        .b-icon {
          height: 15px;
          font-size: initial !important;
          vertical-align: middle;

          &.invisible {
            visibility: hidden;
          }

          &:first-of-type {
            margin-left: 5px;
          }
        }
      }
    }
  }
}

.hovered-step {
  animation: glow-filter 2s infinite;
}

.tab-pane.card-body {
  overflow-y: auto;
  height: 100%;
}

.input-extra {
  top: 3px;
  right: 2rem;
}
</style>
