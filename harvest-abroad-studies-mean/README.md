# Harvest Abroad Studies — Angular + Express + MongoDB

This project follows the technology stack specified in the uploaded project document:

- **Angular + TypeScript** for the responsive student-facing website
- **Node.js + Express.js** for REST API endpoints
- **MongoDB + Mongoose** for storing student enquiries
- **JWT** for protected admin API access
- **Netlify Functions** to run the Express API as serverless functions when deploying the whole project on Netlify

The original document describes a physiotherapist portfolio; this is a fresh adaptation of its architecture for Harvest Abroad Studies, not a copy of its unrelated physiotherapy content or credentials.

## Included features

- Responsive landing page for Harvest Abroad Studies
- Destination cards for Europe, USA, UK, Canada, Australia, Germany, Ireland and other destinations
- Three illustrative guidance packages (Explore, Plan, Prepare); actual fees and inclusions must be confirmed by the business
- Student enquiry form with validation and MongoDB storage
- Study assistant chatbot with FAQ fallback; optional OpenAI Responses API integration
- REST API endpoints for health, destinations, packages, enquiries, admin login and protected enquiry listing
- JWT-protected admin API route for viewing submitted enquiries
- Netlify build and function configuration

## Deploy on Netlify

1. Extract this ZIP and upload the folder to a Git repository (recommended) or use Netlify's manual deployment after building locally.
2. In Netlify, choose **Add new site → Import an existing project** and connect the repository.
3. Build settings are included in `netlify.toml`:
   - Build command: `npm run build:netlify`
   - Publish directory: `dist/harvest-abroad-studies/browser`
   - Functions directory: `netlify/functions`
4. In **Site configuration → Environment variables**, add the values below before publishing.
5. Trigger a new deploy after saving environment variables.

### Required Netlify environment variables

- `MONGO_URI`: MongoDB Atlas connection string for a database named `harvest_abroad_studies` (or your chosen database).
- `JWT_SECRET`: long, random secret used to sign admin JWTs.
- `ADMIN_USERNAME`: the admin username you choose.
- `ADMIN_PASSWORD`: a long, unique admin password.

### Optional chatbot environment variables

- `OPENAI_API_KEY`: enables AI-generated answers. Keep this only in Netlify environment variables; never add it to Angular code.
- `OPENAI_MODEL`: optional; defaults to `gpt-4.1-mini` in this project.

Without `OPENAI_API_KEY`, the chatbot uses its built-in FAQ answers. Without `MONGO_URI`, the public website can still load, but enquiry submissions cannot be saved and the API will return a configuration error. Set up MongoDB Atlas and add the connection string before relying on the form.

### MongoDB Atlas checklist

1. Create a MongoDB Atlas cluster and database user.
2. Allow network access for your deployment. If you choose a broad IP rule for serverless access, understand the security trade-off and use a strong database password and least-privilege database user.
3. Copy the driver connection string, replace the username/password/cluster placeholders, and add it as `MONGO_URI` in Netlify.
4. Do not commit `.env` or real credentials to your repository.

## Configure Harvest Abroad Studies contact details

Update the contact email and phone/WhatsApp placeholder in `src/app/app.component.ts` before launch. The sample `hello@harvestabroadstudies.com` address is a placeholder and should not be treated as a verified mailbox. Confirm all business phone numbers, package prices, service inclusions, partner institutions and claims before publishing.

## Run locally

Requires a current Node.js LTS version and npm.

```bash
npm install
npm start
```

The Angular dev server opens the frontend. To test the backend and database in a local full-stack environment, configure environment variables and use Netlify CLI (`npx netlify dev`) so the `/api/*` routes invoke the same Netlify Function used in production. You may also use the optional `server/index.js` as a conventional Node server after setting up `.env`.

## REST API

- `GET /.netlify/functions/api/health` — health check
- `GET /api/destinations` — supported destination list
- `GET /api/packages` — sample guidance packages
- `POST /api/enquiries` — validate and save an enquiry in MongoDB
- `POST /api/chat` — FAQ response or optional AI response
- `POST /api/admin/login` — returns a JWT when configured admin credentials match
- `GET /api/admin/enquiries` — protected enquiry list; requires `Authorization: Bearer <token>`

The protected endpoint is an API foundation, not a complete graphical content-management dashboard. Admin login uses environment-configured credentials; do not reuse weak passwords.

## Important deployment notes

- Netlify hosts the Angular build and executes the Express API through a Netlify Function. MongoDB Atlas is an external managed database; Netlify does not host MongoDB itself.
- The enquiry form saves data to MongoDB, so configure `MONGO_URI` before launch and test with a sample enquiry.
- This project does not guarantee admissions, scholarships, employment or visa outcomes. Verify all official requirements with the relevant university and government sources.
- Before public launch, replace all placeholder contact details and add a privacy notice suited to your actual data-handling practices.
