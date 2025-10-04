## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Environment variables

Create a `.env` file in the `backend` directory with the following variable:

```env
JWT_SECRET=<your-secret-here>
# Default admin bootstrap (override to change credentials)
DEFAULT_ADMIN_EMAIL=jdzare@gmail.com
DEFAULT_ADMIN_PASSWORD=chuscasas19911991
DEFAULT_ADMIN_USERNAME=jdzare
# Allowed origins for CORS, comma separated
CORS_ORIGIN=http://localhost:3000
# Public URL used to generate absolute links to uploaded files
PUBLIC_URL=http://localhost:4000
# Base URL for accounting service hooks
ACCOUNTING_URL=http://localhost:4000/api
# Keys for Culqi payments
CULQI_PUBLIC_KEY=
CULQI_SECRET_KEY=
# SMTP server for contact form
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
# Destination address for contact emails
CONTACT_EMAIL=contact@example.com
# Enable Redis queues (set to true to enable)
REDIS_ENABLED=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Accounting migrations and seed

Run the accounting migration and seed scripts:

```bash
$ npm run migrate:accounting
$ npm run seed:accounting
```

After seeding, verify that data was inserted with simple count queries:

```sql
SELECT COUNT(*) FROM "Account";
SELECT COUNT(*) FROM "JournalEntry";
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

### `GET /api/keywords`

Returns all available keywords for search in the frontend. Each item includes the
keyword text and the logo URL resolved from the associated brand's `logoSvg` or
`logoPng`.

**Example response:**

```json
[
  { "keyword": "acme", "logoUrl": "/uploads/brands/acme.svg" }
]
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Mysliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
