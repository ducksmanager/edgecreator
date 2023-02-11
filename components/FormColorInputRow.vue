<template>
  <form-input-row
    type="color"
    :option-name="optionName"
    :label="label || optionName"
    :class="{
      'color-row': true,
      'can-be-transparent': canBeTransparent,
      'transparent-selected': isTransparent,
    }"
    :options="options"
    :disabled="isTransparent"
    ><input
      :id="`${optionName}-transparent`"
      :checked="isTransparent"
      type="checkbox"
      @change="
        change($event.currentTarget.checked ? 'transparent' : originalColor)
      "
    />
    <label
      v-if="canBeTransparent"
      class="transparent"
      :for="`${optionName}-transparent`"
      ><img
        :id="`${optionName}-transparent`"
        alt="transp"
        src="/transparent.png"
    /></label>

    <template v-if="!isTransparent" #suffix>
      <b-button
        :id="`${optionName}-popover-colors`"
        class="no-pointer"
        pill
        size="sm"
        variant="outline-primary"
        >{{ $t('Re-use') }}
      </b-button>
      <b-popover
        :target="`${optionName}-popover-colors`"
        triggers="hover focus"
        placement="bottom"
      >
        <div
          v-for="(otherColorsForLocation, colorLocation) in otherColors"
          :key="colorLocation"
        >
          <h6 v-if="colorLocation === 'sameIssuenumber'">
            {{ $t('Colors used in other steps') }}
          </h6>
          <h6 v-if="colorLocation === 'differentIssuenumber'">
            {{ $t('Colors used in other edges') }}
          </h6>
          <ul>
            <li
              v-for="(_, stepNumber) in otherColorsForLocation"
              :key="`${colorLocation}-${stepNumber}`"
            >
              <span
                :class="{
                  'text-secondary': !otherColorsForLocation[stepNumber].length,
                }"
                >{{ $t('Step') }} {{ stepNumber }}</span
              >
              <span
                v-for="color in otherColorsForLocation[stepNumber]"
                :key="color"
                class="frequent-color"
                :style="{ background: color }"
                @click="change(color)"
                >&nbsp;</span
              >
            </li>
          </ul>
        </div>
      </b-popover>
      <b-button
        pill
        size="sm"
        :disabled="!hasPhotoUrl || showEdgePhotos === null"
        :variant="
          colorPickerOption === optionName ? 'primary' : 'outline-primary'
        "
        @click="colorPickerOption = colorPickerOption ? null : optionName"
        >{{ $t('From photo') }}
      </b-button>
    </template>
  </form-input-row>
</template>
<script setup lang="ts">
import { computed, ref, watch } from '@nuxtjs/composition-api'
import { main } from '~/stores/main'
import { globalEvent } from '~/stores/globalEvent'
import { ui } from '~/stores/ui'
import FormInputRow from '~/components/FormInputRow.vue'

const props = withDefaults(
  defineProps<{
    options: any
    optionName: string
    otherColors: any
    label?: string | null
    canBeTransparent?: false | null
  }>(),
  {
    label: null,
    canBeTransparent: false,
  }
)

const originalColor = ref(null as string | null)

const inputValues = computed(() => props.options[props.optionName])
const isTransparent = computed(() => inputValues.value[0] === 'transparent')
const photoUrls = computed(() => main().photoUrls)
const hasPhotoUrl = computed(() => Object.keys(photoUrls.value).length)
const colorPickerOption = computed(() => ui().colorPickerOption)
const showEdgePhotos = computed(() => ui().showEdgePhotos)

watch(
  () => inputValues.value,
  (newValue) => {
    if (newValue) {
      let newColor = inputValues.value[0]
      if (newColor === 'transparent') {
        newColor = '#000000'
      }
      originalColor.value = newColor
    }
  },
  { immediate: true }
)

const change = (value: any) => {
  globalEvent().options = { [props.optionName]: value }
}
//
//   methods: {
//     change(value) {
//       this.$root.$emit('set-options', { [this.optionName]: value })
//     },
//   },
// }
</script>
<style lang="scss" scoped>
ul {
  list-style-type: none;
  padding: 0;
}

input[type='color'] {
  display: inline-block;
  width: 40px;
  border: 0;
  background: none !important;
}

input[type='checkbox'][id$='-transparent'] {
  display: none;
}

label.transparent {
  width: 40px;
  margin-right: 20px;

  img {
    position: absolute;
    top: 0;
  }
}

.color-row.can-be-transparent.transparent-selected label.transparent img,
.color-row.can-be-transparent:not(.transparent-selected) input[type='color'] {
  border: 1px dashed black;
}

.btn {
  font-size: smaller;
  vertical-align: top;

  &.no-pointer {
    cursor: default !important;
  }
}

.frequent-color {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin: 5px;
  cursor: pointer;
  border: 1px solid black;
  border-radius: 15px;
}
</style>
