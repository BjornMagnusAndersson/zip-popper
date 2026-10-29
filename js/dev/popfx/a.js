// Pop effects test page, variant A: Today (the game as it is). A look-and-feel test only (see popfx/shared.js for the hooks).

/** A: the game itself (the engine draws and plays everything). @returns {object} the variant */
function makeA() {
  return { engine: true, pop() {} };
}

export default { id: 'A', name: 'Today (the game as it is)', make: makeA };
