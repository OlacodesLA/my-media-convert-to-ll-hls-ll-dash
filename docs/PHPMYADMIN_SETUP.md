# 🗄️ pgAdmin Setup Guide for Windows

Use pgAdmin to manage your local PostgreSQL instance with a graphical interface. These steps assume a fresh install on Windows.

## 🎯 Quick Setup with the PostgreSQL Installer

### Step 1: Download and Install PostgreSQL

1. **Download** the Windows installer from [postgresql.org](https://www.postgresql.org/download/windows/).
2. Launch the installer as Administrator.
3. Leave **PostgreSQL Server** and **pgAdmin 4** selected.
4. Choose the default install directory (for example `C:\Program Files\PostgreSQL\16\`).
5. Set a strong superuser password for the `postgres` role.
6. Keep the default port `5432` unless another service already uses it.

### Step 2: Start pgAdmin

1. Open **pgAdmin 4** from the Start Menu.
2. Enter the master password (you can reuse the `postgres` password).
3. Expand **Servers → PostgreSQL** and enter the same password when prompted.

### Step 3: Create the Application Database

1. In the Browser tree, right-click **Databases** → **Create → Database…**
2. Name it `social_platform`.
3. Leave the owner as `postgres` (or pick another user).
4. Click **Save**.

### Step 4 (Optional): Create a Dedicated App User

1. Expand **Login/Group Roles**.
2. Right-click → **Create → Login/Group Role…**
3. Choose a name (for example `streaming_app`) and set a password under **Definition**.
4. Under **Privileges**, grant `LOGIN`.
5. Under **Role Membership**, you can leave defaults for local development.
6. Grant rights to the database:

```sql
GRANT ALL PRIVILEGES ON DATABASE social_platform TO streaming_app;
```

## ⚙️ Update Your Environment

Edit `.env` to point Prisma at PostgreSQL:

```env
# Database Configuration (Prisma)
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/social_platform?schema=public"
```

If you created a dedicated role, replace `postgres` and `yourpassword` with that account.

## ✅ Apply the Schema & Test

```bash
npm run prisma:deploy
npm run prisma:generate
npm run test-database
```

You should see tables listed and a successful connection message.

## 🎯 Why pgAdmin?

- **Visual explorer** for schemas, tables, and roles.
- **Query Tool** with syntax highlighting and history.
- **Backup/Restore** dialogs for quick dumps.
- **Server status** dashboard showing locks, sessions, and long-running queries.

## 🚀 Handy pgAdmin Tips

- **Run SQL**: select your database → click the lightning bolt icon.
- **View table data**: right-click a table → **View/Edit Data → All Rows**.
- **Refresh objects**: right-click a node (e.g., `Schemas`) → **Refresh**.

## 🔍 Troubleshooting

### Port Conflicts

- Default Postgres port is `5432`. If it fails, re-run the installer and pick an open port (e.g. `5433`).

### Authentication Errors

- Right-click the server → **Properties** → reset the password.
- Ensure the installer added a `localhost` rule in `pg_hba.conf` (default is yes).

### Service Issues

- Open **Services** (Windows) → restart _postgresql-x64-XX_.
- Check the Windows Event Viewer for precise error messages.

## 🎉 All Set!

Once migrations succeed and `npm run test-database` passes, your PostgreSQL instance is ready for the UltraFast Social Platform. 🚀
