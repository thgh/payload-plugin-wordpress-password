# Enable users to use their existing Wordpress password in Payload

<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
</a>
<a href="https://github.com/thgh/payload-plugin-wordpress-password/issues">
  <img src="https://img.shields.io/github/issues/thgh/payload-plugin-wordpress-password.svg" alt="Issues" />
</a>
<a href="https://npmjs.org/package/payload-plugin-wordpress-password">
  <img src="https://img.shields.io/npm/v/payload-plugin-wordpress-password.svg?style=flat-squar" alt="NPM" />
</a>

## Features

- Marks the user as migrated after the first use of the Wordpress password.

## Installation

```
npm install payload-plugin-wordpress-password
# or
yarn add payload-plugin-wordpress-password
```

## Usage

```js
// payload.config.ts
import { wordpressPassword } from 'payload-plugin-wordpress-password'

export default buildConfig({
  plugins: [wordpressPassword()],
})
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information what has changed recently.

## Contributing

Contributions and feedback are very welcome.

To get it running:

1. Clone the project.
2. `npm install`
3. `npm run build`

## Credits

- [Thomas Ghysels](https://github.com/thgh)
- [All Contributors][link-contributors]

## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

[link-contributors]: ../../contributors
