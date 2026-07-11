# 果趣对对消

一个可以直接发给别人玩的连连看玩法小游戏。

## Run Locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run build
```

## Build Android APK

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```
