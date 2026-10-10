# CapiLAR – Mobile

Android app for **CapiLAR**, a web and mobile platform for the operational and technical management of hair salons and professional stylists.

Final project of the *Tecnicatura Universitaria en Desarrollo Web* – Facultad de Informática, Universidad Nacional del Comahue (2026).

**Team: LAR Developers**

- Crespillo, Andrea
- Navarrete, Ramiro Rafael
- Parra Sanhueza, Linda Cristal

---

## About the app

The mobile app is the day-to-day tool for **clients** and **professionals**. Salon administration (users, services) stays in the web app.

| Role | Features |
|---|---|
| **Client** | Sign-up and login, service catalog, booking (F03), my appointments with cancellation and rescheduling (F04), push reminders (F06), history and photo gallery (F10). |
| **Professional** | Daily agenda with accept / reject / complete (F07), technical records with camera photos (F08/F09), QR stock in/out (F11), push alerts for new bookings and cancellations. |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 57) |
| Language | TypeScript |
| Navigation | Expo Router (file-based, built on React Navigation) |
| Secure storage | Expo SecureStore (JWT) |
| Builds | EAS Build (APK) |

## Repositories

- **Backend**: NestJS + Prisma + MySQL – [CapiLAR-BackEnd](https://github.com/LindaCristalParra/TUDW_TF_LAR_Developers_CapiLAR-BackEnd)
- **Frontend**: Vite + React + Tailwind CSS – [CapiLAR-FrontEnd](https://github.com/Andre-C96/TUDW_TF_LAR_Developers_CapiLAR-FrontEnd)
- **Mobile** (this repository): React Native + Expo

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) LTS (20.x or higher) and npm
- An Android phone with **Expo Go** installed from the Play Store (or an Android emulator)
- The backend running locally (see the backend README)

### Installation

```bash
git clone https://github.com/nramiror/TUDW_TF_LAR_Developers_CapiLAR-Mobile.git
cd TUDW_TF_LAR_Developers_CapiLAR-Mobile
npm install
```

> If Expo Go says the project is **incompatible with this version of Expo Go**, align the project with the SDK your Expo Go supports:
> `npx expo install expo@latest --fix`

### Environment variables

Copy `.env.example` to `.env` and set the backend URL:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

`localhost` does **not** work from the phone (it points to the phone itself). Use your computer's IP on the local network (Windows: `ipconfig` → *IPv4 Address*) and connect the phone and the computer to the **same Wi-Fi**. Restart Expo after changing `.env`.

The backend does not need CORS changes: native apps don't send an `Origin` header.

### Running the app

```bash
npm start
```

Scan the QR code with **Expo Go**. The welcome screen shows a card that tells you whether the phone can reach the backend.

If the phone can't reach your computer (university or public Wi-Fi), use `npx expo start --tunnel`.

### Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (Expo config)
npm run doctor      # Expo dependency check
```

### Android build (APK)

APKs are built with EAS (`eas.json` has the `development`, `preview` and `production` profiles):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Set the backend URL of each environment in `eas.json` before building (tracked in PWA-192).

## Project structure

```
src/
  app/                 Screens (Expo Router: each file is a route)
    _layout.tsx        Root layout: fonts, splash screen, stack
    index.tsx          Welcome screen
    (auth)/            Login and sign-up (no session)
    cliente/           Client tabs: book, my appointments, profile
    profesional/       Professional tabs: agenda, profile
  api/                 Backend client and endpoints (ported from the web frontend)
  components/          Reusable components (one folder per component, as in the web)
  theme/               Design tokens: colors, gradient, fonts, spacing
assets/images/         App icon, splash screen and logos
```

## Conventions

Same as the web frontend:

- Branches from Linear: `ramironavarrete/pwa-XXX-...`, merged into `develop` through pull requests.
- Commits: `- Feat: ...`, `- Fix: ...`
- Code in English where it touches libraries, domain names and comments in Spanish (`turnos`, `servicios`, ...), matching the backend.
