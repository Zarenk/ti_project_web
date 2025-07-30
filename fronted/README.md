# TI Project Web

This repository contains a full stack web application composed of a **NestJS** backend and a **Next.js** front‑end. The project provides an inventory and sales management system that can also serve as an online store.

## Project Structure

- **backend/** – API server built with NestJS and Prisma.
- **fronted/** – Web client built with Next.js using the app router.

## Setup

1. Install **Node.js** (v18 or later) and **npm**.
2. Clone the repository and install dependencies for each part:
   ```bash
   git clone <repo>
   cd ti_project_web
   cd backend && npm install
   cd ../fronted && npm install
   ```
3. Configure environment variables.

### Backend environment
Create a `backend/.env` file with at least the following keys:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-secret
SUNAT_CLIENT_ID=<id>
SUNAT_CLIENT_SECRET=<secret>
SUNAT_USERNAME=<username>
SUNAT_PASSWORD=<password>
PORT=4000
```

Run database migrations and start the server:

```bash
cd backend
npx prisma migrate dev
npm run seed:web # create WEB POS store if missing
npm run start:dev
```

### Front-end environment
Create a `fronted/.env.local` file with the following variables:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
JWT_SECRET=2kQ1oLQuQrsNNA5YfVjfo1sS9STiQMMf
# ID of the store used for online purchases
NEXT_PUBLIC_STORE_ID=1
# Culqi integration
CULQI_PUBLIC_KEY=
CULQI_SECRET_KEY=
```

`NEXT_PUBLIC_BACKEND_URL` **must** point to the public URL of the backend when
building the front‑end. It is used to construct links for files served under
`/uploads`, such as order payment proofs. Example:

```env
NEXT_PUBLIC_BACKEND_URL=https://api.example.com
```
Start the development server:

```bash
cd fronted
npm run dev
```

### Shipping information
Web orders now store shipping details. When creating a web sale you can send the following optional fields:

- `shippingName`
- `shippingAddress`
- `city`
- `postalCode`
- `phone`


## Configuring Stores
The system supports multiple stores. For online purchases the front‑end expects a store representing the web sales channel (commonly named **"WEB POS"**). Configure the ID of this store through the `NEXT_PUBLIC_STORE_ID` variable. Make sure the store exists in the backend before processing online orders.

Additional physical stores can be created using the `/stores` endpoints exposed by the API.

---
This README provides a minimal overview; see the READMEs inside `backend/` and `fronted/` for framework‑specific commands.
