import canTokenAccessRepo from '../../helpers/github/canTokenAccessRepo'

import asyncMiddleware from './asyncMiddleware'

const protectedMiddleware = asyncMiddleware(async (req, res, next) => {
    const { commitSha, repoName, repoOwner, githubAccessToken } = req.body

    const hasAccess = await canTokenAccessRepo({
        repoOwner,
        repoName,
        commitSha,
        githubAccessToken,
    })
    if (!hasAccess) {
        return res.status(401).json({ error: `Not allowed` })
    }
    if (hasAccess.error) {
        return res.status(500).json({ error: hasAccess.error })
    }

    return next()
})

export default protectedMiddleware