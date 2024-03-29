import axios from 'axios'
import { v2 as cloudinary } from 'cloudinary'
import { addAxiosInterceptor, checkUserRoles } from '../api'

const sessionHashes = {}

addAxiosInterceptor()

export default async function (req, res) {
  if (
    !(await checkUserRoles(req, res, (userRoles) =>
      userRoles.some((role) => ['admin', 'edit'].includes(role))
    ))
  ) {
    return
  }
  const [, color, colorBackground, width, font, text] = req.url.match(
    /\/([^/]+)\/([^/]+)\/([^/]+)\/font\/(.+)\/text\/(.+)/
  )
  const context = { color, colorBackground, width, text }
  cloudinary.search
    .expression(
      `tags=${font} AND ${Object.keys(context)
        .reduce((acc, key) => [...acc, `context.${key}="${context[key]}"`], [])
        .join(' AND ')}`
    )
    .execute()
    .then(({ resources }) => {
      if (resources.length) {
        console.log(`Found an existing text`)
        const { width, height, secure_url: url } = resources[0]
        res.writeHeader(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ width, height, url }))
      } else {
        console.log(`Found no existing text, generating text image...`)
        generateImage({ ...context, font })
          .then(({ width, height, secure_url: url }) => {
            console.log(`Text image generated: url=${url}`)
            res.writeHeader(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ width, height, url }))
          })
          .catch(({ response }) => {
            res.statusCode = response.status
            res.end()
          })
      }
    })
}

const generateImage = (parameters) =>
  axios
    .get(
      (parameters.font.includes('/')
        ? process.env.FONT_BASE_URL
        : process.env.FONT_PRODUCT_BASE_URL) + parameters.font
    )
    .then(({ data }) => {
      const sessionHashMatch = data.match(/(?<=font_rend.php\?id=)[a-z\d]+/)
      if (sessionHashMatch) {
        sessionHashes[parameters.font] = sessionHashMatch[0]
      } else {
        throw new Error(
          `No session ID found in URL ${process.env.FONT_BASE_URL}${parameters.font}`
        )
      }
    })
    .then(() =>
      cloudinary.uploader.upload(
        `${process.env.FONT_IMAGE_GEN_URL}?${new URLSearchParams({
          id: sessionHashes[parameters.font],
          rbe: 'fixed',
          rt: parameters.text,
          fg: parameters.color,
          bg: parameters.colorBackground,
        }).toString()}`,
        {
          folder: 'texts',
          async: false,
          tags: [parameters.font],
          context: parameters,
        },
        (error, result) => {
          if (error) {
            console.error(error)
          }
          const { width, height, secure_url: url } = result
          return new Promise((resolve) => resolve({ width, height, url }))
        }
      )
    )
