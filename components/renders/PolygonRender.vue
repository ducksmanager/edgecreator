<template>
  <polygon
    ref="polygon"
    :points="options.points.join(' ')"
    :style="{ fill: options.fill }"
  >
    <metadata>{{ options }}</metadata>
  </polygon>
</template>

<script>
import stepOptionsMixin from '@/mixins/stepOptionsMixin'

export default {
  mixins: [stepOptionsMixin],

  props: {
    options: {
      type: Object,
      default: () => ({
        points: [
          [1, 5],
          [4, 25],
          [7, 14],
          [14, 12],
        ],
        fill: '#000000',
      }),
    },
  },

  data: () => ({
    attributeKeys: [],
  }),

  mounted() {
    const vm = this
    this.enableDragResize(this.$refs.polygon, {
      onmove: ({ dy, dx }) => {
        vm.$root.$emit('set-options', {
          points: vm.options.points.map(([x, y]) => [
            x + dx / vm.zoom,
            y + dy / vm.zoom,
          ]),
        })
      },
      onresizemove: ({ dy, dx }) => {
        const heightMaxGrowth = dy / vm.zoom
        const widthMaxGrowth = dx / vm.zoom

        const { points } = vm.options
        const minX = Math.min(...points.map(([x]) => x))
        const maxX = Math.max(...points.map(([x]) => x))
        const minY = Math.min(...points.map(([, y]) => y))
        const maxY = Math.max(...points.map(([, y]) => y))
        const currentWidth = maxX - minX
        const currentHeight = maxY - minY
        vm.$root.$emit('set-options', {
          points: points.map(([x, y]) => [
            x + widthMaxGrowth * ((x - minX) / currentWidth),
            y + heightMaxGrowth * ((y - minY) / currentHeight),
          ]),
        })
      },
    })
  },
}
</script>

<style scoped></style>
