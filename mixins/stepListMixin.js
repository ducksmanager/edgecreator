import { set, nextTick } from 'vue'

export default {
  data: () => ({
    steps: {},
  }),
  mounted() {
    const vm = this
    this.$root.$on('set-options', (changes) => {
      const { issuenumbers, stepNumber, ...optionChanges } = { ...changes }
      const targetIssueNumbers = issuenumbers || vm.editingIssuenumbers
      const targetStepNumber =
        stepNumber !== undefined ? stepNumber : vm.editingStepNumber
      Object.keys(vm.steps)
        .filter((issuenumber) => targetIssueNumbers.includes(issuenumber))
        .forEach((issuenumber) => {
          const step = vm.steps[issuenumber][targetStepNumber]
          set(step, 'options', {
            ...(step.options || {}),
            ...optionChanges,
          })
        })
    })
  },

  methods: {
    checkSameComponentsAsCompletedEdge(issuenumber, issueSteps) {
      const vm = this
      const completedIssuenumber = Object.keys(this.steps).find(
        (issueNumber) => vm.steps[issueNumber].length
      )
      const completedIssueSteps = this.steps[completedIssuenumber]
      const getComponents = (steps) =>
        steps && steps.map(({ component }) => component).join('+')
      const previousIssueComponents = getComponents(completedIssueSteps)
      const currentIssueComponents = getComponents(issueSteps)
      if (
        completedIssuenumber !== issuenumber &&
        completedIssueSteps &&
        previousIssueComponents !== currentIssueComponents
      ) {
        throw new Error(
          this.$t(
            `Issue numbers {completedIssuenumber} and {issuenumber} ` +
              `don't have the same components` +
              `: {completedIssueSteps} vs {currentIssueComponents}`,
            {
              completedIssuenumber,
              issuenumber,
              previousIssueComponents,
              currentIssueComponents,
            }
          )
        )
      }
    },
    setSteps(issuenumber, issueSteps) {
      const vm = this
      this.checkSameComponentsAsCompletedEdge(issuenumber, issueSteps)
      nextTick().then(() => {
        set(vm.steps, issuenumber, issueSteps)
      })
    },
    copyDimensionsAndSteps(issuenumber, otherIssuenumber) {
      set(
        this.dimensions,
        issuenumber,
        JSON.parse(JSON.stringify(this.dimensions[otherIssuenumber]))
      )
      set(
        this.steps,
        issuenumber,
        JSON.parse(JSON.stringify(this.steps[otherIssuenumber]))
      )
    },
    addStep(component) {
      const vm = this
      Object.keys(vm.steps).forEach((issuenumber) => {
        set(vm.steps[issuenumber], vm.steps[issuenumber].length, {
          component,
        })
      })
    },
    removeStep(stepNumber) {
      const vm = this
      Object.keys(vm.steps).forEach((issuenumber) => {
        vm.steps[issuenumber].splice(stepNumber, 1)
      })
    },
    duplicateStep(stepNumber) {
      const vm = this
      Object.keys(vm.steps).forEach((issuenumber) => {
        const existingStep = vm.steps[issuenumber][stepNumber]
        vm.steps[issuenumber].splice(stepNumber, 0, {
          component: existingStep.component,
          options: { ...existingStep.options },
        })
      })
    },
    swapSteps(stepNumbers) {
      const vm = this
      Object.keys(vm.steps).forEach((issuenumber) => {
        const steps = vm.steps[issuenumber]
        const stepsToSwap = [steps[stepNumbers[0]], steps[stepNumbers[1]]]
        vm.steps[issuenumber].splice(
          stepNumbers[0],
          2,
          stepsToSwap[1],
          stepsToSwap[0]
        )
      })
    },
  },
}
