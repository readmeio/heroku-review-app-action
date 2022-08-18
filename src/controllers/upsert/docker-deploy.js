const core = require('@actions/core');
const github = require('@actions/github');

const circleci = require('../../circleci');

class DockerDeployStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Building Docker image and deploying the image to Heroku';
  }

  async checkPrereqs() {
    this.shouldRun = this.params.useDocker;
    if (this.shouldRun) {
      circleci.initializeCredentials();
    }
  }

  async run() {
    const owner = github.context.payload.repository.owner.login;
    const repo = github.context.payload.repository.name;
    const branch = github.context.payload.pull_request.head.ref;
    const nodeEnv = core.getInput('node_env', { required: false });
    const pipeline = await circleci.startDockerBuild(owner, repo, branch, this.params.appName, nodeEnv);

    core.info(`  - Kicked off CircleCI pipeline #${pipeline.number}. Waiting for pipeline to finish;`);
    core.info('    this may take some time. Watch the build progress here:');
    core.info(`    https://app.circleci.com/pipelines/github/${owner}/${repo}/${pipeline.number}`);

    const result = await circleci.waitForPipelineFinish(pipeline.id);
    if (result.status === 'success') {
      core.info('    Build and deploy pipeline finished successfully!');
    } else {
      throw new Error(`CircleCI pipeline #${pipeline.number} finished with status "${result.status}".`);
    }
  }
}

module.exports = DockerDeployStep;
