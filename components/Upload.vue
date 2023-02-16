<template>
  <div>
    <div class="DashboardContainer" />
    <div v-if="withProgress" class="UppyDragDrop-Progress"></div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'nuxt-i18n-composable'

import XhrUpload from '@uppy/xhr-upload'
import Dashboard from '@uppy/dashboard'
import Uppy from '@uppy/core'
import { onMounted, ref } from '@nuxtjs/composition-api'
import { main } from '~/stores/main'

require('@uppy/core/dist/style.css')
require('@uppy/dashboard/dist/style.css')

const props = withDefaults(
  defineProps<{
    withProgress: boolean
    photo: boolean
    multiple: boolean
    edge: { issuenumber: string } | null
  }>(),
  {
    withProgress: true,
    photo: false,
    multiple: false,
    edge: null,
  }
)

const mainStore = main()
const i18n = useI18n()

const bytesUploaded = ref(0)

onMounted(() => {
  const locale = i18n.locale.value === 'fr' ? 'fr-FR' : 'en-US'
  const uppyTranslations = {
    'fr-FR': require('@uppy/locales/lib/fr_FR'),
    'en-US': require('@uppy/locales/lib/en_US'),
  }

  const uppy = new Uppy({
    debug: true,
    locale: uppyTranslations[i18n.locale.value],
    allowMultipleUploads: false,
    meta: {
      photo: props.photo,
      multiple: props.multiple,
      edge: JSON.stringify(props.edge),
      locale,
    },
    restrictions: {
      maxFileSize: 3 * 1024 * 1024,
      minNumberOfFiles: 1,
      maxNumberOfFiles: props.photo ? 1 : 10,
      allowedFileTypes: props.photo
        ? ['image/jpg', 'image/jpeg']
        : ['image/png'],
    },
  })

  uppy
    .use(Dashboard, {
      inline: true,
      target: '.DashboardContainer',
      replaceTargetContent: true,
      note: i18n.t('Pictures up to 3 MB'),
      height: 470,
      browserBackButtonClose: true,
      proudlyDisplayPoweredByUppy: false,
    })
    .use(XhrUpload, {
      endpoint: '/fs/upload',
      getResponseError: (responseText: string) => {
        const { error, placeholders } = JSON.parse(responseText)
        return new Error(i18n.t(error, placeholders).toString())
      },
    })
    .run()
  uppy.on('upload-progress', (data: { bytesUploaded: number }) => {
    bytesUploaded.value = data.bytesUploaded
  })
  uppy.on(
    'upload-success',
    (_: any, payload: { body: { filename: string } }) => {
      if (props.photo && !props.multiple) {
        mainStore.setPhotoUrl({
          issuenumber: props.edge!.issuenumber,
          filename: payload.body.filename,
        })
      } else {
        mainStore.loadItems({ itemType: props.photo ? 'photos' : 'elements' })
      }
    }
  )
})
</script>

<style lang="scss">
.uppy-Dashboard-inner {
  width: 100vw !important;
  height: 100vh !important;

  .uppy-Dashboard-Item-previewImg {
    object-fit: contain !important;
  }
}

>>> a.uppy-Dashboard-poweredBy {
  display: none;
}
</style>
