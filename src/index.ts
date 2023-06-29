import { json } from 'express'
import payload from 'payload'
import { useAuth, useConfig } from 'payload/components/utilities'
import { Config } from 'payload/config'
import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import createPasswordHasher from 'wp-passhash'

const CLIENTSIDE = typeof window !== 'undefined'

/**
 * This plugin will migrate Wordpress passwords to Payload.
 * The first login attempt will be intercepted and the password will be checked against the Wordpress hash.
 * If it matches, the password will be migrated and the user will be logged in.
 * The next time the user logs in, the password will only be checked against the Payload hash.
 *
 * @example
 * plugins: [wordpressPassword()]
 */
export const wordpressPassword =
  () =>
  (config: Config): Config => {
    // Add the password hash to auth enabled collections
    config = {
      ...config,
      collections: (config.collections || []).map((collection) => {
        if (!collection.auth) return collection
        return {
          ...collection,
          fields: (collection.fields || [])
            .concat({
              name: 'wordpressPasswordMigrate',
              type: 'checkbox',
              label: 'Migrate password from Wordpress',
              access: { update: () => false },
              admin: {
                description: ({ value }: any) =>
                  value === true
                    ? 'When this user signs in with their Wordpress password, this checkbox will turn off.'
                    : value === false
                    ? 'The password has been migrated.'
                    : '',
              },
            })
            .concat({
              name: 'wordpressPasswordHash',
              type: 'text',
              label: 'Password migrated from Wordpress',
              hidden: true,
            }),
        }
      }),
    }
    return CLIENTSIDE
      ? wordpressPasswordClient(config)
      : wordpressPasswordServer(config)
  }

function wordpressPasswordClient(incoming: Config): Config {
  return {
    ...incoming,
    admin: {
      ...incoming.admin,
      components: {
        ...incoming.admin?.components,
        afterLogin: (incoming.admin?.components?.afterLogin || []).concat(
          () => {
            const history = useHistory()
            const { setToken } = useAuth()
            const { routes } = useConfig()
            useEffect(() => {
              const form = document.querySelector('form') as HTMLFormElement
              let intercept = true
              // This handler takes over the communication with the server
              // It breaks form validation, but otherwise there is no way to handle the multipart request body
              const handler = async (e: any) => {
                e.preventDefault()
                if (!intercept) return console.log('wordpress.form.skip')
                e.stopPropagation()
                const formData = new FormData(form)
                const data = Object.fromEntries(formData)
                console.log('wordpress.form', data)
                const ok = await fetch(form.action, {
                  method: 'POST',
                  body: JSON.stringify(data),
                  headers: { 'content-type': 'application/json' },
                }).then((r) => r.json())
                if (ok.token) {
                  console.log('wordpress.form.ok', ok)
                  setToken(ok.token)
                  history.push(routes.admin)
                } else {
                  console.log('wordpress.form.error', ok)
                  // If the login failed, we'll try again without intercepting
                  intercept = false
                  const button = form.querySelector(
                    '[type=submit]'
                  ) as HTMLButtonElement
                  button?.click()
                  setTimeout(() => {
                    intercept = true
                  }, 100)
                }
              }
              form.addEventListener('submit', handler, { capture: true })
              return () =>
                form.removeEventListener('submit', handler, { capture: true })
            }, [])
            return null
          }
        ),
      },
    },
  }
}

function wordpressPasswordServer(incoming: Config): Config {
  return {
    ...incoming,
    admin: {
      ...incoming.admin,
      webpack: (webpackConfig) => {
        const config = incoming.admin?.webpack?.(webpackConfig) || webpackConfig
        return {
          ...config,
          resolve: {
            ...config.resolve,
            alias: {
              ...config.resolve?.alias,
              express: false,
            },
          },
        }
      },
    },
    endpoints: (incoming.endpoints || []).concat([
      {
        path: '/api/:collection/login',
        method: 'post',
        root: true,
        handler: json(),
      },
      {
        path: '/api/:collection/login',
        method: 'post',
        root: true,
        async handler(req, res, next) {
          // The request body should already be parsed
          const email = req.body.email
          const password = req.body.password
          if (!email || !password) return next()

          // Find the relevant user but only if they must be migrated
          const result = await payload.find({
            collection: req.params.collection as 'users',
            where: {
              email: { equals: req.body.email },
              wordpressPasswordMigrate: { equals: true },
            },
            showHiddenFields: true,
            depth: 0,
          })

          // Check if the wordpress hash matters
          const match = result.docs[0]
          if (!match || !match.wordpressPasswordMigrate) return next()

          // Let's verify the password
          const hash = match.wordpressPasswordHash
          console.log('wordpress.check', hash?.slice(0, 5))
          if (!hash || !createPasswordHasher().check(password, hash))
            return next()

          // Migrate!
          console.log('wordpress.migrate')
          await payload.update({
            collection: req.params.collection as 'users',
            id: match.id,
            data: {
              password,
              wordpressPasswordMigrate: false,
              wordpressPasswordHash: '',
            },
            showHiddenFields: true,
            depth: 0,
          })

          // Continue with the regular login which will recognize the new password
          return next()
        },
      },
    ]),
  }
}
