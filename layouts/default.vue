<template>
  <Nuxt keep-alive />
</template>

<style lang="scss">
html {
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

body,
#__nuxt,
#__layout,
#wrapper {
  height: 100vh;
}

* {
  box-sizing: border-box;
  margin: 0;

  &:before {
    box-sizing: border-box;
    margin: 0;
  }

  &:after {
    box-sizing: border-box;
    margin: 0;
  }
}

.button--green {
  display: inline-block;
  border-radius: 4px;
  border: 1px solid #3b8070;
  color: #3b8070;
  text-decoration: none;
  padding: 10px 30px;

  &:hover {
    color: #fff;
    background-color: #3b8070;
  }
}

.button--grey {
  display: inline-block;
  border-radius: 4px;
  border: 1px solid #35495e;
  color: #35495e;
  text-decoration: none;
  padding: 10px 30px;
  margin-left: 15px;

  &:hover {
    color: #fff;
    background-color: #35495e;
  }
}

@keyframes glow-filter {
  0% {
    filter: drop-shadow(-0.75px 0px 6px rgba(0, 0, 0, 0.5));
    outline-color: rgba(0, 0, 0, 0.5);
  }
  50% {
    filter: drop-shadow(-0.75px 0px 6px rgba(128, 128, 128, 0.5));
    outline-color: rgba(128, 128, 128, 0.5);
  }
  100% {
    filter: drop-shadow(-0.75px 0px 6px rgba(0, 0, 0, 0.5));
    outline-color: rgba(0, 0, 0, 0.5);
  }
}
</style>
