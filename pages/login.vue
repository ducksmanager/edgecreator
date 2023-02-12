<template>
  <b-container>
    <b-row class="vh-100 text-center" align-v="center">
      <b-col
        class="d-flex flex-column align-items-center"
        cols="6"
        offset="3"
        md="4"
        offset-md="4"
      >
        <h2>EdgeCreator</h2>
        <b-form @submit.prevent="login()">
          <b-form-input
            id="username"
            v-model="loginUsername"
            :placeholder="$t('Username')"
            required
          ></b-form-input>

          <b-form-input
            id="password"
            v-model="password"
            :placeholder="$t('Password')"
            class="mt-3"
            type="password"
            required
          ></b-form-input>
          <b-button type="submit" variant="primary" class="mt-3">{{
            $t('Login')
          }}</b-button>
        </b-form>
      </b-col>
    </b-row>
  </b-container>
</template>

<script setup lang="ts">
import crypto from 'crypto'
import { ref, useRouter } from '@nuxtjs/composition-api'
import axios from 'axios'
import useRedirect from '@/composables/redirect'
import { useToast } from '~/composables/useToast'
import { useCookies } from '~/composables/useCookies'
import { useGates } from '~/composables/useGates'

const roleMapping: { [label: string]: string } = {
  Affichage: 'display',
  Edition: 'edit',
  Admin: 'admin',
}

useRedirect()
const router = useRouter()

const loginUsername = ref(null as string | null)
const password = ref(null as string | null)

const login = async () => {
  const encryptedPassword = crypto
    .createHash('sha1')
    .update(password.value!)
    .digest('hex')
  try {
    const data = (
      await axios.get('/api/collection/privileges', {
        headers: {
          'x-dm-user': loginUsername.value,
          'x-dm-pass': encryptedPassword,
        },
      })
    ).data
    useCookies().setAll([
      { name: 'dm-user', value: loginUsername.value },
      { name: 'dm-pass', value: encryptedPassword },
    ])
    useGates().setRoles([roleMapping[data.EdgeCreator] || 'display'])
    router.push('/')
  } catch (e) {
    useToast().toast((e as { message: string }).message, {
      title: 'Error',
      autoHideDelay: 3000,
    })
  }
}
</script>
