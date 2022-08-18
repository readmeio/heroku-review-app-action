class Step {
  constructor(title, params) {
    this.title = title;
    this.params = params;
    this.shouldRun = undefined;
  }

  /* eslint-disable class-methods-use-this */
  async checkPrereqs() {
    throw new Error('checkPrereqs() not implemented in Step subclass');
  }

  async run() {
    throw new Error('run() not implemented in Step subclass');
  }
  /* eslint-enable class-methods-use-this */
}

module.exports = Step;
