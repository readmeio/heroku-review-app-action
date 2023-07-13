const core = require('@actions/core');

const circleci = require('../../circleci');
const Step = require('../step');

class DockerDeployStep extends Step {
  constructor(params) {
    super('Building Docker image and deploying the image to Heroku', params);
  }

  async checkPrereqs() {
    this.shouldRun = true;
    circleci.initializeCredentials();
  }

  async run() {
    const pipeline = await circleci.startDockerBuild(this.params);
    const url = `https://app.circleci.com/pipelines/github/${this.params.owner}/${this.params.repo}/${pipeline.number}`;

    core.info(`  - Kicked off CircleCI pipeline #${pipeline.number}. Waiting for pipeline to finish;`);
    core.info('    this may take some time. Watch the build progress here:');
    core.info(`    ${url}`);

    const result = await circleci.waitForPipelineFinish(pipeline.id);
    if (result.status === 'success') {
      core.info('    Build and deploy pipeline finished successfully!');
    } else {
      throw new Error(`CircleCI pipeline #${pipeline.number} finished with status "${result.status}".`);
    }
  }
}

module.exports = DockerDeployStep;
