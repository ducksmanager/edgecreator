<template>
  <b-modal
    ok-only
    :ok-disabled="!issueData"
    :title="$t('Create or edit an edge model')"
    visible
    @close="toDashboard"
    @ok="startEditing"
  >
    {{ $t('Select the issue that you want to create the edge of.') }}
    <issue-select
      can-be-multiple
      disable-ongoing-or-published
      :disable-not-ongoing-nor-published="false"
      @change="
        issueData = $event && $event.issueNumber !== null ? $event : null
      "
    />
  </b-modal>
</template>
<script lang="ts">
export default {
  middleware: ['authenticated', 'is-editor'],
}
</script>
<script setup lang="ts">
import { computed, ref, useRouter } from '@nuxtjs/composition-api'
import IssueSelect from '@/components/IssueSelect'

const router = useRouter()

const issueData = ref(
  null as {
    editMode: 'range' | 'single'
    countryCode: string
    publicationCode: string
    issueNumber: string
    issueNumberEnd: string
    width: number
    height: number
  } | null
)

const issueSpecification = computed(() =>
  issueData.value === null
    ? null
    : issueData.value.editMode === 'range'
    ? `${issueData.value.issueNumber} to ${issueData.value.issueNumberEnd}`
    : issueData.value.issueNumber
)

const toDashboard = () => {
  router.push(`/`)
}

const startEditing = () => {
  router.push(`/edit/${issueData.value!.publicationCode} ${issueSpecification}`)
}
</script>
<style></style>
