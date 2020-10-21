const axios = require('axios')

const logger = require('../../../logger')

const getContextForFilePath = (filePath) => {
    let context = 'bundlewatch'
    if (filePath) {
        const TRUNCATE_TO_LENGTH = 35
        if (filePath.length > TRUNCATE_TO_LENGTH) {
            context +=
                ' *' +
                filePath.substring(
                    filePath.length - TRUNCATE_TO_LENGTH - 2,
                    filePath.length,
                )
        } else {
            context += ' ' + filePath
        }
    }
    return context
}

class GitHubService {
    constructor({
        repoOwner,
        repoName,
        commitSha,
        githubUri,
        githubAccessToken,
    }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.commitSha = commitSha
        this.githubUri = githubUri
        this.githubAccessToken = githubAccessToken
        this.contexts = new Set()
    }

    get repo() {
        return `${this.repoOwner}/${this.repoName}`
    }

    get enabled() {
        return !!(
            this.githubAccessToken &&
            this.repoOwner &&
            this.repoName &&
            this.commitSha
        )
    }

    async update(message, url, status, filePath) {
        if (!this.enabled) {
            return Promise.resolve({})
        }

        const context = getContextForFilePath(filePath)
        if (!this.contexts.has(context) && this.contexts.size >= 5) {
            logger.warn(
                `Max reported statuses reached, github status will not be reported`,
            )
            return Promise.resolve()
        }
        this.contexts.add(context)

        try {
            return axios({
                method: 'POST',
                url: `${this.githubUri}/repos/${this.repo}/statuses/${this.commitSha}`,
                responseType: 'json',
                data: {
                    state: status,
                    target_url: url,
                    description: message,
                    context,
                },
                timeout: 5000,
                headers: {
                    Authorization: `token ${this.githubAccessToken}`,
                },
            })
        } catch (error) {
            if (error.response) {
                logger.error(
                    `GitHubService HTTP_${error.response.status} :: ${
                        error.response.data ? error.response.data.message : ''
                    }`,
                )
            } else {
                logger.error('GitHubService Other error', error)
            }
            return null
        }
    }

    async createIssueComment({ body }) {
        try {
            return axios({
                method: 'POST',
                url: `${this.githubUri}/repos/${this.repo}/issues/26/comments`,
                responseType: 'json',
                data: {
                    body,
                },
                timeout: 5000,
                headers: {
                    Authorization: `token ${this.githubAccessToken}`,
                },
            })
        } catch (error) {
            if (error.response) {
                logger.error(
                    `GitHubService HTTP_${error.response.status} :: ${
                        error.response.data ? error.response.data.message : ''
                    }`,
                )
            } else {
                logger.error('GitHubService Other error', error)
            }
            return null
        }
    }

    async start({ message }) {
        return this.update(message, undefined, 'pending')
    }

    async pass({ message, url }) {
        return this.update(message, url, 'success')
    }

    async fail({ message, url, filePath }) {
        return this.update(message, url, 'failure', filePath)
    }

    async error({ message }) {
        return this.update(message, undefined, 'error')
    }
}

module.exports = {
    GitHubService,
}
