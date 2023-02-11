<template>
  <b-row>
    <b-col sm="3">
      <label :for="optionName">{{ label }}</label>
    </b-col>
    <b-col sm="9">
      <confirm-edit-multiple-values :values="values" @change="onChangeValue">
        <b-alert v-if="$slots.alert || $scopedSlots.alert" show variant="info">
          <slot name="alert" />
        </b-alert>
        <b-form-select
          v-if="type === 'select'"
          :id="optionName"
          :options="selectOptions"
          :value="values[0]"
          @input="onChangeValue"
        />
        <b-form-input
          v-else
          :id="optionName"
          size="sm"
          autocomplete="off"
          :type="type"
          :min="min"
          :max="max"
          :step="step"
          :range="range"
          :value="values[0]"
          :disabled="disabled"
          :list="listId"
          @change="
            isTextImageOption || isImageSrcOption ? onChangeValue : () => {}
          "
          @input="
            !(isTextImageOption || isImageSrcOption) ? onChangeValue : () => {}
          "
        ></b-form-input>
        <slot />
        <slot name="suffix" />
      </confirm-edit-multiple-values>
    </b-col>
  </b-row>
</template>

<script setup lang="ts">
import { computed } from '@nuxtjs/composition-api'
import { globalEvent } from '~/stores/globalEvent'
import ConfirmEditMultipleValues from '~/components/ConfirmEditMultipleValues.vue'

const props = withDefaults(
  defineProps<{
    label: string
    optionName: string
    type: string
    disabled?: boolean | null
    options: any
    min?: number | null
    max?: number | null
    step?: number | null
    range?: number | null
    listId?: string | null
    selectOptions?: any[] | null
  }>(),
  {
    disabled: null,
    min: null,
    max: null,
    step: null,
    range: null,
    listId: null,
    selectOptions: null,
  }
)

const inputValues = computed(() => props.options[props.optionName])
const values = computed(() =>
  props.optionName === 'xlink:href'
    ? (inputValues.value as string[]).map(
        (value) => value!.match(/\/([^/]+)$/)![1]
      )
    : inputValues.value
)
const isTextImageOption = computed(
  () =>
    !!props.options.text &&
    ['fgColor', 'bgColor', 'internalWidth', 'text', 'font'].includes(
      props.optionName
    )
)
const isImageSrcOption = computed(() => !!props.options.src)
const onChangeValue = (value: any) => {
  if (props.optionName === 'rotation') {
    value = parseInt(value)
  }
  globalEvent().options = { [props.optionName]: value }
}
</script>

<style lang="scss" scoped>
::v-deep .alert {
  ul {
    padding-left: 1rem;
    margin-bottom: 0;
  }

  pre {
    margin-bottom: -5px;
  }
}
</style>
