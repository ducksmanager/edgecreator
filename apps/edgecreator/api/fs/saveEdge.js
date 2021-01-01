import axios from 'axios'
import { addAxiosInterceptor } from '../api'

const fs = require('fs')
const sharp = require('sharp')

addAxiosInterceptor()

export default function (req, res) {
  const { runExport, country, magazine, issuenumber, contributors, content } = req.body
  const svgPath = getSvgPath(runExport, country, magazine, issuenumber)
  const publicationCode = `${country}/${magazine}`

  fs.mkdirSync(require('path').dirname(svgPath), { recursive: true })
  fs.writeFile(svgPath, content, () => {
    let paths = { svgPath }
    if (runExport) {
      const pngPath = svgPath.replace('.svg', '.png')
      sharp(svgPath)
        .png()
        .toFile(pngPath)
        .then(async () => {
          paths = { ...paths, pngPath }

          const { designers, photographers } = contributors

          try {
            await axios.put(
              `${process.env.BACKEND_URL}/edgecreator/publish/${publicationCode}/${issuenumber}`,
              {
                designers: (designers || []).map(({ username }) => username),
                photographers: (photographers || []).map(({ username }) => username),
              },
              { headers: req.headers }
            )
            fs.unlinkSync(getSvgPath(false, country, magazine, issuenumber))

            res.writeHeader(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(paths))
          } catch (e) {
            returnError(res, e)
          }
        })
        .catch((error) => {
          returnError(res, error)
        })
    } else {
      res.writeHeader(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(paths))
    }
  })
}

const getSvgPath = (isExport, country, magazine, issuenumber) =>
  `${process.env.EDGES_PATH}/${country}/gen/${isExport ? '' : '_'}${magazine}.${issuenumber}.svg`

const returnError = (res, error) => {
  res.writeHeader(500, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error }))
}
