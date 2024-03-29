<!--suppress XmlUnusedNamespaceDeclaration -->
<template>
  <svg
    :id="`edge-canvas-${issuenumber}`"
    ref="canvas"
    :class="{
      'edge-canvas': true,
      'hide-overflow': !showEdgeOverflow,
      'position-relative': true,
      editing: editingIssuenumbers.includes(issuenumber),
    }"
    :viewBox="`0 0 ${width} ${height}`"
    :width="zoom * width"
    :height="zoom * height"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    preserveAspectRatio="none"
    @mousemove="setPosition"
    @mouseout="positionInCanvas = null"
  >
    <metadata v-if="photoUrl" type="photo">
      {{ photoUrl }}
    </metadata>
    <metadata
      v-for="photographer in contributors.photographers"
      :key="`photographer-${photographer.username}`"
      type="contributor-photographer"
    >
      {{ photographer.username }}
    </metadata>
    <metadata
      v-for="designer in contributors.designers"
      :key="`designer-${designer.username}`"
      type="contributor-designer"
    >
      {{ designer.username }}
    </metadata>
    <g
      v-for="(step, stepNumber) in steps"
      :key="stepNumber"
      :class="{
        [step.component]: true,
        hovered:
          hoveredStepNumber === stepNumber &&
          editingIssuenumbers.includes(issuenumber),
      }"
      @mousedown.exact="
        replaceEditingIssuenumberIfNotAlreadyEditing(issuenumber)
        editingStepNumber = stepNumber
      "
      @mousedown.shift="
        addEditingIssuenumber(issuenumber)
        editingStepNumber = stepNumber
      "
      @mouseover="
        hoveredStepNumber = stepNumber
        hoveredIssuenumber = issuenumber
      "
      @mouseout="
        hoveredStepNumber = null
        hoveredIssuenumber = null
      "
    >
      <component
        :is="`${step.component}Render`"
        v-if="$options.components[`${step.component}Render`]"
        v-show="step.options && step.options.visible !== false"
        :issuenumber="issuenumber"
        :dimensions="dimensions"
        :step-number="stepNumber"
        :options="step.options"
      ></component>
    </g>
    <rect
      class="border"
      :x="borderWidth / 2"
      :y="borderWidth / 2"
      :width="width - borderWidth"
      :height="height - borderWidth"
      fill="none"
      stroke="black"
      :stroke-width="borderWidth"
    />
  </svg>
</template>
<script>
import { mapActions, mapState, mapWritableState } from 'pinia'
import { ui } from '~/stores/ui'
import { hoveredStep } from '~/stores/hoveredStep'
import { editingStep } from '~/stores/editingStep'
import { user } from '~/stores/user'
import { main } from '~/stores/main'
import RectangleRender from '@/components/renders/RectangleRender'
import PolygonRender from '@/components/renders/PolygonRender'
import ArcCircleRender from '@/components/renders/ArcCircleRender'
import StapleRender from '@/components/renders/StapleRender'
import ImageRender from '@/components/renders/ImageRender'
import FillRender from '@/components/renders/FillRender'
import TextRender from '@/components/renders/TextRender'
import GradientRender from '@/components/renders/GradientRender'

export default {
  name: 'EdgeCanvas',
  components: {
    RectangleRender,
    PolygonRender,
    ArcCircleRender,
    StapleRender,
    ImageRender,
    FillRender,
    TextRender,
    GradientRender,
  },
  props: {
    issuenumber: { type: String, required: true },
    dimensions: { type: Object, required: true },
    steps: { type: Array, required: true },
    photoUrl: { type: String, default: null },
    contributors: { type: Object, required: true },
  },
  data() {
    return {
      borderWidth: 1,
    }
  },
  computed: {
    ...mapState(user, ['allUsers']),
    ...mapWritableState(hoveredStep, {
      hoveredStepNumber: 'stepNumber',
      hoveredIssuenumber: 'issuenumber',
    }),
    ...mapWritableState(editingStep, {
      editingStepNumber: 'stepNumber',
      editingIssuenumbers: 'issuenumbers',
    }),
    ...mapState(ui, ['zoom', 'showEdgeOverflow']),
    ...mapWritableState(ui, ['positionInCanvas']),
    width() {
      return this.dimensions.width
    },
    height() {
      return this.dimensions.height
    },
  },

  methods: {
    ...mapActions(main, ['addContributor']),
    ...mapActions(editingStep, {
      addEditingIssuenumber: 'addIssuenumber',
      replaceEditingIssuenumber: 'replaceIssuenumber',
    }),
    setPosition({ clientX: left, clientY: top }) {
      const vm = this
      const { left: svgLeft, top: svgTop } =
        this.$refs.canvas.getBoundingClientRect()
      this.positionInCanvas = [left - svgLeft, top - svgTop].map((value) =>
        parseInt(value / vm.zoom)
      )
    },
    replaceEditingIssuenumberIfNotAlreadyEditing(issuenumber) {
      if (!this.editingIssuenumbers.includes(issuenumber)) {
        this.replaceEditingIssuenumber(issuenumber)
      }
    },
  },
}
</script>

<style lang="scss">
svg.edge-canvas {
  overflow: visible;

  &.hide-overflow {
    overflow: hidden;
  }

  &:not(.editing) {
    .border {
      stroke: #555;
    }
  }
}
body:not(.interacting) {
  svg.edge-canvas {
    g:hover,
    g.Text:hover image,
    g.hovered,
    g.hovered.Text image {
      animation: glow-filter 2s infinite;
      outline-width: 2px;
      outline-style: dotted;
      outline-offset: -1px;
    }
  }
}
</style>
