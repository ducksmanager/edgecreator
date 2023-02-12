const TEMPLATES = [
  {
    regex: /\[Hauteur]\*([.0-9]+)/g,
    replaceCallback: (
      {
        dimensions: { height },
      }: { dimensions: { width: string; height: string } },
      coefficient: number
    ) => (parseFloat(height) * coefficient).toString(),
  },
  {
    regex: /\[Numero]/g,
    replaceCallback: ({ issuenumber }: { issuenumber: string }) => issuenumber,
  },
  {
    regex: /\[Numero\[(\d)]]/g,
    replaceCallback: (
      { issuenumber }: { issuenumber: string },
      digitIndex: number
    ) => issuenumber[digitIndex],
  },
]

export default () => ({
  resolveStringTemplates: (
    text: string,
    data: {
      issuenumber: string
      dimensions: { width: string; height: string }
    }
  ) =>
    !text
      ? text
      : TEMPLATES.reduce(
          (text, { regex, replaceCallback }) =>
            text.replaceAll(regex, (_match, group) =>
              replaceCallback(data, group)
            ),
          text
        ),
})
