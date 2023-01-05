![Owlbert wearing a jetpack](http://owlbert.io/images/owlberts-png/Jetpack.psd.png)

# heroku-review-app-action

This is a GitHub Action that can be used as an alternative to Heroku Review Apps! It manages the full lifecycle of a review app:
* When a Pull Request is opened or reopened, a review app is created in the given Heroku pipeline
* When a Pull Request is [synchronized](https://github.community/t/what-is-a-pull-request-synchronize-event/14784), the review app is rebuilt with the latest source
* When a Pull Request is closed, the review app is deleted

**Note:** GitHub Action workflows will not run on `pull_request` activity if the pull request has a merge conflict. The merge conflict must be resolved first.

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
          # With Docker builds, you can use "fetch-depth: 10" to speed up the checkout step.
          fetch-depth: 0
      - name: Update Heroku
        uses: readmeio/heroku-review-app-action@main
        with:
          docker: false  # true when using Docker builds
          circleci_api_token: ${{ secrets.CIRCLECI_API_TOKEN }}  # only needed for Docker builds
          heroku_api_key: << personal API key for a Heroku user >>
          heroku_email: << email adddress of that Heroku user >>
          pipeline_name: << name of your Heroku pipeline >>
```

Once that file has been committed to your main branch, this should automatically open and close review apps as needed.

## GitHub Action parameters

* `heroku_api_key`: Personal API key for a Heroku user. Required.
* `heroku_email`: Email address of that Heroku user. Required.
* `circleci_api_token`: API token for kicking off a CircleCI workflow. Required when `docker` is `true`.
* `docker`: `true` to build a Docker image on CircleCI and ship it to Heroku, `false` to build directly on Heroku.
* `pipeline_name`: Name of the Heroku pipeline which contains review apps for this repo. Must already exist in Heroku. Required.
* `log_drain_url`: If specified, this log drain will be added to review apps when they are created. If you want to include the PR number in the URL, you can use `${{github.event.number}}`. Optional.

## Caveats

### This is a public repo

If you work at ReadMe: In order to use this as a GitHub Action this repo must be public — even just for projects inside the `readme` org. Don't add anything proprietary here, _especially any kind of secrets!_

If you don't: While this might be a handy template for other Heroku customers, it's written specific to ReadMe's needs.

### Must perform a full clone to use this action

By default `actions/checkout` does a [shallow clone](https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/#user-content-shallow-clones) which doesn't include all of the repo history. But in order to push the repo contents to Heroku, we need a deep clone of all history. Setting `fetch-depth: 0` in the `actions/checkout` loads all history for all branches and tags, so be sure that's included as a parameter to `actions/checkout`.


## Development

### Development workflow

* You'll need another app to trigger review app deployments -- I used https://github.com/readmeio/metrics-test-server
* Create a branch in _this_ repo and push that branch to GitHub
* Back in your other app, add a `.github/workflows/review-app.yaml` file like described above, but point to the action `readmeio/heroku-review-app-action@BRANCH_NAME_HERE` (that's the name of the branch you just created in this repo)
* You can trigger your branch of this workflow by opening a PR in that other app, by pushing code to the PR branch, by closing and reopening it, etc.

### Development commands

* `npm run lint`
* `npm test`
* `npm build` (to rebuild `dist/index.js`, otherwise your changes won't be reflected in the copy that actually runs on GitHub!)
test
