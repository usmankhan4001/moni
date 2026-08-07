# Contributing to Moni

Thank you for your interest in contributing to **Moni — Your Freelance Project Finance Manager**!

## Before you start

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating, and review [SECURITY.md](SECURITY.md) if you're reporting a vulnerability rather than contributing code (please do not open a public issue for security reports).

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
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
7. **Submit a Pull Request**: Open a PR targeting the `main` branch with a clear description of your changes.

## Code Standards
- Adhere to the existing TypeScript conventions and Tailwind CSS styling patterns.
- Ensure all queries are scoped properly by workspace `tenant_id` for multi-tenant safety.
- Test both `single_user` and `multi_tenant` deployment modes before submitting PRs.
