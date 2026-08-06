# Contributing to Moni

Thank you for your interest in contributing to **Moni — Your Freelance Project Finance Manager**!

## Development Workflow

1. **Fork the Repository**: Create a personal fork on GitHub.
2. **Clone & Branch**:
   ```bash
   git clone https://github.com/your-username/Moni.git
   cd Moni
   git checkout -b feature/your-feature-name
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Setup**: Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
5. **Run Locally**:
   ```bash
   npm run dev
   ```
6. **Verify Code Quality**:
   ```bash
   npm run typecheck
   npm run build
   ```
7. **Submit a Pull Request**: Open a PR targeting the `main` or `V1.1` branch with a clear description of your changes.

## Code Standards
- Adhere to the existing TypeScript conventions and Tailwind CSS styling patterns.
- Ensure all queries are scoped properly by workspace `tenant_id` for multi-tenant safety.
- Test both `single_user` and `multi_tenant` deployment modes before submitting PRs.
