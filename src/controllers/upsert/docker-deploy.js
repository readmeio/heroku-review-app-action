const core = require('@actions/core');

const githubActions = require('../../github-actions');
const Step = require('../step');

class DockerDeployStep extends Step {
  constructor(params) {
    super('Building Docker image and deploying the image to Heroku', params);
  }

  async checkPrereqs() {
    this.shouldRun = true;
  }

  async run() {
    const workflowRun = await githubActions.startDeploy(this.params);

    core.info(`  - Kicked off GitHub workflow run #${workflowRun.run_number}.`);
    core.info('    This may take some time; watch the build progress here:');
    core.info(`    ${workflowRun.html_url}`);

    const result = await githubActions.waitForCompletion(this.params, workflowRun.id);
    if (result.status === 'completed' && result.conclusion === 'success') {
      core.info('    Build and deploy pipeline finished successfully!');
    } else {
      throw new Error(
        `GitHub workflow run #${workflowRun.run_number} finished with status "${result.status}" and conclusion "${result.conclusion}".`
      );
    }
  }
}

module.exports = DockerDeployStep;
