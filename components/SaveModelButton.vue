<template>
  <b-button
    v-if="progress || result === 'success'"
    disabled
    pill
    :variant="`outline-${variant}`"
    size="sm"
  >
    <b-progress
      v-if="progress"
      v-b-tooltip.hover
      animated
      :value="progress"
      :max="100"
      :variant="variant"
    />
    <b-icon-check v-if="result === 'success'" />
  </b-button>
  <b-button
    v-else-if="result === 'error'"
    disabled
    pill
    variant="outline-danger"
    size="sm"
  >
    <b-icon-x />
  </b-button>
  <b-button
    v-else
    v-b-tooltip.hover
    :title="label"
    pill
    :variant="`outline-${variant}`"
    size="sm"
    @click="onClick"
  >
    <b-icon-archive v-if="!withExport && !withSubmit" />
    <template v-else>
      <b-icon-cloud-arrow-up-fill />
      <b-modal
        v-model="showModal"
        :title="$t(withExport ? 'Edge publication' : 'Edge validation')"
        ok-only
        :ok-disabled="
          !hasAtLeastOneUser('photographers') || !hasAtLeastOneUser('designers')
        "
        :ok-title="$t(withExport ? 'Export' : 'Submit')"
        @ok="issueIndexToSave = 0"
      >
        <b-alert show variant="info">{{
          $t(
            'Once your edge is ready, indicate the photographers and the designers of the edge. ' +
              'When you click "Submit", the edge will be sent to an administrator for validation ' +
              'before it is published on DucksManager'
          )
        }}</b-alert>
        <div
          v-for="contributionType in ['photographers', 'designers']"
          :key="contributionType"
        >
          <h2>{{ $t(ucFirst(contributionType)) }}</h2>
          <b-alert
            v-if="!hasAtLeastOneUser(contributionType)"
            show
            variant="warning"
            >{{ $t('You should select at least one user') }}</b-alert
          >
          <vue-bootstrap-typeahead
            :ref="`${contributionType}-typeahead`"
            :data="
              userStore.allUsers.filter(
                (contributor) => !isContributor(contributor, contributionType)
              )
            "
            :serializer="({ username }) => username"
            :placeholder="$t('Enter a user name').toString()"
            :min-matching-chars="0"
            @hit="
              addContributorAllIssues($event, contributionType)
              $refs[`${contributionType}-typeahead`][0].inputValue = ''
            "
          />
          <ul>
            <li
              v-for="contributor in getContributors(contributionType)"
              :key="contributor.username"
            >
              {{ contributor.username }}
              <b-icon-x-square-fill
                v-if="
                  !(
                    contributor.username === userStore.username &&
                    contributionType === 'designers'
                  )
                "
                @click="
                  mainStore.removeContributor({
                    contributionType,
                    userToRemove: contributor,
                  })
                "
              />
            </li>
          </ul>
        </div>
      </b-modal>
    </template>
  </b-button>
</template>
<script setup lang="ts">
import {
  BIconArchive,
  BIconCheck,
  BIconCloudArrowUpFill,
  BIconX,
  BIconXSquareFill,
} from 'bootstrap-vue'
import { useI18n } from 'nuxt-i18n-composable'
import { computed, onMounted, ref, watch } from '@nuxtjs/composition-api'
import { nextTick } from 'vue'
import { ui } from '~/stores/ui'
import { main } from '~/stores/main'
import { user } from '~/stores/user'
import saveEdge from '~/composables/saveEdge'
import { useCookies } from '~/composables/useCookies'

const { saveEdgeSvg } = saveEdge()

const i18n = useI18n()
const userStore = user()
const mainStore = main()

const props = withDefaults(
  defineProps<{
    withSubmit: boolean
    withExport: boolean
  }>(),
  {
    withSubmit: false,
    withExport: false,
  }
)

const showModal = ref(false as boolean)
const progress = ref(0 as number)
const issueIndexToSave = ref(null as number | null)
const result = ref(null as any)

const label = computed(() => {
  return i18n.t(
    props.withExport ? 'Export' : props.withSubmit ? 'Submit' : 'Save'
  )
})

const variant = computed(() => {
  return props.withExport || props.withSubmit ? 'success' : 'primary'
})

watch(
  () => progress.value,
  (newValue) => {
    if (newValue === 100) {
      window.setTimeout(() => {
        progress.value = 0
        result.value = 'success'
        window.setTimeout(() => {
          result.value = null
        }, 2000)
      }, 1000)
    }
  }
)
watch(
  () => issueIndexToSave.value,
  (newValue) => {
    const currentIssueNumber = mainStore.issuenumbers[newValue!]

    if (currentIssueNumber === undefined) {
      return
    }

    ui().zoom = 1.5
    nextTick(() => {
      saveEdgeSvg(
        mainStore.country!,
        mainStore.magazine!,
        currentIssueNumber,
        mainStore.contributors[currentIssueNumber],
        props.withExport,
        props.withSubmit
      ).then((response) => {
        const isSuccess = response.paths && response.paths.svgPath
        if (isSuccess) {
          progress.value += 100 / mainStore.issuenumbers.length
          issueIndexToSave.value!++
        } else {
          progress.value = 0
          result.value = 'error'
          issueIndexToSave.value = null
        }
      })
    })
  }
)

watch(
  () => showModal.value,
  (newValue) => {
    if (newValue && props.withSubmit) {
      addContributorAllIssues(
        userStore.allUsers!.find(
          (thisUser) => thisUser.username === userStore.username
        ),
        'designers'
      )
    }
  }
)

onMounted(() => {
  userStore.username = useCookies().get('dm-user')
})

const ucFirst = (text: string) =>
  text[0].toUpperCase() + text.substring(1, text.length)
const getContributors = (contributionType: string) => {
  return userStore.allUsers!.filter((user) =>
    isContributor(user, contributionType)
  )
}

const isContributor = (user, contributionType: string) => {
  return Object.keys(mainStore.contributors).reduce(
    (acc, issueNumber) =>
      acc ||
      mainStore.contributors[issueNumber][contributionType]
        .map(({ username }) => username)
        .includes(user.username),
    false
  )
}
const addContributorAllIssues = (user, contributionType: string) => {
  mainStore.issuenumbers.forEach((issuenumber) => {
    mainStore.addContributor({ issuenumber, contributionType, user })
  })
}
const hasAtLeastOneUser = (contributionType: string) =>
  Object.values(mainStore.contributors).every(
    (contributionsForIssue) => contributionsForIssue[contributionType].length
  )
const onClick = () => {
  if (props.withExport || props.withSubmit) {
    showModal.value = !showModal.value
  } else {
    issueIndexToSave.value = 0
  }
}
</script>
<style scoped lang="scss">
::v-deep.btn {
  width: 2.25rem;
  height: 2rem;
}

.bi-x-square-fill {
  cursor: pointer;
}
</style>
