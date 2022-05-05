![Owlbert wearing a jetpack](http://owlbert.io/images/owlberts-png/Jetpack.psd.png)

# heroku-review-app-action

This is a GitHub Action that can be used as an alternative to Heroku Review Apps! It manages the full lifecycle of a review app:
* When a Pull Request is opened or reopened, a review app is created in the given Heroku pipeline
* When a Pull Request is [synchronized](https://github.community/t/what-is-a-pull-request-synchronize-event/14784), the review app is rebuilt with the latest source
* When a Pull Request is closed, the review app is deleted

To use this action, you'll need a [Heroku pipeline](https://devcenter.heroku.com/articles/pipelines) for your app. Then add a file called `.github/workflows/review-app.yaml` with this content:

```yaml
name: Heroku Review App

on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Update Heroku
        uses: readmeio/heroku-review-app-action@main
        with:
          heroku_api_key: << personal API key for a Heroku user >>
          heroku_email: << email adddress of that Heroku user >>
          pipeline_name: << name of your Heroku pipeline >>
```

Once that file has been committed to your main branch, this should automatically open and close review apps as needed.


## Caveats

### This is a public repo

If you work at ReadMe: In order to use this as a GitHub Action this repo must be public — even just for projects inside the `readme` org. Don't add anything proprietary here, _especially any kind of secrets!_

If you don't: While this might be a handy template for other Heroku customers, it's written specific to ReadMe's needs.

### node_modules

The `node_modules` directory must be checked in to the repo in order to use this GitHub Action without a separate install step.

Before committing changes to the `node_modules` directory, please prune dev dependencies from your local install. Example:

```bash
# Remove dev dependencies from your local node_modules directory
$ npm prune --production

# Commit your changes to package.json and node_modules
$ git add node_modules  package.json package-lock.json
$ git commit -m "chore: update node_modules"

# Reinstall all modules, including dev dependencies
$ npm install
```


## Development

### Development workflow

* You'll need another app to trigger review app deployments -- I used https://github.com/readmeio/metrics-test-server
* Create a branch in _this_ repo and push that branch to GitHub
* Back in your other app, add a `.github/workflows/review-app.yaml` file like described above, but point to the action `readmeio/heroku-review-app-action@BRANCH_NAME_HERE` (that's the name of the branch you just created in this repo)
* You can trigger your branch of this workflow by opening a PR in that other app, by pushing code to the PR branch, by closing and reopening it, etc.

### Development commands

* `npm run lint`
* `npm test`
