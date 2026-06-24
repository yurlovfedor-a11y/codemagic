# MaxyMessenger

MaxyMessenger теперь подготовлен под:
- Firebase Hosting
- iPhone web app
- Capacitor iOS wrapper
- Codemagic iOS build
- Android APK / AAB через Capacitor
- Codemagic Android build

## Файлы для Android

- `ANDROID_BUILD.md`
- `codemagic.yaml`
- `capacitor.config.json`
- `package.json`

## Если нужен Android сейчас

Самый простой путь:
- workflow `android-apk` в Codemagic

Он даст готовый `.apk` для установки на устройство.

## Если нужен Google Play release

Используйте:
- workflow `android-release-aab`

## Подробности

Смотрите:
- `ANDROID_BUILD.md`
