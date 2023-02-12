import axios from 'axios'
import { edgeCatalog } from '~/stores/edgeCatalog'
import { main } from '~/stores/main'
import { user } from '~/stores/user'
import { renders } from '~/stores/renders'
import useDimensions from '~/composables/dimensions'
import svgUtils from '~/composables/svgUtils'
import stepList from '~/composables/stepList'
import legacyDbMixin from '~/composables/legacyDb'

const mainStore = main()
const rendersStore = renders()
const userStore = user()
const edgeCatalogStore = edgeCatalog()

const { getSvgMetadata, loadSvgFromString } = svgUtils()

const { getOptionsFromDb } = legacyDbMixin()

export default () => {
  const getDimensionsFromSvg = (svgElement: HTMLElement) => ({
    width: parseInt(svgElement.getAttribute('width')!) / 1.5,
    height: parseInt(svgElement.getAttribute('height')!) / 1.5,
  })
  const getStepsFromSvg = (svgChildNodes: HTMLElement[]) =>
    svgChildNodes
      .filter(({ nodeName }) => nodeName === 'g')
      .map((group) => ({
        component: group.getAttribute('class'),
        options: JSON.parse(
          (group.getElementsByTagName('metadata')[0] || { textContent: '{}' })
            .textContent!
        ),
      }))

  const setPhotoUrlsFromSvg = (
    issuenumber: string,
    svgChildNodes: SVGElement[]
  ) => {
    for (const photoUrl of getSvgMetadata(svgChildNodes, 'photo')) {
      mainStore.setPhotoUrl({ issuenumber, filename: photoUrl })
    }
  }

  const setContributorsFromSvg = (
    issuenumber: string,
    svgChildNodes: SVGElement[]
  ) => {
    for (const contributionType of ['photographer', 'designer']) {
      for (const username of getSvgMetadata(
        svgChildNodes,
        `contributor-${contributionType}`
      )) {
        mainStore.addContributor({
          issuenumber,
          contributionType: `${contributionType}s`,
          user: userStore.allUsers!.find((user) => user.username === username),
        })
      }
    }
  }

  const getDimensionsFromApi = (
    stepData: object,
    defaultDimensions = { width: 15, height: 200 }
  ): { width: number; height: number } => {
    const dimensions = Object.values(stepData).find(
      ({ stepNumber: originalStepNumber }) => originalStepNumber === -1
    )
    if (dimensions) {
      return {
        width: dimensions.options.Dimension_x,
        height: dimensions.options.Dimension_y,
      }
    }
    return defaultDimensions
  }
  const getStepsFromApi = async (
    publicationcode: string,
    issuenumber: string,
    stepData: {
      [optionName: string]: {
        stepNumber: number
        functionName: string
        options: any
      }
    },
    dimensions: { width: number; height: number },
    calculateBase64: boolean,
    onError: (error: string, stepNumber: number) => void
  ) =>
    (
      await Promise.all(
        Object.values(stepData)
          .filter(
            ({ stepNumber: originalStepNumber }) => originalStepNumber !== -1
          )
          .map(
            async ({
              stepNumber: originalStepNumber,
              functionName: originalComponentName,
              options: originalOptions,
            }) => {
              const { component } = rendersStore.supportedRenders.find(
                (component) => component.originalName === originalComponentName
              ) || { component: null }
              if (component) {
                try {
                  return {
                    component,
                    options: await getOptionsFromDb(
                      publicationcode,
                      issuenumber,
                      stepNumber,
                      { component, options: originalOptions },
                      dimensions,
                      calculateBase64
                    ),
                  }
                } catch (e) {
                  onError(
                    `Invalid step ${originalStepNumber} (${component}) : ${e}, step will be ignored.`,
                    originalStepNumber
                  )
                  return null
                }
              } else {
                onError(
                  `Unrecognized step name : ${originalComponentName}, step will be ignored.`,
                  originalStepNumber
                )
                return null
              }
            }
          )
      )
    ).filter((step) => !!step)
  const setContributorsFromApi = async (
    issuenumber: string,
    edgeId: number
  ) => {
    const contributors = (
      await axios.get(`/api/edgecreator/contributors/${edgeId}`)
    ).data
    for (const { contribution, idUtilisateur } of contributors) {
      mainStore.addContributor({
        issuenumber,
        contributionType:
          contribution === 'photographe' ? 'photographers' : 'designers',
        user: userStore.allUsers!.find((user) => user.id === idUtilisateur),
      })
    }
  }

  const loadModel = async (
    country: string,
    magazine: string,
    issuenumber: string,
    targetIssuenumber: string
  ) => {
    const onlyLoadStepsAndDimensions = issuenumber !== targetIssuenumber
    let steps
    let dimensions: { width: number; height: number }

    const loadSvg = async (publishedVersion: boolean) => {
      const { svgElement, svgChildNodes } = await loadSvgFromString(
        country,
        magazine,
        issuenumber,
        publishedVersion
      )

      dimensions = getDimensionsFromSvg(svgElement)
      steps = getStepsFromSvg(svgChildNodes)
      if (!onlyLoadStepsAndDimensions) {
        setPhotoUrlsFromSvg(issuenumber, svgChildNodes)
        setContributorsFromSvg(issuenumber, svgChildNodes)
      }
    }

    try {
      await loadSvg(false)
    } catch {
      try {
        await loadSvg(true)
      } catch {
        const publicationcode = `${country}/${magazine}`
        const edge = (
          await axios.get(
            `/api/edgecreator/v2/model/${publicationcode}/${issuenumber}`
          )
        ).data
        if (edge) {
          await edgeCatalogStore.getPublishedEdgesSteps({
            publicationcode,
            edgeModelIds: [edge.id],
          })
          const apiSteps =
            edgeCatalog().publishedEdgesSteps[publicationcode][issuenumber]
          dimensions = getDimensionsFromApi(apiSteps)
          steps = await getStepsFromApi(
            publicationcode,
            issuenumber,
            apiSteps,
            dimensions,
            true,
            (error: string) => {
              mainStore.addWarning(error)
            }
          )

          if (!onlyLoadStepsAndDimensions) {
            await setPhotoUrlsFromApi(issuenumber, edge.id)
            await setContributorsFromApi(issuenumber, edge.id)
          }
        } else {
          await loadSvg(true)
        }
      }
    }
    if (steps) {
      useDimensions().setDimensions(dimensions!, targetIssuenumber)
      stepList().setSteps(targetIssuenumber, steps)
    } else {
      throw new Error('No model found for issue ' + issuenumber)
    }
  }

  const setPhotoUrlsFromApi = async (issuenumber: string, edgeId: number) => {
    const photo = (
      await axios.get(`/api/edgecreator/model/v2/${edgeId}/photo/main`)
    ).data
    if (photo) {
      mainStore.setPhotoUrl({ issuenumber, filename: photo.nomfichier })
    }
  }

  return {
    getDimensionsFromSvg,
    getStepsFromSvg,
    setPhotoUrlsFromSvg,
    setContributorsFromSvg,
    getDimensionsFromApi,
    getStepsFromApi,
    setContributorsFromApi,
    loadModel,
    setPhotoUrlsFromApi,
  }
}
